const fs = require('fs');

let content = fs.readFileSync('app/editor/page.tsx', 'utf-8');

// 1. Fix VideoGradingPanel
// We just replace the <VideoGradingPanel ... /> block with the correct one.
// We'll replace lines 63-67 with the proper JSX.
const videoPanelRegex = /<VideoGradingPanel[\s\S]*?\/>/;
const newVideoPanel = `
      <VideoGradingPanel
        isOpen={isVideoGradingOpen}
        onClose={() => setIsVideoGradingOpen(false)}
        settings={settings}
        onExtractFrame={(dataUrl) => {
          setImageSrc(dataUrl);
          setImageName("Video Frame");
        }}
      />`;
content = content.replace(videoPanelRegex, newVideoPanel);

// 2. Fix CommandBar
// Replace `onSelect={handleCommand}` with nothing, since it's not in props.
// Wait, actually let's see how CommandBar was invoked in page_old.tsx.bak!
const oldPage = fs.readFileSync('page_old.tsx.bak', 'utf-8');
const oldCommandBarMatch = oldPage.match(/<CommandBar[\s\S]*?\/>/);
if (oldCommandBarMatch) {
  content = content.replace(/<CommandBar[\s\S]*?\/>/, oldCommandBarMatch[0]);
}

fs.writeFileSync('app/editor/page.tsx', content);

console.log('Fixed page.tsx');
