import * as THREE from "three";
import type { LutUserData } from "../types/editor";

export interface CubeLutData {
  size: number;
  /** RGB triplets, red varying fastest, as stored in .cube files. */
  values: Float32Array;
  domainMin: [number, number, number];
  domainMax: [number, number, number];
  title?: string;
}

export function parseCubeData(text: string): CubeLutData | null {
  const lines = text.split(/\r?\n/);
  let size = 0;
  let title: string | undefined;
  let domainMin: [number, number, number] = [0, 0, 0];
  let domainMax: [number, number, number] = [1, 1, 1];
  const values: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0 || line.startsWith("#")) continue;

    const [keyword, ...parts] = line.split(/\s+/);
    if (keyword === "LUT_3D_SIZE") {
      size = Number.parseInt(parts[0], 10);
      continue;
    }
    if (keyword === "TITLE") { title = line.slice(5).trim().replace(/^"|"$/g, ""); continue; }
    if (keyword === "DOMAIN_MIN" || keyword === "DOMAIN_MAX") {
      const domain = parts.slice(0, 3).map(Number);
      if (domain.length !== 3 || domain.some((value) => !Number.isFinite(value))) return null;
      if (keyword === "DOMAIN_MIN") domainMin = domain as [number, number, number];
      else domainMax = domain as [number, number, number];
      continue;
    }
    if (/^[A-Z_]+/.test(keyword)) continue;
    const row = [keyword, ...parts].slice(0, 3).map(Number);
    if (row.length !== 3 || row.some((value) => !Number.isFinite(value))) return null;
    values.push(...row);
  }

  const valid = Number.isInteger(size) && size >= 2 && size <= 256
    && values.length === size * size * size * 3
    && domainMax.every((value, index) => value > domainMin[index]);
  return valid ? { size, values: Float32Array.from(values), domainMin, domainMax, title } : null;
}

/**
 * Uploads a 3D LUT as a half-float 3D texture so the GPU performs trilinear
 * interpolation at ~11-bit mantissa precision instead of 8-bit quantization.
 * Output values are not clamped; LUTs may legitimately produce values > 1.
 */
export function createLut3DTexture(lut: CubeLutData): THREE.Data3DTexture {
  const { size, values } = lut;
  const voxels = size * size * size;
  const data = new Uint16Array(voxels * 4);
  const one = THREE.DataUtils.toHalfFloat(1);
  for (let i = 0; i < voxels; i++) {
    data[i * 4] = THREE.DataUtils.toHalfFloat(values[i * 3]);
    data[i * 4 + 1] = THREE.DataUtils.toHalfFloat(values[i * 3 + 1]);
    data[i * 4 + 2] = THREE.DataUtils.toHalfFloat(values[i * 3 + 2]);
    data[i * 4 + 3] = one;
  }

  const texture = new THREE.Data3DTexture(data, size, size, size);
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.HalfFloatType;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.wrapR = THREE.ClampToEdgeWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  Object.assign(texture.userData as LutUserData, { lutSize: size, domainMin: lut.domainMin, domainMax: lut.domainMax, title: lut.title });
  return texture;
}

export function parseCubeLUT(text: string): THREE.Data3DTexture | null {
  const lut = parseCubeData(text);
  return lut ? createLut3DTexture(lut) : null;
}

export function serializeCubeLUT(lut: CubeLutData): string {
  const lines = [
    ...(lut.title ? [`TITLE "${lut.title.replace(/"/g, "'")}"`] : []),
    `LUT_3D_SIZE ${lut.size}`,
    `DOMAIN_MIN ${lut.domainMin.join(" ")}`,
    `DOMAIN_MAX ${lut.domainMax.join(" ")}`,
  ];
  for (let i = 0; i < lut.values.length; i += 3) {
    lines.push(`${lut.values[i].toFixed(6)} ${lut.values[i + 1].toFixed(6)} ${lut.values[i + 2].toFixed(6)}`);
  }
  return `${lines.join("\n")}\n`;
}
