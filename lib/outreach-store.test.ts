import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";

// The store resolves its path from process.cwd() at import time, so point
// cwd at a scratch directory before importing it. Each test file runs in its
// own process, so this cannot leak into other tests.
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "outreach-store-"));
process.chdir(scratch);

const { listOutreach, upsertOutreach } = await import("./outreach-store.ts");

const STORE_PATH = path.join(scratch, "data", "outreach.json");

beforeEach(async () => {
  await fs.rm(path.dirname(STORE_PATH), { recursive: true, force: true });
});

describe("listOutreach", () => {
  it("returns an empty list when no log exists yet", async () => {
    assert.deepEqual(await listOutreach(), []);
  });

  it("filters by status", async () => {
    await upsertOutreach({ name: "Ada Lovelace", status: "contacted" });
    await upsertOutreach({ name: "Alan Turing", status: "replied" });

    const replied = await listOutreach("replied");
    assert.equal(replied.length, 1);
    assert.equal(replied[0]?.name, "Alan Turing");
  });

  it("refuses to treat a corrupt log as empty", async () => {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, "{ not json", "utf8");

    await assert.rejects(listOutreach(), /not valid JSON/);
    // The corrupt file must survive untouched for manual recovery.
    assert.equal(await fs.readFile(STORE_PATH, "utf8"), "{ not json");
  });

  it("refuses a log that is valid JSON but not an array", async () => {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, '{"entries": []}', "utf8");

    await assert.rejects(listOutreach(), /JSON array/);
  });
});

describe("upsertOutreach", () => {
  it("creates a new entry with timestamps and an id", async () => {
    const entry = await upsertOutreach({
      name: "Ada Lovelace",
      email: "ada@school.ac.uk",
      organisation: "Analytical Sixth Form",
      status: "planned",
    });

    assert.ok(entry.id);
    assert.ok(entry.createdAt);
    assert.equal(entry.lastContactedAt, undefined);
    assert.equal((await listOutreach()).length, 1);
  });

  it("matches by email case-insensitively and updates in place", async () => {
    await upsertOutreach({
      name: "Ada Lovelace",
      email: "ada@school.ac.uk",
      status: "contacted",
      notes: "first email sent",
    });
    await upsertOutreach({
      name: "Ada Lovelace",
      email: "ADA@SCHOOL.AC.UK",
      status: "replied",
      notes: "replied, keen",
    });

    const entries = await listOutreach();
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.status, "replied");
    assert.equal(entries[0]?.notes, "first email sent\nreplied, keen");
  });

  it("keeps two same-named contacts at different organisations apart", async () => {
    await upsertOutreach({
      name: "Sarah Jones",
      organisation: "Northfield College",
      status: "contacted",
    });
    await upsertOutreach({
      name: "Sarah Jones",
      organisation: "Riverside Academy",
      status: "contacted",
    });

    assert.equal((await listOutreach()).length, 2);
  });

  it("keeps two different email addresses apart even with the same name", async () => {
    await upsertOutreach({
      name: "Sam Patel",
      email: "sam@one.ac.uk",
      status: "contacted",
    });
    await upsertOutreach({
      name: "Sam Patel",
      email: "sam@two.ac.uk",
      status: "contacted",
    });

    assert.equal((await listOutreach()).length, 2);
  });

  it("fills in the email when a name-and-organisation match gains one", async () => {
    await upsertOutreach({
      name: "Priya Shah",
      organisation: "Codebar Leeds",
      status: "planned",
    });
    await upsertOutreach({
      name: "Priya Shah",
      organisation: "Codebar Leeds",
      email: "priya@codebar.example",
      status: "contacted",
    });

    const entries = await listOutreach();
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.email, "priya@codebar.example");
  });

  it("records lastContactedAt only when contactedNow is set", async () => {
    await upsertOutreach({
      name: "Ada Lovelace",
      status: "planned",
    });
    let [entry] = await listOutreach();
    assert.equal(entry?.lastContactedAt, undefined);

    await upsertOutreach({
      name: "Ada Lovelace",
      status: "contacted",
      contactedNow: true,
    });
    [entry] = await listOutreach();
    assert.ok(entry?.lastContactedAt);
  });
});
