const fs = require('fs');

// 1. Fix useState in useEditorState.tsx
let useEditorStateContent = fs.readFileSync('app/editor/hooks/useEditorState.tsx', 'utf-8');
// Fix the broken useState for referenceImageUrl
const brokenUseStateRegex = /const \[referenceImageUrl, setReferenceImageUrl,[\s\S]*?diffVirtualCopy\] = useState<string \| null>\(/g;
useEditorStateContent = useEditorStateContent.replace(brokenUseStateRegex, 'const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(');
fs.writeFileSync('app/editor/hooks/useEditorState.tsx', useEditorStateContent);


// 2. Fix CinematicTextControls default import in EditorRightSidebar.tsx
let rightSidebarContent = fs.readFileSync('app/editor/components/EditorRightSidebar.tsx', 'utf-8');
rightSidebarContent = rightSidebarContent.replace('import { CinematicTextControls } from "../../components/CinematicTextControls";', 'import CinematicTextControls from "../../components/CinematicTextControls";');
fs.writeFileSync('app/editor/components/EditorRightSidebar.tsx', rightSidebarContent);


// 3. Extract TUTORIAL_CONTENT from page_old.tsx and append to pageTypes.ts
let pageOldContent = fs.readFileSync('page_old.tsx', 'utf-8');
let tutorialMatch = pageOldContent.match(/const TUTORIAL_CONTENT[^]*?};/);
if (tutorialMatch) {
  let tutorialContent = tutorialMatch[0].replace('const ', 'export const ');
  let pageTypesContent = fs.readFileSync('app/editor/pageTypes.ts', 'utf-8');
  if (!pageTypesContent.includes('TUTORIAL_CONTENT')) {
    fs.writeFileSync('app/editor/pageTypes.ts', pageTypesContent + '\n' + tutorialContent + '\n');
  }
}

console.log('Final fixes applied');
