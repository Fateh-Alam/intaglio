import type { LibRawMetadata, LibRawSettings } from "libraw-wasm";
import { DEFAULT_RAW_DEVELOP_STATE, type RawDevelopState } from "../types/document";

export const RAW_EXTENSIONS = ["dng", "cr2", "cr3", "nef", "arw", "raf", "orf", "rw2"] as const;
export const STILL_FILE_ACCEPT = `image/jpeg,image/png,image/webp,${RAW_EXTENSIONS.map((extension) => `.${extension}`).join(",")}`;

export interface RawDecodeResult {
  preview: Blob;
  pixels16: Uint16Array;
  width: number;
  height: number;
  metadata: Record<string, string | number | null>;
  rawDevelop: RawDevelopState;
}

interface LibRawRuntime {
  open(bytes: BufferSource, settings?: LibRawSettings): Promise<void>;
  metadata(fullOutput?: boolean): Promise<LibRawMetadata | undefined>;
  imageData(): Promise<import("libraw-wasm").LibRawImageData | undefined>;
  dispose(): void;
}

export class RawDecodeError extends Error {
  constructor(public readonly code: "unsupported" | "corrupt" | "memory" | "cancelled", message: string) {
    super(message);
    this.name = "RawDecodeError";
  }
}

export const isRawFile = (file: Pick<File, "name" | "type">): boolean => {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return RAW_EXTENSIONS.includes(extension as (typeof RAW_EXTENSIONS)[number]) || /^(image|application)\/(x-)?(adobe-dng|canon-cr2|canon-cr3|nikon-nef|sony-arw|fuji-raf|olympus-orf|panasonic-rw2)$/i.test(file.type);
};

export const mapRawDevelopSettings = (state: RawDevelopState): LibRawSettings => ({
  outputBps: 16,
  outputColor: 1,
  outputTiff: false,
  noAutoBright: true,
  useCameraWb: state.whiteBalance !== "custom",
  useAutoWb: false,
  userMul: state.whiteBalance === "custom"
    ? [state.temperature / 6500, 1, Math.max(0.1, 6500 / state.temperature), 1]
    : null,
  expCorrec: state.exposureCompensation !== 0,
  expShift: 2 ** state.exposureCompensation,
  expPreser: state.highlightMode === "reconstruct" ? 1 : state.highlightMode === "blend" ? 0.5 : 0,
  highlight: state.highlightMode === "reconstruct" ? 5 : state.highlightMode === "blend" ? 2 : 0,
  userQual: state.demosaicQuality === "draft" ? 2 : state.demosaicQuality === "quality" ? 11 : 3,
  userBlack: state.blackLevel ?? undefined,
  userSat: state.whiteLevel ?? undefined,
  userFlip: -1,
  gamm: [1, 1],
});

export function classifyRawDecodeError(error: unknown, aborted = false): RawDecodeError {
  if (aborted || (error instanceof Error && error.message === "LibRaw disposed")) return new RawDecodeError("cancelled", "RAW development was cancelled.");
  if (error instanceof RawDecodeError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (/memory|allocation|abort\(OOM\)/i.test(message)) return new RawDecodeError("memory", "There is not enough memory to develop this RAW. Close other tabs or use the draft demosaic setting.");
  if (/unsupported|decoder|format/i.test(message)) return new RawDecodeError("unsupported", "This camera or RAW compression is not supported by the bundled decoder.");
  return new RawDecodeError("corrupt", "The RAW could not be decoded. It may be corrupt or incomplete.");
}

const metadataRecord = (metadata: LibRawMetadata): Record<string, string | number | null> => ({
  cameraMake: metadata.camera_make || null,
  cameraModel: metadata.camera_model || null,
  iso: Number.isFinite(metadata.iso_speed) ? metadata.iso_speed : null,
  shutterSeconds: Number.isFinite(metadata.shutter) ? metadata.shutter : null,
  aperture: Number.isFinite(metadata.aperture) ? metadata.aperture : null,
  focalLengthMm: Number.isFinite(metadata.focal_len) ? metadata.focal_len : null,
  capturedAt: metadata.timestamp instanceof Date && !Number.isNaN(metadata.timestamp.valueOf()) ? metadata.timestamp.toISOString() : null,
});

const makePreview = async (pixels: Uint16Array, width: number, height: number): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new RawDecodeError("memory", "The browser could not allocate a RAW display surface.");
  const image = context.createImageData(width, height);
  for (let source = 0, target = 0; target < image.data.length; source += 3, target += 4) {
    const encode = (value: number) => {
      const linear = value / 65535;
      const srgb = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
      return Math.round(Math.max(0, Math.min(1, srgb)) * 255);
    };
    image.data[target] = encode(pixels[source]);
    image.data[target + 1] = encode(pixels[source + 1]);
    image.data[target + 2] = encode(pixels[source + 2]);
    image.data[target + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new RawDecodeError("memory", "The RAW display proxy could not be encoded.")), "image/png"));
};

export async function decodeRawFile(
  file: File,
  state: RawDevelopState = DEFAULT_RAW_DEVELOP_STATE,
  signal?: AbortSignal,
  onProgress?: (progress: number, stage: string) => void,
): Promise<RawDecodeResult> {
  if (typeof window === "undefined") throw new RawDecodeError("unsupported", "RAW development is available only in the local browser worker.");
  // Keep this an origin-qualified runtime URL. A root-relative import is
  // incorrectly treated as a server filesystem dependency by OpenNext's
  // final esbuild pass even though the decoder is a public browser asset.
  const moduleUrl = `${window.location.origin}/libraw/index.js`;
  const decoderModule = await import(/* webpackIgnore: true */ moduleUrl) as { default: new () => LibRawRuntime };
  const decoder = new decoderModule.default();
  const abort = () => decoder.dispose();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    if (signal?.aborted) throw new RawDecodeError("cancelled", "RAW development was cancelled.");
    onProgress?.(0.08, "Reading original RAW bytes");
    const bytes = await file.arrayBuffer();
    onProgress?.(0.2, "Opening supported-camera RAW");
    await decoder.open(bytes, mapRawDevelopSettings(state));
    onProgress?.(0.4, "Extracting camera metadata");
    const metadata = await decoder.metadata(false);
    onProgress?.(0.52, "Demosaicing 16-bit image");
    const image = await decoder.imageData();
    if (!metadata || !image || image.colors < 3) throw new RawDecodeError("unsupported", "This camera or RAW compression is not supported by the bundled decoder.");
    if (signal?.aborted) throw new RawDecodeError("cancelled", "RAW development was cancelled.");
    const pixels16 = image.data instanceof Uint16Array
      ? image.data
      : Uint16Array.from(image.data, (value) => value * 257);
    onProgress?.(0.82, "Creating display proxy");
    const preview = await makePreview(pixels16, image.width, image.height);
    const rawDevelop: RawDevelopState = {
      ...state,
      enabled: true,
      orientation: metadata.flip,
      decoder: { name: "libraw", version: "libraw-wasm-1.6.0", cameraSupported: true },
    };
    onProgress?.(1, "RAW ready");
    return { preview, pixels16, width: image.width, height: image.height, metadata: metadataRecord(metadata), rawDevelop };
  } catch (error) {
    throw classifyRawDecodeError(error, signal?.aborted);
  } finally {
    signal?.removeEventListener("abort", abort);
    decoder.dispose();
  }
}
