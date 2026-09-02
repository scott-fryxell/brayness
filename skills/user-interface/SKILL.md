---
name: user-interface
description: Designs or reviews user interfaces that are self-evident, low-friction, and easy to understand with minimal explanation. Use when simplifying UI text, removing helper copy, improving affordances, tightening hierarchy, making forms more obvious, or evaluating whether an interface works without instructions.
metadata:
  category: Design & UX
  pairs-with:
  - skill: useless
    reason: Native elements carry affordance before CSS; boolean attributes are state CSS reads directly
  - skill: motion-systems
    reason: This skill decides what changes; motion-systems decides how it moves
  tags:
    - ux
    - ui
    - interaction-design
    - forms
    - usability
---

# UX Interface Design

If the UI needs instructions, fix the UI - not the copy. Structure,
hierarchy, constraints, and interaction carry meaning; text confirms it.

Not for: marketing copy, pure visual styling critiques, long-form docs, or
interfaces where detailed explanation is the product.

## Rules

1. **Structure over text.** Layout, grouping, and affordances make meaning;
   labels and helper copy are a last resort. Before adding text: better
   layout, more specific controls, better defaults. Never repeat what
   context shows ("Submit Form" -> "Submit"); never narrate ("Click below
   to continue").
2. **Defaults and constraints over instructions.** Preselect the common
   option; start in the most useful state. Prevent invalid input with
   constraints and live validation instead of explaining rules up front.
3. **Feedback lives at the point of interaction.** No top-of-page error
   summaries, no disconnected instructions. Explain only when an error
   occurs or the system genuinely needs input.
4. **Show, don't tell.** Real previews, inline examples, visible state
   changes - not instructional paragraphs. If explanation is unavoidable,
   one short sentence; needing more means redesign.
5. **Hierarchy over whitespace.** Strong grouping, one obvious primary
   action, visible priority. Dense is fine if it stays scannable. Don't
   name every section - that's the AI verbosity bias.

## Review

1. Remove the descriptive text - does the interface still work?
2. Is there exactly one obvious next action?
3. Fix layout, grouping, defaults, constraints before adding copy.
4. Are errors prevented rather than explained?
5. Delete anything that does not directly enable action - helper text under
   every input, onboarding tooltips for simple flows, pages that explain
   before allowing interaction.

## Integration

- **useless**: the right element is its own affordance - `<details>`
  discloses, `<dialog>` is modal; boolean attributes (`open`, `disabled`)
  are state CSS reads without JS.
- **motion-systems**: what changes is decided here; how it moves is decided
  there.
