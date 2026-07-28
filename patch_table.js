import fs from 'fs';
let code = fs.readFileSync('src/components/RackVisualizer/RackAlveoliTable.tsx', 'utf-8');

const importSettings = `import { useSettings } from '../../contexts/SettingsContext';\nimport { formatLength, formatVolume } from '../../utils/units';\nimport React from 'react';`;
code = code.replace(`import React from 'react';`, importSettings);

const startComp = `export function RackAlveoliTable({ alveoli, rack, selectedAlveolusId, onSelectAlveolus }: RackAlveoliTableProps) {`;
const insertSettings = `export function RackAlveoliTable({ alveoli, rack, selectedAlveolusId, onSelectAlveolus }: RackAlveoliTableProps) {\n  const { lengthUnit, volumeUnit } = useSettings();`;
code = code.replace(startComp, insertSettings);

// Remove local mmToFt3
code = code.replace(`const mmToFt3 = (liters: number) => liters * 0.0353147;\n`, '');

// Replace volume rendering
const oldVol = `                    {volLiters.toFixed(1)} L <span className="text-slate-500">/ {mmToFt3(volLiters).toFixed(1)} ft³</span>`;
const newVol = `                    {formatVolume(volLiters, volumeUnit)}`;
code = code.replace(oldVol, newVol);

// Replace dimensions
const oldDim = `{Math.round(alv.widthMm)} × {Math.round(alv.heightMm)} × {Math.round(alv.depthMm)} mm`;
const newDim = `{formatLength(alv.widthMm, lengthUnit, 0)} × {formatLength(alv.heightMm, lengthUnit, 0)} × {formatLength(alv.depthMm, lengthUnit, 0)}`;
code = code.replace(oldDim, newDim);

fs.writeFileSync('src/components/RackVisualizer/RackAlveoliTable.tsx', code);
