import fs from 'fs';
let code = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

if (!code.includes('checkTMDCompatibility')) {
  // Add import
  code = code.replace(
    "import { RackAlveoliTable } from './RackVisualizer/RackAlveoliTable';",
    "import { RackAlveoliTable } from './RackVisualizer/RackAlveoliTable';\nimport { checkTMDCompatibility } from '../utils/tmdMatrix';"
  );

  const tmdCheckLogic = `
  // 4. TMD Compatibility Check (Matrice d'incompatibilité chimique TMD)
  const getProductAt = (lIdx: number, bIdx: number, subIdx?: number) => {
    const a = allAlveoli.find(a => a.levelIndex === lIdx && a.binIndex === bIdx);
    if (!a || !a.occupied) return null;
    if (a.isSubdivided && a.pickBins && subIdx !== undefined) {
      return a.pickBins[subIdx]?.product || null;
    }
    return a.product || null;
  };

  const getAdjacentProducts = () => {
    const products: Array<{p: Product, dir: string, alvId: string}> = [];
    if (!targetAlv.isSubdivided) {
      const leftP = getProductAt(targetLIdx, targetBIdx - 1);
      if (leftP) products.push({p: leftP, dir: 'Gauche', alvId: allAlveoli.find(a => a.levelIndex === targetLIdx && a.binIndex === targetBIdx - 1)!.id});
      
      const rightP = getProductAt(targetLIdx, targetBIdx + 1);
      if (rightP) products.push({p: rightP, dir: 'Droite', alvId: allAlveoli.find(a => a.levelIndex === targetLIdx && a.binIndex === targetBIdx + 1)!.id});
      
      const topP = getProductAt(targetLIdx + 1, targetBIdx);
      if (topP) products.push({p: topP, dir: 'Dessus', alvId: allAlveoli.find(a => a.levelIndex === targetLIdx + 1 && a.binIndex === targetBIdx)!.id});
      
      const bottomP = getProductAt(targetLIdx - 1, targetBIdx);
      if (bottomP) products.push({p: bottomP, dir: 'Dessous', alvId: allAlveoli.find(a => a.levelIndex === targetLIdx - 1 && a.binIndex === targetBIdx)!.id});
    } else {
      if (pbIdx > 0) {
        const leftP = getProductAt(targetLIdx, targetBIdx, pbIdx - 1);
        if (leftP) products.push({p: leftP, dir: 'Gauche (même alvéole)', alvId: targetAlv.id});
      } else {
        const leftAlv = allAlveoli.find(a => a.levelIndex === targetLIdx && a.binIndex === targetBIdx - 1);
        if (leftAlv) {
          if (leftAlv.isSubdivided && leftAlv.pickBins) {
            const leftP = leftAlv.pickBins[leftAlv.pickBins.length - 1]?.product;
            if (leftP) products.push({p: leftP, dir: 'Gauche', alvId: leftAlv.id});
          } else if (leftAlv.product) {
            products.push({p: leftAlv.product, dir: 'Gauche', alvId: leftAlv.id});
          }
        }
      }
      
      if (pbIdx < subdivCount - 1) {
        const rightP = getProductAt(targetLIdx, targetBIdx, pbIdx + 1);
        if (rightP) products.push({p: rightP, dir: 'Droite (même alvéole)', alvId: targetAlv.id});
      } else {
        const rightAlv = allAlveoli.find(a => a.levelIndex === targetLIdx && a.binIndex === targetBIdx + 1);
        if (rightAlv) {
          if (rightAlv.isSubdivided && rightAlv.pickBins) {
            const rightP = rightAlv.pickBins[0]?.product;
            if (rightP) products.push({p: rightP, dir: 'Droite', alvId: rightAlv.id});
          } else if (rightAlv.product) {
            products.push({p: rightAlv.product, dir: 'Droite', alvId: rightAlv.id});
          }
        }
      }
      
      const topAlv = allAlveoli.find(a => a.levelIndex === targetLIdx + 1 && a.binIndex === targetBIdx);
      if (topAlv && topAlv.occupied) {
        if (topAlv.isSubdivided && topAlv.pickBins) {
          const topP = topAlv.pickBins[pbIdx]?.product || topAlv.pickBins[0]?.product;
          if (topP) products.push({p: topP, dir: 'Dessus', alvId: topAlv.id});
        } else if (topAlv.product) {
          products.push({p: topAlv.product, dir: 'Dessus', alvId: topAlv.id});
        }
      }
      
      const bottomAlv = allAlveoli.find(a => a.levelIndex === targetLIdx - 1 && a.binIndex === targetBIdx);
      if (bottomAlv && bottomAlv.occupied) {
        if (bottomAlv.isSubdivided && bottomAlv.pickBins) {
          const bottomP = bottomAlv.pickBins[pbIdx]?.product || bottomAlv.pickBins[0]?.product;
          if (bottomP) products.push({p: bottomP, dir: 'Dessous', alvId: bottomAlv.id});
        } else if (bottomAlv.product) {
          products.push({p: bottomAlv.product, dir: 'Dessous', alvId: bottomAlv.id});
        }
      }
    }
    return products;
  };

  const adjProducts = getAdjacentProducts();
  adjProducts.forEach(({p, dir, alvId}) => {
    if (!checkTMDCompatibility(prod.tmdClass, p.tmdClass)) {
      reasons.push(\`Incompatibilité TMD (\${dir}): Le produit \${prod.sku} (Classe \${prod.tmdClass || 'Non-spécifiée'}) ne peut pas être stocké à côté du produit \${p.sku} (Classe \${p.tmdClass || 'Non-spécifiée'}).\`);
      if (!collidesWithAdjacent.includes(alvId)) {
        collidesWithAdjacent.push(alvId);
      }
    }
  });

  return {`;

  code = code.replace(
    'return {',
    tmdCheckLogic
  );

  fs.writeFileSync('src/components/RackVisualizer3D.tsx', code);
  console.log("Patched TMD validation");
} else {
  console.log("Already patched");
}
