import { useSettings } from '../../contexts/SettingsContext';
import { formatLength, formatVolume } from '../../utils/units';
import React from 'react';
import { Alveolus } from '../../types';


interface RackAlveoliTableProps {
  alveoli: Alveolus[];
  hoveredAlveolusId: string | null;
  setHoveredAlveolusId: (id: string | null) => void;
  selectedAlveolusId: string | null;
  setSelectedAlveolusId: (id: string | null) => void;
}

export function RackAlveoliTable({
  alveoli,
  hoveredAlveolusId,
  setHoveredAlveolusId,
  selectedAlveolusId,
  setSelectedAlveolusId
}: RackAlveoliTableProps) {
  const { lengthUnit, volumeUnit } = useSettings();
  return (
    <div className="frosted-glass rounded-xl shadow-lg overflow-hidden border border-slate-700">
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
        <h4 className="font-bold text-slate-200 text-sm font-display">
          📋 Tableau d'Alvéoles & Diagnostic de Charge
        </h4>
        <span className="text-xs text-sky-700 font-mono font-bold bg-cyan-900/30 px-2 py-0.5 rounded border border-sky-100">
          Norme Européenne EN 15635 active
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800/50 text-slate-600 border-b border-slate-700 font-bold">
              <th className="p-3">ID Alvéole</th>
              <th className="p-3">Niveau</th>
              <th className="p-3">Dimensions (L × H × P)</th>
              <th className="p-3">Volume Utile (L / ft³)</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Produit Stocké</th>
              <th className="p-3 text-right">Poids</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150">
            {alveoli.map((alv) => {
              const isHovered = hoveredAlveolusId === alv.id;
              const volLiters = (alv.widthMm * alv.heightMm * alv.depthMm) / 1000000;
              
              return (
                <tr
                  key={alv.id}
                  onMouseEnter={() => setHoveredAlveolusId(alv.id)}
                  onMouseLeave={() => setHoveredAlveolusId(null)}
                  onClick={() => setSelectedAlveolusId(alv.id)}
                  className={`transition-colors cursor-pointer ${
                    isHovered ? 'bg-slate-800' : 'hover:bg-slate-800/30'
                  } ${selectedAlveolusId === alv.id ? 'bg-cyan-900/30 ring-1 ring-inset ring-sky-200' : ''}`}
                >
                  <td className="p-3 font-bold font-mono text-slate-200">{alv.id}</td>
                  <td className="p-3 text-slate-600">
                    {alv.levelIndex === 0 ? 'Sol (Niv 0)' : `Isse Niv ${alv.levelIndex}`}
                  </td>
                  <td className="p-3 font-mono text-slate-300">
                    {formatLength(alv.widthMm, lengthUnit, 0)} × {formatLength(alv.heightMm, lengthUnit, 0)} × {formatLength(alv.depthMm, lengthUnit, 0)}
                  </td>
                  <td className="p-3 font-mono text-slate-300">
                    {formatVolume(volLiters, volumeUnit)}
                  </td>
                  <td className="p-3">
                    {alv.occupied ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-900/30 text-violet-300 border border-indigo-200">
                        Occupé
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900/30 text-emerald-300 border border-emerald-700/50">
                        Libre
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {alv.occupied && alv.product ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: alv.product.color }}
                        ></span>
                        <span className="font-semibold text-slate-200">{alv.product.name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">— Aucun</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-200 font-bold">
                    {alv.occupied && alv.product ? `${alv.product.weight} lbs` : '0 lbs'}
                  </td>
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setSelectedAlveolusId(alv.id);
                      }}
                      className="px-2.5 py-1 text-[11px] bg-[#111827] border border-slate-700 hover:bg-cyan-900/30 text-slate-300 rounded transition-colors font-semibold cursor-pointer"
                    >
                      Gérer
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
