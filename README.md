# Analog Studio — Pebble

A configurable native watchface for Pebble Time 2 (Emery), Pebble 2 SE
(Diorite), Pebble Time Round (Chalk), and Pebble Round 2 (Gabbro). All four
share one UUID and one settings protocol. **Version 0.3.0 is published** as
[Analog Studio](https://apps.repebble.com/8e2e3c5a1eed4c9da3c5b424), verified
September 5, 2026. The source directory and local package name remain
`classic-studio`; publication did not rename persisted settings or identifiers.
See [publication evidence](../store/classic-studio/PUBLICATION.md).

Physical-watch readability, battery behavior, and real-phone settings delivery
remain unverified. The emulator evidence below must not be read as hardware
validation. Next: test settings and restart retention on the Time 2 and 2 SE,
then refine Ivory's yellow cast and the visibly striped/pixel-heavy bezels.

The three construction studies are Ivory, Frost, and Noir. Bezel and dial
materials can be selected independently; hands, markings, date, seconds, and
contrast remain native drawing operations. The bitmap resources contain static
materials only. Monochrome uses purpose-built linework, not a grayscale filter;
color-only finishes share the same light or dark treatment there.

## Configuration

The settings gear opens a bundled, dependency-free form. It works without a
hosted configuration site. A link opens the online visual editor when desired.
Both return a versioned code to the watch:

`L1:recipe:bezel:dial:hands:marks:date:seconds:contrast`

Recipe accepts `1–3`; bezel and dial accept `1–6`; hands and marks accept `0–2`, where `0`
follows the recipe; the last three fields accept `0` or `1`. All fields are
single digits. Unknown versions, extra fields, whitespace, or unsupported
values are rejected without replacing the last valid configuration.

The six bezel finishes are Brass, Cool Chrome, Noir, Warm Copper, Blued Steel,
and Verdigris. The six dial finishes are Ivory, Frost, Ink Black, Verdigris,
Ocean, and Rosewood. Finish IDs 1–3 and the original artwork IDs 1–27 are
unchanged. Additional material combinations append artwork IDs 28–108.
New finishes require the 0.2.0 binary or later; installing it preserves existing
valid settings. Older binaries reject the new finish IDs rather than guessing.

The phone sends `STUDIO_CODE` as a string. The watch validates the entire
configuration before changing it, loads only the selected background, and saves
the accepted code in persistent storage. A background-load or persistence
failure restores the previous selection. Seconds are off by default; enabling
them increases redraws from once per minute to once per second.

## Build and checks

Use Pebble Tool 5.0.x with SDK 4.33.1:

```sh
pebble build
node --test test/settings.test.js
cc -std=c11 -Wall -Wextra -Werror test/settings_host.c -o /tmp/ambient-studio-settings-test
/tmp/ambient-studio-settings-test
```

The asset generator in the repository root supplies 108 combinations per device
under `resources/images/<platform>/`. Gabbro uses three indexed tone masks,
recolored natively; its full-color PNGs are reference composites, not 108
separate bundled textures. Platform-qualified resources share identifiers.
`build/classic-studio.pbw` includes the four declared devices.

Emulator installation is a test operation, not store publication or physical
device evidence. Do not wipe emulator persistence while verifying retention.

```sh
pebble install --emulator emery
pebble send-app-message --emulator emery --string 10000=L1:2:2:2:0:0:0:0:0
pebble screenshot --emulator emery --no-correction --no-open /absolute/test-frame.png
```

## Limits

This is not a CSS engine or every Watch Face Lab recipe. Unsupported components
are rejected rather than substituted. Palette limits, system-font rasterization,
and small-screen geometry mean the web editor is a material/layout preview,
not a promise of pixel-identical output. Hardware readability, battery behavior,
and phone settings-webview checks remain required before release.

## Round support — 0.3.0, 2026-09-04

Time Round (180×180) and Round 2 (260×260) have circular, screen-filling
bezels and an inset dial; numeral size and radial spacing follow screen size.
Both are watchfaces in the same PBW, not separate apps. The phone settings route
to the matching preview; all previous L1 codes and the UUID are unchanged.

Chalk resources are 238,674 bytes. The initial Gabbro build ran but exceeded
the SDK's 262,144-byte store limit. Rather than remove materials, it now stores
three shared grayscale masks and substitutes the metal/dial palette after
loading a fresh bitmap. That brings its pack to **13,568 bytes**. The masks are
forced to `2BitPalette`; the native loader also recolors any rollback image.
Time 2 and 2 SE retain their previous artwork byte-for-byte, with resource
packs of 143,376 and 8,078 bytes respectively.

All 108 Gabbro reference composites reconstruct exactly from those masks and
palettes in the host test. All 7,776 codes still round-trip. Staging fails if any
platform exceeds the store resource limit or lacks evidence matching the PBW.
Native emulator reports and their package hashes live in `evidence/`.

Final PBW SHA-256:
`e604aa4557bd9f35e4516e02ee9b914f3471a50360075f922bd10d78e0fa88c9`.
All four isolated emulator passes succeeded: three recipes, new material
selections, invalid-input rejection, restart retention, and second-hand motion.
Free heap during the inspected frames remained above 44 KB on Chalk, 109 KB
on Gabbro, 103 KB on Emery, and 58 KB on Diorite. Reports match this package.
These are simulator checks, not physical-watch or phone-webview evidence.

Run `test/emulator_smoke.py` separately for `gabbro`, `chalk`, `emery`, and
`diorite`, then `node test/stage-assets.mjs`. The latter stages five native
screenshots per platform and copies the reviewed evidence reports. Store
banners are generated separately by `../render-store-banners.mjs classic-studio`.
Neither step changes a store listing or physical watch.

## Historical 0.2.0 pilot evidence — 2026-09-04

- PBW SHA-256: `007a938fc584f3fc1ba348f40d373ceb69942fbff70f8a9c14aab706029692bf`.
- Both declared devices compile. Emery resources occupy 143,376 bytes; Diorite
  resources occupy 8,078 bytes, below their 256 KB resource limit.
- Native C tests exhaust all 7,776 valid configurations and check malformed
  codes leave the previous structure unchanged. Every artwork index 1–108 is
  reachable, with legacy IDs 1–27 unchanged. Four phone-side tests pass.
- Isolated, persistent Emery and Diorite emulator profiles visibly render all
  three recipes and Copper/Verdigris, Blued Steel/Ocean, and Verdigris/Rosewood
  pairings. Custom material/hand/mark/date changes apply; an invalid finish ID 7
  leaves the image unchanged; process restart restores the same image; enabled
  seconds move naturally. No emulator flash was wiped.
- Runtime free heap stays above 103 KB on Emery and 58 KB on Diorite for the
  inspected configurations. Both native app teardown logs report zero remaining
  allocated bytes.

[Emery report](evidence/emery-report.json) and
[Diorite report](evidence/diorite-report.json) contain matching package hashes,
native logs, and screenshot paths. These are actual emulator screen captures,
not editor mockups. The captured changes were delivered through AppMessage;
physical-watch and real-phone settings-webview validation remain open.

Reproduce with the Pebble Tool Python environment:

```sh
/Users/luke/.local/share/uv/tools/pebble-tool/bin/python test/emulator_smoke.py emery
/Users/luke/.local/share/uv/tools/pebble-tool/bin/python test/emulator_smoke.py diorite
```

The harness uses its own reusable profile under `build/emulator-state/` and
writes fresh evidence under `build/evidence/`. Copy reviewed evidence into the
tracked `evidence/` directory deliberately after a new build.
