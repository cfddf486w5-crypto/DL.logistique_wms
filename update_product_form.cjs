const fs = require('fs');
let rv = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

// Add state for tmdClass
const stateRegex = /const \[palletRotation, setPalletRotation\] = useState\<'A'\|'B'\|'C'\>\('A'\);/;
const stateReplacement = `const [palletRotation, setPalletRotation] = useState<'A'|'B'|'C'>('A');
  const [palletTmdClass, setPalletTmdClass] = useState<string>('None');`;

rv = rv.replace(stateRegex, stateReplacement);

// Add to onAddCustomProduct
const objRegex = /rotationClass: palletRotation,/;
const objReplacement = `rotationClass: palletRotation,
                        tmdClass: palletTmdClass as any,`;
rv = rv.replace(objRegex, objReplacement);

// Add form field
const formFieldRegex = /<div>\s*<label className="block text-\[10px\] font-semibold text-slate-500 mb-1">\s*Classe de Rotation \(ABC\)\s*<\/label>[\s\S]*?<\/div>/;

const newFormField = `<div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Classe de Rotation (ABC)
                        </label>
                        <select
                          value={palletRotation}
                          onChange={(e) => setPalletRotation(e.target.value as 'A'|'B'|'C')}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-sky-500 cursor-pointer"
                        >
                          <option value="A">A - Très Rapide (Idéal sol / N1)</option>
                          <option value="B">B - Moyen (Idéal N2 / N3)</option>
                          <option value="C">C - Lent (Idéal N4+)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Matière Dangereuse (TMD)
                        </label>
                        <select
                          value={palletTmdClass}
                          onChange={(e) => setPalletTmdClass(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
                        >
                          <option value="None">Aucune / Non applicable</option>
                          <option value="2.1">Classe 2.1 (Gaz Inflammable)</option>
                          <option value="2.2">Classe 2.2 (Gaz Ininflammable)</option>
                          <option value="3">Classe 3 (Liquide Inflammable)</option>
                          <option value="4.1">Classe 4.1 (Solide Inflammable)</option>
                          <option value="5.1">Classe 5.1 (Comburant)</option>
                          <option value="6.1">Classe 6.1 (Toxique)</option>
                          <option value="8">Classe 8 (Corrosif)</option>
                        </select>
                      </div>`;

rv = rv.replace(formFieldRegex, newFormField);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', rv);
