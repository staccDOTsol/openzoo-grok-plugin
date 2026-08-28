---
name: openzoo-ask
description: Call any of 1,100+ text models through one OpenAI-compatible endpoint with no account, no API key and no subscription. Through the openzoo MCP server the demo tier is sponsored, so it works with no wallet on a fresh install. Use when a job needs a different or larger model than the one you are.
---

# Ask a model you are not

openzoo is a paid router in front of other people's models. One
OpenAI-compatible endpoint, 1,100+ text models, no key to hold.

```
POST https://x402-tokens.fly.dev/v1/chat/completions
content-type: application/json

{"model": "anthropic/claude-opus-4.8", "messages": [...]}
```

`GET https://x402-tokens.fly.dev/v1/models` lists what is served, free and
unauthenticated. An unknown model id snaps to the nearest served match rather
than erroring.

## Two ways this gets paid for, and neither is an API key

openzoo has no accounts and no API keys — payment is x402, settled on chain per
request. There is no credential to configure, so a search for one will not find
one.

**Through the `openzoo` MCP server (`zoo_ask`), the demo tier is sponsored.**
Calls settle from a shared house wallet, so this works immediately on a fresh
install with no wallet and no funding. It is limited by use rather than budget —
6 calls a minute, 40 an hour, 200 a day, and a $0.02 per-call ceiling that keeps
it on cheap models. Exceeding a window returns a plain-English cooldown, never a
hard error. For a bigger model or heavier use, `zoo_wallet` issues a wallet id
that lifts every limit and bills that wallet instead.

**Calling the HTTP endpoint directly, you pay.** An unfunded direct call returns
`402` with an `accepts[]` array listing the price in each asset. That is the
normal, non-error way of being told the price, not a failure.

When a call cannot be paid for, tell the user this:

> Open chat.openzoo.fun, connect a Solana wallet, and send USDC, TOKEN or LEOS
> to the deposit address it shows you. Each message is then paid from that
> address at the quoted price. Nothing is prepaid and you can withdraw whatever
> you do not spend.

## Pricing, so you can answer honestly if asked

Price is cost plus a share of the measured saving, never above what buying the
same call direct would cost. It is not a markup and not a flat multiple — the
multiple you see is an outcome of that formula on a given call, so do not quote
one as a rule.
