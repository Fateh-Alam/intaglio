const fs = require('fs');

const filesToFix = [
  'app/editor/components/EditorWorkspaceCanvas.tsx',
  'app/editor/components/EditorRightSidebar.tsx',
  'app/editor/hooks/useEditorState.tsx'
];

filesToFix.forEach(file => {
  let c = fs.readFileSync(file, 'utf-8');
  // the old paths in page.tsx were "../components/...".
  // Inside app/editor/components/ or app/editor/hooks/, the path to app/components/ is "../../components/".
  // However, things like EditorLeftSidebar.tsx might import from "../components/HistogramGraph".
  // So if the import is HistogramGraph, it should stay "../components/HistogramGraph".
  
  c = c.replace(/import \{(.*?)\} from "\.\.\/components\/HistogramGraph"/g, 'import {$1} from "./HistogramGraph"');
  c = c.replace(/from "\.\.\/components\/(.*?)"/g, (match, p1) => {
    if (p1 === 'HistogramGraph') return 'from "./HistogramGraph"';
    return `from "../../components/${p1}"`;
  });

  fs.writeFileSync(file, c);
});

console.log('Fixed imports again');
