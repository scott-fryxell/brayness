#!/usr/bin/env python3
"""
h6-to-als.py - generate Ableton Live Sets (.als) for Zoom H6 sessions.

For each session folder under H6_BASE with WAV files but no .als,
writes <session>.als: one audio track per WAV with an arrangement
clip at bar 1, plus the template project's two return tracks.

An .als is gzipped XML. We reuse a real project as a template:
header/footer boilerplate, return tracks, and one stripped audio
track whose paths, names, sizes, durations, and ids get rewritten.

Usage:
  h6-to-als.py                    # generate for all sessions missing .als
  h6-to-als.py --dry-run          # list what would be generated
  h6-to-als.py --year 2026        # one year only
  h6-to-als.py --only 260205      # sessions matching substring
  h6-to-als.py --tempo 92         # arrangement BPM (default 120; clips unwarped)
"""

import argparse
import glob
import gzip
import os
import re
import struct
import sys
import zlib

DEFAULT_BASE = os.path.expanduser(
    "~/Library/Mobile Documents/com~apple~CloudDocs/Ableton User Library/H6"
)
# Track shell + 12.4 schema/returns always come from H6 (donors live there).
# --base only changes which tree is scanned for sessions (H5 or H6).
TEMPLATE_BASE = DEFAULT_BASE
# Track shell: simple Live 12.0.5 set (one clip, empty Devices).
TEMPLATE_GLOB = "2024/24-08-28/*.als"
# Footer + return tracks + Ableton root: Live 12.4.3 set that also
# donated the Scott 2024 rack Devices fragment (same schema).
SCHEMA_GLOB = "2026/260115-162443/*.als"
SET_TEMPO = 120  # default arrangement tempo (clip beat math + set tempo)
ID_BASE = 100000  # generated ids start here; template ids are all < 25000
RETURN_ID_BASE = 9000  # keep ReturnTrack Ids clear of audio 0..n

# Template warp-marker pair (sec→beat at 120 BPM); retargeted per --tempo
WARP_SEC = "0.015625"
WARP_BEAT_120 = "0.03125"

H6_BASE = DEFAULT_BASE  # session root; overridden by --base


# ── template ─────────────────────────────────────────────────────────


def load_template():
    track_path = glob.glob(os.path.join(TEMPLATE_BASE, TEMPLATE_GLOB))[0]
    schema_path = glob.glob(os.path.join(TEMPLATE_BASE, SCHEMA_GLOB))[0]
    with gzip.open(track_path, "rt", encoding="utf-8") as f:
        track_xml = f.read()
    with gzip.open(schema_path, "rt", encoding="utf-8") as f:
        schema_xml = f.read()

    # header + footer from the 12.4 schema donor (matches rack fragment)
    t_start = schema_xml.index("<Tracks>") + len("<Tracks>")
    t_end = schema_xml.index("</Tracks>")
    header = schema_xml[:t_start]
    footer = schema_xml[t_end:]

    header = re.sub(
        r'<NextPointeeId Value="\d+" />', '<NextPointeeId Value="99999999" />', header
    )

    # donor left the playhead / selection deep in its own arrangement
    footer = re.sub(
        r'<CurrentTime Value="[^"]*" />', '<CurrentTime Value="0" />', footer, count=1
    )
    footer = re.sub(
        r'<LoopStart Value="[^"]*" />', '<LoopStart Value="0" />', footer, count=1
    )
    footer = re.sub(
        r'<LoopOn Value="[^"]*" />', '<LoopOn Value="false" />', footer, count=1
    )
    footer = re.sub(
        r'(<TimeSelection>\s*<AnchorTime Value=")[^"]+(")',
        r"\g<1>0\g<2>",
        footer,
        count=1,
    )
    footer = re.sub(
        r'(<TimeSelection>\s*<AnchorTime Value="0" />\s*<OtherTime Value=")[^"]+(")',
        r"\g<1>0\g<2>",
        footer,
        count=1,
    )

    # simple audio track shell from the 12.0 template (Id=8: one clip)
    a_start = track_xml.index('<AudioTrack Id="8"')
    a_end = track_xml.index("</AudioTrack>", a_start) + len("</AudioTrack>")
    track_tpl = track_xml[a_start:a_end]

    # return tracks from the 12.4 donor (same schema as footer / rack)
    returns = []
    for i, m in enumerate(re.finditer(r'<ReturnTrack Id="\d+"', schema_xml[t_start:t_end])):
        start = t_start + m.start()
        end = schema_xml.index("</ReturnTrack>", start) + len("</ReturnTrack>")
        ret = schema_xml[start:end]
        # donor uses Id 2/3; audio tracks are 0..n - must not overlap
        ret = re.sub(
            r'<ReturnTrack Id="\d+"',
            f'<ReturnTrack Id="{RETURN_ID_BASE + i}"',
            ret,
            count=1,
        )
        returns.append(ret)

    grab = lambda pat: re.search(pat, track_tpl).group(1)
    tpl = {
        "track": track_tpl,
        "abs": grab(r'<Path Value="([^"]+)" />'),
        "rel": grab(r'<RelativePath Value="([^"]+)" />'),
        "browser": grab(r'<BrowserContentPath Value="([^"]+)" />'),
        "eff_name": grab(r"<EffectiveName Value=\"([^\"]*)\" />"),
        "base": grab(r'<MemorizedFirstClipName Value="([^"]*)" />'),
        "size": grab(r'<OriginalFileSize Value="(\d+)" />'),
        "crc": grab(r'<OriginalCrc Value="(\d+)" />'),
        "mod_date": grab(r'<LastModDate Value="(\d+)" />'),
        "duration": grab(r'<DefaultDuration Value="(\d+)" />'),
        "rate": grab(r'<DefaultSampleRate Value="(\d+)" />'),
        "current_end": grab(r'<CurrentEnd Value="([\d.]+)" />'),
        "loop_end": grab(r'<LoopEnd Value="([\d.]+)" />'),
        "out_marker": grab(r'<OutMarker Value="([\d.]+)" />'),
        "hidden_loop_end": grab(r'<HiddenLoopEnd Value="([\d.]+)" />'),
        "right_time": grab(r'<RightTime Value="([\d.]+)" />'),
    }
    return header, footer, tpl, returns


# ── wav parsing ──────────────────────────────────────────────────────


def wav_info(path):
    """Return (sample_rate, total_frames) by walking RIFF chunks."""
    with open(path, "rb") as f:
        riff = f.read(12)
        if riff[:4] != b"RIFF" or riff[8:12] != b"WAVE":
            return None
        rate = block_align = data_size = None
        while True:
            hdr = f.read(8)
            if len(hdr) < 8:
                break
            chunk_id = hdr[:4]
            chunk_size = struct.unpack("<I", hdr[4:8])[0]
            if chunk_id == b"fmt ":
                fmt = f.read(chunk_size)
                rate = struct.unpack("<I", fmt[4:8])[0]
                block_align = struct.unpack("<H", fmt[12:14])[0]
                if chunk_size % 2:
                    f.read(1)
            elif chunk_id == b"data":
                data_size = chunk_size
                break
            else:
                f.seek(chunk_size + (chunk_size % 2), 1)
        if rate and block_align and data_size:
            return rate, data_size // block_align
    return None


# ── track generation ─────────────────────────────────────────────────

ID_RE = re.compile(
    r"<(AutomationTarget|Pointee|\w*ModulationTarget|FileRef|WarpMarker|AudioClip)\b"
    r'([^>]*?)\bId="(\d+)"'
)


def esc(s):
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


# Ableton color palette - cycle through these
COLORS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69]

# Expanded Scott 2024 Effect Rack (Paths still point at Ableton User Library)
_DEVICE_FRAGMENT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "references",
    "scott-2024-effect-rack-devices.xml",
)
with open(_DEVICE_FRAGMENT, encoding="utf-8") as _f:
    DEVICE_CHAIN_XML = _f.read().rstrip("\n")


def build_track(tpl, session_dir, wav_rel, index, id_counter, tempo, color_offset):
    # wav_rel is path relative to the session folder (may include subdirs)
    base = os.path.splitext(os.path.basename(wav_rel))[0]
    abs_path = os.path.join(session_dir, wav_rel)
    rel_path = os.path.relpath(abs_path, os.path.dirname(H6_BASE))
    browser_path = "query:UserLibrary#" + rel_path.replace("/", ":")

    info = wav_info(abs_path)
    if info is None:
        raise ValueError(f"not a standard WAV: {wav_name}")
    rate, frames = info
    # Clip time fields are not all the same unit/role. On the 12.0 track
    # shell Live saved: CurrentEnd ≈ sec*tempo/60 (arrangement span),
    # OutMarker/HiddenLoopEnd/RightTime ≈ sec, LoopEnd ≈ CurrentEnd/2.
    # Writing beat-length into every field made clips ~2x the audio.
    sec = frames / rate
    beats = sec * tempo / 60
    sample_end = sec
    loop_end = beats / 2
    size = str(os.path.getsize(abs_path))
    mod_date = str(int(os.path.getmtime(abs_path)))

    t = tpl["track"]
    # paths first (they contain the old basename)
    t = t.replace(tpl["abs"], esc(abs_path))
    t = t.replace(tpl["rel"], esc(rel_path))
    t = t.replace(tpl["browser"], esc(browser_path))
    # names: exact quoted values only match the name slots
    t = t.replace(f'Value="{tpl["eff_name"]}"', f'Value="{index + 1}-{esc(base)}"')
    t = t.replace(f'Value="{tpl["base"]}"', f'Value="{esc(base)}"')
    # file metadata
    t = t.replace(f'<OriginalFileSize Value="{tpl["size"]}" />',
                  f'<OriginalFileSize Value="{size}" />')
    t = t.replace(f'<OriginalCrc Value="{tpl["crc"]}" />',
                  '<OriginalCrc Value="0" />')
    t = t.replace(f'<LastModDate Value="{tpl["mod_date"]}" />',
                  f'<LastModDate Value="{mod_date}" />')
    t = t.replace(f'<DefaultDuration Value="{tpl["duration"]}" />',
                  f'<DefaultDuration Value="{frames}" />')
    t = t.replace(f'<DefaultSampleRate Value="{tpl["rate"]}" />',
                  f'<DefaultSampleRate Value="{rate}" />')
    # clip timing
    t = t.replace(f'<CurrentEnd Value="{tpl["current_end"]}" />',
                  f'<CurrentEnd Value="{beats}" />')
    t = t.replace(f'<LoopEnd Value="{tpl["loop_end"]}" />',
                  f'<LoopEnd Value="{loop_end}" />')
    t = t.replace(f'<OutMarker Value="{tpl["out_marker"]}" />',
                  f'<OutMarker Value="{sample_end}" />')
    t = t.replace(f'<HiddenLoopEnd Value="{tpl["hidden_loop_end"]}" />',
                  f'<HiddenLoopEnd Value="{sample_end}" />')
    t = t.replace(f'<RightTime Value="{tpl["right_time"]}" />',
                  f'<RightTime Value="{sample_end}" />')
    # warp-marker pair must match arrangement tempo (IsWarped stays false)
    warp_beat = str(float(WARP_SEC) * tempo / 60)
    t = t.replace(
        f'SecTime="{WARP_SEC}" BeatTime="{WARP_BEAT_120}"',
        f'SecTime="{WARP_SEC}" BeatTime="{warp_beat}"',
    )
    # track id
    t = t.replace('<AudioTrack Id="8"', f'<AudioTrack Id="{index}"', 1)
    # color: per-session offset + per-track cycle
    color = COLORS[(color_offset + index) % len(COLORS)]
    t = t.replace('<Color Value="26" />', f'<Color Value="{color}" />')
    # track-level Devices only (template has one empty <Devices />)
    t = t.replace("<Devices />", DEVICE_CHAIN_XML, 1)

    # renumber global ids so tracks don't collide
    def repl(m):
        new_id = id_counter[0]
        id_counter[0] += 1
        return f'<{m.group(1)}{m.group(2)}Id="{new_id}"'

    return ID_RE.sub(repl, t)


# ── sessions ─────────────────────────────────────────────────────────


def session_wavs(session):
    """WAV paths relative to session, including subfolders (sorted)."""
    found = []
    for root, _dirs, files in os.walk(session):
        for f in files:
            if f.lower().endswith(".wav"):
                full = os.path.join(root, f)
                found.append(os.path.relpath(full, session))
    return sorted(found)


def find_sessions(years, only):
    for year_dir in sorted(glob.glob(os.path.join(H6_BASE, "*/"))):
        year = os.path.basename(year_dir.rstrip("/"))
        if years and year not in years:
            continue
        for session in sorted(glob.glob(os.path.join(year_dir, "*/"))):
            name = os.path.basename(session.rstrip("/"))
            if only and only not in f"{year}/{name}":
                continue
            has_als = bool(
                glob.glob(os.path.join(session, "*.als"))
                or glob.glob(os.path.join(session, "*.ALS"))
            )
            # skip WAV walk when an .als already exists (avoids iCloud thrash)
            if has_als:
                yield session, year, name, [], True
                continue
            wavs = session_wavs(session)
            if not wavs:
                continue
            yield session, year, name, wavs, False


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--year", action="append", help="limit to year(s)")
    ap.add_argument("--only", help="limit to sessions containing substring")
    ap.add_argument(
        "--base",
        help=f"session root to scan (default: {DEFAULT_BASE}). "
        "Template/schema donors always load from H6.",
    )
    ap.add_argument(
        "--tempo",
        type=float,
        default=SET_TEMPO,
        help=f"arrangement tempo in BPM (default: {SET_TEMPO}). "
        "Clips stay unwarped (play at real speed); this only sets the grid.",
    )
    args = ap.parse_args()

    global H6_BASE
    if args.base:
        H6_BASE = os.path.expanduser(args.base)
    tempo = args.tempo

    header, footer, tpl, returns = load_template()
    # master tempo in footer (Warp off: audio speed unchanged)
    footer = re.sub(
        r'(<Tempo>\s*<LomId Value="0" />\s*<Manual Value=")[^"]+(")',
        rf"\g<1>{tempo}\g<2>",
        footer,
        count=1,
    )

    made = skipped = 0
    for session, year, name, wavs, has_als in find_sessions(args.year, args.only):
        label = f"{year}/{name}"
        if has_als:
            print(f"skip  {label} (already has .als)")
            skipped += 1
            continue

        out_path = os.path.join(session, f"{name}.als")
        print(f"make  {label}: {len(wavs)} tracks @ {tempo} BPM -> {name}.als")
        for w in wavs:
            print(f"        {w}")

        if not args.dry_run:
            id_counter = [ID_BASE]
            color_offset = zlib.adler32(label.encode()) % len(COLORS)
            tracks = []
            for i, wav in enumerate(wavs):
                try:
                    tracks.append(
                        build_track(
                            tpl, session, wav, i, id_counter, tempo, color_offset
                        )
                    )
                except ValueError as e:
                    print(f"        ERROR: {e}")
                    break
            else:
                xml = header + "\n".join(tracks + returns) + footer
                # must exceed every Id in the set (returns/rack keep donor ids)
                max_id = max(int(i) for i in re.findall(r'\bId="(\d+)"', xml))
                xml = re.sub(
                    r'<NextPointeeId Value="\d+" />',
                    f'<NextPointeeId Value="{max_id + 1}" />',
                    xml,
                    count=1,
                )
                # transport loop brace: donor left a long LoopLength (e.g. bar 89)
                ends = [
                    float(v)
                    for t in tracks
                    for v in re.findall(r'<CurrentEnd Value="([^"]*)"', t)
                ]
                max_end = max(ends) if ends else 4.0
                loop_len = max(4, int((max_end + 3.999) // 4) * 4)
                xml = re.sub(
                    r'(<Transport>[\s\S]*?<LoopLength Value=")[^"]+(")',
                    rf"\g<1>{loop_len}\g<2>",
                    xml,
                    count=1,
                )
                with gzip.open(out_path, "wt", encoding="utf-8") as f:
                    f.write(xml)
                made += 1

    print(f"\n{made} generated, {skipped} skipped (existing .als)")
    if args.dry_run:
        print("(dry run - nothing written)")


if __name__ == "__main__":
    main()
