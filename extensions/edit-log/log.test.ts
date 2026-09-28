import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { last, openLog, record, sha } from "./log.ts";

const scratch = resolve(import.meta.dirname, "../../artifacts/brayness");

test("the newest edit to a path wins; other paths stay apart", () => {
	const dir = mkdtempSync(join(scratch, "edit-log-"));
	try {
		const db = openLog(join(dir, "edits.db"));
		const base = { session: "s.jsonl", tool: "edit", ts: "2026-09-27T00:00:00Z" };
		record(db, { ...base, path: "/h/a.md", sha: sha(Buffer.from("one")), turn: 1, tool_call: "t1" });
		record(db, { ...base, path: "/h/a.md", sha: sha(Buffer.from("two")), turn: 2, tool_call: "t2" });
		record(db, { ...base, path: "/h/b.md", sha: null, turn: 3, tool_call: "t3" });
		assert.equal(last(db, "/h/a.md")?.sha, sha(Buffer.from("two")));
		assert.equal(last(db, "/h/a.md")?.turn, 2);
		assert.equal(last(db, "/h/b.md")?.sha, null);
		assert.equal(last(db, "/h/c.md"), undefined);
		db.close();
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("fingerprints match sync's sha256 hex", () => {
	assert.equal(sha(Buffer.from("")), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});
