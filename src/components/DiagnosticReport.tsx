/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSettings } from '../contexts/SettingsContext';
import { formatLength } from '../utils/units';
import React from 'react';
import { Rack, Alveolus, getSlotsCountForLevel } from '../types';
import { Shield, Printer, CheckSquare, AlertCircle, FileCheck, Anchor, ShieldAlert, Activity, Weight } from 'lucide-react';



const getTotalSlotsForRack = (rack: Rack) => {
  let total = getSlotsCountForLevel(rack, 0);
  rack.levels.forEach((l: any, idx: number) => {
    total += getSlotsCountForLevel(rack, idx + 1);
  });
  return total;
};

interface DiagnosticReportProps {
  rack: Rack;
  alveoli: Alveolus[];
}

export default function DiagnosticReport({ rack, alveoli }: DiagnosticReportProps) {
  const { lengthUnit } = useSettings();
  const totalSlotsCount = alveoli.length;
  const occupiedSlotsCount = alveoli.filter((a) => a.occupied).length;
  const occupancyRate = totalSlotsCount > 0 ? (occupiedSlotsCount / totalSlotsCount) * 100 : 0;
  const totalVolumeLiters = alveoli.reduce((sum, alv) => sum + (alv.widthMm * alv.heightMm * alv.depthMm) / 1000000, 0);
  const totalWeightLbs = alveoli.reduce((sum, alv) => {
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


  const certYear = rack.certificationYear || 2012;
  const seismicRisk = certYear >= 2020 ? 'Faible (Normes post-2020)' : (certYear >= 2010 ? 'Modéré (Normes 2010)' : 'Élevé (Pré-2010)');
  const seismicColor = certYear >= 2020 ? 'text-emerald-300 bg-emerald-900/30 border-emerald-700/50' : (certYear >= 2010 ? 'text-amber-300 bg-amber-900/30 border-amber-700/50' : 'text-rose-400 bg-rose-900/30 border-rose-700/50');
  
  let baseCapacity = rack.maxLoadLbs || (rack.totalWidthMm > 2500 ? 25000 : 20000);
  if (certYear < 2010) baseCapacity *= 0.8;
  else if (certYear < 2020) baseCapacity *= 0.9;
  const safeCapacityLbs = Math.floor(baseCapacity);
  const utilizationPercent = (totalWeightLbs / safeCapacityLbs) * 100;

  const overloadedLevels = rack.levels.filter(level => {
    const levelWeight = getLevelWeight(level.levelNumber);
    const levelMaxLoad = level.maxLoadLbs || (rack.binsPerLevel === 3 ? 4000 : 5000);
    return levelWeight > levelMaxLoad;
  });



  const reportId = `REP-${rack.id.substring(0, 5).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="frosted-glass rounded-xl shadow-lg overflow-hidden max-w-4xl mx-auto my-6 print:border-none print:shadow-none print:bg-slate-800 print:text-slate-100">
      {/* Printable Area Wrapper */}
      <div className="p-8 print:p-0 space-y-6 bg-slate-800/30 print:bg-slate-800" id="printable-diagnostic-sheet">
        
        {/* Header Block (Branded / Official) */}
        <div className="flex justify-between items-start border-b-2 border-slate-700 print:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-sky-700 print:text-blue-600 mb-1">
              <Shield size={24} className="fill-sky-500/10 print:fill-blue-50" />
              <span className="font-extrabold tracking-widest text-xs uppercase font-display">DL. Mapping & Ingénierie Logistique</span>
            </div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight font-display">FICHE DE CONFORMITÉ & DIAGNOSTIC DU RACK</h1>
            <p className="text-xs text-slate-400 mt-1">
              Établie en conformité avec la norme européenne de sécurité des palettiers <strong className="text-slate-200 print:text-slate-300">EN 15635</strong>
            </p>
          </div>
          <div className="text-right text-xs">
            <div className="font-mono bg-slate-800 px-2 py-1 rounded text-slate-200 font-bold border border-slate-700 inline-block">
              RÉF: {reportId}
            </div>
            <div className="text-slate-500 print:text-slate-400 font-medium text-[10px] mt-1.5 font-mono">Date : {dateStr}</div>
          </div>
        </div>
 
        {/* Print Instruction Tool (Hidden when printing) */}
        <div className="bg-cyan-900/30 border border-cyan-700/50 p-4 rounded-lg flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <Printer className="text-cyan-400 shrink-0" size={20} />
            <div>
              <h4 className="font-bold text-cyan-200 text-sm font-display">Génération de la fiche A4 prête pour l'export</h4>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Cliquez sur le bouton pour ouvrir l'interface d'impression système. Choisissez "Enregistrer au format PDF" pour obtenir la version numérique réglementaire.
              </p>
            </div>
          </div>
          <button
            id="btn-trigger-print"
            onClick={handlePrint}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-900/300 text-white font-extrabold rounded-lg text-xs transition-colors shadow-md shadow-sky-600/15 shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Printer size={14} />
            Imprimer / PDF
          </button>
        </div>
 
        {/* Section 1: Rack Technical Data Sheet */}
        <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-6">
          {/* Metadata Card */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-700 pb-1.5 font-display">
              📋 Spécifications Physiques du Rack
            </h3>
            <table className="w-full text-xs text-slate-400">
              <tbody className="divide-y divide-slate-100">
                <tr className="py-2">
                  <td className="font-medium text-slate-500 print:text-slate-400 py-1.5">Nom de l'équipement</td>
                  <td className="font-bold text-slate-200 text-right py-1.5">{rack.name}</td>
                </tr>
                <tr className="py-2">
                  <td className="font-medium text-slate-500 print:text-slate-400 py-1.5">Hauteur Hors Tout</td>
                  <td className="font-mono text-slate-200 text-right py-1.5">{formatLength(rack.totalHeightMm, lengthUnit)}</td>
                </tr>
                <tr className="py-2">
                  <td className="font-medium text-slate-500 print:text-slate-400 py-1.5">Largeur de Travée (Lisse)</td>
                  <td className="font-mono text-slate-200 text-right py-1.5">{formatLength(rack.totalWidthMm, lengthUnit)}</td>
                </tr>
                <tr className="py-2">
                  <td className="font-medium text-slate-500 print:text-slate-400 py-1.5">Profondeur des Échelles</td>
                  <td className="font-mono text-slate-200 text-right py-1.5">{formatLength(rack.depthMm, lengthUnit)}</td>
                </tr>
                <tr className="py-2">
                  <td className="font-medium text-slate-500 print:text-slate-400 py-1.5">Largeur des Montants</td>
                  <td className="font-mono text-slate-200 text-right py-1.5">{formatLength(rack.uprightWidthMm, lengthUnit)}</td>
                </tr>
                <tr className="py-2">
                  <td className="font-medium text-slate-500 print:text-slate-400 py-1.5">Alvéoles par niveau</td>
                  <td className="font-bold text-slate-200 text-right py-1.5">{getTotalSlotsForRack(rack)} alvéoles (total)</td>
                </tr>
              </tbody>
            </table>
          </div>
 
          {/* KPIs and Loading overview */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-700 pb-1.5 font-display">
              📊 Indicateurs Opérationnels de Performance
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/60">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Volume total utile</span>
                <span className="text-lg font-bold text-slate-200 block font-mono">{totalVolumeLiters.toFixed(0)} L</span>
                <span className="text-[10px] text-sky-700 print:text-slate-500 font-mono">({(totalVolumeLiters * 0.0353147).toFixed(1)} ft³)</span>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/60">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Taux de Remplissage</span>
                <span className="text-lg font-bold text-slate-200 block font-mono">{occupancyRate.toFixed(1)} %</span>
                <span className="text-[10px] text-sky-700 print:text-slate-500 font-mono">{occupiedSlotsCount} / {totalSlotsCount} occupés</span>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/60">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Masse de Stockage</span>
                <span className="text-lg font-bold text-slate-200 block font-mono">{totalWeightLbs} lbs</span>
                <span className="text-[10px] text-sky-700 print:text-slate-500">Masse globale active</span>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/60">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Charge Moyenne / Alv</span>
                <span className="text-lg font-bold text-slate-200 block font-mono">
                  {occupiedSlotsCount > 0 ? (totalWeightLbs / occupiedSlotsCount).toFixed(0) : 0} lbs
                </span>
                <span className="text-[10px] text-sky-700 print:text-slate-500">Par emplacement chargé</span>
              </div>
                        </div>
          </div>

          {/* Seismic Risk & Bearing Capacity Card */}
          <div className="space-y-4 lg:col-span-1 md:col-span-2">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-700 pb-1.5 font-display flex items-center gap-1.5">
              <Activity size={16} className="text-cyan-400" />
              Risque & Portance
            </h3>
            
            <div className="space-y-3">
              <div className={`p-3 rounded-lg border ${seismicColor}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">Indice Sismique</span>
                  <Activity size={14} />
                </div>
                <div className="text-sm font-bold">{seismicRisk}</div>
                <div className="text-[10px] opacity-80 mt-1 font-medium">Installation / Certification estimée : {certYear}</div>
              </div>
              
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Capacité Admissible</span>
                  <Weight size={14} className="text-slate-400" />
                </div>
                <div className="text-lg font-bold text-slate-200 font-mono">{safeCapacityLbs.toLocaleString('en-US')} lbs</div>
                <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${utilizationPercent > 90 ? 'bg-rose-900/300' : (utilizationPercent > 75 ? 'bg-amber-900/300' : 'bg-cyan-900/300')}`}
                    style={{ width: `${Math.min(100, utilizationPercent)}%` }}
                  ></div>
                </div>
                                <div className="flex justify-between items-center mt-1">
                  <span className="text-[9px] text-slate-500 font-medium">Utilisation structurelle</span>
                  <span className="text-[9px] font-bold text-slate-300">{utilizationPercent.toFixed(1)}%</span>
                </div>
              </div>
              
              {utilizationPercent > 100 && (
                <div className="bg-rose-900/30 border border-rose-700/50 rounded-lg p-2.5 flex items-start gap-2">
                  <ShieldAlert size={14} className="text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-[10px] font-bold text-rose-800 uppercase">Surcharge Critique Échelle</h4>
                    <p className="text-[9px] text-rose-600 font-medium mt-0.5 leading-tight">
                      Le poids total cumulé dépasse la portance admissible sécuritaire de l'équipement.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Detailed Levels list */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-700 pb-1.5 font-display">
            📏 Cotes Techniques par Niveau de Lisses
          </h3>
          <table className="w-full text-xs text-left border border-slate-700 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-800 text-slate-300 border-b border-slate-700 font-bold">
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
                  <tr key={level.id} className={`text-slate-400 hover:bg-slate-800/50 ${isOverloaded ? 'bg-rose-900/10' : ''}`}>
                    <td className="p-2.5 font-bold font-mono">NIVEAU {level.levelNumber}</td>
                    <td className="p-2.5 font-mono">{formatLength(level.heightFromGroundMm, lengthUnit)}</td>
                    <td className="p-2.5 font-mono text-sky-700 font-bold print:text-blue-600">{formatLength(clearanceHeight, lengthUnit, 0)}</td>
                    <td className={`p-2.5 text-right font-bold font-mono ${isOverloaded ? 'text-rose-600' : 'text-emerald-600'}`}>{levelWeight.toLocaleString()} lbs</td>
                    <td className="p-2.5 text-right font-bold font-mono text-slate-200">
                      {levelMaxLoad.toLocaleString()} lbs
                    </td>
                    <td className="p-2.5 text-center">
                      {isOverloaded ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900/50 text-rose-400 border border-rose-700/50">
                          <AlertCircle size={12} /> Surcharge
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
                          <CheckSquare size={12} /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {/* Ground level extra line */}
              <tr className="text-slate-400 bg-slate-800/20">
                <td className="p-2.5 font-bold font-mono">SOL (NIV 0)</td>
                <td className="p-2.5 font-mono">{formatLength(0, lengthUnit)}</td>
                <td className="p-2.5 font-mono text-sky-700 font-bold print:text-blue-600">
                  {formatLength(rack.levels[0] ? rack.levels[0].heightFromGroundMm - 100 : rack.totalHeightMm, lengthUnit)}
                </td>
                <td className="p-2.5 text-right font-bold font-mono text-slate-400">{getLevelWeight(0).toLocaleString()} lbs</td>
                <td className="p-2.5 text-right font-bold font-mono text-slate-200">Illimitée (Sol béton)</td>
                <td className="p-2.5 text-center">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
                    <CheckSquare size={12} /> OK
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
 
        
        {/* Section 3: CSA A344 Audit & Actions */}
        <div className="bg-amber-900/10 border border-amber-700/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Activity size={18} />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200 font-display">
              🛠️ Audit Automatique & Actions Prioritaires (CSA A344)
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 text-amber-500 shrink-0">
                  <CheckSquare size={15} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Faux Aplomb (Plomb)</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Le faux aplomb maximal autorisé est de H/240. 
                    Pour ce rack ({formatLength(rack.totalHeightMm, lengthUnit)}), la tolérance est de <strong className="text-amber-400 font-mono">{formatLength(rack.totalHeightMm / 240, lengthUnit, 1)}</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 text-amber-500 shrink-0">
                  <CheckSquare size={15} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Flèche des Lisses (Deflection)</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    La déformation maximale sous charge (L/180). 
                    Pour une longueur de lisse de {formatLength(rack.totalWidthMm - 2 * rack.uprightWidthMm, lengthUnit)}, flèche max : <strong className="text-amber-400 font-mono">{formatLength((rack.totalWidthMm - 2 * rack.uprightWidthMm) / 180, lengthUnit, 1)}</strong>.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 text-amber-500 shrink-0">
                  <CheckSquare size={15} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Goupilles de Sécurité</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Résistance minimale d'arrachement requise par connecteur : <strong className="text-amber-400">4,5 kN</strong>. Les goupilles manquantes exigent un arrêt immédiat de l'utilisation.
                  </p>
                </div>
              </div>
              {overloadedLevels.length > 0 && (
                <div className="flex items-start gap-2.5 bg-rose-900/30 p-2 rounded border border-rose-700/50">
                  <div className="mt-0.5 text-rose-500 shrink-0">
                    <ShieldAlert size={15} />
                  </div>
                  <div>
                    <h4 className="font-bold text-rose-400">Action Corrective Immédiate</h4>
                    <p className="text-rose-300 text-[11px] mt-0.5">
                      Déchargement obligatoire des niveaux en surcharge : {overloadedLevels.map(l => `Niveau ${l.levelNumber}`).join(', ')}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Section 4: Regulatory Compliance and Safety Checklist */}
        <div className="bg-rose-900/10 print:bg-slate-800/50 border border-rose-700/50 print:border-slate-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertCircle size={18} />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200 font-display">
              🚨 Consignes Réglementaires Obligatoires (Norme EN 15635)
            </h3>
          </div>
 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 text-sky-700 shrink-0">
                  <CheckSquare size={15} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 flex items-center gap-1">
                    Ancrages au sol
                  </h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Tous les montants d'échelle doivent être chevillés mécaniquement au sol (béton d'épaisseur minimale de {formatLength(150, lengthUnit)}) avec au moins deux boulons d'ancrage par platine.
                  </p>
                </div>
              </div>
 
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 text-sky-700 shrink-0">
                  <CheckSquare size={15} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 flex items-center gap-1">
                    Jeux de Sécurité Supérieurs (Clearances)
                  </h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Un espace libre d'au moins {formatLength(100, lengthUnit)} doit être maintenu entre la partie supérieure de la charge (produit) et la lisse du niveau immédiatement supérieur pour éviter les accrochages de chariot.
                  </p>
                </div>
              </div>
            </div>
 
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 text-sky-700 shrink-0">
                  <CheckSquare size={15} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 flex items-center gap-1">
                    Pose des Plaques de Charge (Load Plaques)
                  </h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Des plaques indicatrices de charge de couleur jaune/orange doivent être fixées sur chaque échelle d'extrémité pour rappeler les limites de masse par alvéole et par travée.
                  </p>
                </div>
              </div>
 
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 text-sky-700 shrink-0">
                  <CheckSquare size={15} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 flex items-center gap-1">
                    Goupilles de Sécurité sur Lisses
                  </h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Chaque connecteur de lisse doit comporter une goupille de sécurité métallique verrouillée pour empêcher le soulèvement accidentel par les fourches d'un chariot élévateur (force d'arrachement requise &gt; 5 kN).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
 
        {/* Section 5: Signature Blocks (Official Approval) */}
        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-700 text-xs">
          <div className="space-y-12">
            <div>
              <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">Inspecteur Technique Logistique</span>
              <span className="font-bold text-slate-200 block mt-1">Cabinet de diagnostic certifié</span>
            </div>
            <div className="border-b border-dashed border-slate-700 w-2/3 h-5"></div>
            <span className="text-slate-500 text-[10px] block">Visa :</span>
          </div>
 
          <div className="space-y-12 text-right">
            <div>
              <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">Responsable Exploitation Entrepôt</span>
              <span className="font-bold text-slate-200 block mt-1 font-display">Validation de conformité d'implantation</span>
            </div>
            <div className="border-b border-dashed border-slate-700 w-2/3 ml-auto h-5"></div>
            <span className="text-slate-500 font-semibold text-[10px] block">Signature & Cachet de la Shop :</span>
          </div>
        </div>
 
        {/* Document Footer */}
        <div className="text-center text-[9px] text-slate-500 print:text-slate-400 font-mono pt-4 border-t border-slate-700 flex justify-between items-center">
          <span>Généré numériquement le {dateStr}</span>
          <span className="text-sky-700 print:text-blue-600 font-semibold uppercase tracking-wider">Norme de contrôle EN 15635 active</span>
          <span>DL. MAPPING ENGINE v1.1.0</span>
        </div>
      </div>
    </div>
  );
}
