const fs = require('fs');

const pageContent = fs.readFileSync('app/editor/page.tsx', 'utf-8');
const lines = pageContent.split('\n');

const homeStart = lines.findIndex(l => l.includes('export default function Home() {'));
// Get imports out
const firstConst = lines.findIndex(l => l.includes('const DEFAULT_SETTINGS: EditorSettings = {'));
const typesContent = lines.slice(firstConst, homeStart).join('\n');

// Add "export " before all const, interface, type
const exportedTypesContent = typesContent
  .replace(/const /g, 'export const ')
  .replace(/type /g, 'export type ')
  .replace(/interface /g, 'export interface ');

const fileContent = `
import { TextOverlaySettings } from "../components/CinematicTextOverlay";
import { FORMAT } from "../lib/brand";
import type {
  EditorSettings,
  CompositionGuide,
  PerformanceMode,
  SerializableEditorSettings,
  WatermarkPosition,
  WatermarkSettings,
  AssetMetadataSettings
} from "../types/editor";
import { HistoryState } from "../components/HistoryPanel";

${exportedTypesContent}
`;

fs.writeFileSync('app/editor/pageTypes.ts', fileContent);
console.log('Created pageTypes.ts');
