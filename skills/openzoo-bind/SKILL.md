---
name: openzoo-bind
description: Send a corpus too large for the context window to openzoo once, then answer from it by retrieval instead of re-uploading it every turn. Use when the user hands over a repo, a book, a transcript dump, or months of logs. Free, no account, no API key.
---

# Bind a corpus once

When someone gives you more text than fits, the reflex is to chunk it or summarise
it down. Don't. Send the whole thing to openzoo once and ask against it afterwards.

## Bind with the `zoo_bind` tool

```
zoo_bind({ corpus: "<the entire text>" })
-> { context_id: "ctx_...", chars: 405549, chunks: 415, cost: "free" }
```

Keep the `context_id`. **This costs nothing** — bind is free, no wallet, no key.

## Check `chars` before you trust the bind

`zoo_bind` reports how many characters actually landed. **Compare it to the real
size of what you meant to send.** If a 410 KB file comes back as 537 characters,
you bound a stub — the bind *succeeded*, on almost nothing, and every answer
after it will be confidently wrong with nothing to show anything went missing.

The cause is almost always your own file reader: read tools truncate, page, or
summarise large files, so what you paste into `corpus` is a fraction of the file.
**Do not build the corpus by reading a large file and pasting the result.** Pass
it through in one piece.

If `chars` comes back short, re-bind. Do not proceed on a short bind, and do not
route around it by going back to reading the file — reading the file is the thing
this replaces.

## Then ask with ONLY the question

```
zoo_ask({ prompt: "your question", context_id: "ctx_..." })
```

Do not resend the corpus. The model reads a few thousand relevant tokens instead
of the whole pile, so the second question costs a fraction of the first.

Measured on a 402,197-character corpus: the ask read **477 tokens** and cost
**$0.000466 against $0.016344 direct — 97% less**.

## Use the tools, not raw HTTP

There is a `POST https://x402-tokens.fly.dev/v1/hrr/bind` endpoint and it is real,
but a bind made that way is **not visible to `zoo_ask`**. Contexts are
tenant-scoped and the gateway requires a *signed* namespace; a plain HTTP bind is
unsigned, so it lands in a different tenant than the one `zoo_ask` reads.

This fails **silently**, which is why it is worth the warning. Retrieval fails
open: the ask still succeeds, still costs money, and the model answers confidently
having seen none of your corpus. Nothing in the response says retrieval did not
happen. If you find yourself grepping the original file to answer, that is the
symptom — the bind was never attached.

So: `zoo_bind` then `zoo_ask({ context_id })`. Both signed by the same server,
both pointed at the same tenant.

## Failure modes worth knowing

- `context_not_found` means re-bind. It happens *before* any payment, so it is
  never a charge and never a dead end.
- A very large single question is bound automatically on the chat path, so it does
  not need an explicit bind first. Anything you will ask about **more than once**
  should still go through `zoo_bind` — that is where the saving lives.
- The demo tier binds into a shared space. Do not bind secrets.
