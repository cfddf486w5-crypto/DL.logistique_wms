import fs from 'fs';
let code = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

const anchor = `  // Compute actual volume of stored items (based on custom dimensions of placed items)`;

const cgLogic = `  // Calculate Dynamic Center of Gravity (CG)
  const cgResult = React.useMemo(() => {
    let totalMass = 0;
    let sumMx = 0;
    let sumMy = 0;
    let sumMz = 0;

    alveoli.forEach(alv => {
      const currentSlotsCount = getSlotsCountForLevel(rack, alv.levelIndex);
      const slotWidthMm = (rack.totalWidthMm - 2 * rack.uprightWidthMm) / currentSlotsCount;
      const subdivCount = alv.isSubdivided ? (alv.subdivisionCount || 1) : 1;
      const binWidth = slotWidthMm / subdivCount;

      const level = alv.levelIndex === 0 ? null : rack.levels.find(l => l.levelNumber === alv.levelIndex);
      const baseY = level ? level.heightFromGroundMm + level.beamThicknessMm : 0;
      
      const processProduct = (prod: Product, binIdx: number) => {
        const mass = prod.weight || 0;
        if (mass === 0) return;
        
        const pHeight = prod.heightMm || 1200;
        const pDepth = prod.depthMm || 800;
        
        // X position (center of the specific bin)
        const slotStartX = rack.uprightWidthMm + alv.binIndex * slotWidthMm;
        const binStartX = slotStartX + binIdx * binWidth;
        const centerX = binStartX + binWidth / 2;
        
        // Y position (center of mass of the product)
        const centerY = baseY + pHeight / 2;
        
        // Z position (assume aligned to front if depth is smaller, or centered)
        // Let's assume centered for now
        const centerZ = rack.depthMm / 2;

        totalMass += mass;
        sumMx += mass * centerX;
        sumMy += mass * centerY;
        sumMz += mass * centerZ;
      };

      if (alv.isSubdivided && alv.pickBins) {
        alv.pickBins.forEach((pb, idx) => {
          if (pb.occupied && pb.product) {
            processProduct(pb.product, idx);
          }
        });
      } else if (alv.occupied && alv.product) {
        processProduct(alv.product, 0);
      }
    });

    if (totalMass === 0) {
      return { totalMass: 0, x: rack.totalWidthMm / 2, y: 0, z: rack.depthMm / 2, isBalancedX: true, isBalancedY: true };
    }

    const cgX = sumMx / totalMass;
    const cgY = sumMy / totalMass;
    const cgZ = sumMz / totalMass;

    // Evaluate balance
    const rackCenterX = rack.totalWidthMm / 2;
    // Allow 15% deviation from center
    const maxDeviationX = rack.totalWidthMm * 0.15;
    const isBalancedX = Math.abs(cgX - rackCenterX) <= maxDeviationX;

    // For Y, we generally want CG to be below the middle height of the rack for stability
    const isBalancedY = cgY <= rack.totalHeightMm * 0.6; // 60% of total height

    return {
      totalMass,
      x: cgX,
      y: cgY,
      z: cgZ,
      isBalancedX,
      isBalancedY,
      rackCenterX
    };
  }, [alveoli, rack]);

`;

code = code.replace(anchor, cgLogic + anchor);

// Add visual indicator of CG on the rack
const svgEndAnchor = `            {/* 3. FRONT STRUCTURAL FRAMES (Echelles Avant) */}`;

const cgMarker = `
            {/* Center of Gravity (CG) Marker */}
            {cgResult.totalMass > 0 && lodLevel !== 'low' && (
              <g className="transition-all duration-700 ease-out" transform={\`translate(\${baseX + cgResult.x * scale}, \${baseY - cgResult.y * scale})\`}>
                <circle cx="0" cy="0" r="12" fill={(!cgResult.isBalancedX || !cgResult.isBalancedY) ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)"} className="animate-ping" />
                <circle cx="0" cy="0" r="6" fill={(!cgResult.isBalancedX || !cgResult.isBalancedY) ? "#EF4444" : "#10B981"} stroke="#FFFFFF" strokeWidth="2" />
                <path d="M-6,0 L6,0 M0,-6 L0,6" stroke="#FFFFFF" strokeWidth="1" />
                <text x="10" y="-10" fill={(!cgResult.isBalancedX || !cgResult.isBalancedY) ? "#EF4444" : "#10B981"} fontSize="10" fontWeight="bold" className="drop-shadow-md">CG</text>
              </g>
            )}
`;

code = code.replace(svgEndAnchor, cgMarker + svgEndAnchor);

// Also add a UI panel/warning below the 3D rack to explain the CG
const uiAnchor = `          {/* Ergonomics Analysis */}`;

const cgUI = `
          {/* Dynamic CG Panel */}
          {cgResult.totalMass > 0 && (
            <div className={\`mt-4 rounded-xl border p-4 shadow-sm \${(!cgResult.isBalancedX || !cgResult.isBalancedY) ? 'bg-rose-900/20 border-rose-800/50' : 'bg-emerald-900/20 border-emerald-800/50'}\`}>
              <div className="flex items-start gap-3">
                <div className={\`p-2 rounded-lg shrink-0 \${(!cgResult.isBalancedX || !cgResult.isBalancedY) ? 'bg-rose-900/50 text-rose-500' : 'bg-emerald-900/50 text-emerald-500'}\`}>
                  <Target size={20} />
                </div>
                <div className="flex-1">
                  <h3 className={\`text-sm font-bold \${(!cgResult.isBalancedX || !cgResult.isBalancedY) ? 'text-rose-400' : 'text-emerald-400'}\`}>
                    Analyse du Centre de Gravité (CG)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 mb-3">
                    Masse totale en charge : <strong className="text-slate-200">{cgResult.totalMass.toLocaleString()} lbs</strong>
                  </p>
                  
                  <div className="space-y-3">
                    {/* X Balance */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Équilibre Latéral (Gauche/Droite)</span>
                        <span className={cgResult.isBalancedX ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                          {cgResult.isBalancedX ? 'Conforme' : 'Déséquilibré'}
                        </span>
                      </div>
                      <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-500 z-10 -translate-x-1/2"></div>
                        <div 
                          className={\`absolute top-0 bottom-0 \${cgResult.isBalancedX ? 'bg-emerald-500' : 'bg-rose-500'}\`} 
                          style={{ 
                            left: \`\${Math.min(Math.max((cgResult.x / rack.totalWidthMm) * 100, 0), 100)}%\`,
                            width: '4px',
                            transform: 'translateX(-50%)',
                            borderRadius: '2px'
                          }}
                        ></div>
                      </div>
                      {!cgResult.isBalancedX && (
                        <p className="text-[10px] text-rose-500/80 mt-1 italic">
                          Déviation majeure détectée. Risque de torsion des longerons.
                        </p>
                      )}
                    </div>

                    {/* Y Balance */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Stabilité Verticale (Haut/Bas)</span>
                        <span className={cgResult.isBalancedY ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                          {cgResult.isBalancedY ? 'Conforme' : 'Risque de renversement'}
                        </span>
                      </div>
                      <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 to-rose-500 opacity-20 w-full"></div>
                        <div 
                          className={\`absolute top-0 bottom-0 \${cgResult.isBalancedY ? 'bg-emerald-500' : 'bg-rose-500'}\`} 
                          style={{ 
                            left: \`\${Math.min(Math.max((cgResult.y / rack.totalHeightMm) * 100, 0), 100)}%\`,
                            width: '4px',
                            transform: 'translateX(-50%)',
                            borderRadius: '2px'
                          }}
                        ></div>
                      </div>
                      {!cgResult.isBalancedY && (
                        <p className="text-[10px] text-rose-500/80 mt-1 italic">
                          Charges lourdes trop hautes. Placez les palettes lourdes au sol (Règle des 15kg+).
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

`;

code = code.replace(uiAnchor, cgUI + uiAnchor);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', code);
console.log("Patched CG in RackVisualizer3D");
