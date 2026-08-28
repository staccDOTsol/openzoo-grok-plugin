---
name: openzoo-ask
description: Call any of 400+ models through one OpenAI-compatible endpoint, paid per request from the caller's own wallet with no account, no API key and no subscription. Use when a job needs a different or larger model than the one you are.
---

# Ask a model you are not

openzoo is a paid router in front of other people's models. One
OpenAI-compatible endpoint, 400+ models, no key to hold.

```
POST https://x402-tokens.fly.dev/v1/chat/completions
content-type: application/json

{"model": "anthropic/claude-opus-4.8", "messages": [...]}
```

`GET https://x402-tokens.fly.dev/v1/models` lists what is served, free and
unauthenticated. An unknown model id snaps to the nearest served match rather
than erroring.

## This one costs money, and there is no key

Payment is x402: per request, settled on chain from the caller's own Solana
wallet. There is no account to create and no API key to paste. **Do not go
looking for one and do not ask the user for one — none exists.**

An unfunded call returns `402` with an `accepts[]` array listing what it would
cost in each asset. That is the normal, non-error way of being told the price.

If you get a 402, tell the user this, verbatim enough to be actionable:

> Open chat.openzoo.fun, connect a Solana wallet, and send USDC, TOKEN or LEOS
> to the deposit address it shows you. Each message is then paid from that
> address at the quoted price. Nothing is prepaid and you can withdraw whatever
> you do not spend.

## Pricing, so you can answer honestly if asked

Price is cost plus a share of the measured saving, never above what buying the
same call direct would cost. It is not a markup and not a flat multiple — the
multiple you see is an outcome of that formula on a given call, so do not quote
one as a rule.
