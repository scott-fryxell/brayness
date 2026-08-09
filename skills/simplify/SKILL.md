---
name: simplify
description: Simplify and refine recently modified code for clarity and consistency without changing behavior. Use when asked to "simplify this", "clean up the diff", "tidy this up", or as a post-edit pass after writing code.
---

# Simplify

A pass over the recent diff only - not the whole file, not the codebase.
Behavior stays identical: same outputs, same features, same error paths.

- Follow the AGENTS.md Code rules (snake_case, no semicolons, JSDoc, let
  errors surface); match the surrounding project's conventions over any
  generic style.
- Cut unnecessary nesting, redundant abstractions, and comments that narrate
  obvious code.
- Clear names over clever compression - no nested ternaries or dense
  one-liners; explicit beats compact.
- Keep abstractions that organize; do not merge unrelated concerns to save
  lines.
- Stop at the diff's edge unless explicitly asked to go wider.
- Report only changes that affect understanding.
