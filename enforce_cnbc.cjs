const fs = require('fs');

// 1. Types
let types = fs.readFileSync('src/types.ts', 'utf-8');
if (!types.includes('certificationYear?: number;')) {
  types = types.replace('createdAt: string;', 'createdAt: string;\n  certificationYear?: number;');
  fs.writeFileSync('src/types.ts', types);
}

// 2. checkCollisions in RackVisualizer3D
let rv = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

// Replace left upright check
const oldLeftCheck = `  // Left upright check
  if (targetLeft < rack.uprightWidthMm) {
    collidesWithUprights = true;
    reasons.push(
      \`Collision montant gauche : Largeur de palette (\${pWidth} mm) déborde de \${Math.round(rack.uprightWidthMm - targetLeft)} mm sur la structure métallique gauche.\`
    );
  }`;

const newLeftCheck = `  // Left upright check (Norme CSA A344 : 75 mm de dégagement)
  if (targetLeft < rack.uprightWidthMm + 75) {
    collidesWithUprights = true;
    reasons.push(
      \`Dégagement latéral gauche insuffisant (CSA A344) : Il faut au minimum 75 mm de jeu entre la charge et le montant (actuel: \${Math.round(targetLeft - rack.uprightWidthMm)} mm).\`
    );
  }`;

rv = rv.replace(oldLeftCheck, newLeftCheck);

const oldRightCheck = `  // Right upright check
  const rightUprightStart = rack.totalWidthMm - rack.uprightWidthMm;
  if (targetRight > rightUprightStart) {
    collidesWithUprights = true;
    reasons.push(
      \`Collision montant droit : Largeur de palette (\${pWidth} mm) déborde de \${Math.round(targetRight - rightUprightStart)} mm sur la structure métallique droite.\`
    );
  }`;

const newRightCheck = `  // Right upright check (Norme CSA A344 : 75 mm de dégagement)
  const rightUprightStart = rack.totalWidthMm - rack.uprightWidthMm;
  if (targetRight > rightUprightStart - 75) {
    collidesWithUprights = true;
    reasons.push(
      \`Dégagement latéral droit insuffisant (CSA A344) : Il faut au minimum 75 mm de jeu entre la charge et le montant (actuel: \${Math.round(rightUprightStart - targetRight)} mm).\`
    );
  }`;

rv = rv.replace(oldRightCheck, newRightCheck);

// Add seismic rack check logic based on certification year
const seismicCapacityInject = `
  // Validation Solaire/Sismique de la capacité (CCQ/CNB 2020)
  const certYear = rack.certificationYear || 1990;
  let dynamicMaxLoad = rack.maxLoadLbs || 25000;
  if (certYear >= 2022) {
    dynamicMaxLoad = Math.min(dynamicMaxLoad, 15000);
  } else if (certYear >= 2000) {
    dynamicMaxLoad = Math.min(dynamicMaxLoad, 20000);
  } else if (certYear >= 1990) {
    dynamicMaxLoad = Math.min(dynamicMaxLoad, 23000);
  } else {
    dynamicMaxLoad = Math.min(dynamicMaxLoad, 25000);
  }

  // 2. Total rack capacity (remplacé pour utiliser dynamicMaxLoad)
  if (true) {
    let currentRackWeight = 0;
    allAlveoli.forEach(a => {
      if (a.id !== targetAlv.id) {
        if (a.isSubdivided && a.pickBins) {
           a.pickBins.forEach(b => { if (b.occupied && b.product) currentRackWeight += (b.product.weight || 0); });
        } else if (a.occupied && a.product) {
           currentRackWeight += (a.product.weight || 0);
        }
      } else {
        if (a.isSubdivided && a.pickBins) {
           a.pickBins.forEach((b, idx) => { if (idx !== pbIdx && b.occupied && b.product) currentRackWeight += (b.product.weight || 0); });
        }
      }
    });
    if (currentRackWeight + (prod.weight || 0) > dynamicMaxLoad) {
      reasons.push(\`Surcharge Rack (Sismique \${certYear}) : Le poids total du rack (\${currentRackWeight + (prod.weight || 0)} lbs) dépasserait la capacité admissible de \${dynamicMaxLoad} lbs.\`);
      collidesWithUprights = true;
    }
  }
`;

// Replace the old Total rack capacity logic
const oldTotalRackCapacityRegex = /\/\/ 2\. Total rack capacity[\s\S]*?collidesWithUprights = true;\n    }\n  }/;
rv = rv.replace(oldTotalRackCapacityRegex, seismicCapacityInject.trim());

// We also need to add check for adjacent 75mm (pallet_lateral_clearance)
const oldAdjacentCheck = `        if (overlapStart < overlapEnd) {
          collidesWithAdjacent.push(targetAlv.id);
          const overlapAmt = Math.round(overlapEnd - overlapStart);
          reasons.push(
            \`Collision Bac interne : Chevauchement de \${overlapAmt} mm avec le produit du bac voisin \${bin.label} (\${bin.product.name}).\`
          );
        }`;

const newAdjacentCheck = `        if (overlapStart < overlapEnd + 75) {
          collidesWithAdjacent.push(targetAlv.id);
          const clearance = Math.round(otherLeft - targetRight);
          if (overlapStart < overlapEnd) {
             const overlapAmt = Math.round(overlapEnd - overlapStart);
             reasons.push(
               \`Collision Bac interne : Chevauchement de \${overlapAmt} mm avec le produit du bac voisin \${bin.label} (\${bin.product.name}).\`
             );
          } else {
             reasons.push(
               \`Dégagement latéral insuffisant (CSA A344) : \${clearance} mm de jeu avec le bac voisin \${bin.label} (minimum 75 mm requis).\`
             );
          }
        }`;

rv = rv.replace(oldAdjacentCheck, newAdjacentCheck);

// Same for adjacent products on the SAME level
const oldSameLevelCheck = `        if (overlapStart < overlapEnd) {
          collidesWithAdjacent.push(a.id);
          const overlapAmt = Math.round(overlapEnd - overlapStart);
          reasons.push(
            \`Collision Alvéole : Chevauchement de \${overlapAmt} mm avec le produit stocké dans l'alvéole voisine \${a.label}.\`
          );
        }`;

const newSameLevelCheck = `        if (overlapStart < overlapEnd + 75) {
          collidesWithAdjacent.push(a.id);
          const clearance = targetLeft < otherLeft ? Math.round(otherLeft - targetRight) : Math.round(targetLeft - otherRight);
          if (overlapStart < overlapEnd) {
             const overlapAmt = Math.round(overlapEnd - overlapStart);
             reasons.push(
               \`Collision Alvéole : Chevauchement de \${overlapAmt} mm avec le produit stocké dans l'alvéole voisine \${a.label}.\`
             );
          } else {
             reasons.push(
               \`Dégagement latéral insuffisant (CSA A344) : \${clearance} mm de jeu avec le produit de l'alvéole \${a.label} (minimum 75 mm requis).\`
             );
          }
        }`;

rv = rv.replace(oldSameLevelCheck, newSameLevelCheck);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', rv);
