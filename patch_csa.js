import fs from 'fs';
let code = fs.readFileSync('src/components/DiagnosticReport.tsx', 'utf-8');

const csaAuditCode = `
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
                      Déchargement obligatoire des niveaux en surcharge : {overloadedLevels.map(l => \`Niveau \${l.levelNumber}\`).join(', ')}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
`;

code = code.replace(
  '{/* Section 3: Regulatory Compliance and Safety Checklist */}',
  csaAuditCode + '\n\n        {/* Section 4: Regulatory Compliance and Safety Checklist */}'
);

// We need to also rename "Section 4: Signature Blocks (Official Approval)" to "Section 5: Signature Blocks (Official Approval)"
code = code.replace(
  '{/* Section 4: Signature Blocks (Official Approval) */}',
  '{/* Section 5: Signature Blocks (Official Approval) */}'
);

fs.writeFileSync('src/components/DiagnosticReport.tsx', code);
