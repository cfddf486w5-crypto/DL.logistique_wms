import fs from 'fs';
let code = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

const importSettings = `import { useSettings } from '../contexts/SettingsContext';\nimport { formatLength, formatVolume } from '../utils/units';`;
if (!code.includes("useSettings")) {
  code = importSettings + "\n" + code;
}

code = code.replace(
  '}: RackVisualizer3DProps) {\n  const [hoveredAlveolusId',
  '}: RackVisualizer3DProps) {\n  const { lengthUnit, volumeUnit } = useSettings();\n  const [hoveredAlveolusId'
);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', code);
