# Motion Review Checklist

## Interaction Quality

- The motion explains a state change, not just decoration
- Direction and distance match spatial context
- Enter and exit timing feels intentional and asymmetrical
- Staggering is used only when it improves hierarchy

## Performance

- Primary animated properties are `transform` and/or `opacity`
- No avoidable layout-thrashing animations in frequent interactions
- Layer promotion is controlled and not over-applied
- Interaction remains responsive under realistic load

## Accessibility

- `prefers-reduced-motion: reduce` is implemented
- Reduced-motion behavior keeps state changes understandable
- Focus management remains correct through transitions
- Keyboard and assistive tech flows are not blocked by animation

## View Transitions

- Feature detection and graceful fallback are present
- Shared element naming is scoped and meaningful
- Pseudo-element styles are explicit for root and shared groups
- Cross-document behavior is verified on supported browsers

## Validation

- Tested on desktop and mobile viewport sizes
- Tested in at least one lower-power or throttled scenario
- No visual tearing, clipping, or timing drift in rapid interactions
