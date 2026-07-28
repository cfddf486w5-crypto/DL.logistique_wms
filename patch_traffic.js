import fs from 'fs';
let code = fs.readFileSync('src/components/DigitalTwinDashboard.tsx', 'utf-8');

const oldStartFlow = `
    const obstacles = shopMap.placedRacks.map(r => {
      const isH = r.rotation === 0 || r.rotation === 180;
      return {
        x: r.x,
        y: r.y,
        w: isH ? r.gridWidth : r.gridLength,
        h: isH ? r.gridLength : r.gridWidth
      };
    });
`;

const newStartFlow = `
    const obstacles = [
      ...shopMap.placedRacks.map(r => {
        const isH = r.rotation === 0 || r.rotation === 180;
        return {
          x: r.x,
          y: r.y,
          w: isH ? r.gridWidth : r.gridLength,
          h: isH ? r.gridLength : r.gridWidth
        };
      }),
      ...(shopMap.zones || [])
        .filter(z => ['office', 'emergency', 'damaged'].includes(z.type))
        .map(z => ({ x: z.x, y: z.y, w: z.width, h: z.length }))
    ];
`;

code = code.replace(oldStartFlow, newStartFlow);

// Let's also add an animated AGV on the flow path
const oldFlowSvg = `
            {/* Flow Simulation Layer */}
            {isFlowSimActive && flowSimPath.length > 0 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'translateZ(2px)', overflow: 'visible' }}>
                {/* Connection Lines */}
                <polyline 
                  points={flowSimPath.map(p => \`\${p.x * meterToPx},\${p.y * meterToPx}\`).join(' ')} 
                  fill="none" 
                  stroke="#8b5cf6" 
                  strokeWidth="4" 
                  strokeDasharray="12, 6" 
                  className="animate-[dash_20s_linear_infinite]"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.8))' }}
                />
                {/* Start Point */}
                <circle
                  cx={flowSimPath[0].x * meterToPx}
                  cy={flowSimPath[0].y * meterToPx}
                  r="6"
                  fill="#10b981"
                  stroke="#059669"
                  strokeWidth="2"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.8))' }}
                />
              </svg>
            )}
`;

const newFlowSvg = `
            {/* Flow Simulation Layer */}
            {isFlowSimActive && flowSimPath.length > 0 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'translateZ(2px)', overflow: 'visible' }}>
                {/* Connection Lines */}
                <polyline 
                  points={flowSimPath.map(p => \`\${p.x * meterToPx},\${p.y * meterToPx}\`).join(' ')} 
                  fill="none" 
                  stroke="#8b5cf6" 
                  strokeWidth="4" 
                  strokeDasharray="12, 6" 
                  className="animate-[dash_20s_linear_infinite]"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.8))' }}
                />
                {/* Start Point */}
                <circle
                  cx={flowSimPath[0].x * meterToPx}
                  cy={flowSimPath[0].y * meterToPx}
                  r="6"
                  fill="#10b981"
                  stroke="#059669"
                  strokeWidth="2"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.8))' }}
                />
                {/* End Point */}
                <circle
                  cx={flowSimPath[flowSimPath.length-1].x * meterToPx}
                  cy={flowSimPath[flowSimPath.length-1].y * meterToPx}
                  r="6"
                  fill="#f43f5e"
                  stroke="#be123c"
                  strokeWidth="2"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(244,63,94,0.8))' }}
                />
                
                {/* Animated Forklift on Path */}
                <circle
                  cx={flowSimPath[Math.floor(simProgress * (flowSimPath.length - 1))].x * meterToPx}
                  cy={flowSimPath[Math.floor(simProgress * (flowSimPath.length - 1))].y * meterToPx}
                  r="8"
                  fill="#fbbf24"
                  stroke="#b45309"
                  strokeWidth="3"
                  style={{ filter: 'drop-shadow(0 0 15px rgba(251,191,36,1))' }}
                />
              </svg>
            )}
`;

code = code.replace(oldFlowSvg, newFlowSvg);

// Rename Module to exact request
const oldUiTitle = `<span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1.5"><Truck size={12}/> SIMULATION FLUX</span>`;
const newUiTitle = `<span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1.5"><Truck size={12}/> SIMULATION DE FLUX DE TRAFIC</span>`;
code = code.replace(oldUiTitle, newUiTitle);

fs.writeFileSync('src/components/DigitalTwinDashboard.tsx', code);
console.log("Traffic sim module updated.");
