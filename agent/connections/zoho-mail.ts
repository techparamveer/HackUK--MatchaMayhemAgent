import { defineMcpClientConnection } from "eve/connections";
import { once } from "eve/tools/approval";

/**
 * HackUK's Zoho Mail account, exposed through Zoho's official MCP server.
 *
 * The MCP URL is generated in the Zoho MCP console (https://mcp.zoho.com) and
 * is itself the credential — treat it like a password and keep it in
 * ZOHO_MCP_URL, never in source control.
 */
const url = process.env.ZOHO_MCP_URL;
if (!url) {
  // Fail at startup rather than mid-conversation: a placeholder URL here
  // would let the agent boot fine and then produce baffling MCP errors the
  // first time it tries to touch the inbox.
  throw new Error(
    "ZOHO_MCP_URL is not set. Create an MCP endpoint for the HackUK Zoho " +
      "Mail account in the Zoho MCP console (https://mcp.zoho.com) and put " +
      "the generated URL in .env — the URL itself is the credential, so " +
      "treat it like a password and never commit it.",
  );
}

export default defineMcpClientConnection({
  url,
  description:
    "HackUK's Zoho Mail account. Send outreach emails, read and search the " +
    "inbox, manage drafts, folders, labels and the signature. Use this for " +
    "all Matcha Mayhem outreach correspondence.",
  // Email leaves the building — a human approves the first use in a session.
  approval: once(),
});
