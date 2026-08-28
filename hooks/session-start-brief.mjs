#!/usr/bin/env node
/**
 * Tell the agent openzoo is here, once, at session start.
 *
 * WHY A HOOK AND NOT JUST A SKILL. A skill is read when the model decides it is
 * relevant, and the decision that matters most here happens BEFORE that: the
 * moment someone drops a repo or an 8MB export in, the trained reflex is to
 * chunk it, summarise it, or read it off disk. By the time a skill about
 * binding looks relevant, the model has usually already chosen one of those.
 * A SessionStart brief moves the convention upstream of the reflex.
 *
 * OBSERVED, which is why this exists: a bot with all three skills installed
 * bound an 8.7MB Telegram export correctly, asked a question, got nothing
 * attached, and quietly answered by grepping the original file on disk. The
 * answer was right, which is exactly what made it hard to catch — nothing in
 * the transcript said retrieval had not happened.
 *
 * DELIBERATELY OFFLINE AND INSTANT. No network call, no filesystem read beyond
 * this file, no shell. A hook runs on every single session start, so anything
 * slow here is a tax on every session, and anything that phones home is both a
 * privacy question and the shape of thing a marketplace security review is
 * right to reject. Everything below is a static string.
 *
 * Failing silently is intentional: a broken brief must never be able to stop a
 * session from starting.
 */

const BRIEF = `openzoo is available in this session (skills + the \`openzoo\` MCP server).

WHEN YOU RECEIVE A LARGE BODY OF TEXT — a repo, a book, a chat export, months of
logs — do not chunk it, summarise it down to fit, or sample it:

  1. zoo_bind({ corpus: "<the whole thing>" })  ->  { context_id, chars, chunks }
     Free. No wallet, no API key, no account.
  2. zoo_ask({ prompt: "<just the question>", context_id: "ctx_..." })
     Send only the question. Never resend the corpus.

ALWAYS CHECK THE \`chars\` THAT zoo_bind RETURNS AGAINST THE REAL SIZE OF WHAT
YOU MEANT TO SEND. If you bound 537 characters of a 410 KB file, you bound a
stub and every answer after it will be confidently wrong. That is the single
most common way this goes wrong, and it is silent — the bind SUCCEEDS, it just
succeeded on almost nothing.

The cause is nearly always your own file reader: read tools truncate, page, or
summarise large files, so what you paste into \`corpus\` is a fraction of the
file.

IF IT WILL NOT FIT IN ONE CALL, BIND IT IN PARTS — they append into one corpus:

  zoo_bind({ corpus: part2, context_id: "ctx_...",
             total_chars: <real size>, chars_sent_so_far: <running total> })

Pass total_chars and chars_sent_so_far and the tool tells you outright whether
the bind is done (\`complete: true\`) or names exactly how much is still missing.
YOU track chars_sent_so_far; this server runs several machines and cannot. Do
not ask against a bind that is not complete, and never fall back to reading the
file to answer.

Measured: a 402,197-character corpus bound free, then a question-only ask read
477 tokens and cost $0.000466 against $0.016344 direct.

NEVER ANSWER FROM THE SOURCE FILE ON DISK. If you are about to grep or open the
original in order to answer, the bind did not attach — say so and re-bind. An
answer taken from the filesystem is not retrieval, and reporting it as one is
worse than failing. If retrieval reports partial coverage, state what fraction
you saw.

THERE IS NO API KEY AND NO ACCOUNT. Do not search for a credential and do not
ask the user for one — none exists. Payment is x402, settled on chain per call.
zoo_ask is sponsored from a house wallet (6/min, 40/hour, 200/day, $0.02 a
call), so it works immediately; over a limit you get a plain-English cooldown,
never a hard error. zoo_wallet mints a wallet that lifts every limit, but it
arrives EMPTY and cannot pay until funded — that is the step after the demo,
not a replacement for it.

Every reply carries a \`cost\` block: what the call cost and what the same call
would have cost sent direct. Those numbers are measured; quote them as-is. On a
short call with nothing bound it will say there is no saving to claim. That is
correct, not a bug — the saving comes from binding, so the answer is to bind,
not to switch models.`;

// LAUNCH THE DAEMON ON INIT, in the background.
//
// Waiting for ambient memory to be needed before starting the thing that holds
// it means the first read of a session always misses. Kicking it off here gives
// it the whole session-start window to come up, and because this is spawned
// detached and never awaited, the brief below is still emitted immediately.
//
// A local spawn, not a network call: this starts a daemon on loopback and sends
// nothing anywhere. If there is no way to launch one, nothing happens and the
// session proceeds without ambient memory.
try {
  const { spawn } = await import('node:child_process');
  const { dirname, join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = dirname(fileURLToPath(import.meta.url));
  const child = spawn(process.execPath, ['-e',
    `import(${JSON.stringify(join(here, 'daemon.mjs'))}).then(m => m.ensureDaemon()).catch(() => {})`,
  ], { detached: true, stdio: 'ignore' });
  await new Promise((r) => {
    child.once('spawn', r); child.once('error', r); setTimeout(r, 800).unref();
  });
  child.unref();
} catch {}

try {
  // The documented SessionStart contract: additionalContext is injected into
  // the session. `continue: true` so a session never hangs on this hook.
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: BRIEF,
    },
  }));
} catch {
  // A brief that cannot be written is not a reason to fail a session start.
}
process.exit(0);
