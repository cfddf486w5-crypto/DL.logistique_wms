const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const oldCode = `      const slotWidthMm = (rack.totalWidthMm - 2 * rack.uprightWidthMm) / rack.binsPerLevel;

      for (let bIdx = 0; bIdx < rack.binsPerLevel; bIdx++) {`;

const newCode = `      const currentSlotsCount = lIdx === 0 
        ? (rack.groundSlotsCount || rack.binsPerLevel) 
        : (rack.levels[lIdx - 1]?.slotsCount || rack.binsPerLevel);
      const slotWidthMm = (rack.totalWidthMm - 2 * rack.uprightWidthMm) / currentSlotsCount;

      for (let bIdx = 0; bIdx < currentSlotsCount; bIdx++) {`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('src/App.tsx', content);
