const fs = require('fs');
const files = [
  'app/editor/components/EditorRightSidebar.tsx',
  'app/editor/components/EditorWorkspaceCanvas.tsx',
  'app/editor/hooks/useEditorState.tsx'
];

for (const file of files) {
  let lines = fs.readFileSync(file, 'utf-8').split('\n');
  
  // Find where original imports started (usually `import React` or similar)
  // My auto script added imports to the very top.
  // We can just filter out any import lines that import from "../pageTypes" and contain "setExportScale" etc.
  
  lines = lines.filter(line => {
    if (line.includes('import {') && line.includes('setExportScale')) return false;
    if (line.includes('import {') && line.includes('diffVirtualCopy')) return false;
    if (line.includes('import { VirtualCopy, ExportRecipe') && file.includes('useEditorState')) return false; // bad import in useEditorState
    return true;
  });
  
  fs.writeFileSync(file, lines.join('\n'));
}

console.log("Cleaned bad imports");
