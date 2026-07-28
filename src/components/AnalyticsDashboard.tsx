import React from 'react';
import { Activity, BarChart2, TrendingUp, Users, Target, ShieldAlert, CheckCircle, Clock, Flame, ArrowRight } from 'lucide-react';
import { ShopMap, Product, Rack, Alveolus, getSlotsCountForLevel } from '../types';



const getTotalSlotsForRack = (rack: Rack) => {
  let total = getSlotsCountForLevel(rack, 0);
  rack.levels.forEach((l: any, idx: number) => {
    total += getSlotsCountForLevel(rack, idx + 1);
  });
  return total;
};

interface AnalyticsDashboardProps {
  shopMap: ShopMap;
  alveoliStateByRack: Record<string, Alveolus[]>;
  rackTemplates: Rack[];
}

export default function AnalyticsDashboard({ shopMap, alveoliStateByRack, rackTemplates }: AnalyticsDashboardProps) {
  // Aggregate KPIs
  const totalRacks = shopMap.placedRacks.length;
  let totalSlots = 0;
  let occupiedSlots = 0;
  let highVelocityProducts = 0;

  shopMap.placedRacks.forEach(pr => {
    const template = rackTemplates.find(t => t.id === pr.rackTemplateId);
    if (template) {
      totalSlots += getTotalSlotsForRack(template);
    }
    const alveoli = alveoliStateByRack[pr.id];
    if (alveoli) {
      alveoli.forEach(alv => {
        if (alv.isSubdivided && alv.pickBins) {
          alv.pickBins.forEach(bin => {
            if (bin.occupied) {
              occupiedSlots++;
              if (bin.product?.rotationClass === 'A') highVelocityProducts++;
            }
          });
        } else if (alv.occupied) {
          occupiedSlots++;
          if (alv.product?.rotationClass === 'A') highVelocityProducts++;
        }
      });
    }
  });

  const occupancyRate = totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-900 to-indigo-900 rounded-xl p-6 text-white shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display flex items-center gap-2">
            <Activity className="text-sky-400" />
            Centre d'Analyse et Jumeau Numérique
          </h2>
          <p className="text-sky-100 text-sm mt-1 opacity-90 max-w-2xl">
            Surveillance globale des flux de l'entrepôt, analyse prédictive et performances opérationnelles (KPI).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Occupation Globale</div>
            <div className="bg-cyan-900/60 text-cyan-400 p-1.5 rounded-lg"><BarChart2 size={16} /></div>
          </div>
          <div className="text-3xl font-bold text-slate-200 mb-1">{occupancyRate.toFixed(1)}%</div>
          <div className="text-xs text-slate-500">
            <strong className="text-slate-300">{occupiedSlots}</strong> / {totalSlots} emplacements
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-full rounded-full ${occupancyRate > 85 ? 'bg-rose-900/300' : occupancyRate > 60 ? 'bg-amber-900/300' : 'bg-emerald-900/300'}`} 
              style={{ width: `${occupancyRate}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Densité de Pickings Chauds</div>
            <div className="bg-rose-900/50 text-rose-600 p-1.5 rounded-lg"><TrendingUp size={16} /></div>
          </div>
          <div className="text-3xl font-bold text-slate-200 mb-1">{highVelocityProducts} <span className="text-sm font-medium text-slate-500">U.M.</span></div>
          <div className="text-xs text-slate-500">Produits de classe de rotation A</div>
          <div className="mt-3 text-[10px] bg-rose-900/30 text-rose-400 px-2 py-1 rounded font-medium inline-block w-max">
            +14% vs. semaine dernière
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Erreurs Prélèvement</div>
            <div className="bg-emerald-900/50 text-emerald-600 p-1.5 rounded-lg"><CheckCircle size={16} /></div>
          </div>
          <div className="text-3xl font-bold text-slate-200 mb-1">0.02%</div>
          <div className="text-xs text-slate-500">Taux d'anomalies WMS</div>
          <div className="mt-3 text-[10px] bg-emerald-900/30 text-emerald-300 px-2 py-1 rounded font-medium inline-block w-max">
            Excellente Précision (Pick-to-Light)
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Distance Moyenne (TSP)</div>
            <div className="bg-violet-900/50 text-violet-400 p-1.5 rounded-lg"><Target size={16} /></div>
          </div>
          <div className="text-3xl font-bold text-slate-200 mb-1">214 m</div>
          <div className="text-xs text-slate-500">Par tournée de préparation (Vague)</div>
          <div className="mt-3 text-[10px] bg-violet-900/30 text-violet-300 px-2 py-1 rounded font-medium inline-block w-max">
            Optimisé par routage 3D
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-800/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-500" />
              Alertes & Prédictions d'Infrastructures
            </h3>
          </div>
          <div className="p-4 flex-1">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="bg-rose-900/50 text-rose-600 p-2 rounded-full shrink-0 mt-0.5">
                  <ShieldAlert size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Surcharge pondérale potentielle - Allée G1</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Le ratio de charge du rack G1A approche 92% de la limite EN 15635. Recommandation: Re-slotting dynamique vers G3.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="bg-amber-900/50 text-amber-600 p-2 rounded-full shrink-0 mt-0.5">
                  <Clock size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Maintenance Chariot AGV #12</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Le capteur RTLS indique 450h d'utilisation sur la zone de réception. Planifier l'entretien préventif.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-800/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <Users size={16} className="text-emerald-500" />
              Gamification & Suivi Équipe
            </h3>
          </div>
          <div className="p-4 flex-1">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span>🥇 Équipe "Picking Alpha"</span>
                  <span className="text-emerald-600">142 lignes/h</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-900/300 h-full rounded-full w-[95%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span>🥈 Équipe "Réception Express"</span>
                  <span className="text-cyan-400">118 lignes/h</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-cyan-900/300 h-full rounded-full w-[80%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span>🥉 Équipe "Renfort Nuit"</span>
                  <span className="text-amber-600">95 lignes/h</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-900/300 h-full rounded-full w-[65%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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

    </div>
  );
}
