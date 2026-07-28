import fs from 'fs';
let code = fs.readFileSync('src/components/RackVisualizer/RackAlveoliTable.tsx', 'utf-8');

code = code.replace(
  'setSelectedAlveolusId\n}: RackAlveoliTableProps) {',
  'setSelectedAlveolusId\n}: RackAlveoliTableProps) {\n  const { lengthUnit, volumeUnit } = useSettings();'
);

fs.writeFileSync('src/components/RackVisualizer/RackAlveoliTable.tsx', code);
