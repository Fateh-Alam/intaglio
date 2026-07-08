const fs = require('fs');
let content = fs.readFileSync('app/editor/components/EditorRightSidebar.tsx', 'utf-8');

// Replace the corrupted setReferenceImageUrl...diffVirtualCopy(url) back to setReferenceImageUrl(url)
content = content.replace(/setReferenceImageUrl,[\s\S]*?diffVirtualCopy\(url\);/g, 'setReferenceImageUrl(url);');
// Fix the other corruption at onClearReference
content = content.replace(/onClearReference=\{\(\) => setReferenceImageUrl,[\s\S]*?diffVirtualCopy\(null\)\}/g, 'onClearReference={() => setReferenceImageUrl(null)}');

fs.writeFileSync('app/editor/components/EditorRightSidebar.tsx', content);

console.log('Fixed ReferenceViewer JSX');
