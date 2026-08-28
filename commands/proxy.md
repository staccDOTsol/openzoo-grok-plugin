---
description: Point this agent's model at the openzoo proxy so the conversation stops growing. Your context gets compressed before the model ever sees it — turn 60 costs about what turn 20 costs. No corpus, no upload, no change to how you work.
---

# Stop paying for your own transcript

Every turn of a chat resends the entire conversation. Cost climbs with length,
which is why a long session gets expensive for no extra work. This fixes that at
the wire: the proxy takes the full context, spills the older turns into
holographic memory, and forwards a compact body to the same model you were
already using.

Same model. Same answer. A fraction of the input.

**Measured on a real growing conversation:**

| conversation | sent to the proxy | tokens the model billed |
|---|---|---|
| 4 turns | 22,576 B | 846 |
| 20 turns | 112,494 B | 5,287 |
| 60 turns | 336,963 B | **6,421** |

The ratio is not the point — **the curve flattening is**. From 20 to 60 turns the
transcript tripled and the billed context rose 21%. A 60-turn history is roughly
84,000 tokens sent naively; the model saw 6,421.

## Set it up

1. **Start the proxy** (it runs on localhost, and it is what does the work):

   ```
   npx openzoo
   ```

   It prints the endpoint, normally `http://localhost:8402/v1`.

2. **Point a model at it.** For the grok CLI, add to `~/.grok/config.toml` — keep
   the upstream `model` id exactly as it is, that is the model you keep using:

   ```toml
   [model.openzoo-grok-4-6]
   model = "x-ai/grok-4.6"
   base_url = "http://localhost:8402/v1"
   api_key = "openzoo"
   name = "Grok grok-4.6 (openzoo)"

   [models]
   default = "openzoo-grok-4-6"
   ```

   Any client with an OpenAI-compatible `base_url` works the same way — Claude
   Code, Cline, Cursor, aider, a plain SDK.

3. **Use it normally.** Nothing else changes. There is no corpus to upload and
   no command to remember; the compression happens on every turn whether or not
   anyone thinks about it.

## What to tell the user honestly

- **This does not work inside the Grok Bot desktop or mobile app.** That app runs
  its agent in a remote pod, so its model calls never cross this machine and no
  local proxy can sit in front of them. It needs a client that exposes a
  `base_url`.
- Calls through the proxy are paid per request over x402 rather than against a
  subscription quota. That is usually the point — but say it, do not let someone
  discover it.
- Retrieval is a ranked selection, so a compacted turn is not the verbatim
  transcript. For most conversation this is invisible; if someone needs exact
  recall of an early turn, say that coverage was partial rather than guessing.

## Check it is actually on

Run one prompt and compare `usage.prompt_tokens` against the size of what you
sent. If the transcript is large and `prompt_tokens` is small, it is working. If
they track each other, the client is not going through the proxy — check
`base_url` and that `npx openzoo` is still running.
