# Matcha Mayhem Outreach Agent 🍵

HackUK's outreach agent for **Matcha Mayhem** — the free, beginner-friendly
programme where young people build their first personal website, learn Git and
GitHub along the way, and earn free matcha when they ship it. The programme
runs online, with an in-person mini hack too.

The agent drafts and sends outreach emails through HackUK's **Zoho Mail**
account, answers questions about the programme, and keeps an outreach log so
nobody is ever contacted twice. It is built on [eve](https://vercel.com/docs/eve),
Vercel's filesystem-first framework for durable agents — but it deliberately
does **not** use the Vercel AI Gateway.

## How the model is served

Model calls run off your own credentials, selected with `MODEL_BACKEND`:

| Backend | Billed to | How it works | eve tools |
| --- | --- | --- | --- |
| `local` *(default)* | Your own local endpoint | `@ai-sdk/openai-compatible` pointed at `LOCAL_ENDPOINT_URL` — any OpenAI-compatible server, e.g. a claude-code-router or LiteLLM bridge running off your Claude Code / Codex subscription, or Ollama / LM Studio | ✅ Full support — Zoho connection, outreach log, approvals (endpoint must support tool calling) |
| `codex` | ChatGPT subscription | eve's `experimental_chatgpt()` uses the local `codex login` credentials | ✅ Full support — Zoho connection, outreach log, approvals |
| `claude-code` | Claude subscription | [`ai-sdk-provider-claude-code`](https://github.com/ben-vargas/ai-sdk-provider-claude-code) drives the `claude` CLI | ⚠️ The Claude Code harness executes tools itself, so eve-authored tools are not visible to the model; the Zoho Mail MCP server is handed straight to the harness instead |
| `anthropic` | Your own endpoint/key | `@ai-sdk/anthropic` pointed at `ANTHROPIC_BASE_URL` (defaults to api.anthropic.com) | ✅ Full support |

The `codex` and `claude-code` backends read local CLI logins, so they work in
local development and on any machine where you have signed in — they will not
work on a stateless deployment. For deployed environments use the `anthropic`
backend with your own endpoint.

## Setup

1. **Install dependencies** (Node 24+):

   ```bash
   npm install
   ```

2. **Point at a model.** For the default `local` backend, start your own
   OpenAI-compatible endpoint (a claude-code-router / LiteLLM bridge over your
   Claude Code or Codex subscription, or Ollama / LM Studio) and set
   `LOCAL_ENDPOINT_URL`. For the subscription backends, sign in instead:

   ```bash
   codex login        # for MODEL_BACKEND=codex
   claude             # for MODEL_BACKEND=claude-code (sign in once)
   ```

3. **Connect Zoho Mail.** In the [Zoho MCP console](https://mcp.zoho.com),
   create an MCP endpoint for the HackUK Zoho Mail account and copy the URL it
   generates. The URL itself is the credential — treat it like a password.

4. **Configure the environment:**

   ```bash
   cp .env.example .env
   # then set ZOHO_MCP_URL (and MODEL_BACKEND / MODEL_ID if you like)
   ```

## Run it

```bash
npm run dev
```

This starts eve's local runtime with the interactive terminal UI — type a
message to talk to the agent. Prefer HTTP? Every eve app exposes the same API:

```bash
# start a session
curl -X POST http://127.0.0.1:3000/eve/v1/session \
  -H 'content-type: application/json' \
  -d '{"message":"Draft an outreach email to a sixth-form computing teacher."}'

# stream it (session id comes back in the x-eve-session-id header)
curl http://127.0.0.1:3000/eve/v1/session/<sessionId>/stream
```

Sending email is gated behind human approval by design: the first Zoho Mail
tool use in a session pauses and asks before anything leaves the building.

## Project layout

```
agent/
  agent.ts                   # model backend switch (no AI Gateway)
  instructions.md            # the outreach persona — British English throughout
  channels/eve.ts            # built-in HTTP channel + auth
  connections/zoho_mail.ts   # Zoho Mail via Zoho's official MCP server
  skills/email_templates.md  # house email templates the model loads on demand
  tools/log_outreach.ts      # record every contact in the outreach log
  tools/list_outreach.ts     # check the log before emailing anyone
lib/outreach-store.ts        # JSON-backed store at data/outreach.json (gitignored)
docs/mini-hack-venues.md     # café shortlist for the in-person mini hack
```

The full eve docs are bundled at `node_modules/eve/docs/` once installed.

## House style

Everything the agent writes — emails, replies, reports — is in **British
English**, in a warm, no-pressure tone suitable for an audience of 16–18 year
olds and their teachers.
