import fs from 'fs';
let code = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

code = code.replace(
  'export const checkCollisions = (\n  targetAlv: Alveolus,\n  product: Product,\n  alveoli: Alveolus[],\n  rack: Rack,\n  targetPickBinIndex?: number\n)',
  'export const checkCollisions = (\n  targetAlv: Alveolus,\n  product: Product,\n  alveoli: Alveolus[],\n  rack: Rack,\n  targetPickBinIndex?: number,\n  lengthUnit: any = "mm"\n)'
);

code = code.replace(
  'checkCollisions(activeAlv, selectedProductToPlace, alveoli, rack, activeAlv.isSubdivided ? selectedPickBinIndex : undefined)',
  'checkCollisions(activeAlv, selectedProductToPlace, alveoli, rack, activeAlv.isSubdivided ? selectedPickBinIndex : undefined, lengthUnit)'
);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', code);
