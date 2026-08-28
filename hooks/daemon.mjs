/**
 * Make sure a local leCore is listening — start it if not, and heal it if it dies.
 *
 * WHY THIS EXISTS. "Install the plugin and your agent gets cheaper" is only
 * true if the memory it depends on is actually running. Without this, ambient
 * memory silently does nothing for everyone who has not already set up a leCore
 * daemon, which is almost everyone, and the failure is invisible because every
 * hook fails open by design.
 *
 * WHAT IT WILL NOT DO: fall back to the hosted service when the local daemon is
 * missing. That would turn "your data stays on your machine" into a promise
 * that quietly breaks exactly when it matters, and a user who never opted into
 * egress would be egressing. No daemon means no ambient memory, and the brief
 * says so plainly. Hosted stays a deliberate OPENZOO_ENDPOINT decision.
 *
 * THERE IS NO UNIVERSAL LAUNCH COMMAND. leCore is self-hosted and installs
 * differently everywhere — on this machine it happens to be
 * `python3 …/hrr-context/service/server.py`, which no plugin could guess. So we
 * try, in order: an explicit OPENZOO_LECORE_CMD, a `lecore` binary on PATH,
 * then `python3 $OPENZOO_LECORE_HOME/service/server.py`. If none of those fit,
 * the user sets OPENZOO_LECORE_CMD and it works.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { env, isLocal } from './openzoo-env.mjs';

// A probe on every hook would add a round trip to every prompt and every tool
// call. Cache the last known-good moment on disk (hooks are separate processes,
// so in-memory state buys nothing) and re-probe only when it is stale.
// KEYED BY ENDPOINT. A single shared state file meant a probe against one
// endpoint answered for another: pointing OPENZOO_ENDPOINT at a dead port
// returned "alive" in 1ms because a previous run had cached a healthy result
// for 127.0.0.1:8787. A cache that answers questions it was not asked is worse
// than no cache.
const STATE = join(tmpdir(),
  `openzoo-daemon-${Buffer.from(env.endpoint).toString('hex').slice(0, 40)}.json`);
const FRESH_MS = 30_000;
const BACKOFF_MS = 60_000;

function readState() {
  try { return JSON.parse(readFileSync(STATE, 'utf8')); } catch { return {}; }
}
function writeState(s) {
  try { writeFileSync(STATE, JSON.stringify(s), { mode: 0o600 }); } catch {}
}

async function alive(timeoutMs = 1500) {
  try {
    const r = await fetch(`${env.endpoint}/internal/v1/hrr/bind`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.token}` },
      // A deliberately INVALID body: leCore rejects it fast with a 4xx, which
      // proves the service is answering without writing anything. A health path
      // is not reliable here — /healthz 404s on this daemon while bind works.
      body: JSON.stringify({ tenant_id: '_probe', items: [] }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return r.status > 0 && r.status < 500;
  } catch { return false; }
}

function launchCommand() {
  if (process.env.OPENZOO_LECORE_CMD) {
    const parts = process.env.OPENZOO_LECORE_CMD.split(' ').filter(Boolean);
    return { cmd: parts[0], args: parts.slice(1) };
  }
  const onPath = spawnSync('command', ['-v', 'lecore'], { shell: true, encoding: 'utf8' });
  if (onPath.status === 0 && onPath.stdout.trim()) return { cmd: 'lecore', args: ['serve'] };
  const home = process.env.OPENZOO_LECORE_HOME;
  if (home && existsSync(join(home, 'service', 'server.py'))) {
    return { cmd: 'python3', args: [join(home, 'service', 'server.py')] };
  }
  return null;
}

/**
 * Returns true when a local daemon is answering. Starts one if it can.
 *
 * Hosted endpoints are never started or probed — that is someone else's server
 * and its uptime is not ours to manage.
 */
export async function ensureDaemon() {
  if (!isLocal) return true;

  const st = readState();
  const now = Date.now();
  if (st.okAt && now - st.okAt < FRESH_MS) return true;

  if (await alive()) { writeState({ okAt: now }); return true; }

  // SELF-HEAL, WITH A BACKOFF. If the daemon is down and cannot be started —
  // no launch command, missing dependency, a port already taken by something
  // else — retrying on every single prompt would fork a doomed process
  // constantly. Try at most once a minute.
  if (st.triedAt && now - st.triedAt < BACKOFF_MS) return false;
  writeState({ ...st, triedAt: now });

  const launch = launchCommand();
  if (!launch) return false;

  try {
    const child = spawn(launch.cmd, launch.args, { detached: true, stdio: 'ignore' });
    await new Promise((r) => {
      child.once('spawn', r); child.once('error', r); setTimeout(r, 1000).unref();
    });
    child.unref();
  } catch { return false; }

  // Give it a moment to bind the port, then confirm. Bounded tightly because
  // this can sit in front of a user's prompt.
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await alive(1000)) { writeState({ okAt: Date.now() }); return true; }
  }
  return false;
}
