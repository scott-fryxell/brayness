---
name: nvim-buffers
description: Read the user's currently open Neovim buffers and active view so you can discuss their actual working files and teach them their own nvim keymaps in context. Use when the user asks to "talk about what I have open", mentions a file they're working on without naming it, asks "how do I do X in vim", wants to learn git/search/navigation keys, or says they have files open and wants you to look at them.
---

# Nvim Buffers

The user runs LazyVim (`~/.config/nvim`, config in `work/nvim`). An autocmd in
`lua/config/autocmds.lua` writes the open real-file buffers to a state file on
every buffer change. Read that file with the `read` tool (or `cat`) to see what
they're working on.

## Path

`~/.local/state/nvim/open-buffers.json` (`vim.fn.stdpath("state")` on macOS)

## Shape

```json
{
  "current": "/abs/path/to/current/buffer",
  "buffers": ["/abs/path/a", "/abs/path/b"],
  "oil": [{ "dir": "/browsed/dir", "highlighted": "file.lua" }],
  "view": {
    "file": "/abs/path",
    "line": 42,
    "col": 3,
    "visible": { "from_top": 30, "to_bottom": 60 },
    "context": ["line 40", "line 41", "line 42"]
  },
  "updated": "2026-08-11T14:01:00"
}
```

- `current` - the active buffer; null or an oil dir if the active buffer is a
  terminal/oil/unnamed buffer.
- `buffers` - sorted list of all listed real-file buffers (term://, oil://,
  unnamed excluded).
- `oil` - directories currently browsed in oil (strips the `oil://` prefix),
  each with `highlighted` - the entry name under the cursor in that oil
  window, or null if the oil buffer isn't shown in a window right now.
- `view` - the active window: file, cursor line/col, visible top/bottom lines,
  and a few lines of `context` around the cursor. Use this to answer "what's on
  my screen" / "what am I looking at" / "what should I press here".
- `updated` - when nvim last wrote it. Check it's fresh before trusting it.

Freshness: refreshed on buffer events + `FocusGained` + a 5s timer; external
file changes are reloaded (never clobbering unsaved edits).

## Coaching role (training wheels)

The user is still learning vim and runs hardtime.nvim, which blocks/"yells" at
inefficient keys. Be the patient counterpart:

- When they ask how to do something, teach from THEIR config (`work/nvim/`,
  `lua/config/keymaps.lua`, `lua/plugins/*.lua`), never generic defaults.
- One key at a time, tied to what their `view` shows. No lectures, no keymap
  dumps.
- Read the state file first and confirm what they're looking at before
  answering, so hints land on their real cursor position.
- Their notable bindings: `-` = Oil parent dir, `<leader>gg`/`<leader>gG` =
  gitui, `gr` = LSP references, `<leader>fb` = buffers (Telescope), `gd`/`gi` =
  LSP definition/implementation, `K` = hover. Git + search are LazyVim defaults
  (`<leader>g...`, `<leader>f...`).

## How to use

- When the user mentions files "open in nvim", read this file first and confirm
  which files you're looking at before going deep - the user shouldn't have to
  name paths they already have in front of them.
- If the file is missing or stale (no update in a while), nvim may be closed or
  the autocmd may not have run; say so plainly instead of guessing.
- The write happens on `VimEnter`/`BufAdd`/`BufEnter`/`BufDelete`/`VimLeavePre`.
  If the user just opened/closed a buffer and the file looks stale, they may
  need nvim to pick up the change (or nvim config may need a reload).
