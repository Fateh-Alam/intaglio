const fs = require('fs');

// 1. Fix page.tsx CommandBar
let page = fs.readFileSync('app/editor/page.tsx', 'utf-8');
page = page.replace(
  '<CommandBar isOpen={isCommandBarOpen} onClose={() => setIsCommandBarOpen(false)} />',
  '<CommandBar isOpen={isCommandBarOpen} onClose={() => setIsCommandBarOpen(false)} commands={appCommands} />'
);
fs.writeFileSync('app/editor/page.tsx', page);

// 2. Fix DEFAULT_ASSET_METADATA in pageTypes.ts
let pageTypes = fs.readFileSync('app/editor/pageTypes.ts', 'utf-8');
pageTypes = pageTypes.replace(
  'export const DEFAULT_ASSET_METADATA: AssetMetadataSettings = {',
  \`export const DEFAULT_ASSET_METADATA: AssetMetadataSettings = {
  author: "",
  camera: "",
  lens: "",
  iso: "",
  focalLength: "",
  aperture: "",
  shutterSpeed: "",
  date: "",
  location: "",
  description: "",\`
);
fs.writeFileSync('app/editor/pageTypes.ts', pageTypes);

console.log('Fixed last 2 errors');
