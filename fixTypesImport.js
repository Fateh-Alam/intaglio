const fs = require('fs');

const filesToFix = [
  'app/editor/components/HistogramGraph.tsx',
  'app/editor/hooks/useEditorState.tsx',
  'app/editor/pageTypes.ts'
];

for (const file of filesToFix) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace(/['"]\.\.\/types\/editor['"]/g, '"../pageTypes"');
    content = content.replace(/['"]\.\.\/\.\.\/types\/editor['"]/g, '"../../editor/pageTypes"');
    fs.writeFileSync(file, content);
  }
}

console.log('Fixed types/editor imports');
