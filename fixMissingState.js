const fs = require('fs');

let content = fs.readFileSync('app/editor/hooks/useEditorState.tsx', 'utf-8');

// The missing definitions
const missingStateDefs = `
  const [matchROI, setMatchROI] = useState<any>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareSplit, setCompareSplit] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lutInputRef = useRef<HTMLInputElement>(null);
  
  const handleCommand = (cmd: any) => {
    console.log("Command:", cmd);
  };
`;

// Insert them right after the toneCurveTexture state
content = content.replace(/const \[toneCurveTexture, setToneCurveTexture\] = useState<THREE\.DataTexture \| null>\(null\);/, 
  'const [toneCurveTexture, setToneCurveTexture] = useState<THREE.DataTexture | null>(null);\n' + missingStateDefs);

// Fix the duplicate videoSrc return property
content = content.replace(/videoSrc,\s*videoSrc,/g, 'videoSrc,');

// Check if setCompareEnabled is already returned
if (!content.includes('setCompareEnabled,')) {
  content = content.replace(/setCompareSplit,/g, 'setCompareSplit, setCompareEnabled,');
}

fs.writeFileSync('app/editor/hooks/useEditorState.tsx', content);

console.log('Fixed missing states in useEditorState.tsx');
