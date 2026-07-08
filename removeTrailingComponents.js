const fs = require('fs');

let content = fs.readFileSync('app/editor/components/EditorRightSidebar.tsx', 'utf-8');

// Find the end of the EditorRightSidebar function
const match = content.indexOf('// --- UI COMPONENTS ---');

if (match !== -1) {
  content = content.slice(0, match);
  fs.writeFileSync('app/editor/components/EditorRightSidebar.tsx', content);
  console.log('Removed trailing components');
} else {
  console.log('No trailing components found');
}
