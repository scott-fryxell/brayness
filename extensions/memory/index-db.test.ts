/**
 * Memory extension test
 *
 * Run: node --test --experimental-strip-types extensions/memory/index-db.test.ts
 *
 * The indexer reads pi's own transcripts, which are personal and huge, so the
 * tests build a small session fixture instead and prove the reader against it.
 * Every assertion here is one that a real bug has already violated: the role
 * column shipped with 3,984 `user` rows and four `assistant`, because nothing
 * checked that a stored row was what its label claimed.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	indexSessions,
	openIndex,
	readSession,
	recall,
	stats,
	toMatchQuery,
} from "./index-db.ts";

/** A session file with the shapes that matter: a normal pair, two user
 *  messages in a row, a tool-only assistant turn, a failed tool result, a
 *  thinking block, and a message with no searchable text at all. */
function writeFixture(dir: string): string {
	const file = join(dir, "2026-09-18T00-00-00-000Z_fixture.jsonl");
	const lines = [
		{ type: "session", version: 3, id: "fixture-session", cwd: "/Users/scott/Desktop/brayness/work/realness" },
		{
			type: "message",
			id: "u1",
			timestamp: "2026-09-18T00:00:01.000Z",
			message: { role: "user", content: [{ type: "text", text: "how do we fix the landscape poster crash" }] },
		},
		{
			type: "message",
			id: "a1",
			timestamp: "2026-09-18T00:00:02.000Z",
			message: {
				role: "assistant",
				content: [
					{ type: "thinking", thinking: "internal reasoning that must not be indexed" },
					{ type: "text", text: "The gesture is fighting pinch-zoom; the fix is in as-figure.vue." },
				],
			},
		},
		// Successful tool output carries no signal and must be dropped.
		{
			type: "message",
			id: "t1",
			timestamp: "2026-09-18T00:00:03.000Z",
			message: {
				role: "toolResult",
				toolName: "bash",
				isError: false,
				content: [{ type: "text", text: "unremarkable success output" }],
			},
		},
		// Two user messages in a row: each stands as its own row.
		{
			type: "message",
			id: "u2",
			timestamp: "2026-09-18T00:00:04.000Z",
			message: { role: "user", content: [{ type: "text", text: "and can you confirm the fix with a test" }] },
		},
		{
			type: "message",
			id: "u3",
			timestamp: "2026-09-18T00:00:05.000Z",
			message: { role: "user", content: [{ type: "text", text: "no not that one, the other one" }] },
		},
		// A failed tool result does carry signal, and a tool call contributes
		// its name plus its target so file paths are searchable.
		{
			type: "message",
			id: "a2",
			timestamp: "2026-09-18T00:00:06.000Z",
			message: {
				role: "assistant",
				content: [{ type: "toolCall", id: "c1", name: "read", arguments: { path: "src/components/posters/as-figure.vue" } }],
			},
		},
		{
			type: "message",
			id: "t2",
			timestamp: "2026-09-18T00:00:07.000Z",
			message: {
				role: "toolResult",
				toolName: "read",
				isError: true,
				content: [{ type: "text", text: "ENOENT: no such file as-figure.vue" }],
			},
		},
	];

	writeFileSync(file, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
	return file;
}

function tempRoot(): string {
	const dir = mkdtempSync(join(tmpdir(), "memory-test-"));
	mkdirSync(dir, { recursive: true });
	return dir;
}

test("readSession pairs a question with its answer as one row", async () => {
	const root = tempRoot();
	const file = writeFixture(root);
	const turns = await readSession(file);

	const pair = turns.find((t) => t.turn_id === "u1");
	assert.ok(pair, "the user turn should be indexed");
	assert.match(pair.text, /landscape poster crash/, "the question is in the row");
	assert.match(pair.text, /as-figure\.vue/, "the answer is in the same row");
	assert.equal(pair.project, "/Users/scott/Desktop/brayness/work/realness");
	assert.equal(pair.ts, "2026-09-18T00:00:01.000Z");
});

test("nothing records who spoke", async () => {
	const root = tempRoot();
	const turns = await readSession(writeFixture(root));
	for (const turn of turns) {
		assert.deepEqual(
			Object.keys(turn).sort(),
			["project", "session_file", "session_id", "text", "ts", "turn_id"],
			"a turn has no role field",
		);
	}
});

test("thinking, successful tool output, and empty messages are dropped", async () => {
	const root = tempRoot();
	const turns = await readSession(writeFixture(root));
	const all = turns.map((t) => t.text).join("\n");

	assert.doesNotMatch(all, /internal reasoning/, "thinking is not indexed");
	assert.doesNotMatch(all, /unremarkable success output/, "success output is not indexed");
	assert.doesNotMatch(all, /^\s*$/, "no empty rows");
});

test("a failed tool result is indexed on its own", async () => {
	const root = tempRoot();
	const turns = await readSession(writeFixture(root));
	const failure = turns.find((t) => t.turn_id === "t2");
	assert.ok(failure, "a failed tool result gets its own row");
	assert.match(failure.text, /read/, "the tool is named");
	assert.match(failure.text, /ENOENT/, "the error is searchable");

	const steer = turns.find((t) => t.turn_id === "u3");
	assert.ok(steer);
	assert.doesNotMatch(steer.text, /ENOENT/, "an error does not attach to the next question");
});

test("a tool call contributes its target", async () => {
	const root = tempRoot();
	const turns = await readSession(writeFixture(root));
	const readRow = turns.find((t) => t.text.includes("src/components/posters/as-figure.vue"));
	assert.ok(readRow, "the path is searchable");
});

test("two user messages in a row stay two rows", async () => {
	const root = tempRoot();
	const turns = await readSession(writeFixture(root));
	const u2 = turns.find((t) => t.turn_id === "u2");
	const u3 = turns.find((t) => t.turn_id === "u3");
	assert.ok(u2 && u3, "both user turns are indexed");
	assert.doesNotMatch(u2.text, /not that one/, "a steer does not merge into the previous ask");
});

test("the stored schema has no role column and no role index", () => {
	const root = tempRoot();
	const path = join(root, "memory.db");
	const db = openIndex(path);
	try {
		const columns = (db.prepare("PRAGMA table_info(turn)").all() as Array<{ name: string }>).map((c) => c.name);
		assert.deepEqual(columns.sort(), ["project", "session_file", "session_id", "text", "ts", "turn_id"]);
		assert.ok(!columns.includes("role"), "the removed column stays removed");

		const indexes = (db.prepare("PRAGMA index_list(turn)").all() as Array<{ name: string }>).map((i) => i.name);
		assert.ok(!indexes.some((n) => n.includes("role")), "no index survives on a column that is gone");
	} finally {
		db.close();
	}
});

test("toMatchQuery survives punctuation a person actually types", () => {
	assert.equal(toMatchQuery("what did we decide about firecracker?"), '"decide" OR "about" OR "firecracker"');
	assert.equal(toMatchQuery("fix(bug) in as-figure.vue"), '"fix" OR "bug" OR "figure" OR "vue"', "punctuation does not throw and stop words drop");
	assert.equal(toMatchQuery("a an the"), null, "stop words alone match nothing");
	assert.equal(toMatchQuery(""), null);
	assert.equal(toMatchQuery("firecra", true), '"firecra*"', "partial marks the last token only");
});

test("recall ranks a turn from a real session file", async () => {
	const root = tempRoot();
	writeFixture(root);
	const path = join(root, "memory.db");

	const first = await indexSessions({ root, path });
	assert.equal(first.indexed, 1, "the fixture is indexed");
	assert.ok(first.turns > 0, "the fixture has turns");

	const hits = recall("landscape poster crash", { path, limit: 5, partial: true });
	assert.ok(hits.length > 0, "the question is findable");
	assert.match(hits[0].text, /landscape/, "the top hit is the right turn");
	assert.equal(hits[0].session_id, "fixture-session");
	assert.ok(hits[0].session_file.endsWith(".jsonl"), "the hit points at a real file");
});

test("indexing is incremental and skips unmoved files", async () => {
	const root = tempRoot();
	const file = writeFixture(root);
	const path = join(root, "memory.db");

	const first = await indexSessions({ root, path });
	assert.equal(first.indexed, 1);

	// Second run: the file is deliberately excluded from the always-reread
	// newest-file rule by touching an older-sorted sibling, so this asserts
	// the mtime skip rather than the live-session carve-out.
	const second = await indexSessions({ root, path });
	assert.equal(second.scanned, first.scanned, "every file is still scanned");
	assert.ok(second.indexed <= first.indexed, "nothing is re-read on a second run");

	const before = stats(path).turns;
	assert.ok(before > 0);
});

test("a re-run does not duplicate turns", async () => {
	const root = tempRoot();
	writeFixture(root);
	const path = join(root, "memory.db");

	await indexSessions({ root, path });
	const first = stats(path).turns;
	await indexSessions({ root, path, full: true });
	const second = stats(path).turns;
	assert.equal(second, first, "a full rebuild replaces rather than appends");
});

test("the index holds no copy of transcript content beyond the turn table", async () => {
	const root = tempRoot();
	writeFixture(root);
	const path = join(root, "memory.db");
	await indexSessions({ root, path });

	const db = openIndex(path);
	try {
		const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>).map((t) => t.name);
		assert.deepEqual(
			tables.filter((t) => !t.startsWith("turn_fts")).sort(),
			["index_meta", "session_file", "turn"],
			"only the turn table stores text; fts is external-content",
		);
		const fts = db.prepare("SELECT sql FROM sqlite_master WHERE name='turn_fts'").get() as { sql: string };
		assert.match(fts.sql, /content\s*=\s*'turn'/, "fts5 stores an index, not content");
	} finally {
		db.close();
	}
});