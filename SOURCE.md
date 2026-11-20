# Source and licensing

Analog Studio is my native Pebble adaptation of the material and layout
choices in [Watch Face Lab](https://datapoems.io/clocks/bases/faces.html), a
web project of mine.
Its code, procedural artwork, recipe contract, and supplied palette snapshot
are released under the MIT License in this repository.

The three constructions are Ivory, Frost, and Noir. The generator renders
geometric SVG shapes and rasterizes them for the four Pebble displays.
It uses the eleven named palettes retained in `reference/palettes.json`.
The snapshot excludes other Lab designs and unrelated platform assets.

`reference/assets.json` records source and generator hashes, the three Round 2
tone masks, and all 432 platform artwork references. The original artwork
fixture preserves hashes and IDs from the earlier release. Native code, phone
settings, package identity, version, and included image bytes are unchanged
from Analog Studio 0.3.0 in this standalone source release.

No external artwork or fonts are bundled. The watch uses Pebble system fonts.
The optional generator uses sharp and ImageMagick; those tools and their
transitive libraries keep their own licenses. The Pebble SDK is installed
separately and is not covered by this repository's MIT License.
