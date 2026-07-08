const fs = require('fs');
let content = fs.readFileSync('app/editor/components/EditorRightSidebar.tsx', 'utf-8');

// The main div for Right Sidebar starts at <div className="... w-[360px] ... flex flex-col bg-[var(--ormond-panel)]
// and ends somewhere.
// Let's just find the last `</div>` before `<div className="relative z-50 flex h-16 w-full items-center` or similar, or just before `</main>`!
const mainEndIdx = content.indexOf('</main>');
if (mainEndIdx !== -1) {
  content = content.slice(0, mainEndIdx);
  content += `\n    </>\n  );\n}\n`;
  fs.writeFileSync('app/editor/components/EditorRightSidebar.tsx', content);
  console.log('Fixed syntax 1');
}
