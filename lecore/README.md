# Vendored leCore daemon

The local holographic-memory service the plugin's ambient hooks talk to. It is
**source, vendored here and pinned by the marketplace SHA** — the plugin never
downloads or installs anything at runtime.

- **Requires:** Python 3 and `numpy`. That is the whole list.
- **Optional:** `onnxruntime` / `torch` enable the semantic retrieval lane.
  Without them retrieval is lexical, which is the mode this was measured in.
- **Listens on** `127.0.0.1:8787` (`HRR_PORT`), **stores under**
  `~/.openzoo/lecore-memory` (`HRR_DATA_DIR`), **loopback only.**

Nothing here makes an outbound network call. It is a local store the agent
writes to and reads from; the only traffic is from your own machine to itself.

MIT, same as the plugin.
