const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /const levelsChanged = JSON\.stringify\(currentTemplate\?\.levels\) !== JSON\.stringify\(updatedRack\.levels\) \|\| currentTemplate\?\.binsPerLevel !== updatedRack\.binsPerLevel;/;

const replacement = `const levelsChanged = JSON.stringify(currentTemplate?.levels) !== JSON.stringify(updatedRack.levels) 
      || currentTemplate?.binsPerLevel !== updatedRack.binsPerLevel
      || currentTemplate?.groundSlotsCount !== updatedRack.groundSlotsCount;`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', content);
