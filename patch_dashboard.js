import fs from 'fs';
let code = fs.readFileSync('src/components/AnalyticsDashboard.tsx', 'utf-8');

// Also need to import Flame or Zap from lucide-react
code = code.replace(
  "import { Activity, BarChart2, TrendingUp, Users, Target, ShieldAlert, CheckCircle, Clock } from 'lucide-react';",
  "import { Activity, BarChart2, TrendingUp, Users, Target, ShieldAlert, CheckCircle, Clock, Flame, ArrowRight } from 'lucide-react';"
);

const hotspotsCode = `
      {/* Hotspots Analysis Section */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden flex flex-col mt-6">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
            <Flame size={16} className="text-orange-500" />
            Analyse des Points Chauds (Hotspots) & Re-slotting
          </h3>
          <span className="text-xs text-slate-400">Taux de rotation sur 30 jours</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Allées à Fort Trafic (Top 3)</h4>
              <div className="space-y-3">
                
                {/* Aisle 1 */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-orange-900/30 flex flex-col items-center justify-center border border-orange-800/50">
                    <span className="text-orange-400 font-bold text-sm">A02</span>
                    <span className="text-[9px] text-orange-500/70">Pick</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-sm font-medium text-slate-200">Allée Centrale (Classe A)</span>
                      <span className="text-xs font-bold text-orange-400">842 picks/jour</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div className="bg-orange-500 h-full rounded-full w-[92%]"></div>
                    </div>
                  </div>
                </div>

                {/* Aisle 2 */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-amber-900/30 flex flex-col items-center justify-center border border-amber-800/50">
                    <span className="text-amber-400 font-bold text-sm">B04</span>
                    <span className="text-[9px] text-amber-500/70">Pick</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-sm font-medium text-slate-200">Zone Promotionnelle</span>
                      <span className="text-xs font-bold text-amber-400">512 picks/jour</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full w-[65%]"></div>
                    </div>
                  </div>
                </div>

                {/* Aisle 3 */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-emerald-900/30 flex flex-col items-center justify-center border border-emerald-800/50">
                    <span className="text-emerald-400 font-bold text-sm">C11</span>
                    <span className="text-[9px] text-emerald-500/70">Bulk</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-sm font-medium text-slate-200">Allée de Débordement</span>
                      <span className="text-xs font-bold text-emerald-400">124 picks/jour</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full w-[20%]"></div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="border-l border-slate-700 pl-6 flex flex-col justify-center">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Recommandation du Moteur</h4>
              <div className="bg-sky-900/20 border border-sky-800/50 rounded-xl p-4">
                <div className="text-sm text-slate-300 leading-relaxed mb-3">
                  <strong className="text-sky-400">3 SKUs</strong> à forte rotation (Classe A) sont actuellement stockés dans la zone Bulk (C11).
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-4 bg-slate-900/50 p-2 rounded-lg">
                  <span>Bulk (C11)</span>
                  <ArrowRight size={14} className="text-slate-500" />
                  <span className="text-sky-400">Pick (A02)</span>
                </div>
                <button className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Activity size={14} />
                  Générer Ordres de Mouvement
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
`;

code = code.replace(
  "    </div>\n  );\n}",
  hotspotsCode + "\n    </div>\n  );\n}"
);

// We need to fix the dark/light colors if they were mismatched, but looks like bg-slate-800 is used everywhere
// wait, the previous elements have:
// <div className="bg-slate-800 rounded-xl border border-slate-700
// It matches perfectly.

fs.writeFileSync('src/components/AnalyticsDashboard.tsx', code);
console.log("Patched AnalyticsDashboard.tsx");
