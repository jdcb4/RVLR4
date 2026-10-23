import {
  checkContentUpdates,
  CONTENT_MANIFEST_URL,
  downloadContentPack,
} from "../src/services/contentPacks/download";
import { validateDownload } from "../src/services/contentPacks/schema";

const { manifest } = await checkContentUpdates();
for (const descriptor of manifest.packs) {
  const { pack } = await validateDownload(await downloadContentPack(descriptor), descriptor);
  const response = await fetch(descriptor.url, {
    method: "HEAD",
    headers: { Origin: "https://localhost" },
    redirect: "error",
  });
  if (response.status !== 200 || response.headers.get("access-control-allow-origin") !== "*")
    throw new Error(`${descriptor.kind} endpoint is unavailable to the Android WebView.`);
  console.log(
    `${pack.kind}: version ${pack.version}, ${pack.kind === "words" ? pack.entries.length : pack.questions.length} records, SHA-256 and CORS verified`,
  );
}
const missing = await fetch(new URL("missing-pack.json", CONTENT_MANIFEST_URL), {
  redirect: "error",
});
if (missing.status !== 404) throw new Error("Unknown packs must return 404.");
console.log("Unknown pack: HTTP 404 verified.");
