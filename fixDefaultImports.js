const fs = require('fs');
const files = [
  'app/editor/components/EditorRightSidebar.tsx',
  'app/editor/components/EditorWorkspaceCanvas.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Replace named imports with default imports
  content = content.replace(/import { (VideoGradingPanel|LUTCreatorModal|PresetCreatorModal|ReferenceViewer|HistoryPanel|CurveEditor|ColorWheel) } from/g, 'import $1 from');
  
  // Also remove `activeExportRecipe`, `exportFormat`, `exportQuality` from the `import { ... } from "../pageTypes";` in EditorWorkspaceCanvas.tsx
  if (file.includes('EditorWorkspaceCanvas')) {
    content = content.replace(/, activeExportRecipe, exportFormat, exportQuality/g, '');
  }

  fs.writeFileSync(file, content);
}

console.log('Fixed default imports');
