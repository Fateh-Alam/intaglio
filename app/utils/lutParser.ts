import * as THREE from "three";

export function parseCubeLUT(text: string): THREE.DataTexture | null {
  const lines = text.split(/\r?\n/);
  let size = 0;
  let data3D: Float32Array | null = null;
  let dataIndex = 0;

  // Parse the .CUBE file
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0 || line.startsWith("#")) continue;

    if (line.startsWith("LUT_3D_SIZE")) {
      size = parseInt(line.split(/\s+/)[1]);
      data3D = new Float32Array(size * size * size * 3); // RGB
      continue;
    }

    if (line.startsWith("TITLE") || line.startsWith("DOMAIN")) continue;

    // Data lines
    if (data3D) {
      const parts = line.split(/\s+/).map(parseFloat);
      if (parts.length >= 3) {
        data3D[dataIndex * 3] = parts[0];
        data3D[dataIndex * 3 + 1] = parts[1];
        data3D[dataIndex * 3 + 2] = parts[2];
        dataIndex++;
      }
    }
  }

  if (data3D && size > 0) {
    // Convert 3D LUT to 2D texture for WebGL 1 compatibility
    // Layout: horizontal strips, each strip is one Z-slice
    // Width = size * size, Height = size
    const width = size * size;
    const height = size;
    const data2D = new Uint8Array(width * height * 4);

    for (let z = 0; z < size; z++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          // Source index in 3D data
          const srcIdx = (z * size * size + y * size + x) * 3;

          // Destination index in 2D layout: x + z*size, y
          const dstX = x + z * size;
          const dstY = y;
          const dstIdx = (dstY * width + dstX) * 4;

          data2D[dstIdx] = Math.floor(data3D[srcIdx] * 255);
          data2D[dstIdx + 1] = Math.floor(data3D[srcIdx + 1] * 255);
          data2D[dstIdx + 2] = Math.floor(data3D[srcIdx + 2] * 255);
          data2D[dstIdx + 3] = 255;
        }
      }
    }

    const texture = new THREE.DataTexture(data2D, width, height);
    texture.format = THREE.RGBAFormat;
    texture.type = THREE.UnsignedByteType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    // Store the original size as metadata for shader lookup
    (texture as any).lutSize = size;

    return texture;
  }

  return null;
}
