import fs from 'fs';
let code = fs.readFileSync('src/components/DiagnosticReport.tsx', 'utf-8');

// Find overloaded levels
const calcOverloadedLevels = `
  const overloadedLevels = rack.levels.filter(level => {
    const levelWeight = getLevelWeight(level.levelNumber);
    const levelMaxLoad = level.maxLoadLbs || (rack.binsPerLevel === 3 ? 4000 : 5000);
    return levelWeight > levelMaxLoad;
  });
`;

if (!code.includes('overloadedLevels')) {
  code = code.replace(
    'const utilizationPercent = (totalWeightLbs / safeCapacityLbs) * 100;',
    'const utilizationPercent = (totalWeightLbs / safeCapacityLbs) * 100;\n' + calcOverloadedLevels
  );

  const alertBlock = `{/* Overload Alerts */}
        {(utilizationPercent > 100 || overloadedLevels.length > 0) && (
          <div className="bg-rose-900/30 border-2 border-rose-600 rounded-xl p-6 shadow-[0_0_20px_rgba(225,29,72,0.15)] flex flex-col gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-lg shrink-0">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-rose-500 uppercase tracking-wider font-display">Alerte de Surcharge Structurelle</h3>
                <p className="text-sm text-rose-300/80 font-medium mt-0.5">La limite de charge sécuritaire est dépassée. Une intervention immédiate est requise.</p>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              {utilizationPercent > 100 && (
                <div className="flex items-start gap-2 text-sm text-rose-200 bg-rose-900/50 p-3 rounded-lg border border-rose-800">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Surcharge Critique de l'Échelle</span>
                    Charge cumulée ({totalWeightLbs.toLocaleString()} lbs) supérieure à la portance admissible de la travée ({safeCapacityLbs.toLocaleString()} lbs).
                  </div>
                </div>
              )}
              {overloadedLevels.map(lvl => {
                const w = getLevelWeight(lvl.levelNumber);
                const max = lvl.maxLoadLbs || (rack.binsPerLevel === 3 ? 4000 : 5000);
                return (
                  <div key={lvl.id} className="flex items-start gap-2 text-sm text-amber-200 bg-amber-900/30 p-3 rounded-lg border border-amber-800">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Surcharge de Lisse (Niveau {lvl.levelNumber})</span>
                      La charge du niveau ({w.toLocaleString()} lbs) dépasse la capacité de la paire de lisses ({max.toLocaleString()} lbs).
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}`;

  code = code.replace(
    '{/* Section 1: Visual and KPI Summary */}',
    alertBlock + '\n\n        {/* Section 1: Visual and KPI Summary */}'
  );

  fs.writeFileSync('src/components/DiagnosticReport.tsx', code);
  console.log("Patched DiagnosticReport");
} else {
  console.log("Already patched");
}
