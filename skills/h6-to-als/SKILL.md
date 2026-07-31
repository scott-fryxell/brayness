---
name: h6-to-als
description: Generate Ableton Live Set (.als) files for Zoom H6 recording sessions in batch, without opening Live. Use when the user wants to "set up Ableton projects from H6 recordings", "generate .als files", "auto-create Live Sets for sessions", turn Zoom H6 multitrack folders into mixable projects, backfill missing .als files, add Scott 2024 Effect Rack to generated tracks, or when a generated .als fails to load and the generator needs fixing.
---

# H6 to ALS

Batch-generate one Ableton Live Set per Zoom H6 session folder. Each WAV
becomes an audio track with an arrangement clip at bar 1, color from the
Ableton palette, and the Scott 2024 Effect Rack on the device chain.

An `.als` is gzipped XML, so files are built directly - no Live, no MCP
server. **Read `references/als-format.md` before modifying the generator.**

## Preconditions

- Session folders live under the H6 root (default: iCloud
  `~/Library/Mobile Documents/com~apple~CloudDocs/Ableton User Library/H6/<year>/<session>/`).
- The track shell `2024/24-08-28/*.als` and the 12.4 schema donor
  `2026/260607-124031/*.als` still exist under the H6 root (footer,
  returns, Ableton root, and rack fragment schema). Update
  `TEMPLATE_GLOB` / `SCHEMA_GLOB` in the script if either moves.
- Rack fragment
  `references/scott-2024-effect-rack-devices.xml` exists (expanded
  Devices XML; preset paths still point at the Ableton User Library
  `.adg`). Do not load a skill-local `.adg` copy.
- Evicted iCloud files re-download on read; large batches may take time.

## Run

```bash
python3 h6-to-als.py --dry-run            # preview everything
python3 h6-to-als.py                      # generate all missing
python3 h6-to-als.py --year 2026          # one year
python3 h6-to-als.py --only 260205        # substring match on year/name
python3 h6-to-als.py --tempo 92           # arrangement grid BPM (default 120)
python3 h6-to-als.py --base /path/to/H6   # different root
```

Clips are **unwarped** (`IsWarped=false`): audio always plays at real
wall-clock speed. `--tempo` only sets Live's master tempo and how long
clips appear on the beat grid. H6 sessions do not carry a detectable
BPM; tap or type the song tempo in Live after open, or pass `--tempo`
when you know it. Turning Warp on in Live is optional if you later want
the clip to follow tempo changes.
The script resolves relative to its own location; run it from anywhere.

## Ordered flow

1. `--dry-run` first when scanning new folders; check the track lists.
2. Generate one session, open the `.als` in Live, confirm it loads, clips
   play, and the Scott 2024 rack is on each track. Only then batch the rest.
3. Re-run any time; sessions that already have an `.als` are skipped
   (never overwrites). To regenerate, delete the session's `.als` first.

## Safety boundaries

- Never overwrites: any folder containing an `.als` is skipped.
- Writes exactly one file per session: `<session>/<session>.als`.
- WAVs under the session (including subfolders) become tracks.
- Non-WAV audio (mp3/aif) is ignored.

## Failure handling

- Unreadable/non-standard WAV: session is skipped with an error, no
  partial `.als` is written.
- Generated file fails to load in Live ("corrupt"):
  1. `gunzip -c file.als | sed -n '<line>p'` using the line from Live's
     error dialog.
  2. Check `references/als-format.md` - usually id collisions (audio vs
     return track Ids → "Non-unique list ids"), schema mix, or donor
     transport leftovers.
  3. Fix, delete the bad `.als`, regenerate with `--only <session>`.
