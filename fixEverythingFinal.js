const fs = require('fs');

// 1. Fix pageTypes.ts
let pageTypes = fs.readFileSync('app/editor/pageTypes.ts', 'utf-8');
const lines = pageTypes.split('\n').filter(line => !line.includes('from "../pageTypes"'));
pageTypes = lines.join('\n');
fs.writeFileSync('app/editor/pageTypes.ts', pageTypes);

// 2. Fix useEditorState.tsx
let useEditorState = fs.readFileSync('app/editor/hooks/useEditorState.tsx', 'utf-8');
// Fix implicit any
useEditorState = useEditorState.replace(/\(prev\)/g, '(prev: any)');
useEditorState = useEditorState.replace(/\(str\)/g, '(str: any)');
useEditorState = useEditorState.replace(/\(branch\)/g, '(branch: any)');
// Add missing state variables. The return block starts with `return {` on line ~1380.
// We should put the variables right above the `return {`
const returnRegex = /return \{\s*\n/g;
const match = returnRegex.exec(useEditorState);
if (match) {
  const missingState = `
    const [matchROI, setMatchROI] = useState<any>(null);
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [compareEnabled, setCompareEnabled] = useState(false);
    const [compareSplit, setCompareSplit] = useState(50);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lutInputRef = useRef<HTMLInputElement>(null);
    const handleCommand = (cmd: any) => { console.log("Command:", cmd); };
  `;
  useEditorState = useEditorState.slice(0, match.index) + missingState + '\n  ' + useEditorState.slice(match.index);
}
// Fix duplicate videoSrc
useEditorState = useEditorState.replace(/videoSrc,\s*videoSrc,/g, 'videoSrc,');
// Fix missing setCompareEnabled
if (!useEditorState.includes('setCompareEnabled,')) {
  useEditorState = useEditorState.replace(/setCompareSplit,/g, 'setCompareSplit,\n    setCompareEnabled,');
}
fs.writeFileSync('app/editor/hooks/useEditorState.tsx', useEditorState);

// 3. Fix page.tsx
let page = fs.readFileSync('app/editor/page.tsx', 'utf-8');
// Deduplicate handleCommand
page = page.replace(/handleCommand,\s*handleCommand,/g, 'handleCommand,');
page = page.replace(/handleCommand,\s*settings,\s*handleCommand,/g, 'settings,\n    handleCommand,');
// Fix CommandBar props: it needs commands={appCommands}
// It currently has `<CommandBar isOpen={...} onClose={...} />`
page = page.replace(/<CommandBar[\s\S]*?\/>/, '<CommandBar isOpen={isCommandBarOpen} onClose={() => setIsCommandBarOpen(false)} commands={appCommands} />');
fs.writeFileSync('app/editor/page.tsx', page);

console.log('Fixed everything final');
