import fs from 'fs';

let code = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

// 1. Add states
const stateInsert = `
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStart = React.useRef({x: 0, y: 0});

  const handleSvgWheel = (e: React.WheelEvent) => {
    // We can't preventDefault in React synthetic wheel if passive, but we can do it via a ref if needed.
    // For now, let's just adjust zoom.
    const zoomSensitivity = 0.002;
    const zoomDelta = -e.deltaY * zoomSensitivity;
    
    setZoom(prevZoom => {
      const newZoom = Math.min(Math.max(0.2, prevZoom + zoomDelta), 5);
      
      const svg = e.currentTarget as SVGSVGElement;
      if (svg) {
        const rect = svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const normX = mouseX / rect.width;
        const normY = mouseY / rect.height;
        
        setPan(prevPan => {
          const oldViewWidth = svgWidth / prevZoom;
          const oldViewHeight = svgHeight / prevZoom;
          const newViewWidth = svgWidth / newZoom;
          const newViewHeight = svgHeight / newZoom;
          
          return {
            x: prevPan.x + (oldViewWidth - newViewWidth) * normX,
            y: prevPan.y + (oldViewHeight - newViewHeight) * normY
          };
        });
      }
      return newZoom;
    });
  };

  const handleSvgMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on empty space or specifically wanting to drag
    if ((e.target as any).tagName === 'svg' || (e.target as any).tagName === 'polygon' || e.button === 1) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      // Mouse movement in screen pixels needs to be mapped to viewBox coordinates
      const svg = e.currentTarget as SVGSVGElement;
      const rect = svg.getBoundingClientRect();
      const viewRatioX = (svgWidth / zoom) / rect.width;
      const viewRatioY = (svgHeight / zoom) / rect.height;
      
      const dx = (e.clientX - panStart.current.x) * viewRatioX;
      const dy = (e.clientY - panStart.current.y) * viewRatioY;
      
      setPan(prev => ({ x: prev.x - dx, y: prev.y - dy }));
      panStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleSvgMouseUp = () => setIsPanning(false);
`;

const afterStateAnchor = `const [selectedProductToPlace, setSelectedProductToPlace] = useState<Product | null>(null);`;
code = code.replace(afterStateAnchor, afterStateAnchor + '\n' + stateInsert);

// 2. Compute LOD
const computeLod = `
  const effectiveScale = scale * zoom;
  let lodLevel: 'low' | 'medium' | 'high' = 'high';
  if (effectiveScale < 0.05) lodLevel = 'low';
  else if (effectiveScale < 0.1) lodLevel = 'medium';
`;
const afterScaleAnchor = `const rackDepthPx = rack.depthMm * scale * 0.6; // scaled slightly down for better 3D look`;
code = code.replace(afterScaleAnchor, afterScaleAnchor + '\n' + computeLod);

// 3. Update SVG viewBox and event handlers
const oldSvgTag = `<svg
            id="rack-3d-svg"
            viewBox={\`0 0 \${svgWidth} \${svgHeight}\`}
            className="w-full max-w-[660px] h-auto drop-shadow-2xl select-none"
          >`;

const newSvgTag = `
          {/* Controls for zoom reset */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="bg-slate-800 border border-slate-700 text-slate-300 p-1.5 rounded hover:bg-slate-700" title="Recentrer">
              <Move size={16} />
            </button>
          </div>
          <svg
            id="rack-3d-svg"
            viewBox={\`\${pan.x} \${pan.y} \${svgWidth / zoom} \${svgHeight / zoom}\`}
            className="w-full max-w-[660px] h-auto drop-shadow-2xl select-none cursor-grab active:cursor-grabbing"
            onWheel={handleSvgWheel}
            onMouseDown={handleSvgMouseDown}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onMouseLeave={handleSvgMouseUp}
          >`;
code = code.replace(oldSvgTag, newSvgTag);

// Also need to import Move from lucide-react if not imported
if (!code.includes('Move,')) {
  code = code.replace('import { Plus, Trash2, Box, HelpCircle, AlertTriangle, ArrowUpDown, ShieldAlert, CheckCircle } from \'lucide-react\';', 
    'import { Plus, Trash2, Box, HelpCircle, AlertTriangle, ArrowUpDown, ShieldAlert, CheckCircle, Move } from \'lucide-react\';');
}

// 4. Apply LOD
// Hide floor grids on low LOD
code = code.replace(
  `{/* Grid floor representing warehouse floor */}\n            <g opacity="0.3">`,
  `{/* Grid floor representing warehouse floor */}\n            <g opacity="0.3" style={{ display: lodLevel === 'low' ? 'none' : 'block' }}>`
);

// Hide human silhouette on low LOD
code = code.replace(
  `{/* HUMAN SILHOUETTE - 1.75m visual helper (drawn next to the rack) */}\n            <g transform={\`translate(\${baseX - 60}, \${baseY})\`} className="opacity-80">`,
  `{/* HUMAN SILHOUETTE - 1.75m visual helper (drawn next to the rack) */}\n            <g transform={\`translate(\${baseX - 60}, \${baseY})\`} className="opacity-80" style={{ display: lodLevel === 'low' ? 'none' : 'block' }}>`
);

// Hide back diagonal braces on medium/low LOD
code = code.replace(
  `{/* Back structural diagonal braces */}`,
  `{/* Back structural diagonal braces */}\n            {lodLevel === 'high' && (`
);
code = code.replace(
  `{/* 2. BACKGROUND BEAMS (Lisses arrière) */}`,
  `)}\n            {/* 2. BACKGROUND BEAMS (Lisses arrière) */}`
);

// Beams logic
// Back beams logic
code = code.replace(
  `{/* 2. BACKGROUND BEAMS (Lisses arrière) */}`,
  `{/* 2. BACKGROUND BEAMS (Lisses arrière) */}\n            {lodLevel !== 'low' && (`
);
code = code.replace(
  `{/* 3. FRONT STRUCTURAL FRAMES (Echelles Avant) */}`,
  `)}\n            {/* 3. FRONT STRUCTURAL FRAMES (Echelles Avant) */}`
);

// Front structural braces
code = code.replace(
  `{/* Front structural diagonal braces on columns (Left side Scale bracing details) */}\n            {Array.from({ length: 6 }).map((_, i) => {`,
  `{/* Front structural diagonal braces on columns (Left side Scale bracing details) */}\n            {lodLevel !== 'low' && Array.from({ length: 6 }).map((_, i) => {`
);

// Beams Gradient
code = code.replace(
  `fill={isCollidingBeam ? "#EF4444" : isSelectedBeam ? "#3B82F6" : "url(#orange-steel-gradient)"}`,
  `fill={isCollidingBeam ? "#EF4444" : isSelectedBeam ? "#3B82F6" : (lodLevel === 'low' ? "#C2410C" : "url(#orange-steel-gradient)")}`
);

// Beam Bolts
code = code.replace(
  `{/* Beams Bolt details on scale joints */}\n                  <circle cx={baseX + (rack.uprightWidthMm * scale) + 5} cy={y + height/2} r="1.5" fill="#E2E8F0" />`,
  `{/* Beams Bolt details on scale joints */}\n                  {lodLevel === 'high' && <circle cx={baseX + (rack.uprightWidthMm * scale) + 5} cy={y + height/2} r="1.5" fill="#E2E8F0" />}`
);
code = code.replace(
  `<circle cx={baseX + rackWidthPx - (rack.uprightWidthMm * scale) - 5} cy={y + height/2} r="1.5" fill="#E2E8F0" />`,
  `{lodLevel === 'high' && <circle cx={baseX + rackWidthPx - (rack.uprightWidthMm * scale) - 5} cy={y + height/2} r="1.5" fill="#E2E8F0" />}`
);

// Pick bin subdividers
code = code.replace(
  `{/* Pick Bin Subdividers */}`,
  `{/* Pick Bin Subdividers */}\n                            {lodLevel !== 'low' && (`
);
code = code.replace(
  `{/* Draw the product inside the bin if occupied */}`,
  `)}\n                            {/* Draw the product inside the bin if occupied */}`
);

// Small texts and badges inside products
code = code.replace(
  `<text x={bxFrontLeft + bWidthPx/2} y={byFrontBottom - bHeightPx/2} fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">{productToDraw.sku.substring(0,6)}</text>`,
  `{lodLevel === 'high' && <text x={bxFrontLeft + bWidthPx/2} y={byFrontBottom - bHeightPx/2} fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">{productToDraw.sku.substring(0,6)}</text>}`
);
code = code.replace(
  `<text x={bxFrontLeft + bWidthPx/2} y={byFrontBottom - bHeightPx/2 + 12} fill="#FFFFFF" fontSize="8" opacity="0.8" textAnchor="middle">{productToDraw.weight} lbs</text>`,
  `{lodLevel === 'high' && <text x={bxFrontLeft + bWidthPx/2} y={byFrontBottom - bHeightPx/2 + 12} fill="#FFFFFF" fontSize="8" opacity="0.8" textAnchor="middle">{productToDraw.weight} lbs</text>}`
);

// Empty slot labels
code = code.replace(
  `<text x={slotCenter} y={baseY - 10} fill="#94a3b8" fontSize="12" textAnchor="middle">{idx}</text>`,
  `{lodLevel !== 'low' && <text x={slotCenter} y={baseY - 10} fill="#94a3b8" fontSize="12" textAnchor="middle">{idx}</text>}`
);

// Level names on the side
code = code.replace(
  `<text x={baseX - 10} y={y + height/2 + 4} fill="#94a3b8" fontSize="12" textAnchor="end" className="font-mono">Niv {level.levelNumber}</text>`,
  `{lodLevel !== 'low' && <text x={baseX - 10} y={y + height/2 + 4} fill="#94a3b8" fontSize="12" textAnchor="end" className="font-mono">Niv {level.levelNumber}</text>}`
);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', code);
console.log("Patched LOD and zoom/pan");
