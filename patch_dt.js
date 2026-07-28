import fs from 'fs';
let code = fs.readFileSync('src/components/DigitalTwinDashboard.tsx', 'utf-8');

const importSettings = `import { useSettings } from '../contexts/SettingsContext';\nimport { formatMapDistance } from '../utils/units';\nimport React, { useState, useEffect, useRef } from 'react';`;
code = code.replace(`import React, { useState, useEffect, useRef } from 'react';`, importSettings);

const startComp = `export default function DigitalTwinDashboard({ shopMap, rackTemplates, alveoliStateByRack, products }: DigitalTwinDashboardProps) {`;
const insertSettings = `export default function DigitalTwinDashboard({ shopMap, rackTemplates, alveoliStateByRack, products }: DigitalTwinDashboardProps) {\n  const { lengthUnit } = useSettings();`;
code = code.replace(startComp, insertSettings);

// Replace "{totalDistance.toFixed(1)} m"
code = code.replace(/\{totalDistance\.toFixed\(1\)\} m/g, '{formatMapDistance(totalDistance, lengthUnit)}');

// Replace "{flowDistance.toFixed(1)} m"
code = code.replace(/\{flowDistance\.toFixed\(1\)\} m/g, '{formatMapDistance(flowDistance, lengthUnit)}');

// Replace "{move.save}m"
code = code.replace(/\{move\.save\}m/g, '{formatMapDistance(move.save, lengthUnit)}');

// Also in the right side panel there are some distances ?
code = code.replace(/\{\(\(flowDistance \/ 1\.5\)\)\.toFixed\(0\)\} s/g, '{((flowDistance / 1.5)).toFixed(0)} s');

fs.writeFileSync('src/components/DigitalTwinDashboard.tsx', code);
