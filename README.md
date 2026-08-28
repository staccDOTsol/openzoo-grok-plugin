# openzoo — Grok Build plugin

**Your context stops growing.** Every turn of a chat resends the whole
conversation, so a long session gets expensive for no extra work. Point your
model at the openzoo proxy and the older turns are spilled into holographic
memory before the model ever sees them — same model, same answer, a fraction of
the input.

Measured on a real growing conversation:

| conversation | sent | tokens the model billed |
|---|---|---|
| 4 turns | 22,576 B | 846 |
| 20 turns | 112,494 B | 5,287 |
| 60 turns | 336,963 B | **6,421** |

The ratio is not the point — **the curve flattening is**. From 20 to 60 turns the
transcript tripled and billed context rose **21%**. Turn 60 costs about what turn
20 costs.

Run `/openzoo:proxy` for the setup. It is four lines of config and no change to
how you work: no corpus to upload, no command to remember, nothing to think
about per turn.

> Not available inside the Grok Bot desktop/mobile app — that app runs its agent
> in a remote pod, so no local proxy can sit in front of its model calls. It
> needs a client that exposes a `base_url` (grok CLI, Claude Code, Cline, Cursor,
> aider, any OpenAI-compatible SDK). Everything else below works everywhere.

Also here: pay-per-call access to 1,100+ models with no account and no API key,
and an explicit bind/ask path for when you *do* hand over a large corpus.

## What it adds

| Component | What it does |
|---|---|
| `openzoo-bind` skill | Bind a repo/book/log dump once with `zoo_bind`, then answer from it by retrieval. **Free.** |
| `openzoo-ask` skill | Call any of 1,100+ text models through one OpenAI-compatible endpoint. Sponsored on the demo tier. |
| `openzoo-memory` skill | Durable facts that survive between sessions. **Free.** |
| `openzoo` MCP server | `https://mcp.openzoo.fun/mcp` — `zoo_models`, `zoo_quote`, `zoo_payment_tokens`, `zoo_wallet`, `zoo_bind`, `zoo_ask`. |
| `SessionStart` hook | Injects a short brief so binding is the default reflex, not something the model has to remember. Offline, no network, no shell, ~80ms. |
| `PostToolUse` hook | Binds what the agent just read into holographic memory, in a detached background process. Returns in ~0.1s; never waits for the bind. |
| `UserPromptSubmit` hook | Retrieves the relevant slice of everything read so far and injects it, so the agent stops re-reading files it has already seen. |
| `/openzoo:proxy` command | **Point a model at the proxy so the conversation stops growing.** The main event. |
| `/openzoo:bind` command | Bind a path or the conversation, then **verify `chars`** before reporting success. |
| `/openzoo:ask` command | Ask against a bind, reporting `context_id` and `tokensRead` as provenance. |
| `/openzoo:cost` command | Price a call before running it, or total what this session actually spent. |
| `corpus-analyst` agent | Interrogates a bound corpus in many cheap passes, never reading it into context. |

## What works with nothing configured

**Everything, including inference.** Install the plugin and ask a question — no
signup, no key, no wallet, no card.

- **Bind, memory, and the model catalog** are free and unauthenticated outright.
- **`zoo_ask` through the MCP server** is *sponsored*: the call is settled on
  chain from a shared house wallet we fund, so a fresh install gets real answers
  from real models on the first try. Verified on mainnet — a sponsored ask
  returns the answer and a settlement signature you can look up.

The sponsored tier is limited by **use, not by budget**: 6 calls a minute, 40 an
hour, 200 a day per client, and a $0.02 ceiling per call so it stays on cheap
models. Going over earns a cooldown that doubles per offence. There is no shared
daily pot to drain, deliberately — a global budget is a shared fate, and one
script exhausting it would break the demo for everyone else.

Every reply carries a `cost` block: what the call cost, and what the same call
would have cost sent direct.

Measured end to end on the live server: a 402,197-character corpus bound free
into 450 chunks, then a question-only ask against its `context_id` read **477
tokens** and cost **$0.000466 against $0.016344 direct — 97% less**.

### Past the demo tier

Pass a `wallet_id` from `zoo_wallet` and calls settle from **your** wallet — no
rate limit, no budget, any model in the catalog. Fund it by sending USDC, TOKEN
or LEOS to the address `zoo_wallet` gives you, or open
[chat.openzoo.fun](https://chat.openzoo.fun) and connect a Solana wallet.
Nothing is prepaid and unspent funds can be withdrawn.

## Network endpoints and credentials

Declared in full, per the marketplace security guidance:

| Endpoint | Purpose | Auth |
|---|---|---|
| `https://mcp.openzoo.fun/mcp` | The MCP server this plugin configures | None |
| `https://x402-tokens.fly.dev/v1/models` | Model catalog | None |
| `https://x402-tokens.fly.dev/v1/hrr/bind` | Bind a corpus (the `zoo_bind` tool calls this) | None |
| `https://x402-tokens.fly.dev/v1/memory/write` | Durable memory | None |
| `https://x402-tokens.fly.dev/v1/chat/completions` | Inference | x402 payment, not a key |

**This plugin needs no credentials and reads none.** There is no API key, no
account, and no token to configure. It does not read environment variables,
`.env`, `~/.ssh`, or any file on your machine.

### Ambient memory is LOCAL BY DEFAULT

Three hooks give the agent memory without it having to ask:

- `SessionStart` — prints a fixed brief. No network, no shell, no file reads.
- `PostToolUse` — binds what was just read, in a **detached background process**.
  Returns in ~0.1s and never waits for the bind.
- `UserPromptSubmit` — retrieves the relevant slice and injects it, so the agent
  stops re-reading files it has already seen. Bounded to 4s and **fails open**:
  if the daemon is slow or absent, the prompt runs with no injected context.

**The daemon ships with the plugin.** `lecore/` is the holographic-memory
service, vendored as source and pinned by the same commit SHA the marketplace
pins. The plugin starts it at session start, restarts it if it dies, and backs
off if it cannot. **Nothing is downloaded or installed at runtime** — vendored
source is reviewable in the diff; a `pip install` from a hook would not be, and
that is a distinction worth keeping.

It needs Python 3 and `numpy`, and that is the entire dependency list — verified
by running it with `torch`, `leCore` and `sentence_transformers` all absent.
Those enable an optional semantic lane; without them retrieval is lexical and
still works. No Python means no ambient memory, and the tools still work.

**The default destination is `http://127.0.0.1:8787` — that vendored daemon, on
your own machine. Nothing your agent reads leaves your computer.** Not a setting
we recommend, the default, because a plugin that silently uploads a stranger's
repo to a service they have not heard of deserves to be uninstalled.

Egress is a single explicit opt-in: set `OPENZOO_ENDPOINT` to the hosted
gateway. The injected context always states which mode it is in, so nobody has
to guess. `OPENZOO_AMBIENT=0` turns the automatic behaviour off entirely and
leaves the tools.

Inference is the one thing that always leaves your machine, and only when a
model is actually asked something — never as a side effect of opening a file. Payment, where it happens, is x402: settled on chain per request, either
from our sponsored house wallet or from a wallet you fund yourself.

The `openzoo-memory` skill writes to a service outside your machine, so it is
explicitly scoped to durable preferences and decisions, and instructs against
storing credentials or unshared personal data.

## Why it is cheaper

Large inputs are bound to holographic memory once and answered by retrieval, so
you stop paying to re-send the same context on every turn. Price is cost plus a
share of the measured saving, never above what the same call costs direct.

Every settlement is on chain and carries a leaf binding the payment to the work
it bought, so the numbers are checkable on a block explorer rather than in a
dashboard: [openzoo.fun/stats](https://openzoo.fun/stats).

## Links

- [openzoo.fun](https://openzoo.fun)
- [chat.openzoo.fun](https://chat.openzoo.fun) — live demo, connect a wallet and it runs
- Gateway: `https://x402-tokens.fly.dev`
- MCP: `https://mcp.openzoo.fun/mcp`

MIT licensed.
