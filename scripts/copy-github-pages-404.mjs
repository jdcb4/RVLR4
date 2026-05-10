/**
 * GitHub Pages serves 404.html for unknown paths. Copying index.html lets the SPA
 * boot on deep links and hard refresh (e.g. /JDPassNPlay/games/hat).
 */
import { copyFileSync } from "node:fs";

copyFileSync("dist/index.html", "dist/404.html");
