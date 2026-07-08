const fs = require('fs');

const pageContent = fs.readFileSync('app/editor/page.tsx', 'utf-8');
const lines = pageContent.split('\n');

const mainReturnIdx = lines.findIndex(l => l.includes('<main') && lines[l] && lines[l].includes('grid-rows-[minmax'));
console.log('Main return is at roughly line:', mainReturnIdx);
