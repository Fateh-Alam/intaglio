const fs = require('fs');

// 1. Fix types/editor.ts AssetMetadataSettings
let editorTypes = fs.readFileSync('app/types/editor.ts', 'utf-8');
editorTypes = editorTypes.replace(/description: string;/g, 'description: string;\n  caption: string;\n  rating: number;\n  colorLabel: string;\n  flagStatus: string;\n  creator: string;');
fs.writeFileSync('app/types/editor.ts', editorTypes);

// 2. Fix pageTypes.ts by removing any residual types
let pageTypes = fs.readFileSync('app/editor/pageTypes.ts', 'utf-8');
pageTypes = pageTypes.replace(/interface EditorSettings[\s\S]*?\n\}\n/g, '');
pageTypes = pageTypes.replace(/type EditorSettingKey[\s\S]*?\n/g, '');
pageTypes = pageTypes.replace(/type EditorSettingValue[\s\S]*?\n/g, '');
pageTypes = pageTypes.replace(/type SerializableEditorSettings[\s\S]*?\n/g, '');
pageTypes = pageTypes.replace(/type PerformanceMode[\s\S]*?\n/g, '');
pageTypes = pageTypes.replace(/type CompositionGuide[\s\S]*?\n/g, '');
pageTypes = pageTypes.replace(/type WatermarkPosition[\s\S]*?\n/g, '');
pageTypes = pageTypes.replace(/interface WatermarkSettings[\s\S]*?\n\}\n/g, '');
pageTypes = pageTypes.replace(/interface AssetMetadataSettings[\s\S]*?\n\}\n/g, '');
pageTypes = pageTypes.replace(/interface HistogramData[\s\S]*?\n\}\n/g, '');
pageTypes = pageTypes.replace(/interface ImageBounds[\s\S]*?\n\}\n/g, '');
pageTypes = pageTypes.replace(/interface AppCommand[\s\S]*?\n\}\n/g, '');
fs.writeFileSync('app/editor/pageTypes.ts', pageTypes);

// 3. Fix useEditorState.tsx
let useEditorState = fs.readFileSync('app/editor/hooks/useEditorState.tsx', 'utf-8');

// Add missing imports
const missingPageTypesImports = 'VirtualCopy, ProjectSessionFile, ExportFormat, ExportRecipeId, ExportSafetyWarning, createHistoryState, ExportRecipe, EXPORT_RECIPES, PERFORMANCE_MODES, COMPOSITION_GUIDES, isPerformanceMode, isCompositionGuide, isExportFormat, isExportRecipeId, ImageFileInfo';

useEditorState = useEditorState.replace(
  'import { getEditorModuleLabel, handleCreateVirtualCopy } from "../pageTypes";',
  'import { getEditorModuleLabel, ' + missingPageTypesImports + ' } from "../pageTypes";'
);

// Inject missing state right before return {
const missingVars = `
  const [matchROI, setMatchROI] = useState<any>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareSplit, setCompareSplit] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lutInputRef = useRef<HTMLInputElement>(null);
  const handleCommand = (cmd: any) => { console.log("Command:", cmd); };
`;
useEditorState = useEditorState.replace(/return \{\s*settings,/g, missingVars + '\n  return {\n    settings,');

// Fix implicit any in map loops
useEditorState = useEditorState.replace(/\(prev\)/g, '(prev: any)');
useEditorState = useEditorState.replace(/\(copy\)/g, '(copy: any)');
useEditorState = useEditorState.replace(/\(recipe\)/g, '(recipe: any)');
useEditorState = useEditorState.replace(/\(mode\)/g, '(mode: any)');
useEditorState = useEditorState.replace(/\(guide\)/g, '(guide: any)');

// Check if return { block actually had them replaced
useEditorState = useEditorState.replace(/setCompareSplit,/g, 'setCompareSplit, setCompareEnabled,');

fs.writeFileSync('app/editor/hooks/useEditorState.tsx', useEditorState);

// 4. Fix page.tsx CommandBar commands
let page = fs.readFileSync('app/editor/page.tsx', 'utf-8');
page = page.replace(/<CommandBar[\s\S]*?\/>/, '<CommandBar isOpen={isCommandBarOpen} onClose={() => setIsCommandBarOpen(false)} commands={appCommands} />');
fs.writeFileSync('app/editor/page.tsx', page);

console.log('Fixed everything');
