const fs = require('fs');

// 1. Add AssetMetadataSettings and AppCommand to app/types/editor.ts
let editorTypes = fs.readFileSync('app/types/editor.ts', 'utf-8');
if (!editorTypes.includes('AssetMetadataSettings')) {
  editorTypes += `
export interface AssetMetadataSettings {
  title: string;
  author: string;
  copyright: string;
  camera: string;
  lens: string;
  iso: string;
  focalLength: string;
  aperture: string;
  shutterSpeed: string;
  date: string;
  location: string;
  description: string;
  keywords: string;
}

export interface AppCommand {
  id: string;
  title: string;
  section: string;
  shortcut?: string;
  keywords?: string[];
  disabled?: boolean;
  run: () => void;
}
`;
  fs.writeFileSync('app/types/editor.ts', editorTypes);
}

// 2. Fix pageTypes.ts: restore the import from ../types/editor
let pageTypes = fs.readFileSync('app/editor/pageTypes.ts', 'utf-8');
pageTypes = 'import type { EditorSettings, CompositionGuide, PerformanceMode, SerializableEditorSettings, WatermarkPosition, WatermarkSettings, AssetMetadataSettings, HistogramData, ImageBounds, AppCommand } from "../types/editor";\n' + pageTypes;
// Remove any duplicate internal definitions of EditorSettings from pageTypes.ts that I might have mistakenly kept
// Wait, my extraction script didn't remove the old definitions from pageTypes.ts? It didn't. Let's just strip them out.
pageTypes = pageTypes.replace(/export interface EditorSettings[\s\S]*?\n\}\n/g, '');
pageTypes = pageTypes.replace(/export type EditorSettingKey[\s\S]*?\n/g, '');
pageTypes = pageTypes.replace(/export type EditorSettingValue[\s\S]*?\n/g, '');
pageTypes = pageTypes.replace(/export type SerializableEditorSettings[\s\S]*?\n/g, '');
pageTypes = pageTypes.replace(/export type PerformanceMode[\s\S]*?\n/g, '');
pageTypes = pageTypes.replace(/export type CompositionGuide[\s\S]*?\n/g, '');
pageTypes = pageTypes.replace(/export type WatermarkPosition[\s\S]*?\n/g, '');
pageTypes = pageTypes.replace(/export interface WatermarkSettings[\s\S]*?\n\}\n/g, '');
pageTypes = pageTypes.replace(/export interface AssetMetadataSettings[\s\S]*?\n\}\n/g, '');
pageTypes = pageTypes.replace(/export interface HistogramData[\s\S]*?\n\}\n/g, '');
pageTypes = pageTypes.replace(/export interface ImageBounds[\s\S]*?\n\}\n/g, '');
pageTypes = pageTypes.replace(/export interface AppCommand[\s\S]*?\n\}\n/g, '');
fs.writeFileSync('app/editor/pageTypes.ts', pageTypes);

// 3. Fix useEditorState.tsx: revert its import to ../types/editor
let useEditorState = fs.readFileSync('app/editor/hooks/useEditorState.tsx', 'utf-8');
useEditorState = useEditorState.replace(/import \{.*?\} from ['"]\.\.\/pageTypes['"];/g, 
  'import { getEditorModuleLabel, handleCreateVirtualCopy } from "../pageTypes";\n' +
  'import type { EditorSettings, EditorSettingKey, EditorSettingValue, CompositionGuide, HistogramData, ImageBounds, PerformanceMode, SerializableEditorSettings, WatermarkPosition, WatermarkSettings, AssetMetadataSettings, AppCommand } from "../../types/editor";'
);
fs.writeFileSync('app/editor/hooks/useEditorState.tsx', useEditorState);

// 4. Fix HistogramGraph.tsx: revert its import to ../types/editor
let histogramGraph = fs.readFileSync('app/editor/components/HistogramGraph.tsx', 'utf-8');
histogramGraph = histogramGraph.replace(/import \{ HistogramData \} from "\.\.\/pageTypes";/g, 'import type { HistogramData } from "../../types/editor";');
fs.writeFileSync('app/editor/components/HistogramGraph.tsx', histogramGraph);

console.log('Fixed ALL imports to correctly point to app/types/editor.ts');
