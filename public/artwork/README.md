# Bundled game artwork

Approved built-in image-generation outputs, copied without changing source pixels from docs/design/graphics-proposals. All are transparent PNG sheets with four illustrations: Who What Where, Hat Game, Imposter and future Trivia.

- Classic: tabletop.png
- Recess: paper.png
- Midnight Observatory: engraved.png (map only, no WWW location pin)
- After-Hours Social: pub.png
- The Margin Note: bookclub.png

GameArtwork renders only the selected theme's local source using SVG image cropping. src/themes/gameArtworkRegions.json records each source's dimensions, game viewBox and clipping polygon. Boundaries follow low-alpha gaps between illustrations rather than equal-width slices, preventing neighbouring artwork from leaking into the display. These are display regions, not redrawn illustrations or modified raster files. Keep them aligned if replacing a sheet. Only the active theme's sheet is requested; repeated marks share the browser image cache. No CDN, filter or runtime image generation is used.

The original review sheets remain in docs as historical proposal sources. Trivia artwork is prepared but no Trivia selector is exposed before the game exists.
