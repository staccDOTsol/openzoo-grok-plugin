#!/usr/bin/env node
/**
 * The detached half of the ambient bind. Reads a payload file, binds it, exits.
 *
 * This exists as a SEPARATE PROCESS because the hook that triggers it must not
 * wait. A bind of a large tool result takes seconds; a hook that blocks for
 * seconds on every file read makes the agent feel broken, and the whole point
 * of ambient memory is that the user never notices it happening.
 *
 * So the hook writes a payload to a temp file, spawns this detached, and
 * returns immediately. Nothing downstream depends on this finishing: recall
 * simply finds whatever has landed by the time it is asked. Memory that is a
 * few seconds behind is fine. A UI that stutters is not.
 *
 * Every failure here is silent by design. This is a background nicety — if the
 * daemon is down, the corpus is huge, or the disk is full, the correct outcome
 * is that the agent carries on with no ambient memory and nobody sees a stack
 * trace they did not ask for.
 */
import { readFileSync, unlinkSync, writeFileSync, existsSync } from 'node:fs';
import { env, routes, headers } from './openzoo-env.mjs';
import { ensureDaemon } from './daemon.mjs';

const payloadPath = process.argv[2];
if (!payloadPath) process.exit(0);

async function main() {
  let text = '';
  try {
    text = readFileSync(payloadPath, 'utf8');
  } catch { process.exit(0); }
  try { unlinkSync(payloadPath); } catch {}
  if (!text || text.length < env.minBindChars) process.exit(0);

  // Start the daemon if it is not up. This runs detached, so a few seconds
  // spent here costs the agent nothing.
  if (!(await ensureDaemon())) process.exit(0);

  // Reuse one cumulative context so everything this bot has seen ranks
  // together. Without it each read becomes an island and recall can only ever
  // see the most recent one.
  let contextId = null;
  try {
    if (existsSync(env.contextFile)) contextId = readFileSync(env.contextFile, 'utf8').trim() || null;
  } catch {}

  const body = routes.bind.startsWith('/internal')
    ? { tenant_id: env.tenant, items: [{ text }], chunk: true, ...(contextId ? { context_id: contextId } : {}) }
    : { corpus: text, ...(contextId ? { context_id: contextId } : {}) };

  try {
    const r = await fetch(`${env.endpoint}${routes.bind}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const j = await r.json().catch(() => null);
    if (j?.context_id && j.context_id !== contextId) {
      try { writeFileSync(env.contextFile, j.context_id, { mode: 0o600 }); } catch {}
    }
  } catch {
    // Daemon down, timeout, anything: the agent keeps working without ambient
    // memory. Never surface this.
  }
  process.exit(0);
}

main().catch(() => process.exit(0));
