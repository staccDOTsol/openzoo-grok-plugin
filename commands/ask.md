---
description: Ask a question against a bound corpus, or route one question to a different model. Pass the question; add a model id to send it elsewhere. Sponsored, so it works with no wallet.
---

# Ask through openzoo

Answer the user's question using `zoo_ask`, and be explicit about where the
answer came from.

## Pick the call

**If a corpus is bound in this session**, pass its `context_id` and send **only
the question**:

```
zoo_ask({ prompt: "<the question>", context_id: "ctx_..." })
```

Never resend the corpus. That is the entire saving — a question-only ask against
a 402,197-character bind read 477 tokens and cost $0.000466 against $0.016344
sending the same call direct.

**If nothing is bound and the user handed over something large**, bind it first
with `/openzoo:bind`. Do not stuff a large body inline when it will be asked
about more than once.

**If the user named a model**, pass it as `model`. `zoo_models` lists what is
served with live pricing; an unknown id snaps to the nearest match rather than
erroring.

## Report the provenance, every time

State which `context_id` was used and the `tokensRead` from the call. Those two
facts are what let anyone tell a retrieved answer from a hallucinated one, and
they cost nothing to include.

- **`tokensRead` is small relative to the bind** — normal. That is retrieval
  working: a slice, not the whole pile.
- **The answer came back blank** — say the answer was blank and report
  `tokensRead`. Do not silently retry and present the second result as if it
  were the first.
- **Retrieval reported partial coverage** — say what fraction was seen.
- **You are tempted to open the source file** — stop. The bind did not attach.
  Say so and re-bind. An answer taken off disk is not retrieval and must never
  be presented as one.

## Report the cost

Every reply carries a `cost` block: what the call cost and what the same call
would have cost sent direct. Quote those numbers as-is; they are measured, not
estimated.

On a short call with nothing bound it will say there is no cheaper-than-direct
claim to make. That is correct rather than a failure — the saving comes from
binding, so the answer is to bind something, not to change models.
