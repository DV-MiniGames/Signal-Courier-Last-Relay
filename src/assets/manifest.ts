import notoSansKrUrl from "./fonts/noto-sans-kr-ui-400-600.woff2";
import oxaniumUrl from "./fonts/oxanium-ui-500-600.woff2";
import keyAUrl from "./input/input-key-a.png";
import keyDUrl from "./input/input-key-d.png";
import keyEUrl from "./input/input-key-e.png";
import keyEscapeUrl from "./input/input-key-escape.png";
import keyFUrl from "./input/input-key-f.png";
import keySUrl from "./input/input-key-s.png";
import keySpaceUrl from "./input/input-key-space.png";
import keyWUrl from "./input/input-key-w.png";
import mouseLeftUrl from "./input/input-mouse-left.png";
import mouseMoveUrl from "./input/input-mouse-move.png";
import mouseRightUrl from "./input/input-mouse-right.png";

export type InputGlyphId =
  | "keyA"
  | "keyD"
  | "keyE"
  | "keyEscape"
  | "keyF"
  | "keyS"
  | "keySpace"
  | "keyW"
  | "mouseLeft"
  | "mouseMove"
  | "mouseRight";

export const INPUT_ASSET_URLS: Record<InputGlyphId, string> = {
  keyA: keyAUrl,
  keyD: keyDUrl,
  keyE: keyEUrl,
  keyEscape: keyEscapeUrl,
  keyF: keyFUrl,
  keyS: keySUrl,
  keySpace: keySpaceUrl,
  keyW: keyWUrl,
  mouseLeft: mouseLeftUrl,
  mouseMove: mouseMoveUrl,
  mouseRight: mouseRightUrl,
};

export const GAME_ASSET_MANIFEST = {
  schemaVersion: 1,
  inputGlyphs: Object.entries(INPUT_ASSET_URLS).map(([id, url]) => ({
    id,
    url,
    kind: "image" as const,
    width: 64,
    height: 64,
    licenseId: "CC0-1.0",
  })),
  fonts: [
    { id: "oxanium-ui-500-600", url: oxaniumUrl, kind: "font" as const, bytes: 6196, licenseId: "OFL-1.1" },
    { id: "noto-sans-kr-ui-400-600", url: notoSansKrUrl, kind: "font" as const, bytes: 23380, licenseId: "OFL-1.1" },
  ],
} as const;
