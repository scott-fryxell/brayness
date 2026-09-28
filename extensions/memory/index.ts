/**
 * Memory Extension
 *
 * `remember` - ranked recall over pi's own session transcripts.
 *
 * The transcripts live in `~/.pi/agent/sessions/`; this extension indexes
 * them into an FTS5 store and ranks turns, so a question is answered with
 * snippets and a file to reopen instead of a list of paths from `rg`.
 *
 * Two ways in: the `remember` tool for the agent, and `/remember` for a human
 * to read the same results in a widget.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { StringEnum } from "@earendil-works/pi-ai";
import {
	DB_PATH,
	indexSessions,
	recall,
	stats,
	type Result,
} from "./index-db.ts";

function formatResults(query: string, results: Result[]): string {
	if (!results.length) {
		return `No turns matched "${query}". If the index looks thin, run memory with action "index".`;
	}

	const blocks = results.map((hit, i) => {
		const when = hit.ts.slice(0, 16).replace("T", " ");
		const project = hit.project.split("/").filter(Boolean).pop() ?? "?";
		const session = hit.session_id.slice(0, 8);
		return [
			`${i + 1}. ${when} · ${project} · session ${session}`,
			`   ${hit.text.replace(/\s+/g, " ").trim()}`,
			`   ${hit.session_file}`,
		].join("\n");
	});

	return `${results.length} turn(s) for "${query}":\n\n${blocks.join("\n\n")}`;
}

function formatStats(label: string, line: string): string {
	return `${label}\n${line}`;
}

export default function memoryExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "remember",
		label: "Remember",
		description:
			"Ranked recall over past pi sessions. Indexes session transcripts into a " +
			"local FTS5 store and returns matching turns with snippets, a date, and the " +
			"session file to reopen. Use instead of grepping session JSONL when the " +
			"question is about earlier work - what we decided, tried, or fixed.",
		promptSnippet: "Search past sessions for earlier decisions and work",
		promptGuidelines: [
			'Use remember when the user asks "what did we do about X", "did we already ' +
				'try X", or when a task smells like a repeat of earlier work. Prefer it ' +
				"over reading session JSONL directly.",
		],
		parameters: Type.Object({
			action: StringEnum(["search", "index", "stats"] as const),
			query: Type.Optional(Type.String({
				description: "Words to search for. Typos are tolerated; the last word is also matched as a prefix.",
			})),
			project: Type.Optional(Type.String({
				description: "Filter by part of the working directory, e.g. realness, seeq, brayness.",
			})),
			since: Type.Optional(Type.String({
				description: "ISO date lower bound, e.g. 2026-09-01.",
			})),
			limit: Type.Optional(Type.Number({ description: "Maximum hits (default 10)." })),
			full: Type.Optional(Type.Boolean({
				description: "For action index: re-read every session file, not just changed ones.",
			})),
		}),
		async execute(_toolCallId, params, _signal, onUpdate, _ctx) {
			const action = params.action ?? "search";

			if (action === "index") {
				onUpdate?.({ content: [{ type: "text", text: "Indexing sessions..." }], details: {} });
				const result = await indexSessions({ full: params.full });
				const after = stats();
				const text = formatStats(
					`Indexed ${result.indexed} of ${result.scanned} session file(s); ${result.turns} turn(s) read.`,
					`Store: ${after.path} - ${after.turns} turns across ${after.sessions} sessions.`,
				);
				return { content: [{ type: "text", text }], details: result };
			}

			if (action === "stats") {
				const s = stats();
				return {
					content: [{ type: "text", text: `${s.path}\n${s.turns} turns, ${s.sessions} sessions, ${(s.bytes / 1048576).toFixed(1)} MB` }],
					details: s,
				};
			}

			const query = params.query?.trim();
			if (!query) throw new Error("query is required for action search");

			const results = recall(query, {
				project: params.project,
				since: params.since,
				limit: params.limit ?? 10,
				partial: true,
			});
			return { content: [{ type: "text", text: formatResults(query, results) }], details: { count: results.length } };
		},
	});

	// A fresh Pi conversation still has access to earlier turns without putting
	// those turns in the model context. The index is derived from local JSONL.
	pi.on("session_start", async () => {
		try {
			await indexSessions({ path: DB_PATH });
		} catch {
			// A missing or locked index must not block the terminal from opening.
		}
	});

	pi.registerCommand("remember", {
		description: "Search past sessions. Usage: /remember <words>",
		handler: async (args, ctx) => {
			const query = (args || "").trim();
			if (!query) {
				ctx.ui.notify("remember: give it something to search for", "error");
				return;
			}
			const results = recall(query, { limit: 10, partial: true });
			ctx.ui.setWidget("remember", formatResults(query, results).split("\n"));
			ctx.ui.notify(`remember: ${results.length} hit(s) for "${query}"`, "info");
		},
	});

	// Keep the index warm: a session's own turns should be searchable the next
	// time you ask. Cheap - only the newest file has moved.
	pi.on("agent_settled", async () => {
		try {
			await indexSessions({ root: undefined, path: DB_PATH });
		} catch {
			// Indexing is a convenience; a locked or half-written session file
			// must never disturb the session that is running.
		}
	});
}