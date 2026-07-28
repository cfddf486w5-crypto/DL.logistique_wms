import React, { useMemo } from 'react';
import { Rack, Alveolus, Product } from '../../types';
import { Activity, AlertTriangle, ArrowRight, CheckCircle, Info } from 'lucide-react';

interface ErgonomicAnalysisProps {
  rack: Rack;
  alveoli: Alveolus[];
}

interface RiskItem {
  alveolus: Alveolus;
  product: Product;
  heightMm: number;
  riskLevel: 'high' | 'medium' | 'low';
  reason: string;
  suggestion: string;
  targetAlveolus?: Alveolus;
}

export function ErgonomicAnalysis({ rack, alveoli }: ErgonomicAnalysisProps) {
  const { risks, score, goldenZoneSlots } = useMemo(() => {
    let riskList: RiskItem[] = [];
    let totalScore = 100;
    
    // Find empty slots in Golden Zone for suggestions
    const emptyGoldenSlots = alveoli.filter(a => {
      if (a.occupied) return false;
      const h = a.levelIndex === 0 ? 0 : (rack.levels[a.levelIndex - 1]?.heightFromGroundMm || 0);
      return h >= 800 && h <= 1400;
    });

    let suggestionIndex = 0;

    alveoli.forEach(alv => {
      if (!alv.occupied || !alv.product) return;
      
      const height = alv.levelIndex === 0 ? 0 : (rack.levels[alv.levelIndex - 1]?.heightFromGroundMm || 0);
      const prod = alv.product;
      const isHeavy = prod.weight >= 33; // ~15kg
      const isHighVelocity = prod.rotationClass === 'A';
      
      let inGolden = height >= 800 && height <= 1400;
      let isAcceptable = height >= 600 && height <= 1600;
      
      let riskLevel: 'high' | 'medium' | 'low' = 'low';
      let reason = '';
      
      if (!isAcceptable) {
        if (isHeavy) {
          riskLevel = 'high';
          reason = `Produit lourd (${prod.weight} lbs) hors zone ergonomique (${height}mm).`;
          totalScore -= 10;
        } else if (isHighVelocity) {
          riskLevel = 'high';
          reason = `Produit à forte rotation (A) hors zone ergonomique (${height}mm).`;
          totalScore -= 8;
        } else {
          riskLevel = 'medium';
          reason = `Produit standard hors zone ergonomique (${height}mm).`;
          totalScore -= 2;
        }
      } else if (!inGolden) {
        if (isHeavy || isHighVelocity) {
          riskLevel = 'medium';
          reason = `Produit lourd/véloce en limite de zone dorée (${height}mm).`;
          totalScore -= 4;
        }
      }
      
      if (riskLevel !== 'low') {
        const target = emptyGoldenSlots[suggestionIndex];
        if (target) suggestionIndex++;
        
        riskList.push({
          alveolus: alv,
          product: prod,
          heightMm: height,
          riskLevel,
          reason,
          suggestion: target ? `Déplacer vers l'alvéole vide : ${target.label}` : "Aucun emplacement vide disponible dans la Golden Zone.",
          targetAlveolus: target
        });
      }
    });
    
    return { 
      risks: riskList.sort((a, b) => a.riskLevel === 'high' ? -1 : 1), 
      score: Math.max(0, totalScore),
      goldenZoneSlots: emptyGoldenSlots.length
    };
  }, [rack, alveoli]);

  return (
    <div className="bg-[#1a1a1d] border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
      <div className="flex items-start justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-display font-bold text-slate-100 flex items-center gap-2">
            <Activity className="text-cyan-400" size={20} />
            Score d'Ergonomie & TMS
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Analyse de la Golden Zone (800mm - 1400mm) et propositions de relocalisation
          </p>
        </div>
        <div className={`text-3xl font-black font-mono ${score >= 90 ? 'text-emerald-400' : score >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
          {score}
          <span className="text-sm text-slate-500 font-medium ml-1">/100</span>
        </div>
      </div>
      
      {risks.length === 0 ? (
        <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="text-emerald-400 shrink-0" size={18} />
          <div>
            <h4 className="text-sm font-bold text-emerald-200">Excellente configuration</h4>
            <p className="text-xs text-emerald-400/80 mt-0.5">Aucun risque ergonomique détecté. Les articles lourds et à forte vélocité sont bien positionnés.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-300">Suggestions de relocalisation ({risks.length})</h4>
          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 no-scrollbar">
            {risks.map((risk, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${risk.riskLevel === 'high' ? 'bg-rose-900/20 border-rose-800/50' : 'bg-amber-900/20 border-amber-800/50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${risk.riskLevel === 'high' ? 'text-rose-400' : 'text-amber-400'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 text-sm">{risk.product.sku}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {risk.alveolus.label} ({risk.heightMm}mm)
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${risk.riskLevel === 'high' ? 'text-rose-300' : 'text-amber-300'}`}>
                        {risk.reason}
                      </p>
                      
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-cyan-400 bg-cyan-900/20 px-2 py-1.5 rounded inline-flex border border-cyan-800/50">
                        <ArrowRight size={12} />
                        {risk.suggestion}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
