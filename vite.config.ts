import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";

const distributableNotices = [
  ["CREDITS.md", "./docs/licenses/CREDITS.md"],
  ["ASSET-MANIFEST.yml", "./docs/licenses/ASSET-MANIFEST.yml"],
  ["LICENSE-KENNEY-INPUT-PROMPTS.txt", "./assets-src/vendor/kenney-input-prompts/LICENSE.txt"],
  ["OFL-NOTO-SANS-KR.txt", "./assets-src/vendor/google-fonts-ui/OFL-NotoSansKR.txt"],
  ["OFL-OXANIUM.txt", "./assets-src/vendor/google-fonts-ui/OFL-Oxanium.txt"],
] as const;

function emitAssetNotices(): Plugin {
  return {
    name: "emit-asset-license-notices",
    apply: "build",
    buildStart() {
      for (const [fileName, sourcePath] of distributableNotices) {
        this.emitFile({
          type: "asset",
          fileName: `licenses/${fileName}`,
          source: readFileSync(new URL(sourcePath, import.meta.url)),
        });
      }
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [emitAssetNotices()],
});
