const fs = require('fs');
let pageOld = fs.readFileSync('page_old.tsx', 'utf-8');

// Find TUTORIAL_CONTENT
// It should be something like `const TUTORIAL_CONTENT = { ... };`
let contentMatches = pageOld.match(/const TUTORIAL_CONTENT[^]*?};/);
let tutorialContentCode = contentMatches ? contentMatches[0] : '';
tutorialContentCode = tutorialContentCode.replace('const ', 'export const ');

// Find FORMAT
// Usually it's an import from brand, but maybe it's `import { FORMAT } from "../lib/brand";` in page_old.tsx?
let formatMatch = pageOld.match(/import \{ FORMAT \} from ".*?";/);

let pageTypes = fs.readFileSync('app/editor/pageTypes.ts', 'utf-8');
if (tutorialContentCode && !pageTypes.includes('TUTORIAL_CONTENT')) {
  pageTypes += '\n' + tutorialContentCode + '\n';
}

fs.writeFileSync('app/editor/pageTypes.ts', pageTypes);

// Also fix TutorialModal default import
let rightSidebar = fs.readFileSync('app/editor/components/EditorRightSidebar.tsx', 'utf-8');
rightSidebar = rightSidebar.replace('import { TutorialModal } from "../../components/TutorialModal";', 'import TutorialModal from "../../components/TutorialModal";');
// if FORMAT is not in pageTypes, just import it from lib/brand directly in EditorRightSidebar
if (!formatMatch) {
  // we will import it directly
  rightSidebar = rightSidebar.replace('FORMAT, ', '');
  rightSidebar = 'import { FORMAT } from "../../lib/brand";\n' + rightSidebar;
}

fs.writeFileSync('app/editor/components/EditorRightSidebar.tsx', rightSidebar);

console.log('Fixed constants');
