import fs from 'node:fs';
import path from 'node:path';

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) walk(dirPath, callback);
    else callback(path.join(dir, f));
  });
}

let modifiedCount = 0;

walk('./app', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // We want to find <Icon... > tags and remove size={...}, stroke={...}, strokeWidth={...}
    // and add className="intaglio-icon"
    
    const originalContent = content;
    
    // Replace size={...} or size="..."
    content = content.replace(/<Icon([a-zA-Z0-9_]+)\s+([^>]*?)>/g, (match, p1, p2) => {
      let inner = p2;
      
      // Remove size
      inner = inner.replace(/\bsize=\{[^\}]+\}/g, '');
      inner = inner.replace(/\bsize="[^"]+"/g, '');
      
      // Remove stroke / strokeWidth
      inner = inner.replace(/\bstroke(Width)?=\{[^\}]+\}/g, '');
      inner = inner.replace(/\bstroke(Width)?="[^"]+"/g, '');
      
      // Clean up multiple spaces
      inner = inner.replace(/\s+/g, ' ').trim();
      
      // If there's an existing className, merge intaglio-icon (unless it's already there)
      if (inner.includes('className=')) {
        if (!inner.includes('intaglio-icon')) {
          inner = inner.replace(/className=(["'])(.*?)\1/, 'className=$1intaglio-icon $2$1');
        }
      } else {
        // If it's a self closing tag ending in /
        if (inner.endsWith('/')) {
           inner = 'className="intaglio-icon" ' + inner;
        } else {
           inner = inner ? 'className="intaglio-icon" ' + inner : 'className="intaglio-icon"';
        }
      }
      
      // Fix potential space before />
      inner = inner.replace(/ \/$/, '/');
      
      if (inner) {
        return `<Icon${p1} ${inner}>`;
      }
      return `<Icon${p1}>`;
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      modifiedCount++;
      console.log(`Modified ${filePath}`);
    }
  }
});

console.log(`Done! Modified ${modifiedCount} files.`);
