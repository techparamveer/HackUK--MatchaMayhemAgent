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
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as OutreachEntry[];
  } catch {
    return [];
  }
}

async function save(entries: OutreachEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(entries, null, 2), "utf8");
}

export async function listOutreach(
  status?: OutreachStatus,
): Promise<OutreachEntry[]> {
  const entries = await load();
  return status ? entries.filter((e) => e.status === status) : entries;
}

/**
 * Create or update an outreach entry. Matches an existing entry by email
 * first (case-insensitive), then by name, so the same contact is never
 * recorded twice.
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
      return e.email.toLowerCase() === input.email.toLowerCase();
    }
    return e.name.toLowerCase() === input.name.toLowerCase();
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
