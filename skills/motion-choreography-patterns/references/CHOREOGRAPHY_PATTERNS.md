# Choreography Patterns

## 1) Staggered Content Reveal

Use for cards, menu sections, or grouped controls when sequence supports reading order.

- Primary: container fade/slide in
- Supporting: children staggered by `20-40ms`
- Environment: optional subtle backdrop shift

Guidelines:

- Keep total cascade short (`<= 320ms` for common UI)
- Use semantic order, not random delay ordering
- Stop stagger for high-density lists where immediate scan is needed

## 2) List Insert / Remove / Reorder

Use FLIP-like logic:

1. Capture first positions
2. Apply DOM/state update
3. Capture last positions
4. Invert with transform
5. Play to zero

Guidelines:

- Reorder motion should be shorter than insert/remove motion
- Avoid bouncing in utility/productivity UIs
- Keep container scroll position stable during transition

## 3) Modal and Overlay Stack

- Primary: dialog panel
- Supporting: focused content block and close action
- Environment: scrim and background de-emphasis

Suggested pattern:

- Enter: scrim fade (`120-180ms`) + panel transform/opacity (`180-260ms`)
- Exit: panel out faster than enter, scrim fades near-synchronously

## 4) Drawer / Side Panel

- Use one dominant axis aligned to drawer direction
- Avoid simultaneous large-scale page zoom while drawer slides
- Keep scrim and panel timing coupled but not identical

## 5) Route or Layout Mode Change

Use View Transitions API where supported for continuity.

- Primary: shared element (title, hero, selected card)
- Supporting: content block fade/slide
- Environment: root transition controlled and calm

## 6) Toast and Ephemeral Feedback

- Enter quickly and non-blocking
- Exit can be slightly faster than enter
- Keep movement small; avoid drawing focus from primary task
