const fs = require('fs');
let code = fs.readFileSync('src/components/DiagnosticReport.tsx', 'utf-8');

const importRegex = /import \{ Shield, Printer, CheckSquare, AlertCircle, FileCheck, Anchor, ShieldAlert \} from 'lucide-react';/;
code = code.replace(importRegex, "import { Shield, Printer, CheckSquare, AlertCircle, FileCheck, Anchor, ShieldAlert, Activity, Weight } from 'lucide-react';");

const statsRegex = /const totalWeightLbs = alveoli\.reduce\(\(sum, alv\) => sum \+ \(alv\.product\?\.weight \|\| 0\), 0\);/;

const addStats = `const totalWeightLbs = alveoli.reduce((sum, alv) => sum + (alv.product?.weight || 0), 0);

  const certYear = rack.certificationYear || 2012;
  const seismicRisk = certYear >= 2020 ? 'Faible (Normes post-2020)' : (certYear >= 2010 ? 'Modéré (Normes 2010)' : 'Élevé (Pré-2010)');
  const seismicColor = certYear >= 2020 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : (certYear >= 2010 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200');
  
  let baseCapacity = rack.maxLoadLbs || (rack.totalWidthMm > 2500 ? 25000 : 20000);
  if (certYear < 2010) baseCapacity *= 0.8;
  else if (certYear < 2020) baseCapacity *= 0.9;
  const safeCapacityLbs = Math.floor(baseCapacity);
  const utilizationPercent = (totalWeightLbs / safeCapacityLbs) * 100;
`;
code = code.replace(statsRegex, addStats);

const gridColsRegex = /<div className="grid grid-cols-1 md:grid-cols-2 gap-6">/;
code = code.replace(gridColsRegex, '<div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-6">');

const afterKpiRegex = /<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* Section 2: Detailed Levels list \*\/\}/;

const addCard = `            </div>
          </div>

          {/* Seismic Risk & Bearing Capacity Card */}
          <div className="space-y-4 lg:col-span-1 md:col-span-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5 font-display flex items-center gap-1.5">
              <Activity size={16} className="text-sky-600" />
              Risque & Portance
            </h3>
            
            <div className="space-y-3">
              <div className={\`p-3 rounded-lg border \${seismicColor}\`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">Indice Sismique</span>
                  <Activity size={14} />
                </div>
                <div className="text-sm font-bold">{seismicRisk}</div>
                <div className="text-[10px] opacity-80 mt-1 font-medium">Installation / Certification estimée : {certYear}</div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Capacité Admissible</span>
                  <Weight size={14} className="text-slate-400" />
                </div>
                <div className="text-lg font-bold text-slate-800 font-mono">{safeCapacityLbs.toLocaleString('en-US')} lbs</div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div 
                    className={\`h-full rounded-full \${utilizationPercent > 90 ? 'bg-rose-500' : (utilizationPercent > 75 ? 'bg-amber-500' : 'bg-sky-500')}\`}
                    style={{ width: \`\${Math.min(100, utilizationPercent)}%\` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[9px] text-slate-500 font-medium">Utilisation structurelle</span>
                  <span className="text-[9px] font-bold text-slate-700">{utilizationPercent.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Detailed Levels list */}`;

code = code.replace(afterKpiRegex, addCard);

fs.writeFileSync('src/components/DiagnosticReport.tsx', code);
