# RVLRY artwork proposals

Isolated artwork studies requested on 22 October 2026. No production application changes. The review compares paper screenprint, tactile tabletop miniatures and engraved enamel artwork within the same compact screen structure, with existing theme palettes.

Open `../RVLRY-graphics-proposals.html`. It is a self-contained offline file: embedded artwork, fonts, Lucide control SVGs and interaction code. It includes representative picker/handoff/play/results states, theme switching, and local notes that can be copied or saved as text. No notes are transmitted and no game sessions are stored. Trivia is explicitly an artwork/flow placeholder, not an implemented game.

`paper.png`, `tabletop.png` and `engraved.png` are generated concept sheets, copied from the built-in image tool's outputs. Treat them as proposal assets, not production-ready game icons. Each is displayed as a four-cell strip without modifying its source image. Final asset cleanup, small-size refinement, result artwork and optimisation follow a chosen direction. Action icons remain Lucide.

Rebuild from the repository root with `node docs/design/graphics-proposals/build.mjs`. It reads these PNGs, `review.template.html`, the existing locally licensed fonts in `public/fonts`, and installed React/Lucide packages, then writes the self-contained review HTML. No network calls, app imports or production changes. The generated review is deliberately retained as a portable design deliverable, matching the project's earlier standalone studies.

Trivia discovery and open decisions are recorded in [TRIVIA_DISCOVERY.md](../../TRIVIA_DISCOVERY.md). Nothing in this proposal authorises implementation or accepts the discovered question banks.

Verification: desktop 1320px and mobile 360px inspection; 60 combinations of direction, theme and representative screen checked for page/phone overflow. All three embedded image sheets decode; no HTTP(S) resource requests. Correct/Hint interactions and local feedback preference storage checked; hint height remains fixed. Mechanical design review retained the deliberately inherited warm palette/font choices. Artwork edges and fine detail remain concept-quality and require a production pass after selection.
