/**
 * The edit log: what each session edit left behind, by fingerprint.
 *
 * Sync reads it to tell an explained change from an unexplained one: a file
 * whose current hash matches its last logged hash was last touched by a
 * session, and the log says which. Lives beside the sync records, never in
 * synced folders. `sha` is sha256 hex of the bytes, as sync computes it; null
 * means the edit left no file.
 */
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const LOG_PATH = join(process.env.BRAYNESS_STATE ?? join(homedir(), ".local/state/brayness"), "edits.db");

export type Edit = {
	path: string;
	sha: string | null;
	session: string;
	turn: number;
	tool: string;
	tool_call: string;
	ts: string;
};

export const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export function openLog(path: string = LOG_PATH): DatabaseSync {
	mkdirSync(dirname(path), { recursive: true });
	const db = new DatabaseSync(path);
	db.exec(`
		PRAGMA journal_mode = WAL;
		CREATE TABLE IF NOT EXISTS edit (
			id INTEGER PRIMARY KEY,
			path TEXT NOT NULL,
			sha TEXT,
			session TEXT NOT NULL,
			turn INTEGER NOT NULL,
			tool TEXT NOT NULL,
			tool_call TEXT NOT NULL,
			ts TEXT NOT NULL
		);
		CREATE INDEX IF NOT EXISTS edit_path ON edit (path, id);
	`);
	return db;
}

export function record(db: DatabaseSync, edit: Edit) {
	db.prepare(
		"INSERT INTO edit (path, sha, session, turn, tool, tool_call, ts) VALUES (?, ?, ?, ?, ?, ?, ?)",
	).run(edit.path, edit.sha, edit.session, edit.turn, edit.tool, edit.tool_call, edit.ts);
}

/** The newest logged edit to a path, or undefined. */
export function last(db: DatabaseSync, path: string): Edit | undefined {
	return db
		.prepare("SELECT path, sha, session, turn, tool, tool_call, ts FROM edit WHERE path = ? ORDER BY id DESC LIMIT 1")
		.get(path) as Edit | undefined;
}
