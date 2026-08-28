#!/usr/bin/env node
/**
 * PostToolUse: bind what the agent just read, in the background, without waiting.
 *
 * WHY PostToolUse AND NOT PreToolUse. You cannot bind a file before it has been
 * read — PreToolUse has the arguments and not the contents. The bindable thing
 * is the tool RESULT, which only exists afterwards.
 *
 * FIRE AND FORGET, LITERALLY. This writes the payload to a temp file, spawns
 * bind-worker.mjs detached with stdio ignored, unrefs it, and returns. It never
 * awaits the bind. A hook runs on every single tool call, so anything that
 * blocks here is a tax paid on every file the agent opens, and a several-second
 * bind would make the agent feel broken. The worker outliving this process is
 * the point, not an accident.
 *
 * Consequence, stated because it is a real design choice: memory is EVENTUALLY
 * consistent. Something read this turn may not be recallable until the next
 * one. That is the correct trade — a small lag nobody notices beats a stall
 * everybody does.
 *
 * LOCAL BY DEFAULT. This binds to 127.0.0.1 unless the user has explicitly
 * pointed OPENZOO_ENDPOINT elsewhere. Nothing about reading a file should send
 * it anywhere.
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './openzoo-env.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// Only tools whose output is worth remembering. Deliberately narrow: this is
// not "bind everything the agent touches", it is "bind the documents it read".
const BINDABLE = /^(Read|Grep|Glob|WebFetch|NotebookRead|Bash)$/;

function readStdin() {
  return new Promise((resolve) => {
    let d = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { d += c; });
    process.stdin.on('end', () => resolve(d));
    setTimeout(() => resolve(d), 2000).unref();
  });
}

function textOf(v, depth = 0) {
  if (v == null || depth > 4) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map((x) => textOf(x, depth + 1)).join('\n');
  if (typeof v === 'object') {
    return ['content', 'text', 'output', 'stdout', 'result', 'file', 'data']
      .map((k) => (k in v ? textOf(v[k], depth + 1) : '')).filter(Boolean).join('\n');
  }
  return '';
}

async function main() {
  if (!env.ambient) return;
  let ev = {};
  try { ev = JSON.parse(await readStdin() || '{}'); } catch { return; }

  const tool = ev.tool_name || ev.toolName || '';
  if (!BINDABLE.test(tool)) return;

  const body = textOf(ev.tool_response ?? ev.tool_result ?? ev.toolResponse);
  if (!body || body.length < env.minBindChars) return;

  // Label with where it came from, so a retrieved passage can say which file it
  // is from instead of arriving as anonymous text.
  const src = ev.tool_input?.file_path || ev.tool_input?.path
    || ev.tool_input?.pattern || ev.tool_input?.url || ev.tool_input?.command || tool;
  const payload = `### ${tool}: ${String(src).slice(0, 300)}\n\n${body}`;

  try {
    const dir = mkdtempSync(join(tmpdir(), 'openzoo-bind-'));
    const file = join(dir, 'payload.txt');
    writeFileSync(file, payload, { mode: 0o600 });
    const child = spawn(process.execPath, [join(HERE, 'bind-worker.mjs'), file], {
      detached: true,
      stdio: 'ignore',
    });
    // WAIT FOR THE FORK, NOT FOR THE BIND.
    //
    // spawn() hands back a handle synchronously, but the fork happens on the
    // event loop. With stdio:'ignore' and unref() there is then nothing left
    // holding this process open, so node exits immediately — before the child
    // exists — and the bind silently never happens. MEASURED: the hook returned
    // in 0.127s and no context was ever written, while the identical spawn with
    // stdio:'inherit' (which keeps the parent attached a moment longer) worked
    // every time. That difference is the whole bug.
    //
    // Awaiting the 'spawn' event costs milliseconds and guarantees the child is
    // running. We still never await the BIND itself, which is the part that
    // takes seconds.
    await new Promise((resolve) => {
      child.once('spawn', resolve);
      child.once('error', resolve);
      setTimeout(resolve, 1000).unref();
    });
    child.unref();
  } catch {
    // Never let ambient memory break a tool call.
  }
}

// NO process.exit() HERE, deliberately.
//
// spawn() returns a handle synchronously but the fork itself completes on the
// event loop, so calling process.exit(0) right after — which this did — kills
// the parent before the child is actually running, and the detached worker
// never starts. MEASURED: the hook returned in 0.099s and the bind never
// happened; running the same worker in the foreground bound 202 chunks fine.
// unref() does not save you from this, it only stops the child HOLDING the
// parent open.
//
// Letting node exit on its own is both the fix and still immediate: stdin is
// consumed and the child is unref'd, so nothing is left to keep the loop alive.
main().catch(() => {});
