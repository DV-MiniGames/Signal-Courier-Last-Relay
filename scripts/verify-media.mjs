import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const manifestUrl = new URL("docs/media/MANIFEST.yml", root);
const readmeUrl = new URL("README.md", root);
const [manifest, readme] = await Promise.all([
  readFile(manifestUrl, "utf8"),
  readFile(readmeUrl, "utf8"),
]);

const exports = [...manifest.matchAll(
  /- file: "([^"]+)"[\s\S]*?size_bytes: (\d+)[\s\S]*?sha256: "([a-f0-9]{64})"/g,
)];

if (exports.length !== 3) throw new Error(`Expected three media exports, found ${exports.length}.`);

for (const [, filename, expectedSize, expectedHash] of exports) {
  const mediaUrl = new URL(`docs/media/${filename}`, root);
  const [bytes, metadata] = await Promise.all([readFile(mediaUrl), stat(mediaUrl)]);
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  if (metadata.size !== Number(expectedSize)) {
    throw new Error(`${filename} size mismatch: ${metadata.size} !== ${expectedSize}.`);
  }
  if (actualHash !== expectedHash) throw new Error(`${filename} SHA-256 mismatch.`);
}

for (const filename of ["signal-courier-gameplay.mp4", "signal-courier-gameplay-preview.gif"]) {
  if (!readme.includes(`docs/media/${filename}`)) throw new Error(`README does not reference ${filename}.`);
}

console.log("Verified README links and SHA-256/byte size for 3 gameplay media exports.");
