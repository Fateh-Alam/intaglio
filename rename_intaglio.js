const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      filelist.push(path.join(dir, file));
    }
  });
  return filelist;
};

const appFiles = walkSync('app');
const targetFiles = appFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

const excludeList = [
  'app/lib/brand.ts',
  'app/page.tsx',
  'app/layout.tsx'
];

targetFiles.forEach(file => {
  if (excludeList.includes(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // Replace ormond- with intaglio-
  newContent = newContent.replace(/ormond-/g, 'intaglio-');
  
  // Replace Ormond with Intaglio (for texts and variable names if any)
  newContent = newContent.replace(/Ormond/g, 'Intaglio');
  
  // Also handle lower case standalone ormond if there are any that aren't legacy formats
  // but let's be careful, maybe just handle specific strings
  newContent = newContent.replace(/ormond_preset_preview/g, 'intaglio_preset_preview');
  newContent = newContent.replace(/ormond_preset_favorites/g, 'intaglio_preset_favorites');
  newContent = newContent.replace(/ormond_imported_presets/g, 'intaglio_imported_presets');
  newContent = newContent.replace(/ormond_tutorials_seen/g, 'intaglio_tutorials_seen');
  newContent = newContent.replace(/ormondArchive/g, 'intaglioArchive');
  newContent = newContent.replace(/ormondPage/g, 'intaglioPage');

  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Updated', file);
  }
});

// Update manifest.ts
let manifest = fs.readFileSync('app/manifest.ts', 'utf8');
manifest = manifest.replace(/Ormond/g, 'Intaglio');
manifest = manifest.replace(/ormond/g, 'intaglio'); // just in case
fs.writeFileSync('app/manifest.ts', manifest, 'utf8');
console.log('Updated app/manifest.ts');

// Also update README.md and CHANGELOG.md if we haven't
try {
  let readme = fs.readFileSync('README.md', 'utf8');
  readme = readme.replace(/Ormond/g, 'Intaglio');
  readme = readme.replace(/Nyvarra/g, 'Intaglio');
  fs.writeFileSync('README.md', readme, 'utf8');
  console.log('Updated README.md');
} catch(e) {}

try {
  let cl = fs.readFileSync('CHANGELOG.md', 'utf8');
  cl = cl.replace(/Ormond/g, 'Intaglio');
  fs.writeFileSync('CHANGELOG.md', cl, 'utf8');
  console.log('Updated CHANGELOG.md');
} catch(e) {}
