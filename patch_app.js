import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const importSettings = `import { useSettings } from './contexts/SettingsContext';\nimport { LengthUnit, VolumeUnit } from './utils/units';\nimport React, { useState, useEffect, useRef } from 'react';`;
code = code.replace(`import React, { useState, useEffect, useRef } from 'react';`, importSettings);

const startComp = `export default function App() {`;
const insertSettings = `export default function App() {\n  const { lengthUnit, setLengthUnit, volumeUnit, setVolumeUnit } = useSettings();`;
code = code.replace(startComp, insertSettings);

const headerInsert = `              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
            
            <div className="flex items-center bg-slate-800 rounded-lg p-1 gap-1 border border-slate-700">
              <select 
                value={lengthUnit} 
                onChange={e => setLengthUnit(e.target.value as LengthUnit)}
                className="bg-transparent text-xs font-bold text-slate-300 focus:outline-none cursor-pointer pl-2 pr-1 py-1"
                title="Unité de Longueur"
              >
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="in">pouce (in)</option>
                <option value="ft">pied (ft)</option>
              </select>
              <div className="w-[1px] h-4 bg-slate-700"></div>
              <select 
                value={volumeUnit} 
                onChange={e => setVolumeUnit(e.target.value as VolumeUnit)}
                className="bg-transparent text-xs font-bold text-slate-300 focus:outline-none cursor-pointer pl-1 pr-2 py-1"
                title="Unité de Volume"
              >
                <option value="L">L</option>
                <option value="m3">m³</option>
                <option value="cm3">cm³</option>
                <option value="in3">po³</option>
                <option value="ft3">pi³</option>
              </select>
            </div>`;

code = code.replace(`              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />\n            </label>`, headerInsert);

fs.writeFileSync('src/App.tsx', code);
