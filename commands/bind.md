---
description: Bind a file, directory, or pasted text to openzoo once so later questions answer from retrieval instead of re-reading it. Pass a path, or nothing to bind what is already in the conversation. Free.
---

# Bind a corpus

Bind the target to openzoo so every later question costs a fraction of sending
it again. Bind is free — no wallet, no API key, no account.

## What to bind

- **A path was given** — read that file or directory and bind its contents.
- **No argument** — bind the largest body of text already in this conversation
  (a pasted dump, an attached file, a tool result).

For a directory, concatenate the text files with a `### <relative path>` header
before each one, so the model can say which file an answer came from. Skip
`node_modules`, `.git`, build output, lockfiles, and binaries — they are large
and carry nothing worth asking about.

## Bind it

```
zoo_bind({ corpus: "<the entire text>" })
-> { context_id: "ctx_...", chars: 405549, chunks: 415 }
```

## Then VERIFY, before reporting success

**Compare the returned `chars` to the real size of the target.** This is not
optional and it is the whole reason this command exists as a command.

A short bind SUCCEEDS. It returns a valid `context_id` and a cheerful chunk
count, and every answer built on it afterwards is confidently wrong with nothing
to indicate anything is missing. Observed in the wild: a 410 KB pile bound as
**537 characters**, three times in a row, costing half an hour before anyone
looked at the number.

The cause is almost always the file reader, not openzoo: read tools truncate,
page, and summarise large files, so what reaches `corpus` is a fraction of the
file. If `chars` is materially below the real size:

1. Say so plainly. Do not report a successful bind.
2. Re-read the source in one piece and bind again.
3. Do **not** fall back to answering from the file on disk. That is the thing
   this replaces, and an answer sourced that way is not retrieval.

## Report

State the `context_id`, `chars`, `chunks`, and the size of what you intended to
bind, so the comparison is visible rather than asserted. Then tell the user they
can ask against it with `/openzoo:ask` or by passing `context_id` to `zoo_ask`,
and that the corpus never needs sending again.

Note that demo-tier binds land in a shared space, so nothing private should go
in one.
