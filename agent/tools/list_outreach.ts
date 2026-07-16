import { defineTool } from "eve/tools";
import { z } from "zod";
import { listOutreach } from "../../lib/outreach-store.js";

export default defineTool({
  description:
    "List contacts in the Matcha Mayhem outreach log, optionally filtered by " +
    "status. Check this before sending outreach so nobody is emailed twice, " +
    "and use it to report how the campaign is going.",
  inputSchema: z.object({
    status: z
      .enum(["planned", "contacted", "replied", "signed_up", "declined"])
      .optional()
      .describe("Only return contacts with this status."),
  }),
  async execute({ status }) {
    const entries = await listOutreach(status);
    return { count: entries.length, entries };
  },
});
