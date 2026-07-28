const fs = require('fs');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // Add the helper function if not exists
  if (!content.includes('getTotalSlotsForRack') && (
      content.includes('template.binsPerLevel') || 
      content.includes('rack.binsPerLevel')
  )) {
    // If it's a component file, we can just inject a quick helper at the top (after imports)
    const helper = `\nconst getTotalSlotsForRack = (rack: any) => {\n  let total = (rack.groundSlotsCount || rack.binsPerLevel);\n  rack.levels.forEach((l: any) => {\n    total += (l.slotsCount || rack.binsPerLevel);\n  });\n  return total;\n};\n`;
    
    // Find last import
    const lastImportIndex = content.lastIndexOf('import ');
    const endOfImport = content.indexOf('\n', lastImportIndex);
    if (endOfImport !== -1) {
      content = content.slice(0, endOfImport + 1) + helper + content.slice(endOfImport + 1);
      changed = true;
    }
  }

  // Replace usages like (template.levels.length + 1) * template.binsPerLevel
  const totalRegex1 = /\(template\.levels\.length \+ 1\) \* template\.binsPerLevel/g;
  if (totalRegex1.test(content)) {
    content = content.replace(totalRegex1, 'getTotalSlotsForRack(template)');
    changed = true;
  }
  
  // In DigitalTwinDashboard.tsx
  if (filePath.includes('DigitalTwinDashboard.tsx')) {
    const r1 = /const w = rackWidthPx \/ template\.binsPerLevel;/;
    const r1new = `const currentSlotsCount = (template.groundSlotsCount || template.binsPerLevel); // Just approximate using ground\n                    const w = rackWidthPx / currentSlotsCount;`;
    if (r1.test(content)) {
      content = content.replace(r1, r1new);
      changed = true;
    }
  }

  // In DiagnosticReport.tsx
  if (filePath.includes('DiagnosticReport.tsx')) {
    const r1 = /\{rack\.binsPerLevel\} alvéoles/g;
    const r1new = `{getTotalSlotsForRack(rack)} alvéoles (total)`;
    
    const r2 = /const slotWidth = \(rack\.totalWidthMm - 2 \* rack\.uprightWidthMm\) \/ rack\.binsPerLevel;/g;
    const r2new = `const currentSlotsCount = rack.groundSlotsCount || rack.binsPerLevel; // Ground slot width approx
                const slotWidth = (rack.totalWidthMm - 2 * rack.uprightWidthMm) / currentSlotsCount;`;

    const r3 = /\{Math\.round\(\(rack\.totalWidthMm - 2 \* rack\.uprightWidthMm\) \/ rack\.binsPerLevel\)\} mm/g;
    const r3new = `{Math.round((rack.totalWidthMm - 2 * rack.uprightWidthMm) / (rack.groundSlotsCount || rack.binsPerLevel))} mm`;

    const r4 = /\(\(\(rack\.totalWidthMm - 2 \* rack\.uprightWidthMm\) \/ rack\.binsPerLevel \* \(rack\.levels\[0\]\.heightFromGroundMm - 100\) \* rack\.depthMm\) \/ 1000000\)\.toFixed\(1\)/g;
    const r4new = `(((rack.totalWidthMm - 2 * rack.uprightWidthMm) / (rack.groundSlotsCount || rack.binsPerLevel) * (rack.levels[0].heightFromGroundMm - 100) * rack.depthMm) / 1000000).toFixed(1)`;

    if (r1.test(content)) content = content.replace(r1, r1new);
    if (r2.test(content)) content = content.replace(r2, r2new);
    if (r3.test(content)) content = content.replace(r3, r3new);
    if (r4.test(content)) content = content.replace(r4, r4new);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
  }
}

['src/components/FullScreenMap.tsx', 'src/components/DiagnosticReport.tsx', 'src/components/DigitalTwinDashboard.tsx', 'src/components/AnalyticsDashboard.tsx', 'src/components/ShopFloorMap.tsx'].forEach(replaceInFile);

