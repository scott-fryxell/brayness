---
name: hyperframes
description: Create video compositions, animations, title cards, overlays, captions, voiceovers, audio-reactive visuals, and scene transitions in HyperFrames HTML. Use for any HTML-based video work - authoring compositions, syncing captions to audio, generating TTS narration, running the dev loop (init, lint, inspect, preview, render), preprocessing assets (tts, transcribe, remove-background), or installing/contributing registry blocks.
---

# HyperFrames

HTML is the source of truth for video. A composition is an HTML file with
`data-*` attributes for timing, a GSAP timeline for animation, and CSS for
appearance. The framework handles clip visibility, media playback, and
timeline sync.

Attribute API, composition/template structure, variables, and media rules:
[references/authoring.md](references/authoring.md). Read it before writing
your first composition HTML in a session.

## Approach

### Discovery (exploratory requests only)

For open-ended requests ("make me a product launch video") where the user
hasn't committed to a direction, understand intent before picking colors:
audience, platform, priority (motion quality vs accuracy vs speed), and
whether they want variations. If variations, offer 2-3 that differ in
pacing or structure - one safe, one ambitious - not color swaps.

For specific requests ("add a title card", "fix scene 3 timing"), skip
discovery.

### Step 1: Design system

If `design.md` or `DESIGN.md` exists, read it first (both casings - they're
different files on Linux). It's the source of truth for brand colors,
fonts, and constraints - use its exact values. If it names fonts with no
`.woff2` files in `fonts/` and no built-in match, warn the user before
writing HTML.

If no `design.md` exists, offer a choice:

1. **User named a style or mood?** Read [visual-styles.md](./visual-styles.md)
   (8 named presets), pick the closest.
2. **Browse visually?** Run the design picker -
   [references/design-picker.md](references/design-picker.md).
3. **Go fast?** Ask mood, light/dark, brand colors/fonts; pick a palette
   from [house-style.md](./house-style.md).

**design.md defines the brand, not video composition rules.** Those come
from [references/video-composition.md](references/video-composition.md) and
[house-style.md](./house-style.md). Brand colors at video scale, not web-UI
opacity.

### Step 2: Prompt expansion

Run on every composition except single-scene pieces and trivial edits -
grounds intent against design.md/house-style.md into a consistent
intermediate. Process and format:
[references/prompt-expansion.md](references/prompt-expansion.md).

### Step 3: Plan

1. **What** - narrative arc, key moments, emotional beats.
2. **Structure** - how many compositions, sub-comps vs inline, which tracks
   carry what.
3. **Rhythm** - declare the scene rhythm before implementing
   (fast-fast-SLOW-fast-SHADER-hold). Templates:
   [references/beat-direction.md](references/beat-direction.md).
4. **Timing** - which clips drive duration, where transitions land.
5. **Layout** - build the end state first (next section).
6. **Animate** - then add motion.

**Build what was asked.** "A title card" is not "a title card + 3
supporting scenes + music + captions." Propose extras; don't add them.

For small edits, skip straight to the rules.

<HARD-GATE>
Before writing ANY composition HTML - verify you have a visual identity from Step 1. If you're reaching for `#333`, `#3b82f6`, or `Roboto`, you skipped it.
</HARD-GATE>

## Layout Before Animation

Position every element where it should be at its **most visible moment** -
fully entered, correctly placed, not yet exiting. Write that as static
HTML+CSS first. No GSAP yet.

Why: if you position elements at their animated start state (offscreen,
opacity 0) and tween toward where you think they land, you're guessing the
final layout, and overlaps stay invisible until render. Build the end state
first and layout bugs are visible before motion exists.

1. **Identify the hero frame** per scene - the moment most elements are
   simultaneously visible. Build that layout.
2. **Write static CSS** for it. `.scene-content` MUST fill the scene:
   `width: 100%; height: 100%; padding: Npx;` with
   `display: flex; flex-direction: column; gap: Npx; box-sizing: border-box`.
   Padding pushes content inward - NEVER `position: absolute; top: Npx` on
   a content container (it overflows when content grows). Reserve absolute
   positioning for decoratives.
3. **Entrances with `gsap.from()`** - animate FROM offscreen TO the CSS
   position. CSS is ground truth; the tween is the journey. (Sub-comps
   loaded via `data-composition-src`: prefer `gsap.fromTo()` - see
   [references/motion-principles.md](references/motion-principles.md).)
4. **Final scene only: exits with `gsap.to()`.** All other scenes end fully
   visible - the transition IS the exit (transition rule 3 below).

If element A exits before element B enters in the same area, give both
correct CSS positions for their own hero frames - the timeline keeps them
from coexisting, and the layout step catches accidental overlap from timing
errors. Intentional layering (glow behind text, card stacks) is fine; the
step exists to catch unintentional overlap - two headlines colliding, a
stat covering a label, content off-frame.

## Timeline Contract

- All timelines start `{ paused: true }` - the player controls playback
- Register every timeline: `window.__timelines["<composition-id>"] = tl`
- Framework auto-nests sub-timelines - do NOT manually add them
- Duration comes from `data-duration`, not GSAP timeline length
- Never create empty tweens to set duration

## Rules (Non-Negotiable)

**Deterministic:** no `Math.random()`, `Date.now()`, or time-based logic.
Seeded PRNG (e.g. mulberry32) for pseudo-random.

**GSAP:** only animate visual properties (`opacity`, `x`, `y`, `scale`,
`rotation`, `color`, `backgroundColor`, `borderRadius`, transforms). Never
animate `visibility` or `display`; never call `video.play()`/`audio.play()`.

**Animation conflicts:** never animate the same property on the same
element from multiple timelines simultaneously.

**No `repeat: -1`:** infinite repeats break the capture engine. Compute
`repeat: Math.ceil(duration / cycleDuration) - 1`.

**Synchronous timeline construction:** never build timelines inside
`async`/`await`, `setTimeout`, or Promises - the capture engine reads
`window.__timelines` synchronously after load. Fonts are embedded by the
compiler; no font-load waiting.

**Never do:**

1. Forget `window.__timelines` registration
2. Use video for audio - always muted video + separate `<audio>`
3. Nest video inside a timed div - use a non-timed wrapper
4. Use `data-layer` (use `data-track-index`) or `data-end` (use `data-duration`)
5. Animate video element dimensions - animate a wrapper div
6. Call play/pause/seek on media - framework owns playback
7. Create a top-level container without `data-composition-id`
8. Use `repeat: -1` on any timeline or tween
9. Build timelines asynchronously
10. Use `gsap.set()` on clip elements from later scenes - they don't exist
    in the DOM at page load. Use `tl.set(selector, vars, timePosition)` at
    or after the clip's `data-start`.
11. Use `<br>` in content text - it stacks with natural wrapping and causes
    overlap; use `max-width` instead. Exception: short display titles
    deliberately one word per line.

## Scene Transitions (Non-Negotiable)

Every multi-scene composition MUST follow all four. Violating any one is a
broken composition.

1. **ALWAYS use transitions between scenes.** No jump cuts.
2. **ALWAYS animate every element IN via `gsap.from()`.** Nothing appears
   fully formed. Five elements means five entrance tweens.
3. **NEVER use exit animations** except on the final scene. No `gsap.to()`
   fading opacity, moving offscreen, or scaling to 0 before a transition -
   the transition IS the exit, and the outgoing scene must be fully visible
   when it fires. An exit tween before a transition hands the transition an
   empty frame.
4. **Final scene only** may fade elements out.

Transition selection and implementation:
[references/transitions.md](references/transitions.md).

## Animation Guardrails

- Offset first animation 0.1-0.3s (not t=0)
- Vary eases - at least 3 different eases per scene, no repeated entrance
  pattern within a scene
- Avoid full-screen linear gradients on dark backgrounds (H.264 banding) -
  radial or solid + localized glow
- 60px+ headlines, 20px+ body, 16px+ data labels
- `font-variant-numeric: tabular-nums` on number columns

## Editing Existing Compositions

- **Read actual files, don't guess.** The composition IS the spec - extract
  exact hex codes, fonts, and easing patterns from source, not memory.
- Only change what was requested; preserve timing of unrelated clips.

## Output Checklist

**Fast (run immediately, block on results):**

- [ ] `npx hyperframes lint` and `npx hyperframes validate` both pass
- [ ] Design adherence verified if design.md exists

**Slow (run in parallel while presenting the preview):**

- [ ] `npx hyperframes inspect` passes, or every reported overflow is
      intentionally marked
- [ ] Contrast warnings addressed
- [ ] Animation choreography verified (animation-map script)

How to run and fix each check:
[references/quality-checks.md](references/quality-checks.md).

## Reference Index

**Always read for any new composition:**

| File | Covers |
| --- | --- |
| [references/authoring.md](references/authoring.md) | data attributes, template structure, variables, video/audio, fonts/assets |
| [references/video-composition.md](references/video-composition.md) | video-medium rules - these override web instincts |
| [references/typography.md](references/typography.md) | font pairing, OpenType, dark-background adjustments |
| [references/motion-principles.md](references/motion-principles.md) | motion design, image motion, load-bearing GSAP rules |

**Also always read for multi-scene compositions:**

| File | Covers |
| --- | --- |
| [references/beat-direction.md](references/beat-direction.md) | rhythm templates, choreography verbs, depth layers |
| [references/transitions.md](references/transitions.md) | transition selection; [catalog](references/transitions/catalog.md) routes to implementations; shader transitions live in the `@hyperframes/shader-transitions` npm package (read its source in `node_modules`) |

**Read when the task calls for it:**

| File | Read when |
| --- | --- |
| [references/quality-checks.md](references/quality-checks.md) | running inspect/contrast/design/animation-map checks |
| [references/cli.md](references/cli.md) | any CLI command; build/render troubleshooting |
| [references/captions.md](references/captions.md) | any text synced to audio timing |
| [references/transcript-guide.md](references/transcript-guide.md) | caption-side transcript handling (CLI invocation lives in media.md) |
| [references/dynamic-techniques.md](references/dynamic-techniques.md) | dynamic caption animation (karaoke, slam, scatter) |
| [references/audio-reactive.md](references/audio-reactive.md) | visuals responding to music/voice |
| [references/css-patterns.md](references/css-patterns.md) | marker highlighting (highlight, circle, burst, scribble) |
| [references/techniques.md](references/techniques.md) | planning techniques per beat (11 patterns with code) |
| [references/narration.md](references/narration.md) | voiceover/TTS pacing and script structure |
| [references/media.md](references/media.md) | TTS (Kokoro), transcription (Whisper), background removal |
| [references/prompt-expansion.md](references/prompt-expansion.md) | Step 2 of the approach |
| [references/design-picker.md](references/design-picker.md) | creating a design.md visually |
| [references/from-website.md](references/from-website.md) | turning a website into a video |
| [references/registry.md](references/registry.md) | installing/contributing registry blocks (`hyperframes add`) |
| [visual-styles.md](./visual-styles.md) | user names a style; generating design.md |
| [house-style.md](./house-style.md) | aesthetic defaults when no design.md |
| [patterns.md](./patterns.md) | PiP, title cards, slide shows |
| [data-in-motion.md](./data-in-motion.md) | data, stats, infographics |

**Runtime adapters** (read when the composition uses that runtime instead
of GSAP): [waapi](references/adapters/waapi.md),
[lottie](references/adapters/lottie.md),
[three](references/adapters/three.md),
[animejs](references/adapters/animejs.md),
[css-animations](references/adapters/css-animations.md),
[typegpu](references/adapters/typegpu.md).
