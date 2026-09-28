#!/usr/bin/env node
// Fail when a .mjs file exists. Every package here is type: module, so .js is
// already ESM. Run by hand, or from a pre-commit hook.
//
//   node bin/no-mjs.js          workspace, skipping artifacts/
//   node bin/no-mjs.js --all    include artifacts/ and every other folder
//
// node_modules and .git are always skipped. .cjs files are listed as a notice:
// they are correct where a package needs CommonJS.

import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const skip = new Set([
  "node_modules",
  ".git",
  ...(process.argv.includes("--all") ? [] : ["artifacts"]),
]);

const mjs = [];
const cjs = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skip.has(entry.name)) walk(join(dir, entry.name));
    } else if (entry.name.endsWith(".mjs")) {
      mjs.push(relative(root, join(dir, entry.name)));
    } else if (entry.name.endsWith(".cjs")) {
      cjs.push(relative(root, join(dir, entry.name)));
    }
  }
};
walk(root);

if (cjs.length) {
  console.log(`${cjs.length} .cjs file(s), correct where CommonJS is required:`);
  for (const file of cjs) console.log(`  ${file}`);
}

if (mjs.length) {
  console.log(`${mjs.length} .mjs file(s) - use .js:`);
  for (const file of mjs) console.log(`  ${file}`);
  process.exit(1);
}

console.log("no .mjs files");