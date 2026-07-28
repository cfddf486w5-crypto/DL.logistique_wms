const fs = require('fs');
let rv = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

const oldProductLabel = /<div className="bg-white\/20 text-\[8px\] font-bold px-1 rounded backdrop-blur">\s*\{a\.product\.sku\}\s*<\/div>/;

const newProductLabel = `<div className="bg-white/20 text-[8px] font-bold px-1 rounded backdrop-blur">
                              {a.product.sku}
                            </div>
                            {a.product.tmdClass && a.product.tmdClass !== 'None' && (
                              <div className="bg-orange-500/80 text-white text-[8px] font-bold px-1 rounded flex items-center gap-0.5 shadow-sm" title={\`Matière Dangereuse TMD: Classe \${a.product.tmdClass}\`}>
                                <AlertTriangle size={8} /> TMD {a.product.tmdClass}
                              </div>
                            )}`;

if (!rv.includes('<AlertTriangle size={8} /> TMD {a.product.tmdClass}')) {
  rv = rv.replace(oldProductLabel, newProductLabel);
  fs.writeFileSync('src/components/RackVisualizer3D.tsx', rv);
}
