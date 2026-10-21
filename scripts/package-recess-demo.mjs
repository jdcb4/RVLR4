import { readFile, writeFile } from "node:fs/promises";

const source = new URL("../docs/design/recess-materials/", import.meta.url);
const [html, css, js, font, license] = await Promise.all([
  readFile(new URL("index.html", source), "utf8"),
  readFile(new URL("materials.css", source), "utf8"),
  readFile(new URL("materials.js", source), "utf8"),
  readFile(new URL("assets/BricolageGrotesque.ttf", source)),
  readFile(new URL("assets/BricolageGrotesque-OFL.txt", source), "utf8"),
]);
const styles = css.replace(
  'url("assets/BricolageGrotesque.ttf")',
  `url("data:font/ttf;base64,${font.toString("base64")}")`,
);
const bundled = html
  .replace('<link rel="stylesheet" href="materials.css" />', `<style>\n${styles}\n</style>`)
  .replace('<script src="materials.js" defer></script>', "")
  .replace("</body>", `<script>\n${js.replaceAll("</script", "<\\/script")}\n</script>\n</body>`)
  .replace("</html>", `<!-- Bundled font license:\n${license.replaceAll("-->", "-- >")}\n-->\n</html>`);
if (/\b(?:src|href)="(?!data:|#)/.test(bundled) || /url\("assets\//.test(bundled)) {
  throw new Error("Unbundled file reference remains");
}
const output = new URL("../docs/design/RVLRY-recess-materials.html", import.meta.url);
await writeFile(output, bundled);
console.log(`Created ${output.pathname}: ${Buffer.byteLength(bundled)} bytes`);
