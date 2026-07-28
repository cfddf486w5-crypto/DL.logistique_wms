const fs = require('fs');
let content = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

const regex = /<div className="grid grid-cols-2 gap-3 mt-3">\s*<div>\s*<label className="block text-xs font-semibold text-slate-500 mb-1">\s*Subdivision Globale \(Pick Bins\)/;

const replacement = `<div>
              <h4 className="text-xs font-bold text-slate-700 mt-4 mb-2">Sections (Alvéoles) par niveau</h4>
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                {[0, ...rack.levels].map((level, idx) => {
                  const isGround = idx === 0;
                  const levelId = isGround ? 'ground' : level.id;
                  const lName = isGround ? 'Sol (Picking)' : \`Niveau \${level.levelNumber} (Over)\`;
                  const val = isGround 
                    ? (rack.groundSlotsCount || rack.binsPerLevel) 
                    : (level.slotsCount || rack.binsPerLevel);
                  
                  return (
                    <div key={levelId} className="flex items-center justify-between bg-slate-50 px-2 py-1.5 rounded border border-slate-200">
                      <span className="text-[11px] font-medium text-slate-600">{lName}</span>
                      <select
                        value={val}
                        onChange={(e) => {
                          const newCount = parseInt(e.target.value);
                          const newRack = { ...rack };
                          if (isGround) {
                            newRack.groundSlotsCount = newCount;
                          } else {
                            newRack.levels = newRack.levels.map(l => l.id === level.id ? { ...l, slotsCount: newCount } : l);
                          }
                          onChangeRack(newRack);
                        }}
                        className="text-[11px] px-1 py-0.5 border border-slate-300 rounded focus:outline-none focus:border-sky-500"
                      >
                        {Array.from({length: 20}, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Subdivision Globale (Pick Bins)`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', content);
