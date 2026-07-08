const fs = require('fs');

let rightSidebar = fs.readFileSync('app/editor/components/EditorRightSidebar.tsx', 'utf-8');

// Remove TUTORIAL_CONTENT from pageTypes import
rightSidebar = rightSidebar.replace(', TUTORIAL_CONTENT } from "../pageTypes";', ' } from "../pageTypes";');

// Add import from utils
rightSidebar = 'import { TUTORIAL_CONTENT } from "../../utils/tutorialContent";\n' + rightSidebar;

fs.writeFileSync('app/editor/components/EditorRightSidebar.tsx', rightSidebar);

console.log('Fixed TUTORIAL_CONTENT import');
