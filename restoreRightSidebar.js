const fs = require('fs');

// 1. Get the original UI from page_old.tsx.bak
const pageContent = fs.readFileSync('page_old.tsx.bak', 'utf-8');
const lines = pageContent.split('\n');
const rightSidebarStart = lines.findIndex(l => l.includes('{/* RIGHT SIDEBAR - CONTROLS */}'));
const mobileBarsStart = lines.findIndex(l => l.includes('{/* BOTTOM MOBILE NAVIGATION */}'));
let rightSidebarContent = lines.slice(rightSidebarStart, mobileBarsStart - 1).join('\n');

// 2. Apply Ormond theme
rightSidebarContent = rightSidebarContent
  .replace(/bg-black\/30/g, 'bg-[var(--ormond-panel-soft)]')
  .replace(/bg-\[\#11100d\]/g, 'bg-[var(--ormond-charcoal-2)]')
  .replace(/bg-white\/5/g, 'bg-[rgba(231,223,208,0.045)]')
  .replace(/border-white\/10/g, 'border-[var(--ormond-line)]')
  .replace(/border-white\/5/g, 'border-[var(--ormond-line)]')
  .replace(/text-white\/35/g, 'text-[rgba(231,223,208,0.48)]')
  .replace(/text-white\/45/g, 'text-[rgba(231,223,208,0.58)]')
  .replace(/text-white\/85/g, 'text-[var(--ormond-paper)]')
  .replace(/text-gray-400/g, 'text-[rgba(231,223,208,0.58)]')
  .replace(/text-gray-300/g, 'text-[rgba(231,223,208,0.72)]')
  .replace(/text-gray-500/g, 'text-[rgba(231,223,208,0.38)]')
  .replace(/font-semibold/g, 'font-medium')
  .replace(/uppercase tracking-\[0\.35em\]/g, 'ormond-label')
  .replace(/uppercase tracking-\[0\.45em\]/g, 'ormond-label');

// 3. Fix any errors
rightSidebarContent = rightSidebarContent.replace(/\(prev\)/g, '(prev: any)');
rightSidebarContent = rightSidebarContent.replace(/\(snap\)/g, '(snap: any)');
rightSidebarContent = rightSidebarContent.replace(/\(s\)/g, '(s: any)');
rightSidebarContent = rightSidebarContent.replace(/\(warning\)/g, '(warning: any)');
rightSidebarContent = rightSidebarContent.replace(/\(diff\)/g, '(diff: any)');

// Remove CommandBar and ShortcutHelp and VideoGradingPanel from rightSidebarContent
rightSidebarContent = rightSidebarContent.replace(/<CommandBar[\s\S]*?\/>/g, '');
rightSidebarContent = rightSidebarContent.replace(/<ShortcutHelp[\s\S]*?\/>/g, '');
rightSidebarContent = rightSidebarContent.replace(/<VideoGradingPanel[\s\S]*?\/>/g, '');

// 4. Inject into the corrupted file
let rightSidebarFile = fs.readFileSync('app/editor/components/EditorRightSidebar.tsx', 'utf-8');
const topBlockRegex = /export function EditorRightSidebar\(\) \{[\s\S]*?referenceImageUrl,/g;
const match = topBlockRegex.exec(rightSidebarFile);

if (match) {
  const missingVars = `
    setReferenceImageUrl,
    handleCreateVirtualCopy,
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
    diffVirtualCopy
  } = editorState;`;

  const reconstructed = match[0] + missingVars + `\n  return (\n    <>\n${rightSidebarContent}\n    </>\n  );\n}\n`;

  fs.writeFileSync('app/editor/components/EditorRightSidebar.tsx', reconstructed);
  console.log('Successfully recovered and rebuilt EditorRightSidebar.tsx');
} else {
  console.log('Could not find match to inject');
}
