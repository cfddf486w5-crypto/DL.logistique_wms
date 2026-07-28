import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const importSettings = `import { useSettings } from './contexts/SettingsContext';\nimport { LengthUnit, VolumeUnit } from './utils/units';\nimport React, { useState, useEffect, useRef, useCallback } from 'react';`;
code = code.replace(`import React, { useState, useEffect, useRef, useCallback } from 'react';`, importSettings);

if (!code.includes('const { lengthUnit, setLengthUnit, volumeUnit, setVolumeUnit } = useSettings();')) {
  code = code.replace(`export default function App() {`, `export default function App() {\n  const { lengthUnit, setLengthUnit, volumeUnit, setVolumeUnit } = useSettings();`);
}

fs.writeFileSync('src/App.tsx', code);
