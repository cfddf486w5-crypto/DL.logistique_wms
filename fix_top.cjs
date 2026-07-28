const fs = require('fs');

function fix(file) {
  let c = fs.readFileSync(file, 'utf-8');
  // 1. Remove the injected function
  const injected = `const getTotalSlotsForRack = (rack: any) => {
  let total = (rack.groundSlotsCount || rack.binsPerLevel);
  rack.levels.forEach((l: any) => {
    total += (l.slotsCount || rack.binsPerLevel);
  });
  return total;
};`;
  
  if (c.includes(injected)) {
    c = c.replace(injected, '');
    c = c.replace('import { \n', 'import { ');
    
    // Now insert it safely right before the first interface or component declaration
    // We can just append it at the end of the imports.
    // Let's find the first `interface` or `export` or `const ` (that is not part of import)
    const insertionPoint = c.match(/interface|export default|export const|const [A-Z]/);
    if (insertionPoint) {
       c = c.replace(insertionPoint[0], injected + '\n\n' + insertionPoint[0]);
    } else {
       c += '\n\n' + injected;
    }
    
    fs.writeFileSync(file, c);
  }
}

['src/components/FullScreenMap.tsx', 'src/components/DiagnosticReport.tsx', 'src/components/DigitalTwinDashboard.tsx', 'src/components/AnalyticsDashboard.tsx', 'src/components/ShopFloorMap.tsx'].forEach(fix);

