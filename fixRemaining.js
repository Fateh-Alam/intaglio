const fs = require('fs');

// 1. Fix EditorRightSidebar.tsx imports
let rightContent = fs.readFileSync('app/editor/components/EditorRightSidebar.tsx', 'utf-8');
const importsToAdd = `import { COLOR_LABELS, WATERMARK_POSITIONS, FORMAT, DEFAULT_ASSET_METADATA, DEFAULT_WATERMARK, getImageFileInfo, EXPORT_RECIPES, TUTORIAL_CONTENT } from "../pageTypes";\n`;

// Insert after React import
rightContent = rightContent.replace("import React from 'react';\n", "import React from 'react';\n" + importsToAdd);

// Remove CommandBar and ShortcutHelp blocks
rightContent = rightContent.replace(/<CommandBar[\s\S]*?\/>/g, '');
rightContent = rightContent.replace(/<ShortcutHelp[\s\S]*?\/>/g, '');

fs.writeFileSync('app/editor/components/EditorRightSidebar.tsx', rightContent);

// 2. Fix updateSettings missing in useEditorState.tsx
let hookContent = fs.readFileSync('app/editor/hooks/useEditorState.tsx', 'utf-8');
// wait, the error is at 1488: Cannot find name 'updateSettings'. Did you mean 'updateSetting'?
// Let's replace updateSettings with updateSetting if it's there
hookContent = hookContent.replace(/updateSettings/g, 'updateSetting');
fs.writeFileSync('app/editor/hooks/useEditorState.tsx', hookContent);

console.log('Fixed remaining errors');
