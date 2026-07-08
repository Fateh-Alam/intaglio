const fs = require('fs');
let file = fs.readFileSync('app/editor/pageTypes.ts', 'utf-8');
file = file.replace(
  'export const DEFAULT_ASSET_METADATA: AssetMetadataSettings = {',
  'export const DEFAULT_ASSET_METADATA: AssetMetadataSettings = {\n  caption: "",\n  rating: 0,\n  colorLabel: "None",\n  flagStatus: "Unflagged",'
);
fs.writeFileSync('app/editor/pageTypes.ts', file);
