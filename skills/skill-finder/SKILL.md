---
name: skill-finder
description: Discover and install agent skills from the open ecosystem when the user asks "how do I do X", "find a skill for X", "is there a skill that can...", or wants to extend capabilities.
---

# Find Skills

The Skills CLI (`npx skills`) is the package manager for the open agent
skills ecosystem. Browse: https://skills.sh/ (leaderboard ranks by installs).

| Command | Does |
| --- | --- |
| `npx skills find [query]` | search by keyword |
| `npx skills add <owner/repo@skill> -g -y` | install (global, no prompts) |
| `npx skills check` / `npx skills update` | check / apply updates |
| `npx skills init <name>` | scaffold a new skill |

## Workflow

1. Identify the domain and task; check the skills.sh leaderboard before
   searching (top sources: `vercel-labs/agent-skills`, `anthropics/skills`).
2. `npx skills find <specific keywords>` - "react testing" beats "testing".
3. Verify quality before recommending - never recommend from search results
   alone:
   - install count 1K+ preferred; under 100 is a caution flag
   - reputable source (`vercel-labs`, `anthropics`, `microsoft`) over
     unknown authors
   - source repo under 100 GitHub stars deserves skepticism
4. Present: name, what it does, install count + source, install command,
   skills.sh link. Install only if the user wants it.
5. Nothing found: say so, offer to do the task directly, mention
   `npx skills init` if it's a recurring need.
