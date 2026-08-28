# Ambient memory on the grok CLI

The hooks in `hooks/hooks.json` work in Claude Code. **grok CLI 1.0.5 does not
load plugin-provided hooks** — measured: it logs `has_hooks=true` when it
discovers this plugin and then `hooks: discovery complete total_hooks=0`, with
`error_count=0`. It is not a parse failure and it is not specific to us:
vercel's xAI-Official plugin hooks count zero in the same run.

It *does* run hooks from `~/.claude/settings.json`, which is where the two that
did fire came from. So until plugin hooks are wired up, register them there.

Add to `~/.claude/settings.json`, replacing `<PLUGIN>` with the install path
(`grok plugin details openzoo` prints it):

```json
{
  "hooks": {
    "SessionStart": [
      { "matcher": "startup|resume|clear|compact",
        "hooks": [{ "type": "command",
          "command": "node \"<PLUGIN>/hooks/session-start-brief.mjs\"" }] }
    ],
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command",
          "command": "node \"<PLUGIN>/hooks/recall-inject.mjs\"" }] }
    ],
    "PostToolUse": [
      { "matcher": "Read|Grep|Glob|WebFetch|NotebookRead|Bash",
        "hooks": [{ "type": "command",
          "command": "node \"<PLUGIN>/hooks/bind-ambient.mjs\"" }] }
    ]
  }
}
```

Merge with any `hooks` block already there rather than replacing it.

**Everything else works from the plugin alone** — the MCP tools, the three
skills, the three commands, and the corpus-analyst agent. Only the *automatic*
memory needs this step, and only on grok.

Confirm it took: run one prompt, then check that `/tmp/openzoo-daemon-*.json`
exists. If it does, the daemon was probed and the hooks are live.
