import fs from 'fs';
let code = fs.readFileSync('src/components/ShopFloorMap.tsx', 'utf-8');

const oldSnap = `    if (snapToGrid) {
      targetX = Math.round(targetX / gridSize) * gridSize;
      targetY = Math.round(targetY / gridSize) * gridSize;
      
      // Snap to adjacent racks
      const snapThreshold = 0.5; // meters
      let bestDx = Infinity;
      let bestDy = Infinity;
      
      shopMap.placedRacks.forEach(r => {
        if (r.id === selectedPlacedId) return;
        
        // Check X axis snap (align left/right edges or center)
        const dx = Math.abs(r.x - targetX);
        if (dx < snapThreshold && dx < Math.abs(bestDx)) {
          bestDx = r.x - targetX;
        }
        
        // Check Y axis snap
        const dy = Math.abs(r.y - targetY);
        if (dy < snapThreshold && dy < Math.abs(bestDy)) {
          bestDy = r.y - targetY;
        }
      });
      
      if (Math.abs(bestDx) < snapThreshold) targetX += bestDx;
      if (Math.abs(bestDy) < snapThreshold) targetY += bestDy;
    }`;
    
const newSnap = `    if (snapToGrid) {
      // First, grid snap
      targetX = Math.round(targetX / gridSize) * gridSize;
      targetY = Math.round(targetY / gridSize) * gridSize;
      
      // Advanced snap to adjacent racks (edges and centers)
      const snapThreshold = 0.4; // meters
      let bestDx = Infinity;
      let bestDy = Infinity;
      
      const sWidth = selectedRack.gridWidth;
      const sLength = selectedRack.gridLength;
      
      shopMap.placedRacks.forEach(r => {
        if (r.id === selectedPlacedId) return;
        
        const rWidth = r.gridWidth;
        const rLength = r.gridLength;
        
        // X-axis snap points for selected: left(targetX), right(targetX + sWidth), center(targetX + sWidth/2)
        // X-axis snap points for target: left(r.x), right(r.x + rWidth), center(r.x + rWidth/2)
        const xSnaps = [
          { from: targetX, to: r.x },
          { from: targetX, to: r.x + rWidth },
          { from: targetX + sWidth, to: r.x },
          { from: targetX + sWidth, to: r.x + rWidth },
          { from: targetX + sWidth / 2, to: r.x + rWidth / 2 }
        ];
        
        xSnaps.forEach(snap => {
          const dx = snap.to - snap.from;
          if (Math.abs(dx) < snapThreshold && Math.abs(dx) < Math.abs(bestDx)) {
            bestDx = dx;
          }
        });
        
        // Y-axis snap points
        const ySnaps = [
          { from: targetY, to: r.y },
          { from: targetY, to: r.y + rLength },
          { from: targetY + sLength, to: r.y },
          { from: targetY + sLength, to: r.y + rLength },
          { from: targetY + sLength / 2, to: r.y + rLength / 2 }
        ];
        
        ySnaps.forEach(snap => {
          const dy = snap.to - snap.from;
          if (Math.abs(dy) < snapThreshold && Math.abs(dy) < Math.abs(bestDy)) {
            bestDy = dy;
          }
        });
      });
      
      // We apply the best snap delta if within threshold
      if (Math.abs(bestDx) < snapThreshold) {
        targetX += bestDx;
      }
      if (Math.abs(bestDy) < snapThreshold) {
        targetY += bestDy;
      }
    }`;

code = code.replace(oldSnap, newSnap);

// Let's add visual snap guides if they don't exist
if (!code.includes('snapLines')) {
  const oldState = `const [isDraggingLabel, setIsDraggingLabel] = useState<boolean>(false);`;
  const newState = `const [isDraggingLabel, setIsDraggingLabel] = useState<boolean>(false);\n  const [snapLines, setSnapLines] = useState<{x: number | null, y: number | null}>({x: null, y: null});`;
  code = code.replace(oldState, newState);
  
  // Need to update snapLines in mouse move
  const oldApplySnap = `      // We apply the best snap delta if within threshold
      if (Math.abs(bestDx) < snapThreshold) {
        targetX += bestDx;
      }
      if (Math.abs(bestDy) < snapThreshold) {
        targetY += bestDy;
      }`;
      
  const newApplySnap = `      // We apply the best snap delta if within threshold
      let newSnapX = null;
      let newSnapY = null;
      if (Math.abs(bestDx) < snapThreshold) {
        targetX += bestDx;
        newSnapX = targetX;
      }
      if (Math.abs(bestDy) < snapThreshold) {
        targetY += bestDy;
        newSnapY = targetY;
      }
      setSnapLines({x: newSnapX, y: newSnapY});`;
  code = code.replace(oldApplySnap, newApplySnap);
  
  // Need to clear snapLines on mouseUp
  code = code.replace(
    'const handleMapMouseUp = () => {\n    setIsDragging(false);\n    setIsDraggingLabel(false);',
    'const handleMapMouseUp = () => {\n    setIsDragging(false);\n    setIsDraggingLabel(false);\n    setSnapLines({x: null, y: null});'
  );
  
  // Add SVG lines for snapLines in the render
  const customSvg = `{/* Custom SVG grid alignment lines */}`;
  const snapSvg = `{snapLines.x !== null && (
              <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-cyan-500 z-40 pointer-events-none transition-all" style={{ left: \`\${snapLines.x * meterToPx}px\` }} />
            )}
            {snapLines.y !== null && (
              <div className="absolute left-0 right-0 border-t-2 border-dashed border-cyan-500 z-40 pointer-events-none transition-all" style={{ top: \`\${snapLines.y * meterToPx}px\` }} />
            )}`;
  code = code.replace(customSvg, snapSvg + '\n\n            ' + customSvg);
}

fs.writeFileSync('src/components/ShopFloorMap.tsx', code);
console.log("Snap functionality optimized");
