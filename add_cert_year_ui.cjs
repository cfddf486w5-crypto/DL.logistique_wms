const fs = require('fs');
let rv = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

const regex = /<label className="block text-\[10px\] font-semibold text-slate-500 mb-1">\s*Nombre de places par niveau\s*<\/label>[\s\S]*?<\/div>/m;

const newField = `
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Année Certification (Sismique)
                  </label>
                  <input
                    type="number"
                    value={rack.certificationYear || 1990}
                    onChange={(e) => onChangeRack({ ...rack, certificationYear: parseInt(e.target.value) || 1990 })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                    Affecte la capacité maximale selon le Code du Bâtiment (ex: \u22652022 = max 15000 lbs).
                  </p>
                </div>
`;

if (!rv.includes('Année Certification (Sismique)')) {
  rv = rv.replace(regex, (match) => match + newField);
  fs.writeFileSync('src/components/RackVisualizer3D.tsx', rv);
}
