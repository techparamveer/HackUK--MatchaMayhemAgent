import { promises as fs } from "node:fs";
import path from "node:path";

export type OutreachStatus =
  | "planned"
  | "contacted"
  | "replied"
  | "signed_up"
  | "declined";

export interface OutreachEntry {
  id: string;
  /** Person or organisation the outreach is aimed at. */
  name: string;
  email?: string;
  organisation?: string;
  status: OutreachStatus;
  notes?: string;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const STORE_PATH = path.join(process.cwd(), "data", "outreach.json");

async function load(): Promise<OutreachEntry[]> {
  let raw: string;
  try {
    raw = await fs.readFile(STORE_PATH, "utf8");
  } catch (error) {
    // A missing file just means no outreach yet. Anything else (permissions,
    // I/O) must not be mistaken for an empty log, or the next save would
    // silently wipe it.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `The outreach log at ${STORE_PATH} is not valid JSON. Refusing to ` +
        "continue so the existing data is not overwritten — fix or move the " +
        "file, then try again.",
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error(
      `The outreach log at ${STORE_PATH} should contain a JSON array. ` +
        "Refusing to continue so the existing data is not overwritten.",
    );
  }
  return parsed as OutreachEntry[];
}

async function save(entries: OutreachEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  // Write-then-rename so a crash mid-write can never truncate the log.
  const tmpPath = `${STORE_PATH}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(entries, null, 2), "utf8");
  await fs.rename(tmpPath, STORE_PATH);
}

export async function listOutreach(
  status?: OutreachStatus,
): Promise<OutreachEntry[]> {
  const entries = await load();
  return status ? entries.filter((e) => e.status === status) : entries;
}

const fold = (value?: string) => (value ?? "").trim().toLowerCase();

/**
 * Create or update an outreach entry. Matches an existing entry by email
 * when both sides have one (case-insensitive); otherwise by name *and*
 * organisation, so two different Sarahs at two different schools never
 * collapse into one record.
 */
export async function upsertOutreach(input: {
  name: string;
  email?: string;
  organisation?: string;
  status: OutreachStatus;
  notes?: string;
  contactedNow?: boolean;
}): Promise<OutreachEntry> {
  const entries = await load();
  const now = new Date().toISOString();

  const existing = entries.find((e) => {
    if (input.email && e.email) {
      return fold(e.email) === fold(input.email);
    }
    return (
      fold(e.name) === fold(input.name) &&
      fold(e.organisation) === fold(input.organisation)
    );
  });

  if (existing) {
    existing.name = input.name;
    existing.email = input.email ?? existing.email;
    existing.organisation = input.organisation ?? existing.organisation;
    existing.status = input.status;
    if (input.notes) {
      existing.notes = existing.notes
        ? `${existing.notes}\n${input.notes}`
        : input.notes;
    }
    if (input.contactedNow) existing.lastContactedAt = now;
    existing.updatedAt = now;
    await save(entries);
    return existing;
  }

  const entry: OutreachEntry = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    organisation: input.organisation,
    status: input.status,
    notes: input.notes,
    lastContactedAt: input.contactedNow ? now : undefined,
    createdAt: now,
    updatedAt: now,
  };
  entries.push(entry);
  await save(entries);
  return entry;
}
