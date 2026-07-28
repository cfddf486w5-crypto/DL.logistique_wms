const fs = require('fs');
let dt = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

const regexUi = /\{totalWeightLbs > \(rack\.maxLoadLbs \|\| 12000\) \? \([\s\S]*?\} lbs\)\n              <\/span>\n            \)\}/m;

const newUi = `
            {(() => {
              const certYear = rack.certificationYear || 1990;
              let dynamicMaxLoad = rack.maxLoadLbs || 25000;
              if (certYear >= 2022) dynamicMaxLoad = Math.min(dynamicMaxLoad, 15000);
              else if (certYear >= 2000) dynamicMaxLoad = Math.min(dynamicMaxLoad, 20000);
              else if (certYear >= 1990) dynamicMaxLoad = Math.min(dynamicMaxLoad, 23000);
              else dynamicMaxLoad = Math.min(dynamicMaxLoad, 25000);

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
`;

dt = dt.replace(regexUi, newUi.trim());
fs.writeFileSync('src/components/RackVisualizer3D.tsx', dt);
