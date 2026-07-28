const fs = require('fs');

function fix(file) {
  let c = fs.readFileSync(file, 'utf-8');

  // DiagnosticReport, ShopFloorMap, FullScreenMap, App, RackVisualizer3D
  
  c = c.replace(/level\?\.slotsCount \|\| rack\.binsPerLevel/g, 'level?.slotsCount || 3');
  c = c.replace(/rack\.levels\[(.*?)\.?levelIndex - 1\]\?\.slotsCount \|\| rack\.binsPerLevel/g, 'rack.levels[$1.levelIndex - 1]?.slotsCount || 3');
  c = c.replace(/rack\.levels\[lIdx - 1\]\?\.slotsCount \|\| rack\.binsPerLevel/g, 'rack.levels[lIdx - 1]?.slotsCount || 3');
  c = c.replace(/l\.slotsCount \|\| rack\.binsPerLevel/g, 'l.slotsCount || 3');

  fs.writeFileSync(file, c);
}

['src/components/FullScreenMap.tsx', 'src/components/DiagnosticReport.tsx', 'src/components/DigitalTwinDashboard.tsx', 'src/components/AnalyticsDashboard.tsx', 'src/components/ShopFloorMap.tsx', 'src/components/RackVisualizer3D.tsx', 'src/App.tsx'].forEach(fix);

