import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { claudeCode } from "ai-sdk-provider-claude-code";
import type { LanguageModel } from "ai";
import { defineAgent } from "eve";
import { experimental_chatgpt } from "eve/models/openai";

/**
 * Model backend selection — deliberately NOT the Vercel AI Gateway.
 *
 * MODEL_BACKEND:
 *   "local"       — your own endpoint: any OpenAI-compatible base
 *                  URL (LOCAL_ENDPOINT_URL), e.g. a claude-code-router or
 *                  LiteLLM bridge running off your Claude Code or Codex
 *                  subscription, or Ollama/LM Studio. Full eve tool support.
 *   "codex"       — bills the local ChatGPT subscription through the
 *                  `codex login` credentials on this machine. Full eve tool
 *                  support, including the Zoho Mail connection.
 *   "claude-code" — bills the local Claude subscription through the `claude`
 *                  CLI. The Claude Code harness executes tools itself, so
 *                  eve-authored tools are not visible on this backend; the
 *                  Zoho Mail MCP server is passed straight to the harness
 *                  instead (set ZOHO_MCP_URL).
 *   "anthropic"   — direct Anthropic Messages API against your own endpoint.
 *                  Set ANTHROPIC_BASE_URL (optional) and ANTHROPIC_API_KEY.
 *
 * When MODEL_BACKEND is not set, "local" is used if LOCAL_ENDPOINT_URL is
 * configured, falling back to "codex" so a bare checkout still builds.
 */
const backend =
  process.env.MODEL_BACKEND ??
  (process.env.LOCAL_ENDPOINT_URL ? "local" : "codex");

function pickModel(): LanguageModel {
  switch (backend) {
    case "local": {
      const url = process.env.LOCAL_ENDPOINT_URL;
      if (!url) {
        throw new Error(
          'MODEL_BACKEND=local needs LOCAL_ENDPOINT_URL — an OpenAI-compatible ' +
            'base URL such as http://localhost:4000/v1. Alternatively set ' +
            'MODEL_BACKEND to "codex", "claude-code" or "anthropic".',
        );
      }
      const local = createOpenAICompatible({
        name: "local-endpoint",
        baseURL: url,
        ...(process.env.LOCAL_ENDPOINT_API_KEY
          ? { apiKey: process.env.LOCAL_ENDPOINT_API_KEY }
          : {}),
      });
      return local(process.env.MODEL_ID ?? "default");
    }

    case "codex":
      return experimental_chatgpt(process.env.MODEL_ID);

    case "claude-code": {
      const zohoUrl = process.env.ZOHO_MCP_URL;
      return claudeCode(process.env.MODEL_ID ?? "sonnet", {
        ...(zohoUrl
          ? {
              mcpServers: {
                zoho_mail: { type: "http" as const, url: zohoUrl },
              },
              allowedTools: ["mcp__zoho_mail"],
            }
          : {}),
      });
    }

    case "anthropic": {
      const anthropic = createAnthropic({
        baseURL: process.env.ANTHROPIC_BASE_URL,
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(process.env.MODEL_ID ?? "claude-sonnet-4-6");
    }

    default:
      throw new Error(
        `Unknown MODEL_BACKEND "${backend}". Use "local", "codex", "claude-code" or "anthropic".`,
      );
  }
}

export default defineAgent({
  model: pickModel(),
  // Subscription-backed models carry no AI Gateway metadata, so the context
  // window must be declared explicitly.
  modelContextWindowTokens: Number(
    process.env.MODEL_CONTEXT_WINDOW_TOKENS ?? 200_000,
  ),
});
