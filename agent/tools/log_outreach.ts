import { defineTool } from "eve/tools";
import { z } from "zod";
import { upsertOutreach } from "../../lib/outreach-store.js";

export default defineTool({
  description:
    "Record or update an outreach contact in the Matcha Mayhem outreach log. " +
    "Call this after every email you send or reply you receive, so the team " +
    "never contacts the same person twice by mistake. Matches existing " +
    "entries by email address, then by name.",
  inputSchema: z.object({
    name: z.string().min(1).describe("Person or organisation contacted."),
    // Deliberately not z.email(): its generated JSON-Schema pattern uses
    // regex lookaround, which some model backends reject outright.
    email: z.string().optional().describe("Their email address."),
    organisation: z
      .string()
      .optional()
      .describe("School, university, society or company they belong to."),
    status: z
      .enum(["planned", "contacted", "replied", "signed_up", "declined"])
      .describe("Where this contact currently sits in the outreach funnel."),
    notes: z
      .string()
      .optional()
      .describe("Short note, e.g. what was sent or what they said."),
    contactedNow: z
      .boolean()
      .optional()
      .describe("Set true when an email has just been sent to them."),
  }),
  async execute(input) {
    return await upsertOutreach(input);
  },
});
