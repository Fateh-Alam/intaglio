const { execSync } = require('child_process');
const fs = require('fs');

try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
} catch (error) {
  const output = error.stdout.toString();
  const regex = /(app\/editor\/.*?\.tsx?)\(\d+,\d+\): error TS2304: Cannot find name '([^']+)'.|error TS2552: Cannot find name '([^']+)'.*?Did you mean '([^']+)'\?/g;
  
  const missingImports = {};

  let match;
  while ((match = regex.exec(output)) !== null) {
    const file = match[1];
    const name = match[2] || match[3];
    if (file && name) {
      if (!missingImports[file]) missingImports[file] = new Set();
      missingImports[file].add(name);
    }
  }

  // Define where things come from
  const sourceMap = {
    'ColorLabel': '../types/editor',
    'VirtualCopy': '../types/editor',
    'ProjectSessionFile': '../types/editor',
    'ImageFileInfo': '../types/editor',
    'ExportRecipe': '../types/editor',
    'ExportFormat': '../types/editor',
    'ExportRecipeId': '../types/editor',
    'ExportSafetyWarning': '../types/editor',
    'AppCommand': '../types/editor',
    'AssetMetadataSettings': '../types/editor',
    
    'FILM_EMULATIONS': '../../lib/filmEmulations',
    
    'ColorWheel': '../../components/ColorWheel',
    'CurveEditor': '../../components/CurveEditor',
    'HistoryPanel': '../../components/HistoryPanel',
    'LUTCreatorModal': '../../components/LUTCreatorModal',
    'PresetCreatorModal': '../../components/PresetCreatorModal',
    'ReferenceViewer': '../../components/ReferenceViewer',
    'TutorialModal': '../../components/TutorialModal',
    'VideoGradingPanel': '../../components/VideoGradingPanel',
    'CinematicTextControls': '../../components/CinematicTextControls',
    'Image': 'next/image',
    'THREE': 'three',
    
    // Everything else comes from pageTypes
  };

  for (const [file, names] of Object.entries(missingImports)) {
    let content = fs.readFileSync(file, 'utf-8');
    
    const pageTypesImports = [];
    const otherImports = {};

    names.forEach(name => {
      const source = sourceMap[name];
      if (source) {
        if (!otherImports[source]) otherImports[source] = [];
        otherImports[source].push(name);
      } else {
        // Assume pageTypes
        pageTypesImports.push(name);
      }
    });

    let importBlock = '';
    
    if (pageTypesImports.length > 0) {
      // For useEditorState.tsx, the path is "../pageTypes"
      // For components, the path is "../pageTypes"
      const path = file.includes('hooks') ? '../pageTypes' : '../pageTypes';
      importBlock += `import { ${pageTypesImports.join(', ')} } from "${path}";\n`;
    }

    for (const [source, sourceNames] of Object.entries(otherImports)) {
      if (source === 'next/image') {
        importBlock += `import Image from "next/image";\n`;
      } else if (source === 'three') {
        importBlock += `import * as THREE from "three";\n`;
      } else {
        // adjust path depth
        let finalSource = source;
        if (file.includes('pageTypes.ts') && source.startsWith('../types')) {
          // Keep as is
        } else if (file.includes('pageTypes.ts') && source.startsWith('../../')) {
           finalSource = source.replace('../../', '../');
        }
        importBlock += `import { ${sourceNames.join(', ')} } from "${finalSource}";\n`;
      }
    }

    content = importBlock + content;
    fs.writeFileSync(file, content);
  }
  
  console.log('Auto-fixed imports');
}
