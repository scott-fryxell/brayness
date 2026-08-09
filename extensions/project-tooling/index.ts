/**
 * Project Tooling Extension
 *
 * Gives the agent on-demand awareness of each `work/<project>`'s scripts,
 * ops helpers, and curated tooling notes. Reads live from `package.json`,
 * `scripts/`, and `tools/` when invoked - no startup context bloat, always
 * current.
 *
 * Why: pi loads skills and `AGENTS*.md` into context at startup, but nothing
 * points the agent at a project's `package.json` scripts, `scripts/`, or
 * `tools/` helpers. Realness and seeq-app carry a lot of diagnostic and ops
 * tooling that is easy to miss (logs, emulators, coverage/risk, deploy
 * verify, admin scripts). The agent needs to *consider* tooling when working
 * in a project, without carrying every project's full script list in the
 * system prompt.
 *
 * Design: a `project_tooling` tool (visible to the model via promptSnippet +
 * a guideline) that returns the requested project's scripts grouped by
 * purpose. A curated `work/<project>/.tooling.md`, when present, is included
 * as the headline notes. Content is assembled on each call, so scripts that
 * change are picked up immediately.
 */

import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const __dirname = dirname(fileURLToPath(import.meta.url));
// extensions/project-tooling/ -> brayness root, then work/
const BRAYNESS_ROOT = resolve(__dirname, "..", "..");
const WORK_DIR = join(BRAYNESS_ROOT, "work");

const TOOLING_FILE = ".tooling.md";

/**
 * Group script names by intent so the output reads as a menu, not a flat
 * dump. High-value diagnostic buckets first.
 */
const GROUP_ORDER = ["test", "lint", "type", "build", "deploy", "logs", "dev", "other"];

function classifyScript(name: string): string {
	const n = name.toLowerCase();
	if (/(^|:)test|cover(coverage)?|fallow|risk/.test(n)) return "test";
	if (/(^|:)lint/.test(n)) return "lint";
	if (/(^|:)type|check/.test(n)) return "type";
	if (/(^|:)build|wasm|worker|icons|toc|prerender|manifest/.test(n)) return "build";
	if (/(^|:)deploy|ship|release|verify|publish/.test(n)) return "deploy";
	if (/(^|:)log/.test(n)) return "logs";
	if (/(^|:)dev|serve|watch|emu/.test(n)) return "dev";
	return "other";
}

function listProjects(): string[] {
	if (!existsSync(WORK_DIR)) return [];
	return readdirSync(WORK_DIR)
		.filter((name) => existsSync(join(WORK_DIR, name, "package.json")))
		.sort();
}

function listDirNames(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).filter((name) => !name.startsWith(".")).sort();
}

async function readProjectScripts(projectDir: string): Promise<Array<{ label: string; scripts: string[] }>> {
	const pkgFile = join(projectDir, "package.json");
	if (!existsSync(pkgFile)) return [];

	let scripts: Record<string, string>;
	try {
		const pkg = JSON.parse(await readFile(pkgFile, "utf-8")) as { scripts?: Record<string, string> };
		if (!pkg.scripts) return [];
		scripts = pkg.scripts;
	} catch {
		return [];
	}

	const buckets = new Map<string, string[]>();
	for (const name of Object.keys(scripts)) {
		const group = classifyScript(name);
		if (!buckets.has(group)) buckets.set(group, []);
		buckets.get(group)!.push(name);
	}

	const groups: Array<{ label: string; scripts: string[] }> = [];
	for (const label of GROUP_ORDER) {
		const names = buckets.get(label);
		if (!names || names.length === 0) continue;
		names.sort();
		groups.push({ label, scripts: names });
	}
	return groups;
}

async function readCuratedNotes(projectDir: string): Promise<string | null> {
	const file = join(projectDir, TOOLING_FILE);
	if (!existsSync(file)) return null;
	try {
		return (await readFile(file, "utf-8")).trim() || null;
	} catch {
		return null;
	}
}

async function describeProject(name: string): Promise<string> {
	const projectDir = join(WORK_DIR, name);
	const lines: string[] = [`### ${name}`];

	const curated = await readCuratedNotes(projectDir);
	if (curated) {
		lines.push("Curated notes (`.tooling.md`):");
		lines.push(curated);
	}

	const groups = await readProjectScripts(projectDir);
	if (groups.length > 0) {
		const total = groups.reduce((acc, g) => acc + g.scripts.length, 0);
		lines.push(`\`package.json\` scripts by purpose (${total} total):`);
		for (const group of groups) {
			lines.push(`- ${group.label}: \`${group.scripts.join("`, `")}\``);
		}
	}

	const scriptsDir = listDirNames(join(projectDir, "scripts"));
	if (scriptsDir.length > 0) {
		lines.push(`scripts/ dir: ${scriptsDir.join(", ")}`);
	}

	const toolsDir = listDirNames(join(projectDir, "tools"));
	if (toolsDir.length > 0) {
		lines.push(`tools/ dir (admin/ops helpers): ${toolsDir.join(", ")}`);
	}

	return lines.join("\n");
}

export default function projectToolingExtension(pi: ExtensionAPI) {
	pi.registerCommand("ptooling", {
		description: "Show tooling for a work/<project> (scripts, scripts/, tools/, .tooling.md). Usage: /ptooling [project|all]",
		handler: async (args, ctx) => {
			const want = (args || "all").trim();
			const projects = want === "all" ? listProjects() : [want];
			const missing = projects.filter((p) => !existsSync(join(WORK_DIR, p, "package.json")));
			const blocks: string[] = [];
			for (const project of projects) {
				if (!existsSync(join(WORK_DIR, project, "package.json"))) continue;
				blocks.push(await describeProject(project));
			}
			let text = blocks.join("\n\n---\n\n");
			if (missing.length) {
				text += `\n\nNot found under work/: ${missing.join(", ")}. ` +
					`Available: ${listProjects().join(", ")}`;
			}
			const lines = text.split("\n");
			ctx.ui.notify(`project-tooling: ${want}`, "info");
			ctx.ui.setWidget("ptooling", lines);
		},
	});

	pi.registerTool({
		name: "project_tooling",
		label: "Project Tooling",
		description:
			"List the scripts, ops helpers, and curated tooling notes for a work/<project> " +
			"(package.json scripts grouped by purpose, scripts/ and tools/ dirs, and any " +
			".tooling.md). Use before working in, diagnosing, deploying, or running tests for " +
			"a project so you use its existing tooling instead of guessing.",
		promptSnippet: "List project scripts and tooling for a work/<project>",
		promptGuidelines: [
			"Before editing, diagnosing, testing, building, or deploying a project in work/, " +
				"call project_tooling to see its existing scripts and helpers. Mention the " +
				"relevant npm run command you intend to use.",
		],
		parameters: Type.Object({
			project: Type.Optional(Type.String({
				description:
					"Project directory name under work/ (e.g. realness, seeq-app). " +
					"Omit or pass \"all\" to list every project.",
			})),
		}),
		async execute(_toolCallId, params: { project?: string }, _signal, onUpdate, _ctx) {
			const want = params.project?.trim();
			const projects = want && want !== "all"
				? [want]
				: listProjects();

			if (!projects.length) {
				return { content: [{ type: "text", text: "No work/ projects found." }], details: {} };
			}

			onUpdate?.({ content: [{ type: "text", text: `Reading tooling for ${projects.join(", ")}...` }], details: {} });

			const missing = want && want !== "all"
				? projects.filter((p) => !existsSync(join(WORK_DIR, p, "package.json")))
				: [];

			const blocks: string[] = [];
			for (const project of projects) {
				if (missing.includes(project)) continue;
				blocks.push(await describeProject(project));
			}

			let text = blocks.join("\n\n---\n\n");
			if (missing.length) {
				text += `\n\nNot found under work/: ${missing.join(", ")}. ` +
					`Available: ${listProjects().join(", ")}`;
			}

			return { content: [{ type: "text", text }], details: { projects: blocks.length } };
		},
	});
}
