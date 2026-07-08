const fs = require('fs');

let content = fs.readFileSync('app/editor/components/EditorWorkspaceCanvas.tsx', 'utf-8');
content = content.replace(', handleCreateVirtualCopy', '');
fs.writeFileSync('app/editor/components/EditorWorkspaceCanvas.tsx', content);

console.log('Removed handleCreateVirtualCopy from pageTypes import');
