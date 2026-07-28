const fs = require('fs');
let code = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

const regex = /<h4 className="text-xs font-bold text-slate-700 mt-4 mb-2">Sections \(Alvéoles\) par niveau<\/h4>[\s\S]*?<\/div>\s*<\/div>\s*<div className="grid grid-cols-2 gap-3 mt-3">/m;

const replacement = `<h4 className="text-xs font-bold text-slate-700 mt-4 mb-2">Sections (Alvéoles) par niveau</h4>
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                {( [null, ...rack.levels] as (null | typeof rack.levels[0])[] ).map((level, idx) => {
                  const isGround = idx === 0;
                  const levelId = isGround ? 'ground' : level?.id;
                  const lName = isGround ? 'Sol (Picking)' : \`Niveau \${level?.levelNumber} (Over)\`;
                  
                  const val = isGround 
                    ? (rack.groundSlotsCount || rack.binsPerLevel || 5) 
                    : 3; // Fixed to 3 for Over
                  
                  return (
                    <div key={levelId} className="flex items-center justify-between bg-slate-50 px-2 py-1.5 rounded border border-slate-200">
                      <span className="text-[11px] font-medium text-slate-600">{lName}</span>
                      {isGround ? (
                        <select
                          value={val}
                          onChange={(e) => {
                            const newCount = parseInt(e.target.value);
                            const newRack = { ...rack };
                            newRack.groundSlotsCount = newCount;
                            onChangeRack(newRack);
                          }}
                          className="text-[11px] px-1 py-0.5 border border-slate-300 rounded focus:outline-none focus:border-sky-500"
                        >
                          {Array.from({length: 20}, (_, i) => i + 1).map(n => (
                            <option key={n} value={n}>{n} sec.</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">3 sec. fixes</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-3">`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', code);
