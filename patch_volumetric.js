import fs from 'fs';
let code = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

const targetStr = `{isRendering && (
            <div className="absolute top-4 left-4 z-10 bg-slate-800/80 backdrop-blur-sm border border-slate-700 text-sky-400 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg">
              <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
              Chargement 3D ({Math.round((renderedChunkIndex / (rack.levels.length + 1)) * 100)}%)
            </div>
          )}`;

const replacementStr = `<div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            {isRendering && (
              <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 text-sky-400 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg">
                <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                Chargement 3D ({Math.round((renderedChunkIndex / (rack.levels.length + 1)) * 100)}%)
              </div>
            )}
            
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 p-3 rounded-lg shadow-xl w-[210px] pointer-events-none">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Occupation Vol.</span>
                <span className={\`text-xs font-black \${volumetricOccupancyRate > 90 ? 'text-rose-500' : volumetricOccupancyRate > 75 ? 'text-amber-500' : 'text-emerald-400'}\`}>
                  {volumetricOccupancyRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                <div 
                  className={\`h-full \${volumetricOccupancyRate > 90 ? 'bg-rose-500' : volumetricOccupancyRate > 75 ? 'bg-amber-500' : 'bg-emerald-500'}\`}
                  style={{ width: \`\${Math.min(100, volumetricOccupancyRate)}%\` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 font-medium">
                <span>{formatVolume(totalStoredVolumeLiters, volumeUnit, 1)}</span>
                <span>/ {formatVolume(totalVolumeLiters, volumeUnit, 1)}</span>
              </div>
            </div>
          </div>`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/RackVisualizer3D.tsx', code);
