import fs from 'fs';
let code = fs.readFileSync('src/components/ShopFloorMap.tsx', 'utf-8');

const oldOverlay = `              let overlayColorClass = '';
              if (mapOverlayMode === 'standard') {
                overlayColorClass = isSelected
                  ? rack.color === 'orange'
                    ? 'border-amber-400 bg-amber-900/90 ring-4 ring-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.4)] z-30 text-amber-50'
                    : 'border-cyan-400 bg-cyan-900/90 ring-4 ring-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.4)] z-30 text-cyan-50'
                  : rack.color === 'orange'
                    ? 'border-amber-700/80 bg-amber-950/70 hover:bg-amber-900/80 z-20 text-amber-400 shadow-md'
                    : 'border-cyan-800/80 bg-[#082f49]/70 hover:bg-[#0c4a6e]/90 z-20 text-cyan-400 shadow-md';`;

const newOverlay = `              let overlayColorClass = '';
              if (mapOverlayMode === 'standard') {
                overlayColorClass = isSelected
                  ? rack.color === 'orange'
                    ? 'border-amber-400 bg-amber-900/90 ring-4 ring-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.4)_inset,0_0_15px_rgba(245,158,11,0.6)] z-30 text-amber-50'
                    : 'border-cyan-400 bg-cyan-900/90 ring-4 ring-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.4)_inset,0_0_15px_rgba(6,182,212,0.6)] z-30 text-cyan-50'
                  : rack.color === 'orange'
                    ? 'border-amber-700/80 bg-gradient-to-br from-amber-900/40 to-amber-950/90 hover:from-amber-800/50 hover:to-amber-950/95 z-20 text-amber-400 shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_rgba(255,255,255,0.1)]'
                    : 'border-cyan-700/80 bg-gradient-to-br from-cyan-900/40 to-[#082f49]/90 hover:from-cyan-800/50 hover:to-[#082f49]/95 z-20 text-cyan-400 shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_rgba(255,255,255,0.1)]';`;

code = code.replace(oldOverlay, newOverlay);
fs.writeFileSync('src/components/ShopFloorMap.tsx', code);
console.log("Racks patched");
