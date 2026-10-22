# RVLRY theme artwork proposals

Isolated artwork studies requested on 22 October 2026. No production application changes.

| Theme | Artwork family | Source sheet |
| --- | --- | --- |
| Classic | Tactile tabletop miniatures | tabletop.png |
| Recess | Paper screenprint | paper.png |
| Midnight Observatory | Engraved brass and enamel | engraved.png |
| After-Hours Social | Timber and letterpress | pub.png |
| The Margin Note | Ink and watercolour | bookclub.png |

The first three mappings were selected by Joe. The additional two families are new proposals for review. The engraved Who What Where image has been regenerated without its location pin; the map communicates Where.

Open ../RVLRY-graphics-proposals.html. This self-contained offline file embeds all artwork, fonts, Lucide control SVGs and interaction code. It includes representative picker/handoff/play/results states, mobile theme tabs and local feedback notes that can be copied or saved. Nothing is transmitted and no game sessions are stored. Trivia remains an artwork placeholder.

PNG sheets are original built-in image-generation outputs, displayed as four horizontal cells without modifying the raster source. They are concept assets: final cell separation, edge cleanup, small-size refinement and optimisation are still needed before production integration. Action icons remain Lucide.

Rebuild with: node docs/design/graphics-proposals/build.mjs

The builder uses the sheets, review.template.html, existing licensed fonts in public/fonts and installed React/Lucide packages. The generated HTML is deliberately tracked as a portable design deliverable. Trivia decisions are maintained separately in ../../TRIVIA_DISCOVERY.md.

Verification: all five sheets decode; all 20 mapped-theme/screen combinations checked, including mobile 360px without page or phone-body overflow. Desktop 1320px visual inspection, fixed-height Hint and Correct interactions checked. No HTTP(S) resource requests. No production code changed; no new APK or native durability claim.
