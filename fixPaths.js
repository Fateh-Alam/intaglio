const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  let files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      filelist.push(path.join(dir, file));
    }
  });
  return filelist;
};

const allFiles = walkSync('app');
allFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx')).forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let replaced = content.replace(/'\.\.\/\.\.\/types\/editor'/g, "'../../../types/editor'");
  if(content !== replaced) {
    fs.writeFileSync(file, replaced, 'utf8');
    console.log('Fixed', file);
  }
});
