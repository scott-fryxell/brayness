# Sources

No external sources. Derived by reverse-engineering real project files
in the H6 library:

- `2024/24-08-28/*.als` (Live 12.0.5) - template source; simplest track
  structure found in the library
- `2026/260207-170338/260207-170338.als` (Live 12.1.5) - rejected as
  template (effect racks, 7-8 clips per track) but used to confirm the
  newer schema and relative-path conventions
- `2026/260115-162443/260115-162443.als` (Live 12.4.3) - donor for
  expanded Scott 2024 Effect Rack Devices XML (paths still reference
  Ableton User Library
  `Presets/Audio Effects/Audio Effect Rack/Scott 2024 Effect Rack.adg`)
- `2024/24-02-05/24-02-05.als` (Live 12.0.2) - reference for 12.0
  Saturator fields (`Oversampling` int, `PreDcFilter Value=`) when
  coercing the 12.4 rack fragment onto the template schema

Decisions and format details: `references/als-format.md`.

Changelog:

- 2026-02 - initial skill; generator written, dry-run + single-session
  generation verified locally (XML validity, id uniqueness, durations,
  path resolution); Live load test pending
- 2026-07 - per-track color cycling; inject Scott 2024 Effect Rack;
  header/footer/returns from Live 12.4.3 donor, track shell from 12.0.5
