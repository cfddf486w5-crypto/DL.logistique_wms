import React, { useState } from 'react';
import { ShopMap, PlacedRack, Rack, Alveolus, getSlotsCountForLevel } from '../types';
import defaultBackgroundImg from '../assets/images/warehouse_layout_bg_1783739522503.jpg';
import { Search, Percent, Flame, X, Package, Maximize, Target } from 'lucide-react';



const getTotalSlotsForRack = (rack: Rack) => {
  let total = getSlotsCountForLevel(rack, 0);
  rack.levels.forEach((l: any, idx: number) => {
    total += getSlotsCountForLevel(rack, idx + 1);
  });
  return total;
};

interface FullScreenMapProps {
  shopMap: ShopMap;
  rackTemplates: Rack[];
  alveoliStateByRack: Record<string, Alveolus[]>;
  onClose: () => void;
}

export default function FullScreenMap({
  shopMap,
  rackTemplates,
  alveoliStateByRack,
  onClose
}: FullScreenMapProps) {
  const [mapOverlayMode, setMapOverlayMode] = useState<'standard' | 'occupancy' | 'velocity'>('standard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPopupRackId, setSelectedPopupRackId] = useState<string | null>(null);

  const meterToPx = shopMap.gridScalePx;
  const totalMapWidthPx = shopMap.widthMeters * meterToPx;
  const totalMapLengthPx = shopMap.lengthMeters * meterToPx;

  // Zoom and Pan states
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.1;
    const newScale = e.deltaY > 0 ? Math.max(0.2, scale - zoomFactor) : Math.min(3, scale + zoomFactor);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan on background, not on racks
    if ((e.target as HTMLElement).closest('.rack-element') || (e.target as HTMLElement).closest('.popup-bubble')) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const selectedRack = shopMap.placedRacks.find(r => r.id === selectedPopupRackId);
  const selectedTemplate = selectedRack ? rackTemplates.find(t => t.id === selectedRack.rackTemplateId) : null;
  const selectedAlveoli = selectedRack ? alveoliStateByRack[selectedRack.id] : null;

  // Search logic
  const doesRackMatchSearch = (rack: PlacedRack) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (rack.customLabel && rack.customLabel.toLowerCase().includes(q)) return true;
    const rackAlvs = alveoliStateByRack[rack.id];
    if (!rackAlvs) return false;
    
    return rackAlvs.some(alv => {
      if (alv.isSubdivided && alv.pickBins) {
        return alv.pickBins.some(bin => {
          if (bin.occupied && bin.product) {
            return bin.product.name.toLowerCase().includes(q) || bin.product.sku.toLowerCase().includes(q);
          }
          return false;
        });
      } else if (alv.occupied && alv.product) {
        return alv.product.name.toLowerCase().includes(q) || alv.product.sku.toLowerCase().includes(q);
      }
      return false;
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col overflow-hidden font-sans">
      {/* Header Toolbar */}
      <div className="bg-slate-800/90 backdrop-blur border-b border-slate-700 p-4 flex items-center justify-between text-white shadow-xl shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Maximize className="text-sky-400" /> Map Interactive 2D
          </h2>
          
          <div className="h-6 w-px bg-slate-700 mx-2"></div>
          
          {/* Overlay Modes */}
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setMapOverlayMode('standard')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                mapOverlayMode === 'standard' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setMapOverlayMode('occupancy')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                mapOverlayMode === 'occupancy' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Percent size={12} /> Occup.
            </button>
            <button
              onClick={() => setMapOverlayMode('velocity')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                mapOverlayMode === 'velocity' ? 'bg-amber-900/300 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Flame size={12} /> Vélocité
            </button>
          </div>
          
          {/* Search Input */}
          <div className="relative ml-4">
            <input
              type="text"
              placeholder="Rechercher produit/allée..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 w-64 placeholder-slate-500"
            />
            <Search className="absolute left-2.5 top-2 text-slate-500" size={14} />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1.5 text-slate-500 hover:text-white cursor-pointer">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="p-2 bg-slate-700 hover:bg-rose-600 hover:text-white text-slate-300 rounded-lg transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Map Area */}
      <div 
        className="flex-1 overflow-hidden relative bg-slate-950 cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="absolute transform-gpu origin-center"
          style={{ 
            width: `${totalMapWidthPx}px`, 
            height: `${totalMapLengthPx}px`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            left: `calc(50% - ${totalMapWidthPx / 2}px)`,
            top: `calc(50% - ${totalMapLengthPx / 2}px)`,
          }}
        >
          {/* Background Image */}
          {shopMap.backgroundUrl && (
            <div 
              className="absolute inset-0 pointer-events-none opacity-50 mix-blend-lighten"
              style={{
                backgroundImage: `url(${shopMap.backgroundUrl})`,
                backgroundSize: `${shopMap.backgroundScale}%`,
                backgroundPosition: `${shopMap.backgroundOffsetX}px ${shopMap.backgroundOffsetY}px`,
                backgroundRepeat: 'no-repeat',
                filter: 'invert(1) hue-rotate(180deg) brightness(0.7) contrast(1.2)'
              }}
            />
          )}

          {/* Zones */}
          {shopMap.zones?.map((zone) => (
             <div
               key={zone.id}
               className="absolute border-2 pointer-events-none z-10 flex items-center justify-center opacity-30"
               style={{
                 left: `${zone.x * meterToPx}px`,
                 top: `${zone.y * meterToPx}px`,
                 width: `${zone.width * meterToPx}px`,
                 height: `${zone.length * meterToPx}px`,
                 borderColor: zone.color,
                 backgroundColor: `${zone.color}20`, // 20 hex is ~12% opacity
               }}
             >
               <span className="text-[10px] font-bold px-2 py-1 bg-black/50 text-white rounded whitespace-nowrap">
                 {zone.label}
               </span>
             </div>
          ))}

          {/* Racks */}
          {shopMap.placedRacks.map((rack) => {
            const isMatchedBySearch = doesRackMatchSearch(rack);
            const isSelected = rack.id === selectedPopupRackId;
            const template = rackTemplates.find((t) => t.id === rack.rackTemplateId);
            
            const widthPx = rack.gridWidth * meterToPx;
            const lengthPx = rack.gridLength * meterToPx;
            const leftPx = rack.x * meterToPx;
            const topPx = rack.y * meterToPx;
            
            const specificAlveoli = alveoliStateByRack[rack.id];
            const totalSlots = template ? getTotalSlotsForRack(template) : 0;
            const occupied = specificAlveoli ? specificAlveoli.filter((a) => a.occupied).length : 0;
            const localOccupancy = totalSlots > 0 ? (occupied / totalSlots) * 100 : 0;

            let overlayColorClass = '';
            if (mapOverlayMode === 'standard') {
              overlayColorClass = isSelected
                ? rack.color === 'orange'
                  ? 'border-amber-500/50 bg-amber-900/300 ring-4 ring-amber-500/40 z-30 text-amber-950 shadow-xl'
                  : 'border-sky-400 bg-cyan-900/300 ring-4 ring-sky-500/40 z-30 text-sky-950 shadow-xl'
                : rack.color === 'orange'
                  ? 'border-amber-500/80 bg-amber-600/90 hover:bg-amber-900/300 z-20 text-white'
                  : 'border-blue-500/80 bg-blue-600/90 hover:bg-blue-900/300 z-20 text-white';
            } else if (mapOverlayMode === 'occupancy') {
              if (localOccupancy === 0) {
                overlayColorClass = isSelected
                  ? 'border-slate-700 bg-slate-400 ring-4 ring-slate-400/40 z-30 text-slate-100'
                  : 'border-slate-600 bg-slate-700/90 hover:bg-slate-600 z-20 text-slate-300';
              } else if (localOccupancy <= 40) {
                overlayColorClass = isSelected
                  ? 'border-emerald-400 bg-emerald-900/300 ring-4 ring-emerald-500/40 z-30 text-emerald-950'
                  : 'border-emerald-500/80 bg-emerald-600/90 hover:bg-emerald-900/300 z-20 text-white';
              } else if (localOccupancy <= 80) {
                overlayColorClass = isSelected
                  ? 'border-amber-500/50 bg-amber-900/300 ring-4 ring-amber-500/40 z-30 text-amber-950'
                  : 'border-amber-500/80 bg-amber-600/90 hover:bg-amber-900/300 z-20 text-white';
              } else {
                overlayColorClass = isSelected
                  ? 'border-rose-400 bg-rose-900/300 ring-4 ring-rose-500/40 z-30 text-rose-950'
                  : 'border-rose-500/80 bg-rose-600/90 hover:bg-rose-900/300 z-20 text-white';
              }
            } else if (mapOverlayMode === 'velocity') {
              let highVolCount = 0;
              let medVolCount = 0;
              let lowVolCount = 0;

              if (specificAlveoli) {
                specificAlveoli.forEach(alv => {
                  if (alv.isSubdivided && alv.pickBins) {
                    alv.pickBins.forEach(bin => {
                      if (bin.product?.rotationClass === 'A') highVolCount++;
                      else if (bin.product?.rotationClass === 'B') medVolCount++;
                      else if (bin.product?.rotationClass === 'C') lowVolCount++;
                    });
                  } else if (alv.product) {
                    if (alv.product.rotationClass === 'A') highVolCount++;
                    else if (alv.product.rotationClass === 'B') medVolCount++;
                    else if (alv.product.rotationClass === 'C') lowVolCount++;
                  }
                });
              }

              const totalClasses = highVolCount + medVolCount + lowVolCount;
              let dominantClass = 'none';
              if (totalClasses > 0) {
                if (highVolCount >= medVolCount && highVolCount >= lowVolCount) dominantClass = 'A';
                else if (medVolCount >= highVolCount && medVolCount >= lowVolCount) dominantClass = 'B';
                else dominantClass = 'C';
              }

              if (dominantClass === 'A') {
                overlayColorClass = isSelected
                  ? 'border-emerald-400 bg-emerald-900/300 ring-4 ring-emerald-500/40 z-30 text-emerald-950'
                  : 'border-emerald-500/80 bg-emerald-600/90 hover:bg-emerald-900/300 z-20 text-white';
              } else if (dominantClass === 'B') {
                overlayColorClass = isSelected
                  ? 'border-amber-500/50 bg-amber-900/300 ring-4 ring-amber-500/40 z-30 text-amber-950'
                  : 'border-amber-500/80 bg-amber-600/90 hover:bg-amber-900/300 z-20 text-white';
              } else if (dominantClass === 'C') {
                overlayColorClass = isSelected
                  ? 'border-rose-400 bg-rose-900/300 ring-4 ring-rose-500/40 z-30 text-rose-950'
                  : 'border-rose-500/80 bg-rose-600/90 hover:bg-rose-900/300 z-20 text-white';
              } else {
                overlayColorClass = isSelected
                  ? 'border-slate-400 bg-slate-800/500 ring-4 ring-slate-500/40 z-30 text-slate-100'
                  : 'border-slate-600 bg-slate-700/90 hover:bg-slate-600 z-20 text-slate-300';
              }
            }

            return (
              <div
                key={rack.id}
                className={`rack-element absolute border-2 flex items-center justify-center text-[10px] cursor-pointer transition-all ${overlayColorClass} ${
                  searchQuery && !isMatchedBySearch ? 'opacity-10 grayscale pointer-events-none' : 'opacity-100'
                }`}
                style={{
                  width: `${widthPx}px`,
                  height: `${lengthPx}px`,
                  left: `${leftPx}px`,
                  top: `${topPx}px`,
                  transform: `rotate(${rack.rotation}deg)`,
                  transformOrigin: 'center center',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPopupRackId(rack.id);
                }}
              >
                <div className="text-center w-full px-0.5 leading-tight overflow-hidden">
                  <div className="font-bold truncate">{rack.customLabel}</div>
                </div>

                {/* Popup Bubble */}
                {isSelected && selectedTemplate && (
                  <div 
                    className="popup-bubble absolute left-1/2 -top-4 -translate-x-1/2 -translate-y-full w-80 bg-slate-800 text-white p-4 rounded-xl shadow-2xl border border-slate-600 z-50 cursor-auto"
                    style={{
                      transform: `rotate(${-rack.rotation}deg) translate(-50%, -100%)`,
                      transformOrigin: 'bottom center'
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between mb-3 border-b border-slate-700 pb-2">
                      <div>
                        <h4 className="font-bold text-lg text-sky-400">{rack.customLabel}</h4>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <Target size={12} /> {selectedTemplate.name}
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedPopupRackId(null)}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                      {selectedAlveoli && selectedAlveoli.length > 0 ? (
                        selectedAlveoli.map(alv => {
                          if (alv.isSubdivided && alv.pickBins) {
                            return alv.pickBins.map(bin => {
                              if (bin.occupied && bin.product) {
                                return (
                                  <div key={bin.id} className="bg-slate-900 rounded border border-slate-700 p-2 flex gap-2 items-center">
                                    <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: bin.product.color }}></div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-bold truncate text-slate-200">{bin.product.name}</div>
                                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                        <Package size={10} /> {alv.label} - {bin.label}
                                      </div>
                                    </div>
                                    {bin.product.rotationClass && (
                                      <div className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                        Cl.{bin.product.rotationClass}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            });
                          } else if (alv.occupied && alv.product) {
                            return (
                              <div key={alv.id} className="bg-slate-900 rounded border border-slate-700 p-2 flex gap-2 items-center">
                                <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: alv.product.color }}></div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-bold truncate text-slate-200">{alv.product.name}</div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Package size={10} /> {alv.label}
                                  </div>
                                </div>
                                {alv.product.rotationClass && (
                                  <div className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                    Cl.{alv.product.rotationClass}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })
                      ) : (
                        <div className="text-xs text-slate-500 italic text-center py-4">
                          Rack vide.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
