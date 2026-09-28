/**
 * Session memory index
 *
 * A durable FTS5 index over pi's own session transcripts, so recall can rank
 * and filter turns instead of grepping file paths. Exists because `rg` over
 * `.pi/agent/sessions/` returns unranked files and cannot tell a decision
 * from a tool dump - the signal is a few percent of the lines.
 *
 * The store is a standalone SQLite file. Content lives in the JSONL files and
 * is never copied: an external-content FTS5 table stores only the index, and
 * `text` holds just enough to rank and snippet. Nothing secret is duplicated.
 *
 * One row per turn: a user turn with the following assistant text, or an
 * assistant turn on its own. Thinking blocks are dropped; tool results are
 * reduced to a name, error line, or touched path.
 */

import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

/**
 * Sessions live under the agent directory, which pi reports as
 * `PI_CODING_AGENT_DIR` - a project-local `.pi/agent` when brayness runs through
 * `bin/pi`, and `~/.pi/agent` under a bare pi install. Both the tree and the
 * store follow it so a checkout and a global install keep separate memories.
 *
 * The fallback is deliberately `~/.pi/agent`: it is where pi itself would put
 * sessions, so the index follows the transcripts rather than inventing a
 * second location. `bin/pi` refuses to run at all if `~/.pi` exists, which
 * keeps the harness copy and the global copy from being confused for one
 * another.
 */
function agentDir(): string {
	const fromEnv = process.env.PI_CODING_AGENT_DIR;
	if (fromEnv) return resolve(fromEnv);
	return join(homedir(), ".pi", "agent");
}

export const SESSIONS_DIR = join(agentDir(), "sessions");
export const DB_PATH = join(agentDir(), "memory.db");

const SCHEMA_VERSION = 1;

/** How much of a turn to keep for ranking. A turn longer than this ranks and
 *  snippets from its head, which is where the question and the decision are. */
const MAX_TEXT_CHARS = 4000;

/** FTS5 tokenizer: unicode61 folds case and accents, `_` is kept as a
 *  character so `resume_pointer` and `bm25` stay single tokens. */
const TOKENIZE = `unicode61 remove_diacritics 2 tokenchars '_'`;

const HIGHLIGHT_OPEN = "\u0001";
const HIGHLIGHT_CLOSE = "\u0002";

export interface Result {
	turn_id: string;
	session_id: string;
	session_file: string;
	project: string;
	ts: string;
	text: string;
}

export interface IndexStats {
	path: string;
	turns: number;
	sessions: number;
	bytes: number;
}

interface Turn {
	turn_id: string;
	session_id: string;
	session_file: string;
	project: string;
	ts: string;
	text: string;
}

/* ------------------------------------------------------------------ *
 * Iteration
 * ------------------------------------------------------------------ */

/** Yield every `*.jsonl` under the sessions tree, oldest first by mtime. */
export function listSessionFiles(root: string = SESSIONS_DIR): string[] {
	if (!existsSync(root)) return [];
	const found: string[] = [];

	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) walk(path);
			else if (entry.name.endsWith(".jsonl")) found.push(path);
		}
	};

	walk(root);
	return found.sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs);
}

function textOf(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	const parts: string[] = [];
	for (const block of content) {
		if (!block || typeof block !== "object") continue;
		const b = block as Record<string, unknown>;
		if (b.type === "text" && typeof b.text === "string") parts.push(b.text);
	}
	return parts.join("\n");
}

/** File path, command, or pattern a tool call touched, or null. */
function targetOf(name: string, args: Record<string, unknown>): string | null {
	const pick = (...keys: string[]): string | null => {
		for (const key of keys) {
			const value = args[key];
			if (typeof value === "string" && value.trim()) return value.trim();
		}
		return null;
	};
	switch (name) {
		case "read":
		case "write":
		case "edit":
			return pick("path", "file_path");
		case "bash":
			return pick("command");
		case "grep":
			return pick("pattern");
		case "glob":
			return pick("pattern");
		case "project_tooling":
			return pick("project");
		default:
			return pick("path", "file_path", "pattern", "query");
	}
}

/** The searchable text of one message, or "" when it carries no signal. */
function searchableOf(message: Record<string, unknown>): string {
	const role = message.role;

	if (role === "user") return textOf(message.content).trim();

	if (role === "assistant") {
		const parts: string[] = [];
		const text = textOf(message.content).trim();
		if (text) parts.push(text);
		const content = message.content;
		if (Array.isArray(content)) {
			for (const block of content) {
				if (!block || typeof block !== "object") continue;
				const b = block as Record<string, unknown>;
				if (b.type !== "toolCall" || typeof b.name !== "string") continue;
				const args = (b.arguments ?? {}) as Record<string, unknown>;
				const target = targetOf(b.name, args);
				parts.push(target ? `${b.name} ${target}` : b.name);
			}
		}
		return parts.join("\n").trim();
	}

	if (role === "toolResult") {
		const name = typeof message.toolName === "string" ? message.toolName : "tool";
		// Only a failure is worth ranking on; success output is covered by the
		// tool call that produced it.
		if (message.isError) {
			const detail = textOf(message.content).trim().split("\n").find((l) => l.trim()) ?? "";
			return detail ? `${name} error ${detail}` : `${name} error`;
		}
		return "";
	}

	return "";
}

/**
 * Read one session file into turns.
 *
 * A user message and the assistant text that answers it become a single row,
 * because that pair is the recall unit - the question alone loses the decision,
 * the answer alone loses the ask. Nothing here records who spoke: the index
 * ranks what was said, and a role label was never a thing you filtered on.
 */
export async function readSession(file: string): Promise<Turn[]> {
	const raw = await readFile(file, "utf-8");
	const turns: Turn[] = [];

	let sessionId = "";
	let project = "";
	let index = 0;
	let pendingUser: { turn_id: string; ts: string; text: string } | null = null;
	let assistantText = "";

	const flush = () => {
		if (!pendingUser) return;
		const pair = [pendingUser.text, assistantText].filter(Boolean).join("\n");
		if (pair) {
			turns.push({
				turn_id: pendingUser.turn_id,
				session_id: sessionId,
				session_file: file,
				project,
				ts: pendingUser.ts,
				text: pair.slice(0, MAX_TEXT_CHARS),
			});
		}
		pendingUser = null;
		assistantText = "";
	};

	for (const line of raw.split("\n")) {
		if (!line.trim()) continue;
		let entry: Record<string, unknown>;
		try {
			entry = JSON.parse(line) as Record<string, unknown>;
		} catch {
			continue; // a partial trailing line while a session is live
		}

		if (entry.type === "session") {
			sessionId = String(entry.id ?? sessionId);
			project = String(entry.cwd ?? "");
			continue;
		}
		if (entry.type !== "message") continue;

		const message = (entry.message ?? {}) as Record<string, unknown>;
		const role = String(message.role ?? "");
		const ts = String(entry.timestamp ?? "");

		// A failed tool result is not part of a pair: it stands alone, because
		// the error and the command that produced it are what you search for
		// later, and neither belongs to the next question's row.
		if (role === "toolResult") {
			const failure = searchableOf(message);
			if (failure) {
				turns.push({
					turn_id: String(entry.id ?? `${sessionId}-${index}`),
					session_id: sessionId,
					session_file: file,
					project,
					ts,
					text: failure.slice(0, MAX_TEXT_CHARS),
				});
				index += 1;
			}
			continue;
		}

		if (role !== "user" && role !== "assistant") continue;

		const text = searchableOf(message);
		if (!text) continue;

		const id = String(entry.id ?? `${sessionId}-${index}`);
		index += 1;

		if (role === "user") {
			// Two user messages in a row (the second usually a steer) close the
			// previous pair rather than merging into it.
			flush();
			pendingUser = { turn_id: id, ts, text };
			continue;
		}

		if (pendingUser) {
			assistantText = assistantText ? `${assistantText}\n${text}` : text;
			continue;
		}

		turns.push({
			turn_id: id,
			session_id: sessionId,
			session_file: file,
			project,
			ts,
			text: text.slice(0, MAX_TEXT_CHARS),
		});
	}

	flush();
	return turns;
}

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

export function openIndex(path: string = DB_PATH): DatabaseSync {
	mkdirSync(dirname(path), { recursive: true });
	const db = new DatabaseSync(path);
	db.exec("PRAGMA journal_mode = WAL");
	db.exec(`
		CREATE TABLE IF NOT EXISTS index_meta (
			key TEXT PRIMARY KEY,
			value TEXT
		);
		CREATE TABLE IF NOT EXISTS session_file (
			path TEXT PRIMARY KEY,
			mtime_ms REAL NOT NULL,
			turns INTEGER NOT NULL,
			indexed_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS turn (
			turn_id TEXT PRIMARY KEY,
			session_id TEXT NOT NULL,
			session_file TEXT NOT NULL,
			project TEXT NOT NULL,
			ts TEXT NOT NULL,
			text TEXT NOT NULL
		);
		CREATE INDEX IF NOT EXISTS turn_by_project ON turn(project, ts);
		CREATE VIRTUAL TABLE IF NOT EXISTS turn_fts USING fts5(
			text,
			content = 'turn',
			content_rowid = 'rowid',
			tokenize = "${TOKENIZE}"
		);
		CREATE TRIGGER IF NOT EXISTS turn_ai AFTER INSERT ON turn BEGIN
			INSERT INTO turn_fts(rowid, text) VALUES (new.rowid, new.text);
		END;
		CREATE TRIGGER IF NOT EXISTS turn_ad AFTER DELETE ON turn BEGIN
			INSERT INTO turn_fts(turn_fts, rowid, text) VALUES ('delete', old.rowid, old.text);
		END;
		CREATE TRIGGER IF NOT EXISTS turn_au AFTER UPDATE ON turn BEGIN
			INSERT INTO turn_fts(turn_fts, rowid, text) VALUES ('delete', old.rowid, old.text);
			INSERT INTO turn_fts(rowid, text) VALUES (new.rowid, new.text);
		END;
	`);
	db.prepare("INSERT OR IGNORE INTO index_meta(key, value) VALUES ('schema', ?)").run(String(SCHEMA_VERSION));
	return db;
}

/** Drop every turn belonging to a session file and its index rows. */
function dropSession(db: DatabaseSync, file: string): void {
	db.prepare("DELETE FROM turn WHERE session_file = ?").run(file);
}

export interface IndexOptions {
	root?: string;
	path?: string;
	/** Re-read every file, not just the changed ones. */
	full?: boolean;
	onProgress?: (done: number, total: number, file: string) => void;
}

/**
 * Bring the index up to date with the sessions tree. Files whose mtime has
 * not moved are skipped, so a repeat run costs one stat per file.
 */
export async function indexSessions(options: IndexOptions = {}): Promise<{ scanned: number; indexed: number; turns: number }> {
	const root = options.root ?? SESSIONS_DIR;
	const db = openIndex(options.path);
	const files = listSessionFiles(root);
	const known = new Map<string, number>();
	for (const row of db.prepare("SELECT path, mtime_ms FROM session_file").all() as Array<{ path: string; mtime_ms: number }>) {
		known.set(row.path, row.mtime_ms);
	}

	let scanned = 0;
	let indexed = 0;
	let total = 0;

	try {
		// A live session may hold an unflushed turn; re-index the newest file
		// every run so recall sees the current conversation.
		const newest = files.length ? files[files.length - 1] : null;

		for (const file of files) {
			scanned += 1;
			options.onProgress?.(scanned, files.length, file);
			const mtime = statSync(file).mtimeMs;
			const seen = known.get(file);
			if (!options.full && seen !== undefined && seen === mtime && file !== newest) continue;

			const turns = await readSession(file);
			dropSession(db, file);
			db.exec("BEGIN");
			try {
				const insert = db.prepare(
					"INSERT OR REPLACE INTO turn(turn_id, session_id, session_file, project, ts, text) VALUES (?,?,?,?,?,?)",
				);
				for (const turn of turns) {
					insert.run(turn.turn_id, turn.session_id, turn.session_file, turn.project, turn.ts, turn.text);
				}
				db.prepare(
					"INSERT OR REPLACE INTO session_file(path, mtime_ms, turns, indexed_at) VALUES (?,?,?,?)",
				).run(file, mtime, turns.length, new Date().toISOString());
				db.exec("COMMIT");
			} catch (error) {
				db.exec("ROLLBACK");
				throw error;
			}
			indexed += 1;
			total += turns.length;
		}

		if (options.full) db.exec("INSERT INTO turn_fts(turn_fts) VALUES ('optimize')");
	} finally {
		db.close();
	}

	return { scanned, indexed, turns: total };
}

/* ------------------------------------------------------------------ *
 * Query
 * ------------------------------------------------------------------ */

export interface RecallOptions {
	path?: string;
	project?: string;
	limit?: number;
	/** ISO date or prefix; turns before it are excluded. */
	since?: string;
	/** Prefix the query with `*` on its last token, so "firecra" finds it. */
	partial?: boolean;
}

const STOP_WORDS = new Set([
	"a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "did", "do", "does",
	"for", "from", "had", "has", "have", "how", "i", "if", "in", "is", "it", "its",
	"me", "my", "not", "of", "on", "or", "our", "so", "that", "the", "their", "them",
	"then", "there", "these", "they", "this", "to", "was", "we", "were", "what", "when",
	"where", "which", "who", "why", "will", "with", "you", "your",
]);

/**
 * Turn a typed question into an FTS5 MATCH expression.
 *
 * FTS5 treats bare punctuation as syntax, so `fix(bug)` or `firecra*` throw a
 * parse error on a question someone actually typed. Every token is quoted and
 * joined with OR; bm25 then ranks turns matching more terms higher, which is
 * the forgiving behavior a half-remembered query needs.
 */
export function toMatchQuery(text: string, partial = false): string | null {
	const tokens = text
		.toLowerCase()
		.split(/[^a-z0-9_]+/)
		.filter((t) => t.length > 1 && !STOP_WORDS.has(t));
	const unique = [...new Set(tokens)];
	if (!unique.length) return null;

	if (partial) {
		const last = unique[unique.length - 1];
		unique[unique.length - 1] = `${last}*`;
	}

	return unique.map((t) => `"${t.replace(/"/g, "")}"`).join(" OR ");
}

/** Rank turns against a query, newest first within equal relevance. */
export function recall(query: string, options: RecallOptions = {}): Result[] {
	const match = toMatchQuery(query, options.partial);
	if (!match) return [];

	const db = openIndex(options.path);
	try {
		const where = ["turn_fts MATCH ?"];
		const args: Array<string | number> = [match];
		if (options.project) {
			where.push("t.project LIKE ?");
			args.push(`%${options.project}%`);
		}
		if (options.since) {
			where.push("t.ts >= ?");
			args.push(options.since);
		}
		args.push(options.limit ?? 10);

		const rows = db.prepare(`
			SELECT t.turn_id, t.session_id, t.session_file, t.project, t.ts,
				snippet(turn_fts, 0, ?, ?, ' ... ', 24) AS snippet
			FROM turn_fts
			JOIN turn t ON t.rowid = turn_fts.rowid
			WHERE ${where.join(" AND ")}
			ORDER BY bm25(turn_fts), t.ts DESC
			LIMIT ?
		`).all(HIGHLIGHT_OPEN, HIGHLIGHT_CLOSE, ...args) as Array<Record<string, unknown>>;

		return rows.map((row) => ({
			turn_id: String(row.turn_id),
			session_id: String(row.session_id),
			session_file: String(row.session_file),
			project: String(row.project),
			ts: String(row.ts),
			text: String(row.snippet ?? "").replaceAll(HIGHLIGHT_OPEN, "**").replaceAll(HIGHLIGHT_CLOSE, "**"),
		}));
	} finally {
		db.close();
	}
}

export function stats(path: string = DB_PATH): IndexStats {
	if (!existsSync(path)) return { path, turns: 0, sessions: 0, bytes: 0 };
	const db = openIndex(path);
	try {
		const turns = Number((db.prepare("SELECT COUNT(*) AS n FROM turn").get() as { n: number }).n);
		const sessions = Number((db.prepare("SELECT COUNT(*) AS n FROM session_file").get() as { n: number }).n);
		return { path, turns, sessions, bytes: statSync(path).size };
	} finally {
		db.close();
	}
}

/** Stable identity for a file, used to detect moves during a rebuild. */
export function fingerprint(path: string): string {
	return createHash("sha1").update(path).digest("hex").slice(0, 12);
}