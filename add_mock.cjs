const fs = require('fs');

let dt = fs.readFileSync('src/data.ts', 'utf-8');

// Add certificationYear to initialRacks
dt = dt.replace(/totalHeightMm: 4500,\n    totalWidthMm: 2700,/g, 'certificationYear: 2023,\n    totalHeightMm: 4500,\n    totalWidthMm: 2700,');

// Add some TMD classes
dt = dt.replace(/color: '#ef4444',\n    type: 'Palette',/g, "color: '#ef4444',\n    type: 'Palette',\n    tmdClass: '3', // Inflammable");
dt = dt.replace(/color: '#3b82f6',\n    type: 'Palette',/g, "color: '#3b82f6',\n    type: 'Palette',\n    tmdClass: '5.1', // Comburant");

fs.writeFileSync('src/data.ts', dt);
