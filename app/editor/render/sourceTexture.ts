import * as THREE from "three";

/** Linear-light, sRGB-primaries 16-bit RGB pixels as produced by the RAW decoder. */
export interface LinearSourceBuffer {
  width: number;
  height: number;
  pixels: Uint16Array;
}

let halfFloatTable: Uint16Array | null = null;

/** Maps every 16-bit code value to its normalized half-float bit pattern. */
function getHalfFloatTable(): Uint16Array {
  if (!halfFloatTable) {
    halfFloatTable = new Uint16Array(65536);
    for (let value = 0; value < 65536; value++) halfFloatTable[value] = THREE.DataUtils.toHalfFloat(value / 65535);
  }
  return halfFloatTable;
}

/**
 * Uploads the full-precision RAW development as a half-float RGBA texture
 * tagged as linear, so the render graph skips sRGB decoding and edits keep the
 * decoder's 16-bit tonal depth instead of the 8-bit display proxy.
 * Images larger than the GPU limit are box-downsampled by an integer factor.
 */
export function createLinearSourceTexture(buffer: LinearSourceBuffer, maxTextureSize = 16384): THREE.DataTexture {
  const factor = Math.max(1, Math.ceil(Math.max(buffer.width, buffer.height) / maxTextureSize));
  const width = Math.floor(buffer.width / factor);
  const height = Math.floor(buffer.height / factor);
  const table = getHalfFloatTable();
  const one = THREE.DataUtils.toHalfFloat(1);
  const data = new Uint16Array(width * height * 4);
  const samples = factor * factor;

  for (let y = 0; y < height; y++) {
    // Texture rows run bottom-up; flip here rather than relying on UNPACK_FLIP_Y for typed arrays.
    const targetRow = (height - 1 - y) * width;
    for (let x = 0; x < width; x++) {
      const target = (targetRow + x) * 4;
      if (factor === 1) {
        const source = (y * buffer.width + x) * 3;
        data[target] = table[buffer.pixels[source]];
        data[target + 1] = table[buffer.pixels[source + 1]];
        data[target + 2] = table[buffer.pixels[source + 2]];
      } else {
        let r = 0, g = 0, b = 0;
        for (let dy = 0; dy < factor; dy++) {
          for (let dx = 0; dx < factor; dx++) {
            const source = ((y * factor + dy) * buffer.width + x * factor + dx) * 3;
            r += buffer.pixels[source];
            g += buffer.pixels[source + 1];
            b += buffer.pixels[source + 2];
          }
        }
        data[target] = table[Math.round(r / samples)];
        data[target + 1] = table[Math.round(g / samples)];
        data[target + 2] = table[Math.round(b / samples)];
      }
      data[target + 3] = one;
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.HalfFloatType);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.userData.intaglioEncoding = "linear";
  texture.needsUpdate = true;
  return texture;
}

/**
 * Marks an 8-bit photo texture as sRGB so the GPU decodes it to linear light
 * *before* filtering. Rotation, lens correction, keystone and downscaled
 * (mipmapped) previews then blend in linear light, as light actually mixes;
 * blending encoded values darkens hard edges and fine detail. The input
 * transform pass skips itself for such textures, so nothing decodes twice.
 */
export function markPhotoTexture<T extends THREE.Texture>(texture: T): T {
  if (texture.colorSpace !== THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }
  return texture;
}

function profileInHeader(bytes: Uint8Array) {
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 8 && data.getUint32(0) === 0x89504e47 && data.getUint32(4) === 0x0d0a1a0a) {
    for (let i = 8; i + 8 <= bytes.length; i += data.getUint32(i) + 12) {
      const kind = data.getUint32(i + 4);
      if (kind === 0x69434350) return true; // iCCP
      if (kind === 0x49444154) break; // IDAT follows the profile.
    }
  } else if (bytes.length >= 2 && data.getUint16(0) === 0xffd8) {
    const signature = "ICC_PROFILE\0";
    let i = 2;
    while (i + 4 <= bytes.length && bytes[i] === 0xff) {
      if (bytes[i + 1] === 0xff) { i += 1; continue; }
      if (bytes[i + 1] === 0xda || bytes[i + 1] === 0xd9) break;
      const length = data.getUint16(i + 2);
      if (length < 2) break;
      if (bytes[i + 1] === 0xe2 && length >= signature.length + 4
        && bytes.subarray(i + 4, i + 4 + signature.length).length === signature.length
        && bytes.subarray(i + 4, i + 4 + signature.length).every((code, index) => code === signature.charCodeAt(index))) return true;
      i += length + 2;
    }
  }
  return false;
}

async function embeddedProfile(url: string) {
  try {
    // Stop after the header rather than reading another full photograph.
    const limit = 1024 * 1024;
    const result = await fetch(url, { headers: { Range: `bytes=0-${limit - 1}` } });
    const reader = result.body?.getReader();
    if (!result.ok || !reader) return false;
    try {
      const header = new Uint8Array(limit);
      let size = 0;
      while (size < limit) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = value.subarray(0, limit - size);
        header.set(chunk, size);
        size += chunk.length;
      }
      return profileInHeader(header.subarray(0, size));
    } finally {
      void reader.cancel().catch(() => {});
    }
  } catch {
    return false;
  }
}

type PhotoTexture = THREE.Texture<HTMLImageElement | HTMLCanvasElement>;

export class PhotoTextureLoader extends THREE.Loader<PhotoTexture> {
  override load(url: string, onLoad?: (value: PhotoTexture) => void, onProgress?: (event: ProgressEvent) => void, onError?: (error: unknown) => void) {
    const profile = embeddedProfile(url);
    const texture: PhotoTexture = new THREE.Texture();
    const loader = new THREE.ImageLoader(this.manager).setCrossOrigin(this.crossOrigin).setPath(this.path);
    loader.load(url, (image) => {
      void profile.then((tagged) => {
        texture.image = image;
        if (tagged) {
          // Three disables unpack color conversion for an sRGB texture.
          // Rasterizing here gives it actual sRGB codes before GPU filtering.
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d", { colorSpace: "srgb" });
          if (!context) throw new Error("Could not normalize the embedded color profile.");
          context.drawImage(image, 0, 0);
          texture.image = canvas;
        }
        onLoad?.(markPhotoTexture(texture));
      }).catch(onError);
    }, onProgress, onError);
    return texture;
  }
}

export async function loadImageTexture(url: string): Promise<THREE.Texture> {
  return new Promise<THREE.Texture>((resolve, reject) => new PhotoTextureLoader().load(url, resolve, undefined, reject));
}

/** The canonical full-resolution render source: 16-bit RAW when available, else the image file. */
export async function loadRenderSource(imageUrl: string, rawSource: LinearSourceBuffer | null | undefined, maxTextureSize?: number): Promise<THREE.Texture> {
  return rawSource ? createLinearSourceTexture(rawSource, maxTextureSize) : await loadImageTexture(imageUrl);
}
