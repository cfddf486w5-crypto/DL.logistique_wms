import React from 'react';
import { ShieldAlert, CheckCircle } from 'lucide-react';
import { Rack } from '../../types';

interface RackKPIsProps {
  totalVolumeLiters: number;
  totalStoredVolumeLiters: number;
  volumetricOccupancyRate: number;
  occupancyRate: number;
  totalWeightLbs: number;
  rack: Rack;
}

export function RackKPIs({
  totalVolumeLiters,
  totalStoredVolumeLiters,
  volumetricOccupancyRate,
  occupancyRate,
  totalWeightLbs,
  rack
}: RackKPIsProps) {
  const certYear = rack.certificationYear || 1990;
  let dynamicMaxLoad = rack.maxLoadLbs || 25000;
  if (certYear >= 2022) dynamicMaxLoad = Math.min(dynamicMaxLoad, 15000);
  else if (certYear >= 2000) dynamicMaxLoad = Math.min(dynamicMaxLoad, 20000);
  else if (certYear >= 1990) dynamicMaxLoad = Math.min(dynamicMaxLoad, 23000);
  else dynamicMaxLoad = Math.min(dynamicMaxLoad, 25000);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="frosted-glass rounded-xl p-4 shadow-lg">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Volume total utile / Stochastique</span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl font-extrabold text-slate-200 font-mono">{totalVolumeLiters.toFixed(0)}</span>
          <span className="text-xs text-slate-500 font-mono font-semibold">Litres</span>
        </div>
        <span className="text-[10px] text-sky-700 font-mono mt-0.5 block font-semibold">
          Stocké : {totalStoredVolumeLiters.toFixed(1)} L ({(totalStoredVolumeLiters / 1000).toFixed(2)} m³)
        </span>
      </div>

      <div className="frosted-glass rounded-xl p-4 shadow-lg">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Remplissage Volumétrique</span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl font-extrabold text-amber-300 font-mono">{volumetricOccupancyRate.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-amber-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, volumetricOccupancyRate)}%` }}
          ></div>
        </div>
      </div>

      <div className="frosted-glass rounded-xl p-4 shadow-lg">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Taux d'occupation alvéoles</span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl font-extrabold text-sky-700 font-mono">{occupancyRate.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-sky-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${occupancyRate}%` }}
          ></div>
        </div>
      </div>

      <div className="frosted-glass rounded-xl p-4 shadow-lg">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Masse de stockage</span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl font-extrabold text-slate-200 font-mono">{totalWeightLbs}</span>
          <span className="text-xs text-slate-500 font-semibold font-mono">lbs</span>
        </div>
        
        {(() => {
          if (totalWeightLbs > dynamicMaxLoad) {
            return (
              <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-1 mt-0.5">
                <ShieldAlert size={10} /> Surcharge Critique ({dynamicMaxLoad} lbs max, CNB)
              </span>
            );
          } else if (totalWeightLbs > dynamicMaxLoad * 0.8) {
            return (
              <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
                <ShieldAlert size={10} /> Charge élevée ({Math.round(totalWeightLbs / dynamicMaxLoad * 100)}%)
              </span>
            );
          } else {
            return (
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                <CheckCircle size={10} /> Charge Sécurisée (Max {dynamicMaxLoad} lbs)
              </span>
            );
          }
        })()}
      </div>
    </div>
  );
}
