# Memory Extension

Ranked recall over your own past sessions.

`rg` over `.pi/agent/sessions/` returns file paths, unranked, and cannot tell a
decision from a tool dump. In a sample of this harness's transcripts, 8% of
lines were the user's own words. This extension indexes the transcripts into
SQLite with FTS5 and answers with ranked turns: a snippet, a date, and the
session file to reopen.

## Usage

| Where       | What                                             |
| ----------- | ------------------------------------------------ |
| `remember`  | tool for the agent: `search`, `index`, `stats`   |
| `/remember` | the same search as a widget, for a human to read |

Search filters: `project` (part of the working directory), `since` (ISO date),
`limit`.

## How it works

- **One row per turn.** A user message and the assistant text that answers it
  become a single row, because a pair is the recall unit: the question alone
  loses the decision, the answer alone loses the ask. Two user messages in a row
  close the previous pair rather than merging into it.
- **No role column.** Who spoke is not something you filter on, and a label that
  does not narrow a search is a promise the index cannot keep. See the note
  below on why it was removed.
- **What is searchable.** User text; assistant text; each tool call reduced to
  its name plus the path, command, or pattern it touched; and the first line of
  a failed tool result. Thinking blocks are dropped, and successful tool output
  is dropped because the tool call already covers it.
- **Content is not copied.** The FTS5 table is external-content over the `turn`
  table, and `text` holds only what is needed to rank and snippet. A 12.6 MB
  index over 140 MB of JSONL. The transcripts stay the source of truth.
- **Forgiving queries.** Bare punctuation and prefix asterisks are FTS5 syntax
  and throw on a question someone actually typed. Every term is quoted, joined
  with `OR`, and the last one also matches as a prefix, so `firecra` finds it.
  bm25 ranks turns matching more terms higher.
- **Live newest session.** The most recently modified file is re-read every run,
  so the conversation you are in is searchable without a manual rebuild.
- **Incremental.** Files whose mtime has not moved are skipped. A repeat index
  is one `stat` per file: 12 ms for 417 sessions.

## Cost

| Operation                           | Measured |
| ----------------------------------- | -------- |
| Cold build, 417 sessions            | 1.3 s    |
| Incremental (newest file + session) | 12-24 ms |
| Query, top 10                       | 2-4 ms   |

Store: `.pi/agent/memory.db`, derived, gitignored, never synced by
`brayness-sync`. Delete it any time.

## Bake-off

Five real questions, index against `rg` (`artifacts/memory-index-bakeoff.mjs`):
index found the right turn in the top 3 every time, 2-4 ms. `rg` found the
containing file every time, 12-25 ms, but only reached it in the _first_ file it
named 4 of 5 times - for one question it returned 204 candidate files with the
answer unranked among them. The win is not that `rg` fails; it is that the index
answers, and `rg` lists.

Keep `rg` for raw archaeology: every occurrence, exact strings, and the Cursor
and Claude Code stores, which this index does not cover.

## A removed column, and why

The first version stored a `role` per row and offered `role: "user"` as a
filter. It was wrong in two ways at once. Pairing meant nearly every row kept the
label `user` while its text was mostly assistant prose, so the filter returned
everything. And the assistant half never became its own row, so
`role: "assistant"` returned nothing. Measured over 3,988 turns: 3,984 `user`,
four `assistant`.

The fix was not to relabel it. A filter that cannot narrow a search should not be
in the tool, and "who said it" was not a question worth answering here - the
useful unit is the exchange. The column, its index, the query parameter, and the
documented filter are all gone.
