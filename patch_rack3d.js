import fs from 'fs';
let code = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

const importSettings = `import { useSettings } from '../contexts/SettingsContext';\nimport { formatLength, formatVolume } from '../utils/units';\nimport { Rack, Alveolus, Product, BeamLevel, getSlotsCountForLevel } from '../types';`;
code = code.replace(`import { Rack, Alveolus, Product, BeamLevel, getSlotsCountForLevel } from '../types';`, importSettings);

const startComp = `export default function RackVisualizer3D({ rack, alveoli, products, onChangeLevelHeight, onChangeLevelType, onChangeLevelSlots, onChangeLevelThickness, onChangeLevelLoad, onUpdateAlveoli }: RackVisualizerProps) {`;
const insertSettings = `export default function RackVisualizer3D({ rack, alveoli, products, onChangeLevelHeight, onChangeLevelType, onChangeLevelSlots, onChangeLevelThickness, onChangeLevelLoad, onUpdateAlveoli }: RackVisualizerProps) {\n  const { lengthUnit, volumeUnit } = useSettings();`;
code = code.replace(startComp, insertSettings);

// Remove local mmToFt3
code = code.replace(`  const mmToFt3 = (liters: number) => liters * 0.0353147;\n`, '');

// Replace volume logic in inspector
const oldVol = `            const volLiters = (alv.widthMm * alv.heightMm * alv.depthMm) / 1000000;
            const volFt3 = mmToFt3(volLiters);`;
const newVol = `            const volLiters = (alv.widthMm * alv.heightMm * alv.depthMm) / 1000000;`;
code = code.replace(oldVol, newVol);

const oldDisplayVol = `<div className="flex justify-between border-b border-slate-700/50 pb-1">
                  <span className="text-slate-500">Volume :</span>
                  <span className="text-slate-300 font-bold font-mono">{volLiters.toFixed(1)} L <span className="text-slate-500 font-normal">/ {volFt3.toFixed(1)} ft³</span></span>
                </div>`;
const newDisplayVol = `<div className="flex justify-between border-b border-slate-700/50 pb-1">
                  <span className="text-slate-500">Volume :</span>
                  <span className="text-slate-300 font-bold font-mono">{formatVolume(volLiters, volumeUnit)}</span>
                </div>`;
code = code.replace(oldDisplayVol, newDisplayVol);

const oldDisplayDim = `<div className="flex justify-between border-b border-slate-700/50 pb-1">
                  <span className="text-slate-500">Dimensions :</span>
                  <span className="text-slate-300 font-mono text-[11px]">{Math.round(alv.widthMm)} × {Math.round(alv.heightMm)} × {Math.round(alv.depthMm)} mm</span>
                </div>`;
const newDisplayDim = `<div className="flex justify-between border-b border-slate-700/50 pb-1">
                  <span className="text-slate-500">Dimensions :</span>
                  <span className="text-slate-300 font-mono text-[11px]">{formatLength(alv.widthMm, lengthUnit)} × {formatLength(alv.heightMm, lengthUnit)} × {formatLength(alv.depthMm, lengthUnit)}</span>
                </div>`;
code = code.replace(oldDisplayDim, newDisplayDim);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', code);
