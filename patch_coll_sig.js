import fs from 'fs';
let code = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

code = code.replace(
  'export const checkCollisions = (\n  targetAlv: Alveolus,\n  prod: Product,\n  allAlveoli: Alveolus[],\n  rack: Rack,\n  targetPickBinIndex?: number\n): CollisionResult => {',
  'export const checkCollisions = (\n  targetAlv: Alveolus,\n  prod: Product,\n  allAlveoli: Alveolus[],\n  rack: Rack,\n  targetPickBinIndex?: number,\n  lengthUnit: any = "mm"\n): CollisionResult => {'
);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', code);
