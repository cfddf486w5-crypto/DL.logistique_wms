import fs from 'fs';
let code = fs.readFileSync('src/components/ShopFloorMap.tsx', 'utf-8');

const oldVelocity = `                if (dominantClass === 'A') {
                  overlayColorClass = isSelected
                    ? 'border-emerald-500 bg-emerald-600/95 ring-4 ring-emerald-500/25 shadow-emerald-500/20 z-30 text-emerald-50'
                    : 'border-emerald-500/50 bg-emerald-950/85 hover:bg-emerald-950 z-20 text-emerald-300';
                } else if (dominantClass === 'B') {
                  overlayColorClass = isSelected
                    ? 'border-amber-500 bg-amber-600/95 ring-4 ring-amber-500/25 shadow-amber-500/20 z-30 text-amber-50'
                    : 'border-amber-500/50 bg-amber-950/85 hover:bg-amber-950 z-20 text-amber-300';
                } else if (dominantClass === 'C') {
                  overlayColorClass = isSelected
                    ? 'border-rose-500 bg-rose-700/90 ring-4 ring-rose-500/25 shadow-rose-500/20 z-30 text-rose-50'
                    : 'border-rose-500/40 bg-rose-950/85 hover:bg-rose-950 z-20 text-rose-300';
                } else if (dominantClass === 'none') {`;

const newVelocity = `                if (dominantClass === 'A') {
                  overlayColorClass = isSelected
                    ? 'border-cyan-400 bg-cyan-900/90 ring-4 ring-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.5)] z-30 text-cyan-50'
                    : 'border-cyan-500/70 bg-[#083344]/80 hover:bg-cyan-950/90 z-20 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)]';
                } else if (dominantClass === 'B') {
                  overlayColorClass = isSelected
                    ? 'border-violet-400 bg-violet-900/90 ring-4 ring-violet-400/30 shadow-[0_0_15px_rgba(167,139,250,0.5)] z-30 text-violet-50'
                    : 'border-violet-500/70 bg-violet-950/80 hover:bg-violet-900/90 z-20 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.15)]';
                } else if (dominantClass === 'C') {
                  overlayColorClass = isSelected
                    ? 'border-rose-400 bg-rose-900/90 ring-4 ring-rose-400/30 shadow-[0_0_15px_rgba(251,113,133,0.5)] z-30 text-rose-50'
                    : 'border-rose-500/70 bg-rose-950/80 hover:bg-rose-900/90 z-20 text-rose-300 shadow-[0_0_10px_rgba(225,29,72,0.15)]';
                } else if (dominantClass === 'none') {`;

if (code.includes('border-emerald-500 bg-emerald-600/95 ring-4 ring-emerald-500/25')) {
  code = code.replace(oldVelocity, newVelocity);
  fs.writeFileSync('src/components/ShopFloorMap.tsx', code);
  console.log("Velocity colors patched!");
} else {
  console.log("Failed to find velocity replacement block.");
}
