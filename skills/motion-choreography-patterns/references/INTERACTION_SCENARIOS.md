# Interaction Scenarios

## Dense Data Table: Row Expansion

Goal: Preserve scan context while revealing details.

- Primary: expanded row container height/opacity transition
- Supporting: detail content fade with small delayed start (`20-40ms`)
- Environment: no global movement

Notes:

- Keep expand/collapse under `220ms`
- Avoid moving unrelated rows long distances

## Kanban Board: Card Move Between Columns

Goal: Keep mental model of card identity while changing position.

- During drag: direct pointer follow (no lag)
- On drop commit: short settle transform (`120-180ms`)
- Supporting: target column highlight fades quickly

Notes:

- Reorder neighbors with brief position transition
- Do not run decorative effects during drag

## Search Results: Filter Change

Goal: Show that content set changed without disorientation.

- Primary: results container root transition (View Transition if supported)
- Supporting: item-level fade/slide for entering cards only
- Environment: filter bar remains stable as anchor

Notes:

- Avoid full-page motion if only result set changed
- Keep query feedback immediate

## Modal Form: Submit Success

Goal: Confirm success while preserving task closure.

- Primary: submit button morph/check state
- Supporting: success message fade in
- Environment: modal exits after short confirmation delay only if appropriate

Notes:

- Keep keyboard focus stable through success state
- Reduced-motion mode should avoid dramatic modal travel
