import { INPUT_ASSET_URLS, type InputGlyphId } from "../../../assets/manifest";

export type { InputGlyphId } from "../../../assets/manifest";

export class InputGlyphs {
  private readonly images = new Map<InputGlyphId, HTMLImageElement>();

  constructor() {
    for (const [id, url] of Object.entries(INPUT_ASSET_URLS) as Array<[InputGlyphId, string]>) {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      this.images.set(id, image);
    }
  }

  get(id: InputGlyphId): HTMLImageElement | null {
    const image = this.images.get(id);
    return image?.complete && image.naturalWidth > 0 ? image : null;
  }
}
