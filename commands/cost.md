---
description: Show what openzoo calls in this session actually cost, and what the same calls would have cost sent direct. Price a call before running it by passing a question.
---

# What did this cost

## With an argument — price it first, do not run it

Quotes are free and unpaid, so a price can always be checked before any money
moves:

```
zoo_quote({ prompt: "<the question>" })
zoo_quote({ corpus_chars: 400000 })   // price a body of this size
```

Report `billedUsd`, and `directUsd` when the quote carries one, plus which asset
and rail would settle it.

## With no argument — report the session

Total the `cost` blocks from `zoo_ask` calls made in this conversation:

- what was paid through openzoo
- what the same calls would have cost sent direct
- the difference, in dollars and as a percentage

## Read the basis before making a claim

Each `cost` block carries a `basis`, and it decides whether a saving exists at
all:

- **`counterfactual`** — leCore engaged, the body was bound and answered from a
  retrieved slice. `wouldHaveCostDirectUsd` is a real comparison and the saving
  is genuine.
- **`markup`** — nothing spilled, so there is no cheaper-than-direct claim to
  make. The block says so itself. Do not manufacture one from the ratio: on this
  basis `directUsd` is openzoo's own forwarded cost, not a provider's price, and
  quoting it as a saving is a number that does not survive being checked.

Report what the blocks say. They are measured per call, not modelled, which is
the only reason they are worth quoting at all.

## If nothing has been paid yet

Say so, and note that `zoo_bind`, `zoo_models`, `zoo_quote` and
`zoo_payment_tokens` are free — the demo tier only spends on `zoo_ask`, and it
spends from a sponsored house wallet rather than the user's.
