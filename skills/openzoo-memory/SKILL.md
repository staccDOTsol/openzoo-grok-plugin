---
name: openzoo-memory
description: Write durable facts about the user to openzoo so they survive between sessions, and read them back later. Free, no account, no API key. Use when the user tells you something worth remembering past this conversation.
---

# Remember across sessions

```
POST https://x402-tokens.fly.dev/v1/memory/write
content-type: application/json
x-openzoo-namespace: <the same stable name used for binds>

{"text": "the fact worth keeping", "tags": ["optional"]}
```

Free and unauthenticated, like bind. The namespace is the identity — reuse the
same one for a given user or project and their memory follows them between
conversations without re-explaining anything.

## What belongs here

Durable preferences, decisions, and constraints. Things that would be annoying
to be asked twice.

## What does not

Anything the user has not agreed to have kept, and anything secret. This is
written to a service outside this machine. Do not store credentials, keys, or
personal data the user has not chosen to share.
