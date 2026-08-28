#!/usr/bin/env node
/**
 * UserPromptSubmit: retrieve against everything bound so far, inject the slice.
 *
 * This is the half that pays for itself. bind-ambient remembers what the agent
 * read; this puts the relevant few hundred characters of it back in front of
 * the model on the next prompt, so the agent stops re-reading files it has
 * already seen. That is where "cheaper" comes from — not a discount, but not
 * sending the same bytes twice.
 *
 * THIS ONE DOES AWAIT, briefly. Its whole output is context for the prompt that
 * is about to run, so returning after that prompt has gone would be pointless.
 * It is bounded hard (a few seconds) and fails open: if the daemon is slow or
 * down, the prompt proceeds with no injected context, exactly as if the plugin
 * were not installed. A memory layer must never be able to block a question.
 *
 * LOCAL BY DEFAULT — the query and the corpus both stay on 127.0.0.1 unless the
 * user has pointed OPENZOO_ENDPOINT at the hosted service themselves. The
 * prompt text is sent to whatever that endpoint is, which is precisely why the
 * default is loopback.
 */
import { readFileSync, existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, routes, headers, isLocal } from './openzoo-env.mjs';
import { ensureDaemon } from './daemon.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

function readStdin() {
  return new Promise((resolve) => {
    let d = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { d += c; });
    process.stdin.on('end', () => resolve(d));
    setTimeout(() => resolve(d), 2000).unref();
  });
}

function emit(context) {
  process.stdout.write(JSON.stringify({
    continue: true,
    ...(context ? {
      hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: context },
    } : {}),
  }));
}

async function main() {
  if (!env.ambient) return emit(null);

  let ev = {};
  try { ev = JSON.parse(await readStdin() || '{}'); } catch { return emit(null); }
  const prompt = (ev.prompt || ev.user_prompt || '').trim();
  if (prompt.length < 8) return emit(null);

  // BIND A BIG PROMPT TOO, not just tool results.
  //
  // PostToolUse only fires on tool calls, and the most common way a large body
  // arrives is not a tool call at all — it is an ATTACHMENT, which reaches the
  // agent inside the prompt. OBSERVED: a 120KB markdown file dropped into a
  // Grok Bot chat produced no PostToolUse event and therefore no ambient bind
  // at all, which quietly defeats the entire feature for the single most
  // obvious use case.
  //
  // Detached and never awaited, same as the tool path: the prompt must not wait
  // on a bind. It will not be recallable until the NEXT prompt, which is the
  // correct trade — the model already has this text in front of it right now.
  if (prompt.length >= env.minBindChars) {
    try {
      const dir = mkdtempSync(join(tmpdir(), 'openzoo-bind-'));
      const file = join(dir, 'payload.txt');
      writeFileSync(file, `### user message\n\n${prompt}`, { mode: 0o600 });
      const child = spawn(process.execPath, [join(HERE, 'bind-worker.mjs'), file], {
        detached: true, stdio: 'ignore',
      });
      await new Promise((r) => {
        child.once('spawn', r); child.once('error', r); setTimeout(r, 1000).unref();
      });
      child.unref();
    } catch {}
  }

  // Self-heal before retrieving. If the daemon died between prompts this brings
  // it back; if it cannot be started we return no context rather than blocking,
  // and rather than quietly reaching for the hosted service.
  if (!(await ensureDaemon())) return emit(null);

  let contextId = null;
  try {
    if (existsSync(env.contextFile)) contextId = readFileSync(env.contextFile, 'utf8').trim() || null;
  } catch {}
  if (!contextId) return emit(null); // nothing bound yet — nothing to say

  const body = routes.recall.startsWith('/internal')
    ? { tenant_id: env.tenant, context_id: contextId, query: prompt.slice(0, 2000), top_k: env.topK }
    : { context_id: contextId, query: prompt.slice(0, 2000), top_k: env.topK };

  let items = [];
  try {
    const r = await fetch(`${env.endpoint}${routes.recall}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      // Short on purpose. This sits between the user pressing enter and the
      // model starting, so it is the most latency-sensitive call in the plugin.
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return emit(null);
    const j = await r.json();
    items = (j?.items ?? []).map((x) => (typeof x === 'string' ? x : x?.text)).filter(Boolean);
  } catch {
    return emit(null); // fail open, always
  }
  if (!items.length) return emit(null);

  const slice = items.join('\n---\n').slice(0, 12000);
  emit(
    `Relevant material retrieved from this session's holographic memory (${items.length} passage`
    + `${items.length === 1 ? '' : 's'}, ${isLocal ? 'local leCore on 127.0.0.1 — nothing left this machine' : `hosted at ${env.endpoint}`}).\n\n`
    + 'This is a RANKED SELECTION of things already read in this session, not the whole corpus. '
    + 'Use it instead of re-reading those files. It does not support exhaustive claims '
    + '("every", "all", "none") — if the question needs those, say your view is partial.\n\n'
    + slice,
  );
}

main().catch(() => emit(null)).finally(() => process.exit(0));
