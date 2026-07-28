const fs = require('fs');
let content = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

// Replace the array mapping with a proper TS cast or distinct types
const oldArray = `[0, ...rack.levels].map((level, idx) => {`;
const newArray = `( [null, ...rack.levels] as (null | typeof rack.levels[0])[] ).map((level, idx) => {`;

content = content.replace(oldArray, newArray);
content = content.replace(/level\.id/g, "level?.id");
content = content.replace(/level\.levelNumber/g, "level?.levelNumber");
content = content.replace(/level\.slotsCount/g, "level?.slotsCount");

fs.writeFileSync('src/components/RackVisualizer3D.tsx', content);
