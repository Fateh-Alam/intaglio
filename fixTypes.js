const fs = require('fs');

let content = fs.readFileSync('app/editor/pageTypes.ts', 'utf-8');
const lines = content.split('\n');
const newLines = lines.map(line => {
  if (line.match(/^\s+export const /)) {
    return line.replace('export const ', 'const ');
  }
  return line;
});
fs.writeFileSync('app/editor/pageTypes.ts', newLines.join('\n'));
console.log('Fixed nested exports');
