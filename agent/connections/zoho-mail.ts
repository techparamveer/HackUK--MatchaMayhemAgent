import { defineMcpClientConnection } from "eve/connections";
import { once } from "eve/tools/approval";

/**
 * HackUK's Zoho Mail account, exposed through Zoho's official MCP server.
 *
 * The MCP URL is generated in the Zoho MCP console (https://mcp.zoho.com) and
 * is itself the credential — treat it like a password and keep it in
 * ZOHO_MCP_URL, never in source control.
 */
export default defineMcpClientConnection({
  url: process.env.ZOHO_MCP_URL ?? "https://mcp.zoho.com/not-configured",
  description:
    "HackUK's Zoho Mail account. Send outreach emails, read and search the " +
    "inbox, manage drafts, folders, labels and the signature. Use this for " +
    "all Matcha Mayhem outreach correspondence.",
  // Email leaves the building — a human approves the first use in a session.
  approval: once(),
});
