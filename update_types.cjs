const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf-8');
content = content.replace('maxLoadLbs?: number; // Thickness of the orange steel beam, e.g., 100mm', 'maxLoadLbs?: number;\n  slotsCount?: number; // Number of slots for this specific level');
content = content.replace('binsPerLevel: number;', 'binsPerLevel: number;\n  groundSlotsCount?: number; // Number of slots for the ground level');
fs.writeFileSync('src/types.ts', content);
