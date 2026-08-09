---
name: motion-choreography-patterns
description: Use when orchestrating multi-element UI motion, stagger systems, list reorder/insert/remove flows, modal and overlay stacks, gesture-driven transitions, and route-level choreography that preserves hierarchy and attention.
metadata:
  category: Design & Frontend
  pairs-with:
  - skill: motion-systems
    reason: Sibling skill - motion-systems covers mechanism selection and tokens; this covers multi-element sequencing and choreography
  - skill: user-interface
    reason: Choreography serves UX goals - attention, hierarchy, continuity
  - skill: realness-design
    reason: Design-system skills defer animation decisions to the motion pair
---

# Motion Choreography Patterns

How multiple moving parts coordinate in time and space to communicate
interaction intent. Mechanism selection and tokens live in `motion-systems`;
this skill owns sequencing.

## Choreography Model

Treat each sequence as three actor layers:

1. **Primary actor** - the element representing the state change
2. **Supporting actors** - nearby elements that reinforce context
3. **Environment actors** - backdrop, scrim, container, page-level continuity

Animate primary first, then supporting, then environment unless the interaction model requires the reverse.

## Timing Architecture

Use predictable beat structure:

- **Lead beat** (`0-80ms`) - immediate acknowledgment
- **Primary beat** (`120-240ms`) - main state change
- **Follow beat** (`20-60ms` offset) - supporting context update
- **Settle beat** (`80-180ms`) - final stabilization

Favor asymmetry: exits slightly faster than enters.

## Core Choreography Principles

- One dominant axis per beat (avoid conflicting direction signals)
- Keep simultaneous high-amplitude motions limited
- Use stagger only when it improves scan order and hierarchy
- Keep rhythm consistent across similar components
- Preserve spatial anchors during reflow/reorder transitions

## Pattern Library

For concrete recipes and timelines, see:

- [references/CHOREOGRAPHY_PATTERNS.md](references/CHOREOGRAPHY_PATTERNS.md)
- [references/INTERACTION_SCENARIOS.md](references/INTERACTION_SCENARIOS.md)

For reusable stagger utilities, see:

- [references/STAGGER_SYSTEMS.css](references/STAGGER_SYSTEMS.css)

## Input-to-Motion Mapping

- **Tap/click:** immediate visual response in under `80ms`
- **Press/hold:** include press state before commitment transition
- **Drag:** motion follows pointer directly; settle animation occurs only on drop/commit
- **Keyboard navigation:** preserve focus continuity and avoid disorienting travel

## Reduced Motion Choreography

When reduced motion is requested:

- Remove spatial travel when possible
- Keep sequencing logic with opacity/state changes
- Preserve hierarchy with contrast, layering, and timing rather than movement distance
- Ensure state change remains obvious and immediate

## Anti-Patterns

- Cascades that delay interaction completion
- Independent components using unrelated easing and duration tokens
- Large travel distances for frequent interactions
- Simultaneous enter and exit motions that compete for focus
- Decorative infinite animations in core task surfaces

## Output Contract

Use the same five-section format as `motion-systems`: Intent -> Motion Spec -> Implementation -> Accessibility Fallback -> QA Checklist. Replace "Intent" with "Storyboard" (who moves, in what order, and why) when orchestrating multiple elements.

QA reference: [references/QA_STORYBOARD_CHECKLIST.md](references/QA_STORYBOARD_CHECKLIST.md)
