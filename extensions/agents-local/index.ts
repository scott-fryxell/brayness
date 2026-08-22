/**
 * Personal Context Extension
 *
 * Auto-loads `AGENTS.local.md` and keeps its `work/` project table in sync
 * with `work/` on disk each session.
 */

import {
	existsSync,
	readFileSync,
	writeFileSync,
	readdirSync,
	statSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const LOCAL_FILENAME = "AGENTS.local.md";
const WORK_SECTION = "## work/ (projects)";
const WORK_SYNC_START = "<!-- agents-local:work-sync -->";
const WORK_SYNC_END = "<!-- /agents-local:work-sync -->";

function findHarnessRoot(cwd: string): string | null {
	const root = resolve("/");
	let currentDir = resolve(cwd);

	while (true) {
		if (
			existsSync(join(currentDir, "AGENTS.md")) &&
			existsSync(join(currentDir, "work"))
		) {
			return currentDir;
		}
		if (currentDir === root) break;
		const parent = dirname(currentDir);
		if (parent === currentDir) break;
		currentDir = parent;
	}

	return null;
}

/** Nearest AGENTS.local.md, or harness root when cwd is inside a nested repo. */
function findLocalContextFile(cwd: string): string | null {
	const root = resolve("/");
	let currentDir = resolve(cwd);

	while (true) {
		const candidate = join(currentDir, LOCAL_FILENAME);
		if (existsSync(candidate)) return candidate;

		const gitDir = join(currentDir, ".git");
		if (existsSync(gitDir)) break;

		if (currentDir === root) break;
		const parent = dirname(currentDir);
		if (parent === currentDir) break;
		currentDir = parent;
	}

	const harness = findHarnessRoot(cwd);
	if (!harness) return null;
	const harnessLocal = join(harness, LOCAL_FILENAME);
	return existsSync(harnessLocal) ? harnessLocal : null;
}

function readLocalContext(filePath: string): string {
	try {
		return readFileSync(filePath, "utf-8").trim();
	} catch {
		return "";
	}
}

function parseWorkDescriptions(content: string): Map<string, string> {
	const descriptions = new Map<string, string>();
	const block =
		content.match(
			new RegExp(
				`${WORK_SYNC_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([\\s\\S]*?)${WORK_SYNC_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
			),
		)?.[1] ?? content;

	for (const line of block.split("\n")) {
		const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|$/);
		if (match) descriptions.set(match[1], match[2]);
	}

	return descriptions;
}

function projectHint(projectDir: string): string {
	const pkgPath = join(projectDir, "package.json");
	if (existsSync(pkgPath)) {
		try {
			const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
				description?: string;
				name?: string;
			};
			if (pkg.description && pkg.description !== pkg.name)
				return pkg.description;
			if (pkg.name) return pkg.name;
		} catch {
			/* fall through */
		}
	}

	const readmePath = join(projectDir, "README.md");
	if (existsSync(readmePath)) {
		try {
			for (const line of readFileSync(readmePath, "utf-8").split("\n")) {
				const text = line.replace(/^#+\s*/, "").trim();
				if (text && !text.startsWith("![")) return text.slice(0, 80);
			}
		} catch {
			/* fall through */
		}
	}

	return "(add description)";
}

function buildWorkSyncBlock(
	projects: string[],
	descriptions: Map<string, string>,
	workPath: string,
): string {
	const rows = [...projects].sort().map((name) => {
		const desc =
			descriptions.get(name) ?? projectHint(join(workPath, name));
		return `| \`${name}\` | ${desc} |`;
	});

	const noGit = projects
		.filter((name) => !existsSync(join(workPath, name, ".git")))
		.sort();

	return `${WORK_SYNC_START}
| Project | What it is |
|---------|------------|
${rows.join("\n")}

No git: ${noGit.map((name) => `\`${name}\``).join(", ")}.
${WORK_SYNC_END}`;
}

function syncWorkSection(harnessRoot: string, localPath: string): void {
	const workPath = join(harnessRoot, "work");
	if (!existsSync(workPath)) return;

	const projects = readdirSync(workPath).filter((name) => {
		if (name.startsWith(".")) return false;
		return statSync(join(workPath, name)).isDirectory();
	});

	let content = readFileSync(localPath, "utf-8");
	const descriptions = parseWorkDescriptions(content);
	const syncBlock = buildWorkSyncBlock(projects, descriptions, workPath);

	if (content.includes(WORK_SYNC_START)) {
		content = content.replace(
			new RegExp(
				`${WORK_SYNC_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${WORK_SYNC_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
			),
			syncBlock,
		);
	} else if (content.includes(WORK_SECTION)) {
		content = content.replace(
			new RegExp(`${WORK_SECTION}[\\s\\S]*?(?=\\n## |$)`),
			`${WORK_SECTION}

Code and client work live in \`work/<project>/\`. Synced from disk by agents-local each session - edit descriptions in the table; rows add and remove automatically.

${syncBlock}`,
		);
	} else {
		const anchor = content.indexOf("\n## ");
		const insert = `\n\n${WORK_SECTION}

Code and client work live in \`work/<project>/\`. Synced from disk by agents-local each session - edit descriptions in the table; rows add and remove automatically.

${syncBlock}\n`;
		content =
			anchor === -1 ? content + insert : content.slice(0, anchor) + insert + content.slice(anchor);
	}

	writeFileSync(localPath, content, "utf-8");
}

/** Splice personal context into README immediately before the last fenced block. */
function insertBeforeLastCodeBlock(readme: string, insert: string): string {
	const fence = /^```/gm;
	let lastStart = -1;
	let match: RegExpExecArray | null;
	while ((match = fence.exec(readme)) !== null) lastStart = match.index;
	if (lastStart === -1) return `${readme.trim()}\n\n${insert}\n`;
	return `${readme.slice(0, lastStart).trimEnd()}\n\n${insert}\n\n${readme.slice(lastStart)}`;
}

function buildReadmeWithLocal(harnessRoot: string, localPath: string): string | null {
	const readmePath = join(harnessRoot, "README.md");
	if (!existsSync(readmePath)) return null;

	const local = readLocalContext(localPath);
	if (!local) return null;

	const readme = readFileSync(readmePath, "utf-8");
	const personal = [
		"## Personal Context",
		"",
		`From \`${LOCAL_FILENAME}\` (gitignored, machine-local):`,
		"",
		local,
	].join("\n");

	return insertBeforeLastCodeBlock(readme, personal);
}

export default function agentsLocalExtension(pi: ExtensionAPI) {
	let localFile: string | null = null;
	let localContent = "";
	let pendingInsert: string | null = null;

	pi.on("resources_discover", async (event) => {
		localFile = findLocalContextFile(event.cwd);
		if (!localFile) return;

		const harnessRoot = findHarnessRoot(event.cwd) ?? dirname(localFile);
		syncWorkSection(harnessRoot, localFile);
		localContent = readLocalContext(localFile);
	});

	pi.registerCommand("insert", {
		description:
			"Splice AGENTS.local.md into README.md (before the last command block) for the next prompt",
		handler: async (_args, ctx) => {
			const harnessRoot = findHarnessRoot(ctx.cwd);
			if (!harnessRoot) {
				ctx.ui.notify("insert: harness root not found", "error");
				return;
			}

			const localPath =
				localFile ??
				(existsSync(join(harnessRoot, LOCAL_FILENAME))
					? join(harnessRoot, LOCAL_FILENAME)
					: null);
			if (!localPath) {
				ctx.ui.notify(`insert: no ${LOCAL_FILENAME}`, "error");
				return;
			}

			const combined = buildReadmeWithLocal(harnessRoot, localPath);
			if (!combined) {
				ctx.ui.notify("insert: README.md or personal context missing", "error");
				return;
			}

			pendingInsert = combined;
			ctx.ui.notify(
				"insert: README + AGENTS.local queued for next prompt",
				"info",
			);
		},
	});

	pi.on("before_agent_start", async (event) => {
		let systemPrompt = event.systemPrompt;

		if (pendingInsert) {
			systemPrompt +=
				`\n\n## README + Personal Context\n\n` +
				`Loaded via /insert (AGENTS.local spliced into README before the last command block):\n\n` +
				pendingInsert;
			pendingInsert = null;
		} else if (localContent) {
			systemPrompt +=
				`\n\n## Personal Context\n\nLoaded from \`${localFile}\` (gitignored, machine-local):\n\n` +
				localContent;
		}

		if (systemPrompt === event.systemPrompt) return;
		return { systemPrompt };
	});
}
