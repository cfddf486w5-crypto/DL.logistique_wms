import fs from 'fs';
let code = fs.readFileSync('src/components/ShopFloorMap.tsx', 'utf-8');

// Container
code = code.replace(
  'className="bg-slate-800/50 relative border-4 border-slate-700 rounded-lg shadow-2xl overflow-hidden select-none transition-all duration-300"',
  'className="bg-[#04060a] relative border border-slate-700 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden select-none transition-all duration-300 ring-1 ring-white/5"'
);

// SVG Grid
code = code.replace(
  '<svg className="absolute inset-0 w-full h-full pointer-events-none opacity-15">',
  '<svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">'
);
code = code.replace(
  'stroke="#64748B" strokeWidth="0.5"',
  'stroke="#1e293b" strokeWidth="1"'
);
code = code.replace(
  'stroke="#94A3B8" strokeWidth="1"',
  'stroke="#0891b2" strokeWidth="0.5" strokeOpacity="0.4"'
);

// Zones
code = code.replace(
  /border-cyan-400 bg-cyan-900\/40 shadow-\[0_0_15px_rgba\(34,211,238,0\.3\)\] z-20/g,
  'border-cyan-400 bg-cyan-900/20 shadow-[0_0_20px_rgba(34,211,238,0.2)] z-20'
);
code = code.replace(
  /border-slate-600 bg-slate-800\/30 hover:border-slate-500 z-10/g,
  'border-slate-700 bg-slate-800/20 hover:border-slate-600 z-10'
);
code = code.replace(
  /text-slate-300 uppercase tracking-widest font-black/g,
  'text-slate-400 uppercase tracking-widest font-black opacity-50'
);

// Overlay Colors
const oldOverlay = `              let overlayColorClass = '';
              if (mapOverlayMode === 'standard') {
                overlayColorClass = isSelected
                  ? rack.color === 'orange'
                    ? 'border-amber-500 bg-amber-600/95 ring-4 ring-amber-500/25 shadow-amber-500/20 z-30 text-amber-50'
                    : 'border-blue-500 bg-blue-600/90 ring-4 ring-blue-500/25 shadow-blue-500/20 z-30 text-blue-50'
                  : rack.color === 'orange'
                    ? 'border-amber-500/50 bg-amber-950/80 hover:bg-amber-950/95 z-20 text-amber-150 font-medium'
                    : 'border-blue-400/40 bg-slate-800/90 hover:bg-slate-800 z-20';`;

const newOverlay = `              let overlayColorClass = '';
              if (mapOverlayMode === 'standard') {
                overlayColorClass = isSelected
                  ? rack.color === 'orange'
                    ? 'border-amber-400 bg-amber-900/90 ring-4 ring-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.4)] z-30 text-amber-50'
                    : 'border-cyan-400 bg-cyan-900/90 ring-4 ring-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.4)] z-30 text-cyan-50'
                  : rack.color === 'orange'
                    ? 'border-amber-700/80 bg-amber-950/70 hover:bg-amber-900/80 z-20 text-amber-400 shadow-md'
                    : 'border-cyan-800/80 bg-[#082f49]/70 hover:bg-[#0c4a6e]/90 z-20 text-cyan-400 shadow-md';`;

if(code.includes('border-amber-500 bg-amber-600/95 ring-4 ring-amber-500/25 shadow-amber-500/20 z-30 text-amber-50')) {
  code = code.replace(oldOverlay, newOverlay);
}

// Occupancy mini slots
code = code.replace(
  /bg-rose-900\/300/g,
  'bg-rose-500/80'
);
code = code.replace(
  /bg-amber-900\/300/g,
  'bg-amber-500/80'
);
code = code.replace(
  /bg-emerald-900\/300/g,
  'bg-emerald-500/80'
);
code = code.replace(
  /border-\[0\.5px\] border-white\/20/g,
  'border-[0.5px] border-black/40'
);

fs.writeFileSync('src/components/ShopFloorMap.tsx', code);
console.log("Map visual patched");
