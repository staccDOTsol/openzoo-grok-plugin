# openzoo — Grok Build plugin

Pay-per-call access to 400+ models with **no account and no API key**, plus
holographic memory: bind a corpus once and stop re-sending it every turn.

```
grok plugin install staccDOTsol/openzoo-grok-plugin
```

## What it adds

| Component | What it does |
|---|---|
| `openzoo-bind` skill | Send a repo/book/log dump to openzoo once, then answer from it by retrieval. **Free.** |
| `openzoo-ask` skill | Call any of 400+ models through one OpenAI-compatible endpoint. Paid per request. |
| `openzoo-memory` skill | Durable facts that survive between sessions. **Free.** |
| `openzoo` MCP server | `https://mcp.openzoo.fun/mcp` — `zoo_models`, `zoo_quote`, `zoo_payment_tokens`, `zoo_wallet`, `zoo_ask`. |

## What works with nothing configured

Bind, memory, and the model catalog are free and unauthenticated. Install the
plugin and they work immediately — no signup, no key, no wallet.

Inference costs money. An unfunded call returns `402` with the price in each
accepted asset. To fund it, open [chat.openzoo.fun](https://chat.openzoo.fun),
connect a Solana wallet, and send USDC, TOKEN or LEOS to the deposit address it
shows you. Each call is then settled on chain from that address at the quoted
price. Nothing is prepaid and unspent funds can be withdrawn.

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
