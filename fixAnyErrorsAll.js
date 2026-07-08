const fs = require('fs');

const files = [
  'app/editor/components/EditorLeftSidebar.tsx',
  'app/editor/components/EditorWorkspaceCanvas.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/\(prev\)/g, '(prev: any)');
  content = content.replace(/\(snap\)/g, '(snap: any)');
  content = content.replace(/\(s\)/g, '(s: any)');
  content = content.replace(/\(warning\)/g, '(warning: any)');
  content = content.replace(/\(diff\)/g, '(diff: any)');
  fs.writeFileSync(file, content);
}

console.log('Fixed any errors in all UI files');
