const fs = require('fs');
let rv = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

const regexRender = /const slotWidthMm = \(rack\.totalWidthMm - 2 \* rack\.uprightWidthMm\) \/ rack\.binsPerLevel;\n\n\s+return Array\.from\(\{ length: rack\.binsPerLevel \}\)\.map\(\(_, bIdx\) => \{/g;

const newRender = `const currentSlotsCount = lIdx === 0 ? (rack.groundSlotsCount || rack.binsPerLevel) : (rack.levels[lIdx - 1]?.slotsCount || rack.binsPerLevel);
                const slotWidthMm = (rack.totalWidthMm - 2 * rack.uprightWidthMm) / currentSlotsCount;

                return Array.from({ length: currentSlotsCount }).map((_, bIdx) => {`;

rv = rv.replace(regexRender, newRender);

const regexCol = /const slotWidthMm = \(rack\.totalWidthMm - 2 \* rack\.uprightWidthMm\) \/ rack\.binsPerLevel;/;
const newCol = `const currentSlotsCount = targetAlv.levelIndex === 0 ? (rack.groundSlotsCount || rack.binsPerLevel) : (rack.levels[targetAlv.levelIndex - 1]?.slotsCount || rack.binsPerLevel);
  const slotWidthMm = (rack.totalWidthMm - 2 * rack.uprightWidthMm) / currentSlotsCount;`;
rv = rv.replace(regexCol, newCol);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', rv);
