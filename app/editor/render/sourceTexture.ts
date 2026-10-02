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

export async function loadImageTexture(url: string): Promise<THREE.Texture> {
  return await new Promise<THREE.Texture>((resolve, reject) => new THREE.TextureLoader().load(url, resolve, undefined, reject));
}

/** The canonical full-resolution render source: 16-bit RAW when available, else the image file. */
export async function loadRenderSource(imageUrl: string, rawSource: LinearSourceBuffer | null | undefined, maxTextureSize?: number): Promise<THREE.Texture> {
  return rawSource ? createLinearSourceTexture(rawSource, maxTextureSize) : await loadImageTexture(imageUrl);
}
