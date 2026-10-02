export type IntaglioOutputFormat = "image/jpeg" | "image/png" | "image/webp";

/** Encode final RGBA pixels with pinned browser-neutral WASM codecs. */
export async function encodeCanvasWasm(canvas: HTMLCanvasElement, format: IntaglioOutputFormat, quality: number): Promise<Blob> {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("The output codec could not read final render pixels.");
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  let buffer: ArrayBuffer;
  if (format === "image/png") {
    const { default: encode } = await import("@jsquash/png/encode.js");
    buffer = await encode(image, { bitDepth: 8 });
  } else if (format === "image/jpeg") {
    const { default: encode } = await import("@jsquash/jpeg/encode.js");
    const requestedPercent = Math.round(Math.max(0, Math.min(1, quality)) * 100);
    const percent = requestedPercent >= 90 ? 100 : requestedPercent;
    buffer = await encode(image, {
      quality: percent,
      chroma_quality: 100,
      separate_chroma_quality: true,
      auto_subsample: false,
      chroma_subsample: 1,
      progressive: true,
      optimize_coding: true,
      trellis_multipass: true,
      trellis_opt_zero: true,
      trellis_opt_table: true,
      trellis_loops: 2,
    });
  } else {
    const { default: encode } = await import("@jsquash/webp/encode.js");
    const requestedPercent = Math.round(Math.max(0, Math.min(1, quality)) * 100);
    buffer = await encode(image, {
      quality: requestedPercent >= 90 ? 100 : requestedPercent,
      method: 6,
      pass: 6,
      sns_strength: 35,
      filter_strength: 20,
      autofilter: 1,
      alpha_quality: 100,
      exact: 1,
      lossless: requestedPercent >= 90 ? 1 : 0,
      use_sharp_yuv: 0,
    });
  }
  return new Blob([buffer], { type: format });
}
