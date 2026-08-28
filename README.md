# openzoo — Grok Build plugin

Pay-per-call access to 1,100+ models with **no account and no API key**, plus
holographic memory: bind a corpus once and stop re-sending it every turn.

```
grok plugin install staccDOTsol/openzoo-grok-plugin
```

Ask it something straight after install. It answers — the demo tier is
sponsored, so there is nothing to set up first.

## What it adds

| Component | What it does |
|---|---|
| `openzoo-bind` skill | Bind a repo/book/log dump once with `zoo_bind`, then answer from it by retrieval. **Free.** |
| `openzoo-ask` skill | Call any of 1,100+ text models through one OpenAI-compatible endpoint. Sponsored on the demo tier. |
| `openzoo-memory` skill | Durable facts that survive between sessions. **Free.** |
| `openzoo` MCP server | `https://mcp.openzoo.fun/mcp` — `zoo_models`, `zoo_quote`, `zoo_payment_tokens`, `zoo_wallet`, `zoo_bind`, `zoo_ask`. |
| `SessionStart` hook | Injects a short brief so binding is the default reflex, not something the model has to remember. Offline, no network, no shell, ~80ms. |
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

It ships **one hook**: a `SessionStart` brief (`hooks/session-start-brief.mjs`)
that prints a fixed string telling the agent to bind large bodies rather than
chunk them or read them off disk. It makes no network call, spawns no shell,
reads no file, and takes about 80ms. The entire payload is a string literal in
that file — read it, it is short. It exists because a bot with these skills
installed still answered from a grep of the original file instead of from
retrieval, and nothing in the transcript said so. Payment, where it happens, is x402: settled on chain per request, either
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
