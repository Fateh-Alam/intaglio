const fs = require('fs');
let c = fs.readFileSync('app/editor/hooks/useEditorState.tsx', 'utf-8');

// I replaced `imageBounds, setImageBounds` everywhere. 
// It was supposed to be in `const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null);`
// and inside `const editorState = { ... imageBounds, setImageBounds }`.

// Let's find the broken useState:
// It looks like `const [imageBounds, setImageBounds, handleUpload, ... setReferenceImageUrl] = useState<ImageBounds | null>(null);`
// We need to change that back to `const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null);`

c = c.replace(/const \[\n?imageBounds, setImageBounds[\s\S]*?setReferenceImageUrl\n?\s*\] = useState/g, 'const [imageBounds, setImageBounds] = useState');

fs.writeFileSync('app/editor/hooks/useEditorState.tsx', c);
console.log('Fixed broken useState');
