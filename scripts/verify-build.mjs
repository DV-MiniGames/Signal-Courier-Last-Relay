import { readFile } from "node:fs/promises";

const projectRoot = new URL("../", import.meta.url);
const mappings = [
  ["docs/licenses/CREDITS.md", "dist/licenses/CREDITS.md"],
  ["docs/licenses/ASSET-MANIFEST.yml", "dist/licenses/ASSET-MANIFEST.yml"],
  ["assets-src/vendor/kenney-input-prompts/LICENSE.txt", "dist/licenses/LICENSE-KENNEY-INPUT-PROMPTS.txt"],
  ["assets-src/vendor/google-fonts-ui/OFL-NotoSansKR.txt", "dist/licenses/OFL-NOTO-SANS-KR.txt"],
  ["assets-src/vendor/google-fonts-ui/OFL-Oxanium.txt", "dist/licenses/OFL-OXANIUM.txt"],
];

const indexHtml = await readFile(new URL("dist/index.html", projectRoot), "utf8");
if (/\b(?:src|href)="\/assets\//.test(indexHtml)) {
  throw new Error("Production HTML contains root-absolute asset URLs instead of a relative Vite base.");
}

for (const [sourcePath, outputPath] of mappings) {
  const [source, output] = await Promise.all([
    readFile(new URL(sourcePath, projectRoot)),
    readFile(new URL(outputPath, projectRoot)),
  ]);
  if (!source.equals(output)) {
    throw new Error(`Distributed notice differs from its source: ${outputPath}`);
  }
}

console.log(`Verified relative production URLs and ${mappings.length} distributable license/credit records.`);
