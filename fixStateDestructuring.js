const fs = require('fs');

const missingVars = `    handleCreateVirtualCopy,
    handleCopySettings,
    handlePasteSettings,
    applyExportRecipe,
    activeExportRecipeId,
    setActiveExportRecipeId,
    setExportFormat,
    exportFormat,
    exportQuality,
    setExportQuality,
    setExportScale,
    exportScale,
    diffVirtualCopy`;

const files = [
  'app/editor/components/EditorLeftSidebar.tsx',
  'app/editor/components/EditorRightSidebar.tsx',
  'app/editor/components/EditorWorkspaceCanvas.tsx',
  'app/editor/hooks/useEditorState.tsx' // The return block of useEditorState
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  // We know that `setReferenceImageUrl` is the last variable in the massive destructuring list.
  // We can just replace it with `setReferenceImageUrl,\n` + missingVars.
  content = content.replace(/setReferenceImageUrl(?!,\s*handleCreateVirtualCopy)/g, 'setReferenceImageUrl,\n' + missingVars);
  fs.writeFileSync(file, content);
}

console.log('Fixed destructuring and return blocks');
