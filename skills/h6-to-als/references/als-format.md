# ALS format notes

Reverse-engineered from real project files (Live 12.0.5 / 12.1.5 /
12.4.3). Read this before touching `h6-to-als.py`.

## Anatomy

- `.als` = gzipped XML. `gzip.open(path, "rt")` reads it.
- Root: `<Ableton MajorVersion MinorVersion SchemaChangeCount Creator Revision>`
  with one `<LiveSet>` child.
- `<LiveSet>` layout: preamble (NextPointeeId, OverwriteProtectionNumber),
  `<Tracks>`, then a large footer (MainTrack, Scenes, Transport, view
  state, GroovePool, NoteAlgorithms, ...).
- Live upgrades older sets on open, so generating the 12.0 format and
  opening in 12.1+ is fine. Generating an older, simpler schema on
  purpose is a valid strategy.

## Generation strategy

Do not hand-write track XML (tried, abandoned - too much schema detail).
Instead cut real projects into pieces and substitute:

1. header = everything through `<Tracks>` from the **12.4 schema donor**
   (`SCHEMA_GLOB` = `2026/260607-124031/*.als`)
2. track template = one `<AudioTrack>` from the **12.0 shell**
   (`TEMPLATE_GLOB` = `2024/24-08-28/*.als`) - single clip, empty Devices;
   rack fragment injected per track at generate time
3. return tracks = both `<ReturnTrack>` elements from the **12.4 donor**
4. footer = from `</Tracks>` to EOF from the **12.4 donor** (empty scene
   clip slots; list wrappers self-closed)

Keep header/footer/returns/rack on the same Live schema. Mixing a 12.4
rack into a 12.0 footer (e.g. `ScaleInformation/Name Value="Major"`)
makes Live report corrupt sets. The 12.0 project stays useful only as
the thin audio-track shell.

After taking the donor footer, reset transport `CurrentTime`, loop
start/on, and arrangement `TimeSelection` (AnchorTime/OtherTime) to 0 -
the donor playhead/selection is otherwise left far past short H6 clips
(e.g. bar 159). Set transport `LoopLength` from the longest clip
`CurrentEnd`, rounded up to a whole bar (donor left e.g. bar 89).

## Substitution rules (per generated track)

Order matters: paths first (they contain the old basename), then names
matched as exact quoted `Value="..."` so path contents are untouched.

- `<Path Value=...>` -> absolute file path
- `<RelativePath Value=...>` -> path relative to the User Library,
  slash form (`H6/2026/session/ZOOM0001.WAV`); `RelativePathType` stays 6
- `<BrowserContentPath>` -> `query:UserLibrary#` + relative path with
  `:` separators
- `EffectiveName` -> `<n>-<basename>` (Ableton's own naming style)
- `MemorizedFirstClipName` and clip `<Name>` -> `<basename>`
- `OriginalFileSize`, `LastModDate` (mtime), `DefaultDuration` (frames),
  `DefaultSampleRate` -> real values from the WAV
- `OriginalCrc` -> 0 (Live recalculates; real CRCs not required)
- Clip timing (`CurrentEnd`, `LoopEnd`, `OutMarker`, `HiddenLoopEnd`,
  ScrollerTimePreserver `RightTime`) -> clip length in beats
- `AudioTrack Id` -> 0..n per project
- `<Color Value=...>` -> cycle Ableton palette by track index
- track-level `<Devices />` -> Scott 2024 rack fragment (see below)

Beat math at `--tempo` (default 120): arrangement `CurrentEnd` =
`sec * tempo / 60`. On the 12.0 track shell, `OutMarker` /
`HiddenLoopEnd` / `RightTime` follow Live's saved shape (`≈ sec`), and
`LoopEnd ≈ CurrentEnd / 2`. Clips stay `IsWarped=false`. Writing the
full beat length into every end field made clips ~2x the audio.
Warp-marker pair is retargeted so `BeatTime/SecTime` matches `--tempo`.
H6 WAVs have no BPM metadata - pass `--tempo` or set tempo in Live.

WAV parsing walks RIFF chunks (`fmt ` -> rate + block align, `data` ->
size; frames = data size / block align). Do not assume a fixed 44-byte
header.

## ID renumbering

File-global ids must be unique within the generated set or Live may
refuse or misbehave. Renumber with a per-project counter starting at
100000 (template ids are all < 25000):

- global: `AutomationTarget`, `Pointee`, `*ModulationTarget`,
  `AudioClip`, `FileRef` (when it has an Id), `WarpMarker`
- scoped, leave as-is: `ClipSlot`, `AutomationLane`,
  `RemoteableTimeSignature`, `SourceContext`, `TrackSendHolder`

Bump header `<NextPointeeId>` to the next free id after generation
(must exceed every `Id` in the set; the rack fragment alone uses
thousands of ids per track).

Duplicate `Id="0"` values in scoped tags exist in real Live files and
are tolerated.

## Effect rack on audio tracks

Ableton does not support a path-only rack stub. A track's Devices must
contain the **expanded** `AudioEffectGroupDevice` tree (Eq8, Saturator,
Glue, macros). The `.adg` is a different schema (`GroupDevicePreset` /
`BranchPresets`) and is not drop-in.

Source of truth for injection:

- Fragment file: `references/scott-2024-effect-rack-devices.xml`
- Extracted from `H6/2026/260607-124031/260607-124031.als` (Live 12.4.3)
- `Path` / `RelativePath` still point at Ableton User Library:
  `Presets/Audio Effects/Audio Effect Rack/Scott 2024 Effect Rack.adg`
- Do not read a skill-local `.adg` copy

The track shell stays the simple 12.0.5 cut; header, footer, returns,
and this fragment all come from the Live 12.4.3 donor so schema stays
consistent (see Generation strategy). Do not coerce rack fields back to
12.0 shapes.

Replace only the track-level empty `<Devices />` (count=1) so clip
device chains stay untouched. Then run the usual id renumberer.

If Live reports "corrupt" with a path under `.../Devices/N/...`,
compare that node to the donor set and the fragment; prefer matching
12.4 structure over inventing 12.0 equivalents.

## Known limitations

- WAVs under the session folder (including subfolders) become tracks.
- No mp3/aif support (parser is PCM WAV only).
- All tracks share the template's sends and two return tracks
  (A-Reverb, B-Delay) - intentional, matches existing projects.
  ReturnTrack Ids are remumbered to `9000+` so they never collide with
  audio track Ids `0..n` ("Non-unique list ids" in Live).
- Track colors cycle the Ableton palette with a per-session offset
  (stable hash of `year/name`) so projects do not all start on color 0;
  each track gets the Scott 2024 rack.
- Return-track device presets (`.adv`/`.amxd`) resolve via Ableton's
  factory library, not the filesystem `Path` - they show as "missing"
  in naive path checks but load fine in Live.
- Regenerating requires deleting the existing `.als` first (no overwrite).

## Verified

- 2026-02: generated set for `2026/260205-heavyness` (5 tracks) parses,
  ids unique, durations match files, paths resolve. Loaded in Live:
  pending user confirmation at time of writing.
- 2026-07: `2026/260603-104725` loads in Live 12.4.3 with Scott 2024
  Effect Rack on each track (12.4 donor header/footer/returns + rack
  fragment; `NextPointeeId` = max Id + 1).
