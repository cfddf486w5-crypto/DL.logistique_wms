import fs from 'fs';
let code = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

// The remaining hardcoded mm in text we found earlier:
// 95: `Hauteur excessive (${pHeight} mm) : Le colis entre en collision verticale avec la lisse supérieure (hauteur disponible utile : ${Math.round(targetAlv.heightMm)} mm).`
// 172: `Dégagement latéral gauche insuffisant (CSA A344) : Il faut au minimum 75 mm de jeu entre la charge et le montant (actuel: ${Math.round(targetLeft - rack.uprightWidthMm)} mm).`
// 181: `Dégagement latéral droit insuffisant (CSA A344) : Il faut au minimum 75 mm de jeu entre la charge et le montant (actuel: ${Math.round(rightUprightStart - targetRight)} mm).`
// 204: `Collision Bac interne : Chevauchement de ${overlapAmt} mm avec le produit du bac voisin ${bin.label} (${bin.product.name}).`
// 208: `Dégagement latéral insuffisant (CSA A344) : ${clearance} mm de jeu avec le bac voisin ${bin.label} (minimum 75 mm requis).`
// 239: `Collision alvéole adjacente : Chevauchement de ${overlapAmt} mm avec le produit du bac voisin ${otherBin.label} (${otherProd.name}).`
// 261: `Collision alvéole adjacente : Chevauchement de ${overlapAmt} mm avec la palette de l'alvéole voisine ${otherAlv.id} (${otherProd.name}).`

code = code.replace(
  /\`Hauteur excessive \(\$\{pHeight\} mm\) : Le colis entre en collision verticale avec la lisse supérieure \(hauteur disponible utile : \$\{Math\.round\(targetAlv\.heightMm\)\} mm\)\.\`/g,
  "`Hauteur excessive (${formatLength(pHeight, lengthUnit)}) : Le colis entre en collision verticale avec la lisse supérieure (hauteur disponible utile : ${formatLength(targetAlv.heightMm, lengthUnit)}).`"
);

code = code.replace(
  /\`Dégagement latéral gauche insuffisant \(CSA A344\) : Il faut au minimum 75 mm de jeu entre la charge et le montant \(actuel: \$\{Math\.round\(targetLeft \- rack\.uprightWidthMm\)\} mm\)\.\`/g,
  "`Dégagement latéral gauche insuffisant (CSA A344) : Il faut au minimum ${formatLength(75, lengthUnit)} de jeu entre la charge et le montant (actuel: ${formatLength(targetLeft - rack.uprightWidthMm, lengthUnit)}).`"
);

code = code.replace(
  /\`Dégagement latéral droit insuffisant \(CSA A344\) : Il faut au minimum 75 mm de jeu entre la charge et le montant \(actuel: \$\{Math\.round\(rightUprightStart \- targetRight\)\} mm\)\.\`/g,
  "`Dégagement latéral droit insuffisant (CSA A344) : Il faut au minimum ${formatLength(75, lengthUnit)} de jeu entre la charge et le montant (actuel: ${formatLength(rightUprightStart - targetRight, lengthUnit)}).`"
);

code = code.replace(
  /\`Collision Bac interne : Chevauchement de \$\{overlapAmt\} mm avec le produit du bac voisin \$\{bin\.label\} \(\$\{bin\.product\.name\}\)\.\`/g,
  "`Collision Bac interne : Chevauchement de ${formatLength(overlapAmt, lengthUnit)} avec le produit du bac voisin ${bin.label} (${bin.product.name}).`"
);

code = code.replace(
  /\`Dégagement latéral insuffisant \(CSA A344\) : \$\{clearance\} mm de jeu avec le bac voisin \$\{bin\.label\} \(minimum 75 mm requis\)\.\`/g,
  "`Dégagement latéral insuffisant (CSA A344) : ${formatLength(clearance, lengthUnit)} de jeu avec le bac voisin ${bin.label} (minimum ${formatLength(75, lengthUnit)} requis).`"
);

code = code.replace(
  /\`Collision alvéole adjacente : Chevauchement de \$\{overlapAmt\} mm avec le produit du bac voisin \$\{otherBin\.label\} \(\$\{otherProd\.name\}\)\.\`/g,
  "`Collision alvéole adjacente : Chevauchement de ${formatLength(overlapAmt, lengthUnit)} avec le produit du bac voisin ${otherBin.label} (${otherProd.name}).`"
);

code = code.replace(
  /\`Collision alvéole adjacente : Chevauchement de \$\{overlapAmt\} mm avec la palette de l'alvéole voisine \$\{otherAlv\.id\} \(\$\{otherProd\.name\}\)\.\`/g,
  "`Collision alvéole adjacente : Chevauchement de ${formatLength(overlapAmt, lengthUnit)} avec la palette de l'alvéole voisine ${otherAlv.id} (${otherProd.name}).`"
);

code = code.replace(
  /Niveau \{level\?\.levelNumber\} : H = \{level\.heightFromGroundMm\} mm/g,
  "Niveau {level?.levelNumber} : H = {formatLength(level.heightFromGroundMm, lengthUnit)}"
);

code = code.replace(
  /\? \`\$\{Math\.round\(alv\.widthMm \/ \(alv\.subdivisionCount \|\| 1\)\)\} mm \/ bac\`/g,
  "? `${formatLength(alv.widthMm / (alv.subdivisionCount || 1), lengthUnit)} / bac`"
);

code = code.replace(
  /: \`\$\{Math\.round\(alv\.widthMm\)\} mm\`/g,
  ": `${formatLength(alv.widthMm, lengthUnit)}`"
);

code = code.replace(
  /<strong className="text-slate-200 font-mono">\{Math\.round\(alv\.heightMm\)\} mm<\/strong>/g,
  '<strong className="text-slate-200 font-mono">{formatLength(alv.heightMm, lengthUnit)}</strong>'
);

code = code.replace(
  /<strong className="text-slate-200 font-mono">\{Math\.round\(alv\.depthMm\)\} mm<\/strong>/g,
  '<strong className="text-slate-200 font-mono">{formatLength(alv.depthMm, lengthUnit)}</strong>'
);

code = code.replace(
  /\{selectedProductToPlace\.widthMm \|\| 1200\}x\{selectedProductToPlace\.heightMm \|\| 1200\}x\{selectedProductToPlace\.depthMm \|\| 800\} mm/g,
  '{formatLength(selectedProductToPlace.widthMm || 1200, lengthUnit)} x {formatLength(selectedProductToPlace.heightMm || 1200, lengthUnit)} x {formatLength(selectedProductToPlace.depthMm || 800, lengthUnit)}'
);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', code);
