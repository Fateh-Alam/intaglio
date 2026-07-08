const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'components', 'landing', 'LensTunnel.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace('thickness: 0.5 + Math.random() * 2,', 'thickness: 0.5 + ((i * 1.7) % 2),');
content = content.replace('ior: 1.1 + Math.random() * 0.4,', 'ior: 1.1 + ((i * 0.3) % 0.4),');

fs.writeFileSync(filePath, content);
console.log('Fixed LensTunnel');
