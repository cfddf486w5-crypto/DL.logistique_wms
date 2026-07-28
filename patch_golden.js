import fs from 'fs';
let code = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

// Add Activity to lucide-react imports
code = code.replace(
  "import { Plus, Trash2, Box, HelpCircle, AlertTriangle, ArrowUpDown, ShieldAlert, CheckCircle, Move } from 'lucide-react';",
  "import { Plus, Trash2, Box, HelpCircle, AlertTriangle, ArrowUpDown, ShieldAlert, CheckCircle, Move, Activity } from 'lucide-react';"
);

// Add showGoldenZone state
code = code.replace(
  "const [newLevelHeight, setNewLevelHeight] = useState<number>(1800);",
  "const [newLevelHeight, setNewLevelHeight] = useState<number>(1800);\n  const [showGoldenZone, setShowGoldenZone] = useState<boolean>(true);"
);

// Add the button
const buttonHtml = `          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button 
              onClick={() => setShowGoldenZone(!showGoldenZone)} 
              className={\`border p-1.5 rounded flex items-center gap-1.5 text-xs font-bold transition-colors \${showGoldenZone ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}\`} 
              title="Zone Ergonomique (Golden Zone)"
            >
              <Activity size={16} />
              <span className="hidden sm:inline">Golden Zone</span>
            </button>
            <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="bg-slate-800 border border-slate-700 text-slate-300 p-1.5 rounded hover:bg-slate-700" title="Recentrer">`;

code = code.replace(
  '          <div className="absolute top-4 right-4 z-10 flex gap-2">\n            <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="bg-slate-800 border border-slate-700 text-slate-300 p-1.5 rounded hover:bg-slate-700" title="Recentrer">',
  buttonHtml
);

// Add the SVG elements for the Golden Zone
const svgGoldenZone = `            {/* Grid floor representing warehouse floor */}
            {showGoldenZone && (
              <g style={{ pointerEvents: 'none' }}>
                {/* Back Plane */}
                <polygon
                  points={\`
                    \${baseX - 50},\${mmToY(1500)}
                    \${baseX + rackWidthPx + 50},\${mmToY(1500)}
                    \${baseX + rackWidthPx + 50},\${mmToY(600)}
                    \${baseX - 50},\${mmToY(600)}
                  \`}
                  fill="#10b981"
                  opacity="0.08"
                />
                {/* Side Depth */}
                <polygon
                  points={\`
                    \${baseX + rackWidthPx + 50},\${mmToY(1500)}
                    \${baseX + rackWidthPx + depthOffsetPx + 50},\${mmToY(1500) - rackDepthPx}
                    \${baseX + rackWidthPx + depthOffsetPx + 50},\${mmToY(600) - rackDepthPx}
                    \${baseX + rackWidthPx + 50},\${mmToY(600)}
                  \`}
                  fill="#059669"
                  opacity="0.12"
                />
                {/* Top face */}
                <polygon
                  points={\`
                    \${baseX - 50},\${mmToY(1500)}
                    \${baseX - 50 + depthOffsetPx},\${mmToY(1500) - rackDepthPx}
                    \${baseX + rackWidthPx + depthOffsetPx + 50},\${mmToY(1500) - rackDepthPx}
                    \${baseX + rackWidthPx + 50},\${mmToY(1500)}
                  \`}
                  fill="#34d399"
                  opacity="0.1"
                />
                {/* Bottom face */}
                <polygon
                  points={\`
                    \${baseX - 50},\${mmToY(600)}
                    \${baseX - 50 + depthOffsetPx},\${mmToY(600) - rackDepthPx}
                    \${baseX + rackWidthPx + depthOffsetPx + 50},\${mmToY(600) - rackDepthPx}
                    \${baseX + rackWidthPx + 50},\${mmToY(600)}
                  \`}
                  fill="#10b981"
                  opacity="0.1"
                />
                
                {/* Marker lines */}
                <line x1={baseX - 60} y1={mmToY(1500)} x2={baseX - 45} y2={mmToY(1500)} stroke="#10b981" strokeWidth="2" />
                <line x1={baseX - 60} y1={mmToY(600)} x2={baseX - 45} y2={mmToY(600)} stroke="#10b981" strokeWidth="2" />
                <line x1={baseX - 58} y1={mmToY(600)} x2={baseX - 58} y2={mmToY(1500)} stroke="#10b981" strokeWidth="1" strokeDasharray="4 2" />
                
                <text
                  x={baseX - 65}
                  y={mmToY(1050)}
                  fill="#10b981"
                  fontSize="12"
                  fontWeight="900"
                  className="font-display uppercase tracking-widest"
                  opacity="0.9"
                  transform={\`rotate(-90 \${baseX - 65} \${mmToY(1050)})\`}
                  textAnchor="middle"
                >
                  Golden Zone (TMS)
                </text>
              </g>
            )}`;

code = code.replace(
  '{/* Grid floor representing warehouse floor */}',
  svgGoldenZone
);

// We should also add a legend item for the Golden Zone
const legendHtml = `            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-violet-900/300 rounded-xs inline-block"></span>
              <span>Palette Chargée</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xs inline-block"></span>
              <span className="text-emerald-400 font-bold">Golden Zone</span>
            </div>`;

code = code.replace(
  `            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-violet-900/300 rounded-xs inline-block"></span>
              <span>Palette Chargée</span>
            </div>`,
  legendHtml
);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', code);
