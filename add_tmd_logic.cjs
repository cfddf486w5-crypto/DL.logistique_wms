const fs = require('fs');
let rv = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

const tmdMatrix = `
// Matrice de ségrégation des matières dangereuses (TMD / RMD)
// P = Permis, X = Interdit, A = Autorisée (sous condition), FS = Séparation Feu
const tmdMatrix: Record<string, Record<string, string>> = {
  '2.1': { '2.1': 'P', '2.2': 'P', '2.3': 'X', '3': 'P', '4.1': 'P', '4.2': 'A', '4.3': 'FS', '5.1': 'X', '5.2': 'X', '6.1': 'X', '8': 'X' },
  '2.2': { '2.1': 'P', '2.2': 'P', '2.3': 'P', '3': 'P', '4.1': 'P', '4.2': 'P', '4.3': 'P', '5.1': 'P', '5.2': 'P', '6.1': 'P', '8': 'P' },
  '2.3': { '2.1': 'X', '2.2': 'P', '2.3': 'P', '3': 'X', '4.1': 'A', '4.2': 'A', '4.3': 'FS', '5.1': 'A', '5.2': 'X', '6.1': 'FS', '8': 'A' },
  '3': { '2.1': 'P', '2.2': 'P', '2.3': 'X', '3': 'P', '4.1': 'P', '4.2': 'A', '4.3': 'A', '5.1': 'X', '5.2': 'X', '6.1': 'FS', '8': 'A' },
  '4.1': { '2.1': 'P', '2.2': 'P', '2.3': 'A', '3': 'P', '4.1': 'P', '4.2': 'A', '4.3': 'FS', '5.1': 'X', '5.2': 'X', '6.1': 'FS', '8': 'A' },
  '4.2': { '2.1': 'A', '2.2': 'P', '2.3': 'A', '3': 'A', '4.1': 'A', '4.2': 'P', '4.3': 'FS', '5.1': 'X', '5.2': 'X', '6.1': 'FS', '8': 'A' },
  '4.3': { '2.1': 'FS', '2.2': 'P', '2.3': 'FS', '3': 'A', '4.1': 'FS', '4.2': 'FS', '4.3': 'P', '5.1': 'X', '5.2': 'X', '6.1': 'FS', '8': 'X' },
  '5.1': { '2.1': 'X', '2.2': 'P', '2.3': 'A', '3': 'X', '4.1': 'X', '4.2': 'X', '4.3': 'X', '5.1': 'P', '5.2': 'X', '6.1': 'A', '8': 'X' },
  '5.2': { '2.1': 'X', '2.2': 'P', '2.3': 'X', '3': 'X', '4.1': 'X', '4.2': 'X', '4.3': 'X', '5.1': 'X', '5.2': 'P', '6.1': 'X', '8': 'X' },
  '6.1': { '2.1': 'X', '2.2': 'P', '2.3': 'FS', '3': 'FS', '4.1': 'FS', '4.2': 'FS', '4.3': 'FS', '5.1': 'A', '5.2': 'X', '6.1': 'P', '8': 'A' },
  '8': { '2.1': 'X', '2.2': 'P', '2.3': 'A', '3': 'A', '4.1': 'A', '4.2': 'A', '4.3': 'X', '5.1': 'X', '5.2': 'X', '6.1': 'A', '8': 'P' },
};

function checkHazardSegregation(p1: Product, p2: Product): string | null {
  if (!p1.tmdClass || !p2.tmdClass || p1.tmdClass === 'None' || p2.tmdClass === 'None') return null;
  const rule = tmdMatrix[p1.tmdClass]?.[p2.tmdClass];
  if (rule === 'X') {
    return \`Incompatibilité chimique TMD (RMD Art. 41) : Classe \${p1.tmdClass} et Classe \${p2.tmdClass} interdites d'être stockées de manière adjacente.\`;
  } else if (rule === 'FS') {
    return \`Séparation incendie requise TMD : Classe \${p1.tmdClass} et Classe \${p2.tmdClass} nécessitent une barrière coupe-feu (FS).\`;
  }
  return null;
}
`;

if (!rv.includes('tmdMatrix')) {
  // Inject before checkCollisions
  rv = rv.replace('export const checkCollisions =', tmdMatrix + '\nexport const checkCollisions =');
}

// Add inside checkCollisions the calls to checkHazardSegregation
const oldAdjacentLoop = /allAlveoli\.forEach\(a => \{\n\s+if \(a\.levelIndex === targetAlv\.levelIndex && a\.id !== targetAlv\.id\) \{/;

const newAdjacentLoop = `allAlveoli.forEach(a => {
      if (a.levelIndex === targetAlv.levelIndex && a.id !== targetAlv.id) {
        if (a.occupied && a.product) {
          const hazardError = checkHazardSegregation(prod, a.product);
          if (hazardError) {
             collidesWithAdjacent.push(a.id);
             reasons.push(hazardError);
          }
        }`;

if (!rv.includes('checkHazardSegregation(prod, a.product)')) {
   // Replace within checkCollisions loop
   const replaced = rv.replace(oldAdjacentLoop, newAdjacentLoop);
   fs.writeFileSync('src/components/RackVisualizer3D.tsx', replaced);
}
