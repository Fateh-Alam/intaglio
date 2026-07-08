const fs = require('fs');

// 1. Fix pageTypes.ts exports and invalid imports
let pageTypes = fs.readFileSync('app/editor/pageTypes.ts', 'utf-8');
pageTypes = pageTypes.replace(/import {.*?AssetMetadataSettings.*?} from ['"]\.\.\/pageTypes['"];?/g, '');
// Add export to interfaces and types
pageTypes = pageTypes.replace(/interface EditorSettings/g, 'export interface EditorSettings');
pageTypes = pageTypes.replace(/interface WatermarkSettings/g, 'export interface WatermarkSettings');
pageTypes = pageTypes.replace(/type EditorSettingKey/g, 'export type EditorSettingKey');
pageTypes = pageTypes.replace(/type EditorSettingValue/g, 'export type EditorSettingValue');
// Also AppCommand, HistogramData, ImageBounds
pageTypes = pageTypes.replace(/interface AppCommand/g, 'export interface AppCommand');
pageTypes = pageTypes.replace(/interface HistogramData/g, 'export interface HistogramData');
pageTypes = pageTypes.replace(/interface ImageBounds/g, 'export interface ImageBounds');

fs.writeFileSync('app/editor/pageTypes.ts', pageTypes);


// 2. Fix useEditorState.tsx missing vars
let editorState = fs.readFileSync('app/editor/hooks/useEditorState.tsx', 'utf-8');
// Find where to insert the missing vars. Let's insert them right after `const [videoSrc, setVideoSrc]` or at the end of the state declarations.
const insertPos = editorState.indexOf('const updateSetting = useCallback(');
if (insertPos !== -1) {
  const missingVars = `
  const [matchROI, setMatchROI] = useState<any>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareSplit, setCompareSplit] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lutInputRef = useRef<HTMLInputElement>(null);
  const handleCommand = (cmd: any) => { console.log("Command:", cmd); };
  
`;
  editorState = editorState.slice(0, insertPos) + missingVars + editorState.slice(insertPos);
}

// Fix duplicate videoSrc in return
editorState = editorState.replace(/videoSrc,\s*videoSrc,/g, 'videoSrc,');

// Check if setCompareEnabled is in return
if (!editorState.includes('setCompareEnabled,')) {
  editorState = editorState.replace(/setCompareSplit,/g, 'setCompareSplit,\n    setCompareEnabled,');
}

fs.writeFileSync('app/editor/hooks/useEditorState.tsx', editorState);


// 3. Fix page.tsx destructuring
let page = fs.readFileSync('app/editor/page.tsx', 'utf-8');
// Add settings and handleCommand to useEditorState() block
page = page.replace('appCommands,', 'appCommands,\n    settings,\n    handleCommand,');

// Fix CommandBar props: remove onSelect={handleCommand} and add commands={appCommands}
// The broken page.tsx has CommandBar inside EditorLayout
// Wait, my previous script tried to replace the whole `<CommandBar...>` block with what was in page_old.tsx.bak!
// If that failed, let's just do it manually.
page = page.replace(/<CommandBar[\s\S]*?\/>/, `
      <CommandBar
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
        commands={appCommands}
      />
`);

fs.writeFileSync('app/editor/page.tsx', page);

console.log('Applied final type fixes');
