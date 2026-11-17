import type { GradeNode } from '../../types/document';
import type { EditorSettings } from '../../types/editor';

/** A node can override grading values, never resources, geometry or other layers. */
const keys: Record<string, string[]> = {
  develop: ['brightness', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'temperature', 'tint', 'vibrance', 'saturation', 'dehaze', 'filmToeStrength', 'filmToeLength', 'filmShoulderStrength', 'filmShoulderLength', 'filmGamma', 'colorCrossover', 'lumaDesat'],
  'oklch-mixer': ['Red', 'Orange', 'Yellow', 'Green', 'Aqua', 'Blue', 'Purple', 'Magenta'].flatMap(channel => ['Hue', 'Sat', 'Lum'].map(axis => `hsl${channel}${axis}`)), lut: ['lutStrength'], film: ['filmEmulationStrength'],
  halation: ['halation'], bloom: ['bloom'], optical: ['vignette'], sharpen: ['sharpness'],
};
export function gradeNodeSettings(settings: EditorSettings, node: GradeNode): EditorSettings {
  const patch: Record<string, number> = {};
  for (const key of keys[node.kind] ?? []) {
    const value = (node.params as Record<string, unknown>)[key];
    if (typeof value === 'number' && Number.isFinite(value)) patch[key] = value;
  }
  return Object.keys(patch).length ? { ...settings, ...patch } : settings;
}

export function validateGradeNodeParams(node: GradeNode): void {
  for (const [key, value] of Object.entries(node.params)) {
    if (!(keys[node.kind] ?? []).includes(key)) throw new Error(`${node.name}: ${key} is not a supported node override.`);
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${node.name}: ${key} must be a finite number.`);
  }
}
