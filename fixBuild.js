const fs = require('fs');

// 1. Fix HistogramGraph exports
let hist = fs.readFileSync('app/editor/components/HistogramGraph.tsx', 'utf-8');
hist = hist.replace(/const HistogramGraph =/g, 'export const HistogramGraph =');
hist = hist.replace(/const ScopeMetric =/g, 'export const ScopeMetric =');
hist = hist.replace(/const getColorCastLabel =/g, 'export const getColorCastLabel =');
fs.writeFileSync('app/editor/components/HistogramGraph.tsx', hist);

// 2. Fix pageTypes modifiers
let types = fs.readFileSync('app/editor/pageTypes.ts', 'utf-8');
types = types.replace(/export export const/g, 'export const');
types = types.replace(/export export interface/g, 'export interface');
types = types.replace(/export export type/g, 'export type');
fs.writeFileSync('app/editor/pageTypes.ts', types);

// 3. Fix import paths in hooks/useEditorState.tsx
let state = fs.readFileSync('app/editor/hooks/useEditorState.tsx', 'utf-8');
state = state.replace(/from "\.\.\/lib/g, 'from "../../lib');
state = state.replace(/from "\.\.\/utils/g, 'from "../../utils');
state = state.replace(/from "\.\.\/types/g, 'from "../../types');
state = state.replace(/from "\.\.\/components/g, 'from "../components');
state = state.replace(/from "\.\/pageTypes"/g, 'from "../pageTypes"');
fs.writeFileSync('app/editor/hooks/useEditorState.tsx', state);

// 4. Fix import paths in components
const components = ['EditorLeftSidebar.tsx', 'EditorWorkspaceCanvas.tsx', 'EditorRightSidebar.tsx'];
components.forEach(comp => {
  let c = fs.readFileSync('app/editor/components/' + comp, 'utf-8');
  c = c.replace(/from "\.\.\/hooks/g, 'from "../hooks');
  c = c.replace(/from "\.\.\/components/g, 'from "../components');
  c = c.replace(/from "\.\.\/pageTypes"/g, 'from "../pageTypes"');
  fs.writeFileSync('app/editor/components/' + comp, c);
});
console.log('Fixed build paths and exports');
