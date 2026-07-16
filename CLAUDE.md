# Matcha Mayhem Outreach Agent

HackUK's outreach agent for the Matcha Mayhem programme, built on eve
(`node_modules/eve/docs/` has the full framework docs).

- **British English everywhere** — code comments, docs, and everything the
  agent itself writes.
- The model must **never route through the Vercel AI Gateway**. Backends are
  switched with `MODEL_BACKEND` in `agent/agent.ts`: `local` (default — own
  OpenAI-compatible endpoint at `LOCAL_ENDPOINT_URL`), `codex` (ChatGPT
  subscription via local `codex login`), `claude-code` (Claude subscription
  via the `claude` CLI), or `anthropic` (own endpoint via
  `ANTHROPIC_BASE_URL`).
- Zoho Mail is wired through Zoho's official MCP server; the secret MCP URL
  lives in `ZOHO_MCP_URL` (never commit it).
- `npm run dev` starts the eve dev TUI; `npm run typecheck` runs tsc.
- Tool filenames under `agent/tools/` are the model-facing tool names
  (snake_case).
