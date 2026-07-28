import fs from 'fs';
let code = fs.readFileSync('src/components/DigitalTwinDashboard.tsx', 'utf-8');

code = code.replace(
  '<Flame size={14} className="text-orange-500" />',
  '<Flame size={14} className="text-cyan-400" />'
);

fs.writeFileSync('src/components/DigitalTwinDashboard.tsx', code);
console.log("Dashboard rotation classes patched");
