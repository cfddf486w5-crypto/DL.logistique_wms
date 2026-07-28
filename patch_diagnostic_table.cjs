const fs = require('fs');
let code = fs.readFileSync('src/components/DiagnosticReport.tsx', 'utf-8');

const weightRegex = /const totalWeightLbs = alveoli\.reduce\(\(sum, alv\) => sum \+ \(alv\.product\?\.weight \|\| 0\), 0\);/;
const weightNew = `const totalWeightLbs = alveoli.reduce((sum, alv) => {
    if (alv.isSubdivided && alv.pickBins) {
      return sum + alv.pickBins.reduce((pbSum, pb) => pbSum + (pb.product?.weight || 0), 0);
    }
    return sum + (alv.product?.weight || 0);
  }, 0);

  const getLevelWeight = (lIdx: number) => {
    return alveoli.filter(a => a.levelIndex === lIdx).reduce((sum, alv) => {
      if (alv.isSubdivided && alv.pickBins) {
        return sum + alv.pickBins.reduce((pbSum, pb) => pbSum + (pb.product?.weight || 0), 0);
      }
      return sum + (alv.product?.weight || 0);
    }, 0);
  };
`;
code = code.replace(weightRegex, weightNew);

const tableRegex = /<table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">[\s\S]*?<\/table>/;
const tableNew = `<table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                <th className="p-2.5">Niveau</th>
                <th className="p-2.5">Hauteur / Sol (mm)</th>
                <th className="p-2.5">Hauteur de Passage (mm)</th>
                <th className="p-2.5 text-right">Charge Actuelle</th>
                <th className="p-2.5 text-right">Masse max autorisée</th>
                <th className="p-2.5 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rack.levels.map((level, idx) => {
                const prevHeight = idx === 0 ? 0 : rack.levels[idx - 1].heightFromGroundMm;
                const clearanceHeight = level.heightFromGroundMm - prevHeight - level.beamThicknessMm;
                
                // Assuming +1 because ground is 0, so first level is 1
                const levelWeight = getLevelWeight(level.levelNumber); 
                const levelMaxLoad = level.maxLoadLbs || (rack.binsPerLevel === 3 ? 4000 : 5000);
                const isOverloaded = levelWeight > levelMaxLoad;

                return (
                  <tr key={level.id} className={\`text-slate-600 hover:bg-slate-50 \${isOverloaded ? 'bg-rose-50/50' : ''}\`}>
                    <td className="p-2.5 font-bold font-mono">NIVEAU {level.levelNumber}</td>
                    <td className="p-2.5 font-mono">{level.heightFromGroundMm} mm</td>
                    <td className="p-2.5 font-mono text-sky-700 font-bold print:text-blue-600">{Math.round(clearanceHeight)} mm</td>
                    <td className={\`p-2.5 text-right font-bold font-mono \${isOverloaded ? 'text-rose-600' : 'text-emerald-600'}\`}>{levelWeight.toLocaleString()} lbs</td>
                    <td className="p-2.5 text-right font-bold font-mono text-slate-800">
                      {levelMaxLoad.toLocaleString()} lbs
                    </td>
                    <td className="p-2.5 text-center">
                      {isOverloaded ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          <AlertCircle size={12} /> Surcharge
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <CheckSquare size={12} /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {/* Ground level extra line */}
              <tr className="text-slate-600 bg-slate-50/30">
                <td className="p-2.5 font-bold font-mono">SOL (NIV 0)</td>
                <td className="p-2.5 font-mono">0 mm</td>
                <td className="p-2.5 font-mono text-sky-700 font-bold print:text-blue-600">
                  {rack.levels[0] ? rack.levels[0].heightFromGroundMm - 100 : rack.totalHeightMm} mm
                </td>
                <td className="p-2.5 text-right font-bold font-mono text-slate-600">{getLevelWeight(0).toLocaleString()} lbs</td>
                <td className="p-2.5 text-right font-bold font-mono text-slate-800">Illimitée (Sol béton)</td>
                <td className="p-2.5 text-center">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <CheckSquare size={12} /> OK
                  </span>
                </td>
              </tr>
            </tbody>
          </table>`;
code = code.replace(tableRegex, tableNew);

fs.writeFileSync('src/components/DiagnosticReport.tsx', code);
