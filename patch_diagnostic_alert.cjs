const fs = require('fs');
let code = fs.readFileSync('src/components/DiagnosticReport.tsx', 'utf-8');

const regex = /<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* Section 2: Detailed Levels list \*\/\}/;

const replacement = `                <div className="flex justify-between items-center mt-1">
                  <span className="text-[9px] text-slate-500 font-medium">Utilisation structurelle</span>
                  <span className="text-[9px] font-bold text-slate-700">{utilizationPercent.toFixed(1)}%</span>
                </div>
              </div>
              
              {utilizationPercent > 100 && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 flex items-start gap-2">
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

        {/* Section 2: Detailed Levels list */}`;

code = code.replace(/<div className="flex justify-between items-center mt-1">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* Section 2: Detailed Levels list \*\/\}/, replacement);

fs.writeFileSync('src/components/DiagnosticReport.tsx', code);
