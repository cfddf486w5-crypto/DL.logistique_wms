import fs from 'fs';
let code = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

code = code.replace(
  "prod.rotationClass === 'A' ? 'bg-emerald-900/50 text-emerald-200' :",
  "prod.rotationClass === 'A' ? 'bg-cyan-900/50 text-cyan-200 border border-cyan-500/30' :"
);
code = code.replace(
  "prod.rotationClass === 'B' ? 'bg-amber-900/50 text-amber-800' :",
  "prod.rotationClass === 'B' ? 'bg-violet-900/50 text-violet-300 border border-violet-500/30' :"
);
code = code.replace(
  "'bg-rose-900/50 text-rose-800'",
  "'bg-rose-900/30 text-rose-400 border border-rose-500/30'"
);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', code);
console.log("Visualizer rotation classes patched");
