const fs = require('fs');

let content = fs.readFileSync('app/editor/components/EditorRightSidebar.tsx', 'utf-8');
const scopeMetricIdx = content.indexOf('const ScopeMetric');
if (scopeMetricIdx !== -1) {
  content = content.slice(0, scopeMetricIdx);
  // Ensure we close the fragment and function
  content += `    </>\n  );\n}\n`;
  fs.writeFileSync('app/editor/components/EditorRightSidebar.tsx', content);
  console.log('Trimmed EditorRightSidebar.tsx');
}
