/**
 * Personal Context Extension
 *
 * Auto-loads an `AGENTS.local.md` file from the current directory (and
 * ancestor dirs up to the git repo root, or filesystem root when not in a
 * repo) and appends its contents to the system prompt. This lets you keep
 * personal, machine-specific, or sensitive context out of the shared
 * `AGENTS.md` while still having it active in every session.
 *
 * Why: pi loads `AGENTS.md` from global, parent, and cwd locations, but has
 * no built-in gitignored "local" variant. This extension provides it.
 *
 * Setup for your own use:
 * 1. This extension is registered in package.json under pi.extensions, so it
 *    loads automatically once the project is trusted.
 * 2. Create `AGENTS.local.md` next to your `AGENTS.md` (or in any ancestor
 *    dir you work from).
 * 3. Add `AGENTS.local.md` to your `.gitignore` so it never gets committed.
 *
 * If no `AGENTS.local.md` is found, this extension does nothing - safe to
 * ship in a shared repo for users who don't use the feature.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname, sep } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const LOCAL_FILENAME = "AGENTS.local.md";

/**
 * Walk up from cwd looking for the local context file.
 * Stops at the git repo root (if there is a .git dir) or the filesystem root.
 * Returns the first match (nearest to cwd wins), or null.
 */
function findLocalContextFile(cwd: string): string | null {
	const root = resolve("/");
	let currentDir = resolve(cwd);

	while (true) {
		const candidate = join(currentDir, LOCAL_FILENAME);
		if (existsSync(candidate)) {
			return candidate;
		}

		// Stop at git repo boundary: if this dir has a .git, don't walk above it.
		const gitDir = join(currentDir, ".git");
		if (existsSync(gitDir)) {
			// One last check at the repo root itself already happened above.
			return null;
		}

		if (currentDir === root) break;
		const parent = dirname(currentDir);
		if (parent === currentDir) break;
		currentDir = parent;
	}

	return null;
}

function readLocalContext(filePath: string): string {
	try {
		return readFileSync(filePath, "utf-8").trim();
	} catch {
		return "";
	}
}

export default function personalContextExtension(pi: ExtensionAPI) {
	let localFile: string | null = null;
	let localContent: string = "";

	pi.on("resources_discover", async (event) => {
		localFile = findLocalContextFile(event.cwd);
		localContent = localFile ? readLocalContext(localFile) : "";
	});

	pi.on("before_agent_start", async (event) => {
		if (!localContent) return;

		return {
			systemPrompt:
				event.systemPrompt +
				`\n\n## Personal Context\n\nLoaded from \`${localFile}\` (gitignored, machine-local):\n\n` +
				localContent,
		};
	});
}
