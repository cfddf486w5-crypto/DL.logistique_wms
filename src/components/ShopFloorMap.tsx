/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ShopMap, PlacedRack, Rack, Alveolus, ShopZone, AisleLabel, getSlotsCountForLevel } from '../types';
import defaultBackgroundImg from '../assets/images/warehouse_layout_bg_1783739522503.jpg';
import { 

  Plus, Trash2, RotateCw, Move, HelpCircle, LayoutGrid, Check, Settings, Compass, Info, Copy,
  Search, Percent, Navigation, Sparkles, AlertTriangle, TrendingUp, Flame, Type, Undo2, Redo2
} from 'lucide-react';

const getTotalSlotsForRack = (rack: Rack) => {
  let total = getSlotsCountForLevel(rack, 0);
  rack.levels.forEach((l: any, idx: number) => {
    total += getSlotsCountForLevel(rack, idx + 1);
  });
  return total;
};

interface ShopFloorMapProps {
  shopMap: ShopMap;
  onChangeShopMap: (updatedMap: ShopMap) => void;
  rackTemplates: Rack[];
  onSelectRackFor3D: (templateId: string, placedRackId?: string) => void;
  alveoliStateByRack: Record<string, Alveolus[]>; // placedRackId -> Alveolus[]
  onDuplicatePlacedRack: (placedId: string) => string;
  onBatchDuplicatePlacedRack: (placedId: string, count: number, direction: 'horizontal' | 'vertical', spacing: number) => string;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export default function ShopFloorMap({
  shopMap,
  onChangeShopMap,
  rackTemplates,
  onSelectRackFor3D,
  alveoliStateByRack,
  onDuplicatePlacedRack,
  onBatchDuplicatePlacedRack,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ShopFloorMapProps) {
  const [selectedPlacedId, setSelectedPlacedId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(rackTemplates[0]?.id || '');
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [gridSize, setGridSize] = useState<number>(0.5); // meters
  
  // Zones states
  const [isPlacingLabel, setIsPlacingLabel] = useState(false);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [newZoneType, setNewZoneType] = useState<ShopZone['type']>('reception');
  const [newZoneLabel, setNewZoneLabel] = useState('Zone de Réception');
  const [drawingStart, setDrawingStart] = useState<{ x: number, y: number } | null>(null);
  const [drawingEnd, setDrawingEnd] = useState<{ x: number, y: number } | null>(null);
  
  // Advanced optimization states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mapOverlayMode, setMapOverlayMode] = useState<'standard' | 'occupancy' | 'velocity'>('standard');
  const [selectedPickRacks, setSelectedPickRacks] = useState<string[]>([]);
  const [hoveredCoords, setHoveredCoords] = useState<{ x: number; y: number } | null>(null);
  const [startingPoint, setStartingPoint] = useState<'reception' | 'offices'>('reception');
  
  // Batch placement states
  const [batchMode, setBatchMode] = useState<boolean>(false);
  const [batchCount, setBatchCount] = useState<number>(5);
  const [batchDirection, setBatchDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [batchSpacing, setBatchSpacing] = useState<number>(0.5);

  // Dragging states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isDraggingLabel, setIsDraggingLabel] = useState<boolean>(false);
  const [snapLines, setSnapLines] = useState<{x: number | null, y: number | null}>({x: null, y: null});
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartCoords = useRef({ x: 0, y: 0 });
  
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const meterToPx = shopMap.gridScalePx; // standard pixels per meter, e.g. 16px = 1m


  const getRackBounds = (rack: PlacedRack) => {
    const isHorizontal = rack.rotation === 0 || rack.rotation === 180;
    const w = isHorizontal ? rack.gridWidth : rack.gridLength;
    const h = isHorizontal ? rack.gridLength : rack.gridWidth;
    const cx = rack.x + rack.gridWidth / 2;
    const cy = rack.y + rack.gridLength / 2;
    return { left: cx - w / 2, right: cx + w / 2, top: cy - h / 2, bottom: cy + h / 2, isHorizontal };
  };

  const isSpacingViolation = (rack: PlacedRack) => {
    const b1 = getRackBounds(rack);
    for (const other of shopMap.placedRacks) {
      if (other.id === rack.id) continue;
      const b2 = getRackBounds(other);
      if (b1.isHorizontal === b2.isHorizontal) {
        if (b1.isHorizontal) {
          const overlapX = Math.min(b1.right, b2.right) - Math.max(b1.left, b2.left);
          if (overlapX > 0) {
            const distY = Math.max(b1.top, b2.top) - Math.min(b1.bottom, b2.bottom);
            if (distY >= 0 && distY < 3.0) return true;
          }
        } else {
          const overlapY = Math.min(b1.bottom, b2.bottom) - Math.max(b1.top, b2.top);
          if (overlapY > 0) {
            const distX = Math.max(b1.left, b2.left) - Math.min(b1.right, b2.right);
            if (distX >= 0 && distX < 3.0) return true;
          }
        }
      }
    }
    return false;
  };

  const totalMapWidthPx = shopMap.widthMeters * meterToPx;
  const totalMapLengthPx = shopMap.lengthMeters * meterToPx;

  // Add a new rack to the map
  const handlePlaceRack = () => {
    const template = rackTemplates.find((r) => r.id === selectedTemplateId);
    if (!template) return;

    // Find a free-ish spot near the center of the viewport
    let startX = Math.round(shopMap.widthMeters / 3);
    let startY = Math.round(shopMap.lengthMeters / 3);
    
    const count = batchMode ? batchCount : 1;
    const newPlaced: PlacedRack[] = [];

    for (let i = 0; i < count; i++) {
      const rackWidth = template.totalWidthMm / 1000;
      const rackLength = template.depthMm / 1000;
      
      const r: PlacedRack = {
        id: `placed-${Date.now()}-${i}`,
        rackTemplateId: template.id,
        customLabel: `RACK-${template.binsPerLevel}P-${shopMap.placedRacks.length + i + 1}`,
        x: startX,
        y: startY,
        rotation: 0,
        gridWidth: rackWidth,
        gridLength: rackLength,
      };
      
      newPlaced.push(r);
      
      if (batchMode) {
        if (batchDirection === 'horizontal') {
          startX += rackWidth + batchSpacing;
        } else {
          startY += rackLength + batchSpacing;
        }
      }
    }

    onChangeShopMap({
      ...shopMap,
      placedRacks: [...shopMap.placedRacks, ...newPlaced],
    });
    setSelectedPlacedId(newPlaced[0].id);
  };

  // Delete placed rack
  const handleDeletePlaced = (id: string) => {
    onChangeShopMap({
      ...shopMap,
      placedRacks: shopMap.placedRacks.filter((r) => r.id !== id),
    });
    if (selectedPlacedId === id) {
      setSelectedPlacedId(null);
    }
  };

  // Rotate selected rack
  const handleRotate = (id: string) => {
    const updated = shopMap.placedRacks.map((r) => {
      if (r.id === id) {
        const nextRotation: (0 | 90 | 180 | 270) = 
          r.rotation === 0 ? 90 : 
          r.rotation === 90 ? 180 : 
          r.rotation === 180 ? 270 : 0;
        return {
          ...r,
          rotation: nextRotation,
        };
      }
      return r;
    });

    onChangeShopMap({
      ...shopMap,
      placedRacks: updated,
    });
  };

  // Move selected rack programmatically (safe micro-adjustments)
  const handleMoveStep = (direction: 'up' | 'down' | 'left' | 'right', amount: number = 0.5) => {
    if (!selectedPlacedId) return;

    const updated = shopMap.placedRacks.map((r) => {
      if (r.id === selectedPlacedId) {
        let newX = r.x;
        let newY = r.y;

        if (direction === 'left') newX -= amount;
        if (direction === 'right') newX += amount;
        if (direction === 'up') newY -= amount;
        if (direction === 'down') newY += amount;

        // Map boundary check
        newX = Math.max(0, Math.min(shopMap.widthMeters - r.gridWidth, newX));
        newY = Math.max(0, Math.min(shopMap.lengthMeters - r.gridLength, newY));

        return { ...r, x: newX, y: newY };
      }
      return r;
    });

    onChangeShopMap({
      ...shopMap,
      placedRacks: updated,
    });
  };

  // Inline inputs change coordinates
  const handleCoordChange = (field: 'x' | 'y', value: number) => {
    if (!selectedPlacedId) return;
    const updated = shopMap.placedRacks.map((r) => {
      if (r.id === selectedPlacedId) {
        let newVal = value;
        if (snapToGrid) {
          newVal = Math.round(value / gridSize) * gridSize;
        }
        return {
          ...r,
          [field]: Math.max(0, newVal),
        };
      }
      return r;
    });
    onChangeShopMap({ ...shopMap, placedRacks: updated });
  };

  // Map mouse interaction (click-select and drag modeling)

  const handleLabelMouseDown = (e: React.MouseEvent, label: AisleLabel) => {
    e.stopPropagation();
    setSelectedLabelId(label.id);
    setSelectedPlacedId(null);
    setSelectedZoneId(null);
    setIsDraggingLabel(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartCoords.current = { x: label.x, y: label.y };
  };

  const handleMapMouseDown = (e: React.MouseEvent, rack: PlacedRack) => {
    e.stopPropagation();
    setSelectedPlacedId(rack.id);
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartCoords.current = { x: rack.x, y: rack.y };
  };

  const handleMapMouseMove = (e: React.MouseEvent) => {
    if (isDraggingLabel && selectedLabelId) {
      const dxPx = e.clientX - dragStartPos.current.x;
      const dyPx = e.clientY - dragStartPos.current.y;
      const dxMeters = dxPx / meterToPx;
      const dyMeters = dyPx / meterToPx;
      let targetX = dragStartCoords.current.x + dxMeters;
      let targetY = dragStartCoords.current.y + dyMeters;
      if (snapToGrid) {
        targetX = Math.round(targetX / gridSize) * gridSize;
        targetY = Math.round(targetY / gridSize) * gridSize;
      }
      const updated = (shopMap.aisleLabels || []).map((l) => {
        if (l.id === selectedLabelId) {
          return { ...l, x: targetX, y: targetY };
        }
        return l;
      });
      onChangeShopMap({ ...shopMap, aisleLabels: updated });
      return;
    }

    if (!isDragging || !selectedPlacedId) return;


    const dxPx = e.clientX - dragStartPos.current.x;
    const dyPx = e.clientY - dragStartPos.current.y;

    // Convert pixel offset to meters
    const dxMeters = dxPx / meterToPx;
    const dyMeters = dyPx / meterToPx;

    let targetX = dragStartCoords.current.x + dxMeters;
    let targetY = dragStartCoords.current.y + dyMeters;
    const selectedRack = shopMap.placedRacks.find(r => r.id === selectedPlacedId);
    if (!selectedRack) return;

    if (snapToGrid) {
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
      let newSnapX: number | null = null;
      let newSnapY: number | null = null;
      if (Math.abs(bestDx) < snapThreshold) {
        targetX += bestDx;
        newSnapX = targetX;
      }
      if (Math.abs(bestDy) < snapThreshold) {
        targetY += bestDy;
        newSnapY = targetY;
      }
      setSnapLines({x: newSnapX, y: newSnapY});
    }
    if (selectedRack) {
      // Boundaries
      targetX = Math.max(0, Math.min(shopMap.widthMeters - selectedRack.gridWidth, targetX));
      targetY = Math.max(0, Math.min(shopMap.lengthMeters - selectedRack.gridLength, targetY));

      const updated = shopMap.placedRacks.map((r) => {
        if (r.id === selectedPlacedId) {
          return {
            ...r,
            x: targetX,
            y: targetY,
          };
        }
        return r;
      });

      onChangeShopMap({
        ...shopMap,
        placedRacks: updated,
      });
    }
  };

  const handleMapMouseUp = () => {
    setIsDragging(false);
    setIsDraggingLabel(false);
    setSnapLines({x: null, y: null});
  };

  useEffect(() => {
    if (isDragging || isDraggingLabel) {
      window.addEventListener('mouseup', handleMapMouseUp);
    }
    

  return () => {
      window.removeEventListener('mouseup', handleMapMouseUp);
    };
  }, [isDragging, isDraggingLabel]);

  // Real-time hover coordinate tracking on map
  const getMouseMeters = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!mapContainerRef.current) return { x: 0, y: 0 };
    const rect = mapContainerRef.current.getBoundingClientRect();
    let xMeters = (e.clientX - rect.left) / meterToPx;
    let yMeters = (e.clientY - rect.top) / meterToPx;
    
    if (snapToGrid) {
      xMeters = Math.round(xMeters / gridSize) * gridSize;
      yMeters = Math.round(yMeters / gridSize) * gridSize;
    }
    
    return {
      x: Math.max(0, Math.min(shopMap.widthMeters, xMeters)),
      y: Math.max(0, Math.min(shopMap.lengthMeters, yMeters)),
    };
  };

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getMouseMeters(e);
    setHoveredCoords(coords);
    if (isDrawingZone && drawingStart) {
      setDrawingEnd(coords);
    }
  };

  const handleContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDrawingZone) {
      e.stopPropagation();
      const coords = getMouseMeters(e);
      setDrawingStart(coords);
      setDrawingEnd(coords);
    } else if (isPlacingLabel) {
      e.stopPropagation();
      const coords = getMouseMeters(e);
      const newLabel = {
        id: `label-${Date.now()}`,
        text: 'Nouvelle Allée',
        x: coords.x,
        y: coords.y,
        rotation: 0,
        fontSize: 24
      };
      onChangeShopMap({
        ...shopMap,
        aisleLabels: [...(shopMap.aisleLabels || []), newLabel]
      });
      setSelectedLabelId(newLabel.id);
      setSelectedPlacedId(null);
      setSelectedZoneId(null);
      setIsPlacingLabel(false);
    } else {
      // Deselect all
      setSelectedPlacedId(null);
      setSelectedZoneId(null);
      setSelectedLabelId(null);
    }
  };

  const handleContainerMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDrawingZone && drawingStart && drawingEnd) {
      const minX = Math.min(drawingStart.x, drawingEnd.x);
      const maxX = Math.max(drawingStart.x, drawingEnd.x);
      const minY = Math.min(drawingStart.y, drawingEnd.y);
      const maxY = Math.max(drawingStart.y, drawingEnd.y);
      
      const width = maxX - minX;
      const length = maxY - minY;
      
      if (width > 0.5 && length > 0.5) { // minimum size
        let color = '#94a3b8'; // gray
        switch (newZoneType) {
          case 'reception': color = '#3b82f6'; break; // blue
          case 'shipping': color = '#eab308'; break; // yellow
          case 'storage': color = '#10b981'; break; // emerald green
          case 'damaged': color = '#9f1239'; break; // dark red / rose-800
          case 'aisle': color = '#64748b'; break; // slate
          case 'office': color = '#8b5cf6'; break; // purple
          case 'emergency': color = '#ef4444'; break; // red
        }
        
        const newZone: ShopZone = {
          id: `zone-${Date.now()}`,
          type: newZoneType,
          label: newZoneLabel,
          x: minX,
          y: minY,
          width,
          length,
          color,
        };
        
        onChangeShopMap({
          ...shopMap,
          zones: [...(shopMap.zones || []), newZone],
        });
      }
      
      setIsDrawingZone(false);
      setDrawingStart(null);
      setDrawingEnd(null);
    }
  };

  const handleContainerMouseLeave = () => {
    setHoveredCoords(null);
  };

  // Search filter matching
  const doesRackMatchSearch = (rack: PlacedRack): boolean => {
    if (!searchQuery) return false;
    const normalizedQuery = searchQuery.toLowerCase().trim();
    if (rack.customLabel.toLowerCase().includes(normalizedQuery)) return true;
    
    const template = rackTemplates.find(t => t.id === rack.rackTemplateId);
    if (template && template.name.toLowerCase().includes(normalizedQuery)) return true;
    
    const specificAlveoli = alveoliStateByRack[rack.id];
    if (specificAlveoli) {
      return specificAlveoli.some(a => 
        a.occupied && a.product && (
          a.product.name.toLowerCase().includes(normalizedQuery) ||
          (a.product.sku && a.product.sku.toLowerCase().includes(normalizedQuery)) ||
          (a.product.type && a.product.type.toLowerCase().includes(normalizedQuery))
        )
      );
    }
    return false;
  };

  // Picking Route Math (Traveling Salesperson heuristic)
  const startX = startingPoint === 'reception' ? shopMap.widthMeters * 0.27 : shopMap.widthMeters - 4;
  const startY = startingPoint === 'reception' ? shopMap.lengthMeters - 2 : 2;

  const getOptimizedRoute = () => {
    const points = shopMap.placedRacks
      .filter(r => selectedPickRacks.includes(r.id))
      .map(r => ({
        id: r.id,
        label: r.customLabel,
        x: r.x + r.gridWidth / 2,
        y: r.y + r.gridLength / 2
      }));

    const route = [];
    let currentX = startX;
    let currentY = startY;
    const remaining = [...points];

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = Math.sqrt(Math.pow(remaining[i].x - currentX, 2) + Math.pow(remaining[i].y - currentY, 2));
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }
      const next = remaining.splice(nearestIdx, 1)[0];
      route.push(next);
      currentX = next.x;
      currentY = next.y;
    }
    return route;
  };

  const optimizedRoutePoints = getOptimizedRoute();

  // Calculate route metrics
  const calculateRouteDistance = () => {
    if (optimizedRoutePoints.length === 0) return 0;
    let totalDist = 0;
    let currentX = startX;
    let currentY = startY;

    optimizedRoutePoints.forEach((p) => {
      totalDist += Math.sqrt(Math.pow(p.x - currentX, 2) + Math.pow(p.y - currentY, 2));
      currentX = p.x;
      currentY = p.y;
    });

    // Add distance to return back to start/depot
    totalDist += Math.sqrt(Math.pow(startX - currentX, 2) + Math.pow(startY - currentY, 2));
    return totalDist;
  };

  const routeDistance = calculateRouteDistance();
  const estimatedWalkingTimeSec = routeDistance / 1.1; // 1.1 m/s standard walking speed
  const estimatedPickTimeSec = estimatedWalkingTimeSec + (optimizedRoutePoints.length * 30); // 30s per rack to find & pick item

  // Selected rack detailed parameters
  const activePlaced = shopMap.placedRacks.find((r) => r.id === selectedPlacedId);
  const activeTemplate = activePlaced 
    ? rackTemplates.find((t) => t.id === activePlaced.rackTemplateId)
    : null;

  // Calculate Map Statistics
  const totalRacks = shopMap.placedRacks.length;
  const mapAreaSqMeters = shopMap.widthMeters * shopMap.lengthMeters;
  
  // Rack footprint calculation
  const totalRackFootprint = shopMap.placedRacks.reduce((sum, r) => {
    const area = r.gridWidth * r.gridLength;
    return sum + area;
  }, 0);

  const footprintPercentage = (totalRackFootprint / mapAreaSqMeters) * 100;

  // Sum of all slots placed in the entire workshop map
  let globalTotalSlots = 0;
  let globalOccupiedSlots = 0;

  shopMap.placedRacks.forEach((pr) => {
    const template = rackTemplates.find((t) => t.id === pr.rackTemplateId);
    if (template) {
      const templateSlotsCount = getTotalSlotsForRack(template); // including ground
      globalTotalSlots += templateSlotsCount;

      const specificAlveoli = alveoliStateByRack[pr.id];
      if (specificAlveoli) {
        globalOccupiedSlots += specificAlveoli.filter((a) => a.occupied).length;
      }
    }
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 2D Interactive Blueprint Grid Map */}
      <div className="lg:col-span-9 frosted-glass rounded-xl shadow-lg overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="border-b border-slate-700 bg-slate-800/50/50 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2 font-display">
              <LayoutGrid size={16} className="text-cyan-400" />
              Implantation 2D au Sol & Circulation Logistique
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Glissez les racks ou utilisez les coordonnées. Organisez les allées d'entreposage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Undo/Redo */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
                  canUndo ? 'text-slate-300 hover:bg-slate-800 hover:shadow-xs cursor-pointer' : 'text-slate-300 cursor-not-allowed'
                }`}
                title="Annuler (Ctrl+Z)"
              >
                <Undo2 size={12} />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
                  canRedo ? 'text-slate-300 hover:bg-slate-800 hover:shadow-xs cursor-pointer' : 'text-slate-300 cursor-not-allowed'
                }`}
                title="Rétablir (Ctrl+Y)"
              >
                <Redo2 size={12} />
              </button>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher produit/allée..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-600 w-44"
              />
              <Search className="absolute left-2.5 top-2 text-slate-500" size={13} />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1 text-slate-400 hover:text-white text-sm"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Overlay Mode Selector */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => setMapOverlayMode('standard')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  mapOverlayMode === 'standard' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-100'
                }`}
                title="Allée standard"
              >
                Normal
              </button>
              <button
                onClick={() => setMapOverlayMode('occupancy')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  mapOverlayMode === 'occupancy' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-100'
                }`}
                title="Taux d'occupation en temps réel"
              >
                <Percent size={10} /> Occup.
              </button>
              <button
                onClick={() => setMapOverlayMode('velocity')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  mapOverlayMode === 'velocity' ? 'bg-amber-500/80 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-100'
                }`}
                title="Vitesse de rotation / Pickings chauds"
              >
                <Flame size={10} /> Vélocité
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 border border-slate-700 rounded-lg">
              <input
                id="checkbox-snap-grid"
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
                className="rounded text-cyan-400 focus:ring-cyan-500/20 bg-slate-800 border-slate-700"
              />
              <label htmlFor="checkbox-snap-grid" className="font-semibold text-slate-300 select-none cursor-pointer">
                Aimantation ({gridSize}m)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Dimensions:</span>
              <input
                id="input-shop-width"
                type="number"
                min="10"
                max="120"
                value={shopMap.widthMeters}
                onChange={(e) => onChangeShopMap({ ...shopMap, widthMeters: parseInt(e.target.value) || 30 })}
                className="w-12 px-1.5 py-0.5 border border-slate-700 rounded text-center text-xs font-semibold bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-slate-400 font-bold">×</span>
              <input
                id="input-shop-length"
                type="number"
                min="10"
                max="120"
                value={shopMap.lengthMeters}
                onChange={(e) => onChangeShopMap({ ...shopMap, lengthMeters: parseInt(e.target.value) || 20 })}
                className="w-12 px-1.5 py-0.5 border border-slate-700 rounded text-center text-xs font-semibold bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-slate-500 font-mono font-semibold">m</span>
            </div>
          </div>
        </div>

        {/* Dynamic Blueprint Floor */}
        <div className="flex-1 bg-slate-800/50 p-4 overflow-auto min-h-[520px] flex items-center justify-center relative">
          
          {/* Coordinates Legend Indicator */}
          {hoveredCoords && (
            <div className="absolute top-4 left-4 z-10 bg-slate-800/95 border border-slate-700 px-2.5 py-1 rounded-md text-[10px] font-mono text-slate-300 shadow-md flex items-center gap-2 pointer-events-none">
              <Compass size={12} className="text-cyan-400" />
              <span>Pointeur : <strong className="text-slate-100">X: {hoveredCoords.x.toFixed(2)}m</strong>, <strong className="text-slate-100">Y: {hoveredCoords.y.toFixed(2)}m</strong></span>
            </div>
          )}

          <div
            id="blueprint-container"
            ref={mapContainerRef}
            onMouseDown={handleContainerMouseDown}
            onMouseUp={handleContainerMouseUp}
            onMouseMove={(e) => {
              handleMapMouseMove(e);
              handleContainerMouseMove(e);
            }}
            onMouseLeave={handleContainerMouseLeave}
            style={{
              width: `${totalMapWidthPx}px`,
              height: `${totalMapLengthPx}px`,
            }}
            className="bg-[#04060a] relative border border-slate-700 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden select-none transition-all duration-300 ring-1 ring-white/5"
          >
            {/* Real Background Blueprint image (Trace layout) */}
            {shopMap.backgroundUrl && (
              <img
                src={shopMap.backgroundUrl}
                alt="Plan d'implantation réel"
                style={{
                  position: 'absolute',
                  left: `${(shopMap.backgroundOffsetX || 0) * meterToPx}px`,
                  top: `${(shopMap.backgroundOffsetY || 0) * meterToPx}px`,
                  width: `${((shopMap.backgroundScale || 100) / 100) * totalMapWidthPx}px`,
                  height: 'auto',
                  opacity: (shopMap.backgroundOpacity !== undefined ? shopMap.backgroundOpacity : 50) / 100,
                  filter: 'invert(1) hue-rotate(180deg) brightness(0.7) contrast(1.2)',
                  mixBlendMode: 'lighten',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
                className="transition-all duration-150"
              />
            )}

            {snapLines.x !== null && (
              <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-cyan-500 z-40 pointer-events-none transition-all" style={{ left: `${snapLines.x * meterToPx}px` }} />
            )}
            {snapLines.y !== null && (
              <div className="absolute left-0 right-0 border-t-2 border-dashed border-cyan-500 z-40 pointer-events-none transition-all" style={{ top: `${snapLines.y * meterToPx}px` }} />
            )}

            {/* Custom SVG grid alignment lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
              <defs>
                <pattern id="smallGrid" width={meterToPx * gridSize} height={meterToPx * gridSize} patternUnits="userSpaceOnUse">
                  <path d={`M ${meterToPx * gridSize} 0 L 0 0 0 ${meterToPx * gridSize}`} fill="none" stroke="#1e293b" strokeWidth="1" />
                </pattern>
                <pattern id="grid" width={meterToPx * 5} height={meterToPx * 5} patternUnits="userSpaceOnUse">
                  <rect width={meterToPx * 5} height={meterToPx * 5} fill="url(#smallGrid)" />
                  <path d={`M ${meterToPx * 5} 0 L 0 0 0 ${meterToPx * 5}`} fill="none" stroke="#0891b2" strokeWidth="0.5" strokeOpacity="0.4" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            
            
          {selectedLabelId && (
            <div 
              className="absolute z-50 bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-4 w-64 space-y-3"
              style={{
                left: Math.min((shopMap.aisleLabels?.find(l => l.id === selectedLabelId)?.x || 0) * meterToPx + 20, totalMapWidthPx - 260),
                top: Math.min((shopMap.aisleLabels?.find(l => l.id === selectedLabelId)?.y || 0) * meterToPx + 20, totalMapLengthPx - 200),
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2"><Type size={14} className="text-violet-400"/> Éditer l'étiquette</span>
                <button
                  onClick={() => {
                    onChangeShopMap({
                      ...shopMap,
                      aisleLabels: (shopMap.aisleLabels || []).filter(l => l.id !== selectedLabelId)
                    });
                    setSelectedLabelId(null);
                  }}
                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-rose-900/30 rounded-md transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Texte</label>
                <input
                  type="text"
                  value={shopMap.aisleLabels?.find(l => l.id === selectedLabelId)?.text || ''}
                  onChange={(e) => {
                    const updated = (shopMap.aisleLabels || []).map(l => 
                      l.id === selectedLabelId ? { ...l, text: e.target.value } : l
                    );
                    onChangeShopMap({ ...shopMap, aisleLabels: updated });
                  }}
                  className="w-full px-2 py-1.5 text-xs rounded border border-slate-700 bg-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Taille de police</label>
                  <input
                    type="number"
                    value={shopMap.aisleLabels?.find(l => l.id === selectedLabelId)?.fontSize || 24}
                    onChange={(e) => {
                      const updated = (shopMap.aisleLabels || []).map(l => 
                        l.id === selectedLabelId ? { ...l, fontSize: Number(e.target.value) } : l
                      );
                      onChangeShopMap({ ...shopMap, aisleLabels: updated });
                    }}
                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-700 bg-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Orientation</label>
                  <select
                    value={shopMap.aisleLabels?.find(l => l.id === selectedLabelId)?.rotation || 0}
                    onChange={(e) => {
                      const updated = (shopMap.aisleLabels || []).map(l => 
                        l.id === selectedLabelId ? { ...l, rotation: Number(e.target.value) } : l
                      );
                      onChangeShopMap({ ...shopMap, aisleLabels: updated });
                    }}
                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-700 bg-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="0">0°</option>
                    <option value="90">90°</option>
                    <option value="180">180°</option>
                    <option value="270">270°</option>
                  </select>
                </div>
              </div>
            </div>
          )}
\n            {/* Text Labels rendering */}
            {shopMap.aisleLabels?.map((label) => {
              const isSelected = selectedLabelId === label.id;
              return (
                <div
                  key={label.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLabelId(label.id);
                    setSelectedPlacedId(null);
                    setSelectedZoneId(null);
                  }}
                  onMouseDown={(e) => handleLabelMouseDown(e, label)}
                  className={`absolute font-display cursor-grab whitespace-nowrap overflow-visible ${isDraggingLabel && isSelected ? 'cursor-grabbing' : ''}`}
                  style={{
                    left: `${label.x * meterToPx}px`,
                    top: `${label.y * meterToPx}px`,
                    transform: `translate(-50%, -50%) rotate(${label.rotation}deg)`,
                    fontSize: `${label.fontSize}px`,
                    color: isSelected ? '#0284c7' : '#334155',
                    textShadow: '0 0 2px white, 0 0 2px white',
                    zIndex: 25,
                    border: isSelected ? '2px dashed #0ea5e9' : 'none',
                    padding: '4px',
                    pointerEvents: 'auto'
                  }}
                >
                  {label.text}
                </div>
              );
            })}

            {/* Zones rendering */}
            {shopMap.zones?.map((zone) => {
              const isSelected = selectedZoneId === zone.id;
              return (
                <div
                  key={zone.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedZoneId(zone.id);
                    setSelectedPlacedId(null);
                  }}
                  className="absolute cursor-pointer transition-all duration-200 shadow-sm overflow-hidden"
                  style={{
                    left: `${zone.x * meterToPx}px`,
                    top: `${zone.y * meterToPx}px`,
                    width: `${zone.width * meterToPx}px`,
                    height: `${zone.length * meterToPx}px`,
                    backgroundColor: `${zone.color}33`, // 20% opacity
                    borderColor: isSelected ? '#1e293b' : zone.color,
                    borderWidth: isSelected ? '3px' : '2px',
                    borderStyle: isSelected ? 'dashed' : 'solid',
                    zIndex: 5,
                  }}
                >
                  {/* Diagonal hatch pattern for zone interior */}
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${zone.color} 10px, ${zone.color} 11px)`
                  }}></div>
                  <div 
                    className="absolute inset-0 flex flex-col items-center justify-center p-1"
                    style={{ color: zone.color }}
                  >
                    <span className="font-extrabold text-[10px] md:text-xs text-center drop-shadow-md leading-tight mix-blend-multiply bg-slate-800/70 px-1.5 py-0.5 rounded">
                      {zone.label}
                    </span>
                    <span className="font-mono text-[8px] md:text-[9px] mix-blend-multiply bg-slate-800/70 px-1 py-0.5 rounded mt-0.5 font-bold flex flex-col items-center">
                      <span>{zone.width.toFixed(1)}m × {zone.length.toFixed(1)}m</span>
                      <span className="opacity-75">{(zone.width * zone.length).toFixed(1)} m²</span>
                    </span>
                  </div>
                  
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeShopMap({
                          ...shopMap,
                          zones: shopMap.zones?.filter(z => z.id !== zone.id)
                        });
                        setSelectedZoneId(null);
                      }}
                      className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded hover:bg-rose-700 shadow"
                      title="Supprimer la zone"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Zone drawing overlay */}
            {isDrawingZone && drawingStart && drawingEnd && (
              <div 
                className="absolute border-2 border-amber-500 bg-amber-500/80/20"
                style={{
                  left: `${Math.min(drawingStart.x, drawingEnd.x) * meterToPx}px`,
                  top: `${Math.min(drawingStart.y, drawingEnd.y) * meterToPx}px`,
                  width: `${Math.abs(drawingStart.x - drawingEnd.x) * meterToPx}px`,
                  height: `${Math.abs(drawingStart.y - drawingEnd.y) * meterToPx}px`,
                  pointerEvents: 'none',
                  zIndex: 20,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-amber-300 bg-slate-800/80 px-2 py-1 rounded text-xs font-bold font-mono shadow-sm">
                    {Math.abs(drawingStart.x - drawingEnd.x).toFixed(1)}m × {Math.abs(drawingStart.y - drawingEnd.y).toFixed(1)}m
                  </span>
                </div>
              </div>
            )}

            {/* SVG picking path overlay */}
            {selectedPickRacks.length > 0 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                <defs>
                  <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.85" />
                  </linearGradient>
                </defs>

                {/* Draw lines between points */}
                {(() => {
                  let dPath = `M ${startX * meterToPx} ${startY * meterToPx} `;
                  optimizedRoutePoints.forEach((pt) => {
                    dPath += `L ${pt.x * meterToPx} ${pt.y * meterToPx} `;
                  });
                  dPath += `L ${startX * meterToPx} ${startY * meterToPx}`;

                  return (
                    <>
                      {/* Outer shadow route line */}
                      <path
                        d={dPath}
                        fill="none"
                        stroke="#0369a1"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-25"
                      />
                      {/* Active core route line */}
                      <path
                        d={dPath}
                        fill="none"
                        stroke="url(#routeGradient)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="8, 6"
                      />
                    </>
                  );
                })()}

                {/* Draw Route Node Stops Circles */}
                <circle
                  cx={startX * meterToPx}
                  cy={startY * meterToPx}
                  r="8"
                  fill="#f43f5e"
                  stroke="#fff"
                  strokeWidth="2"
                />
                
                {optimizedRoutePoints.map((pt, index) => (
                  <g key={`stop-${pt.id}`}>
                    <circle
                      cx={pt.x * meterToPx}
                      cy={pt.y * meterToPx}
                      r="10"
                      fill="#0284c7"
                      stroke="#fff"
                      strokeWidth="2"
                    />
                    <text
                      x={pt.x * meterToPx}
                      y={pt.y * meterToPx + 3}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      {index + 1}
                    </text>
                  </g>
                ))}
              </svg>
            )}

            {/* STATIC WAREHOUSE MARKINGS (For realism & scale) */}
            {/* 1. Loading Dock Zone (Quais de Chargement) */}
            <div className="absolute bottom-0 left-[10%] w-[35%] h-[40px] bg-amber-500/80/10 border-t-2 border-dashed border-amber-500/40 flex items-center justify-center text-[10px] text-amber-500 font-bold tracking-wider uppercase pointer-events-none">
              ⚓ Zone de Réception & Quais de Déchargement
            </div>

            {/* 2. Forklift Transit Lanes (Voie Chariots) */}
            <div className="absolute top-[10%] left-0 w-full h-[35px] bg-slate-700/20 border-y border-dashed border-slate-600/30 flex items-center justify-between px-6 text-[9px] text-slate-500 font-semibold pointer-events-none">
              <span>⚠ SÉCURITÉ : VOIE DE CIRCULATION CHARIOTSÉLÉVATEURS</span>
              <span>↔</span>
              <span>SÉCURITÉ : VOIE DE CIRCULATION CHARIOTSÉLÉVATEURS ⚠</span>
            </div>

            {/* 3. Administration / Offices */}
            <div className="absolute top-0 right-0 w-[120px] h-[60px] bg-slate-800 border-l border-b border-slate-600 flex flex-col items-center justify-center text-[10px] text-slate-400 font-bold pointer-events-none">
              <span>🏢 BUREAUX</span>
              <span className="text-[8px] text-slate-500">Contrôle Réception</span>
            </div>

            {/* PLACED RACKS (Dynamic Interactive Elements) */}


            {shopMap.placedRacks.map((rack) => {
              const hasClearanceViolation = isSpacingViolation(rack);
              const isSelected = rack.id === selectedPlacedId;
              const template = rackTemplates.find((t) => t.id === rack.rackTemplateId);
              
              // Coordinates translated to pixels
              const widthPx = rack.gridWidth * meterToPx;
              const lengthPx = rack.gridLength * meterToPx;
              const leftPx = rack.x * meterToPx;
              const topPx = rack.y * meterToPx;

              // Calculate active capacity details for this rack
              const specificAlveoli = alveoliStateByRack[rack.id];
              const totalSlots = template ? getTotalSlotsForRack(template) : 0;
              const occupied = specificAlveoli ? specificAlveoli.filter((a) => a.occupied).length : 0;
              const localOccupancy = totalSlots > 0 ? (occupied / totalSlots) * 100 : 0;

              const isMatchedBySearch = doesRackMatchSearch(rack);

              // Determine coloring classes based on Overlay Mode
              let overlayColorClass = '';
              if (mapOverlayMode === 'standard') {
                overlayColorClass = isSelected
                  ? rack.color === 'orange'
                    ? 'border-amber-400 bg-amber-900/90 ring-4 ring-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.4)_inset,0_0_15px_rgba(245,158,11,0.6)] z-30 text-amber-50'
                    : 'border-cyan-400 bg-cyan-900/90 ring-4 ring-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.4)_inset,0_0_15px_rgba(6,182,212,0.6)] z-30 text-cyan-50'
                  : rack.color === 'orange'
                    ? 'border-amber-700/80 bg-gradient-to-br from-amber-900/40 to-amber-950/90 hover:from-amber-800/50 hover:to-amber-950/95 z-20 text-amber-400 shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_rgba(255,255,255,0.1)]'
                    : 'border-cyan-700/80 bg-gradient-to-br from-cyan-900/40 to-[#082f49]/90 hover:from-cyan-800/50 hover:to-[#082f49]/95 z-20 text-cyan-400 shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_rgba(255,255,255,0.1)]';
              } else if (mapOverlayMode === 'occupancy') {
                if (localOccupancy === 0) {
                  overlayColorClass = isSelected
                    ? 'border-slate-400 bg-slate-700/95 ring-4 ring-slate-400/25 shadow-slate-500/20 z-30 text-white'
                    : 'border-slate-700 bg-slate-900/80 hover:bg-slate-850 z-20 text-slate-400';
                } else if (localOccupancy <= 40) {
                  overlayColorClass = isSelected
                    ? 'border-emerald-500 bg-emerald-700/90 ring-4 ring-emerald-500/25 shadow-emerald-500/20 z-30 text-emerald-50'
                    : 'border-emerald-500/40 bg-emerald-950/85 hover:bg-emerald-950 z-20 text-emerald-300';
                } else if (localOccupancy <= 80) {
                  overlayColorClass = isSelected
                    ? 'border-amber-500 bg-amber-700/90 ring-4 ring-amber-500/25 shadow-amber-500/20 z-30 text-amber-50'
                    : 'border-amber-500/40 bg-amber-950/85 hover:bg-amber-950 z-20 text-amber-300';
                } else {
                  overlayColorClass = isSelected
                    ? 'border-red-500 bg-red-700/90 ring-4 ring-red-500/25 shadow-red-500/20 z-30 text-red-50'
                    : 'border-red-500/40 bg-red-950/85 hover:bg-red-950 z-20 text-red-300';
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
                } else {
                  // Empty or unknown
                  overlayColorClass = isSelected
                    ? 'border-slate-400 bg-slate-700/95 ring-4 ring-slate-400/25 shadow-slate-500/20 z-30 text-white'
                    : 'border-slate-700 bg-slate-900/80 hover:bg-slate-850 z-20 text-slate-400';
                }
              }

              return (
                <div
                  key={rack.id}
                  id={`placed-rack-${rack.id}`}
                  onMouseDown={(e) => handleMapMouseDown(e, rack)}
                  style={{
                    width: `${widthPx}px`,
                    height: `${lengthPx}px`,
                    left: `${leftPx}px`,
                    top: `${topPx}px`,
                    transform: `rotate(${rack.rotation}deg)`,
                    transformOrigin: 'center center',
                    cursor: isDragging && isSelected ? 'grabbing' : 'grab',
                  }}
                  className={`absolute rounded transition-all shadow-md flex flex-col justify-between p-1.5 overflow-hidden border-2 text-[10px] select-none ${overlayColorClass} ${
                    isMatchedBySearch ? 'ring-4 ring-red-500 animate-pulse border-red-500 scale-105 z-30' : ''
                  }`}
                >
                  {hasClearanceViolation && (
                    <div className="absolute -inset-1 border-2 border-dashed border-red-500 animate-pulse pointer-events-none rounded z-50"></div>
                  )}
                  {/* Rack Title / Code */}
                  <div className="flex justify-between items-start font-bold">
                    <span className="truncate max-w-[80%]">{rack.customLabel}</span>
                    <span className="text-[8px] font-mono opacity-85">{rack.rotation}°</span>
                  </div>

                  {/* Visual slots representation (drawing miniature slots in 2D block) */}
                  <div className="grid grid-cols-3 gap-0.5 my-1 opacity-70">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-xs border-[0.5px] border-black/40 ${
                          localOccupancy > 80 ? 'bg-rose-500/80' : localOccupancy > 40 ? 'bg-amber-500/80' : localOccupancy > 0 ? 'bg-emerald-500/80' : 'bg-slate-700/60'
                        }`}
                      ></div>
                    ))}
                  </div>

                  {/* Occupancy info bar */}
                  <div className="flex justify-between items-end text-[8px] font-mono opacity-90">
                    <span>{rack.gridWidth.toFixed(1)}m</span>
                    <span>Cap: {occupied}/{totalSlots} ({Math.round(localOccupancy)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Control Panel (Implantation Sidebar) */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        
        {/* Zones (Aires de Fonctionnement) */}
        <div className="frosted-glass rounded-xl p-4 shadow-lg border border-slate-700">
          <h4 className="font-bold text-slate-200 text-sm mb-3 flex items-center gap-2 font-display">
            🗺️ Zones Fonctionnelles
          </h4>
          <div className="space-y-3">
            <button
              onClick={() => setIsDrawingZone(!isDrawingZone)}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isDrawingZone 
                ? 'bg-amber-900/50 text-amber-300 border-2 border-amber-500/50' 
                : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              {isDrawingZone ? (
                <>
                  <AlertTriangle size={15} />
                  Annuler le tracé
                </>
              ) : (
                <>
                  <Plus size={15} />
                  Tracer une Nouvelle Zone
                </>
              )}
            </button>

            {isDrawingZone && (
              <div className="p-3 bg-amber-900/30 rounded-lg border border-amber-700/50 space-y-3">
                <p className="text-[10px] text-amber-800 leading-tight">
                  1. Choisissez le type de zone.<br/>
                  2. <b>Cliquez et glissez</b> sur le plan pour définir sa surface.
                </p>
                <div>
                  <label className="block text-[10px] font-semibold text-amber-900 mb-1">Type de Zone</label>
                  <select
                    value={newZoneType}
                    onChange={(e) => {
                      const t = e.target.value as ShopZone['type'];
                      setNewZoneType(t);
                      switch (t) {
                        case 'reception': setNewZoneLabel('Zone de Réception'); break;
                        case 'shipping': setNewZoneLabel('Zone d\'Expédition'); break;
                        case 'storage': setNewZoneLabel('Zone de Stockage'); break;
                        case 'damaged': setNewZoneLabel('Zone Palettes Endommagées'); break;
                        case 'aisle': setNewZoneLabel('Allée Principale'); break;
                        case 'office': setNewZoneLabel('Bureaux / Admin'); break;
                        case 'emergency': setNewZoneLabel('Issue de Secours'); break;
                        case 'custom': setNewZoneLabel('Zone Personnalisée'); break;
                      }
                    }}
                    className="w-full px-2 py-1.5 text-xs rounded border border-amber-600/50 bg-slate-800 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="reception">Réception (Bleu)</option>
                    <option value="shipping">Expédition (Jaune)</option>
                    <option value="storage">Stockage (Vert)</option>
                    <option value="damaged">Palettes Endommagées (Rouge Foncé)</option>
                    <option value="aisle">Allée (Gris)</option>
                    <option value="office">Bureaux (Violet)</option>
                    <option value="emergency">Issue de Secours (Rouge)</option>
                    <option value="custom">Autre / Personnalisé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-amber-900 mb-1">Nom (Optionnel)</label>
                  <input 
                    type="text" 
                    value={newZoneLabel}
                    onChange={(e) => setNewZoneLabel(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border border-amber-600/50 bg-slate-800 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        
        {/* Text Labels (Étiquettes Textuelles) */}
        <div className="frosted-glass rounded-xl p-4 shadow-lg border border-slate-700">
          <h4 className="font-bold text-slate-200 text-sm mb-3 flex items-center gap-2 font-display">
            <Type size={16} className="text-violet-400" /> Étiquettes Textuelles
          </h4>
          
          <button
            onClick={() => setIsPlacingLabel(!isPlacingLabel)}
            className={`w-full py-2 mb-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              isPlacingLabel 
              ? 'bg-violet-900/50 text-violet-300 border-2 border-violet-600/50' 
              : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            {isPlacingLabel ? (
              <>
                <AlertTriangle size={15} />
                Annuler l'ajout
              </>
            ) : (
              <>
                <Plus size={15} />
                Placer une Étiquette
              </>
            )}
          </button>
          {isPlacingLabel && (
            <p className="text-[10px] text-violet-400 mb-3 text-center font-medium bg-violet-900/30 py-1.5 rounded-md">
              Cliquez n'importe où sur le plan.
            </p>
          )}

          
        </div>

        {/* Placement Catalog (Ajouter Rack) */}
        <div className="frosted-glass rounded-xl p-4 shadow-lg">
          <h4 className="font-bold text-slate-200 text-sm mb-3 flex items-center gap-2 font-display">
            🏗️ Catalogue de Racks
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Sélectionner le modèle de rack :
              </label>
              <select
                id="select-map-rack-template"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-700 rounded-lg focus:outline-none bg-slate-800 text-slate-200 cursor-pointer focus:border-cyan-500"
              >
                {rackTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.totalWidthMm / 1000}m × {t.depthMm / 1000}m)
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Batch */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={batchMode}
                  onChange={(e) => setBatchMode(e.target.checked)}
                  className="rounded text-cyan-400 focus:ring-cyan-500/20 bg-slate-800 border-slate-700"
                />
                Génération de Rangées (Batch)
              </label>

              {batchMode && (
                <div className="space-y-2 mt-2 pt-2 border-t border-slate-700 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Nb. Racks</label>
                      <input
                        type="number"
                        min="2"
                        max="30"
                        value={batchCount}
                        onChange={(e) => setBatchCount(parseInt(e.target.value) || 2)}
                        className="w-full px-2 py-1 border border-slate-700 rounded font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Espacement (m)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={batchSpacing}
                        onChange={(e) => setBatchSpacing(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-slate-700 rounded font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Alignement</label>
                    <select
                      value={batchDirection}
                      onChange={(e) => setBatchDirection(e.target.value as 'horizontal' | 'vertical')}
                      className="w-full px-2 py-1 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyan-500 bg-slate-800"
                    >
                      <option value="horizontal">Horizontal (Côte-à-côte)</option>
                      <option value="vertical">Vertical (Dos-à-dos ou aligné)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button
              id="btn-place-rack-on-map"
              onClick={handlePlaceRack}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-extrabold transition-colors cursor-pointer shadow-sm"
            >
              <Plus size={15} />
              Déployer sur le Plan
            </button>
          </div>
        </div>

        {/* Plan de Fond / Calque d'Implantation Réel */}
        <div className="frosted-glass rounded-xl p-4 shadow-lg">
          <h4 className="font-bold text-slate-200 text-xs mb-2.5 flex items-center justify-between font-display uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Compass size={13} className="text-emerald-600" />
              Calque du Plan Réel
            </span>
            {shopMap.backgroundUrl && (
              <span className="text-[8px] bg-emerald-900/50 text-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Actif</span>
            )}
          </h4>
          
          <div className="space-y-3">
            {/* File upload / base64 loader */}
            <div>
              <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-1">
                Importer l'image du Plan (PNG/JPG)
              </label>
              <div className="flex gap-1.5">
                <input
                  id="input-bg-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          onChangeShopMap({
                            ...shopMap,
                            backgroundUrl: event.target.result as string,
                            backgroundScale: shopMap.backgroundScale || 100,
                            backgroundOffsetX: shopMap.backgroundOffsetX || 0,
                            backgroundOffsetY: shopMap.backgroundOffsetY || 0,
                            backgroundOpacity: shopMap.backgroundOpacity || 45,
                          });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('input-bg-upload')?.click()}
                  className="flex-1 py-1.5 px-2 bg-slate-800/50 border border-slate-700 hover:border-slate-500 rounded text-xs font-semibold text-slate-300 transition-colors cursor-pointer text-center"
                >
                  Choisir un fichier...
                </button>
                {shopMap.backgroundUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeShopMap({
                        ...shopMap,
                        backgroundUrl: undefined,
                      });
                    }}
                    className="px-2 py-1.5 bg-rose-900/30 hover:bg-rose-900/50 text-rose-300 border border-rose-700/50 rounded text-xs font-bold transition-colors cursor-pointer"
                    title="Supprimer le plan"
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>

            {/* Presets mapping to easily load the screenshot layout plan */}
            <div>
              <span className="block text-[9px] font-semibold text-slate-500 uppercase mb-1">
                Plan par défaut (Screenshot importé)
              </span>
              <button
                type="button"
                onClick={() => {
                  onChangeShopMap({
                    ...shopMap,
                    backgroundUrl: defaultBackgroundImg,
                    backgroundScale: 100,
                    backgroundOffsetX: 0,
                    backgroundOffsetY: 0,
                    backgroundOpacity: 45,
                  });
                }}
                className="w-full py-1.5 px-2 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-200 border border-emerald-700/50 rounded text-xs text-center font-bold transition-colors cursor-pointer"
              >
                🗺️ Charger le Plan d'entrepôt
              </button>
            </div>

            {shopMap.backgroundUrl && (
              <div className="space-y-2 pt-2 border-t border-slate-700 text-[11px]">
                {/* Scale factor */}
                <div>
                  <div className="flex justify-between text-slate-500 text-[10px] font-medium mb-1">
                    <span>Échelle du Plan :</span>
                    <span className="font-mono text-slate-200">{shopMap.backgroundScale || 100}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="400"
                    value={shopMap.backgroundScale || 100}
                    onChange={(e) => {
                      onChangeShopMap({
                        ...shopMap,
                        backgroundScale: parseInt(e.target.value) || 100,
                      });
                    }}
                    className="w-full accent-emerald-600 cursor-pointer h-1 bg-slate-700 rounded"
                  />
                </div>

                {/* Opacity factor */}
                <div>
                  <div className="flex justify-between text-slate-500 text-[10px] font-medium mb-1">
                    <span>Transparence :</span>
                    <span className="font-mono text-slate-200">{shopMap.backgroundOpacity || 45}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={shopMap.backgroundOpacity || 45}
                    onChange={(e) => {
                      onChangeShopMap({
                        ...shopMap,
                        backgroundOpacity: parseInt(e.target.value) || 45,
                      });
                    }}
                    className="w-full accent-emerald-600 cursor-pointer h-1 bg-slate-700 rounded"
                  />
                </div>

                {/* Horizontal & Vertical Offsets */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-semibold mb-0.5">Axe X (décalage m)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={shopMap.backgroundOffsetX || 0}
                      onChange={(e) => {
                        onChangeShopMap({
                          ...shopMap,
                          backgroundOffsetX: parseFloat(e.target.value) || 0,
                        });
                      }}
                      className="w-full text-xs font-mono px-2 py-1 border border-slate-700 rounded bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-semibold mb-0.5">Axe Y (décalage m)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={shopMap.backgroundOffsetY || 0}
                      onChange={(e) => {
                        onChangeShopMap({
                          ...shopMap,
                          backgroundOffsetY: parseFloat(e.target.value) || 0,
                        });
                      }}
                      className="w-full text-xs font-mono px-2 py-1 border border-slate-700 rounded bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 leading-normal text-center mt-1">
                  Glissez/zoomez ou ajustez les coordonnées pour calquer virtuellement vos racks sur les lignes réelles.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 🗺️ OPTIMISATEUR DE TRAJET DE PICKING */}
        <div className="frosted-glass rounded-xl p-4 shadow-lg space-y-3">
          <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2 font-display">
            <Navigation size={15} className="text-cyan-400" />
            Optimisation de Trajet (Picking)
          </h4>
          <p className="text-[11px] text-slate-500 font-semibold">
            Sélectionnez les racks à visiter pour simuler et calculer le chemin le plus court pour le chariot élévateur.
          </p>

          {/* Start Point Selection */}
          <div className="flex gap-2">
            <button
              onClick={() => setStartingPoint('reception')}
              className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                startingPoint === 'reception'
                  ? 'bg-rose-900/30 border-rose-700/50 text-rose-400 font-bold'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-400 text-slate-400'
              }`}
            >
              ⚓ Quais Réception
            </button>
            <button
              onClick={() => setStartingPoint('offices')}
              className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                startingPoint === 'offices'
                  ? 'bg-rose-900/30 border-rose-700/50 text-rose-400 font-bold'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-400 text-slate-400'
              }`}
            >
              🏢 Bureaux / Expéd.
            </button>
          </div>

          {/* Rack Selectors list */}
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1 bg-slate-800/50 p-2 rounded-lg border border-slate-700">
            {shopMap.placedRacks.map((r) => {
              const isIncluded = selectedPickRacks.includes(r.id);
              const specificAlveoli = alveoliStateByRack[r.id] || [];
              const productsInRack = specificAlveoli
                .filter(a => a.occupied && a.product)
                .map(a => a.product?.name)
                .filter((v, i, a) => a.indexOf(v) === i); // unique

              return (
                <label key={r.id} className="flex items-start gap-2 p-1 rounded hover:bg-slate-700/50 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={isIncluded}
                    onChange={() => {
                      if (isIncluded) {
                        setSelectedPickRacks(selectedPickRacks.filter(id => id !== r.id));
                      } else {
                        setSelectedPickRacks([...selectedPickRacks, r.id]);
                      }
                    }}
                    className="rounded text-cyan-400 focus:ring-cyan-500/20 bg-slate-800 border-slate-700 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between font-bold text-slate-100">
                      <span className="truncate">{r.customLabel}</span>
                      <span className="text-[9px] text-slate-500 font-mono">({r.x.toFixed(1)}m, {r.y.toFixed(1)}m)</span>
                    </div>
                    {productsInRack.length > 0 ? (
                      <p className="text-[9px] text-sky-400 truncate">Stock: {productsInRack.join(', ')}</p>
                    ) : (
                      <p className="text-[9px] text-slate-500 italic">Vide</p>
                    )}
                  </div>
                </label>
              );
            })}
            {shopMap.placedRacks.length === 0 && (
              <p className="text-[10px] text-slate-500 text-center py-2">Aucun rack implanté sur le plan</p>
            )}
          </div>

          {selectedPickRacks.length > 0 ? (
            <div className="bg-cyan-900/30 border border-cyan-700/50 rounded-lg p-2.5 text-[11px] space-y-1.5">
              <div className="flex justify-between items-center text-cyan-200 font-bold">
                <span className="flex items-center gap-1">
                  <Sparkles size={11} /> Trajet Optimisé :
                </span>
                <span className="text-[10px] bg-cyan-900/60 text-cyan-200 px-1.5 py-0.5 rounded font-mono">
                  Séquence TSP
                </span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>Ordre de passage :</span>
                  <span className="font-semibold text-slate-100 truncate max-w-[130px]" title={optimizedRoutePoints.map(p => p.label).join(' ➜ ')}>
                    {optimizedRoutePoints.map(p => p.label).join(' ➜ ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Distance totale :</span>
                  <span className="font-semibold text-slate-100 font-mono">{routeDistance.toFixed(1)} mètres</span>
                </div>
                <div className="flex justify-between">
                  <span>Temps de picking estimé :</span>
                  <span className="font-semibold text-slate-100 font-mono">
                    {Math.floor(estimatedPickTimeSec / 60)}m {Math.round(estimatedPickTimeSec % 60)}s
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPickRacks([])}
                className="w-full text-center text-[10px] text-slate-500 hover:text-slate-200 pt-1 cursor-pointer transition-all font-medium"
              >
                Réinitialiser la simulation &times;
              </button>
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center text-[10px] text-slate-500 font-medium">
              Cochez des racks pour calculer le chemin optimal et estimer la durée de préparation.
            </div>
          )}
        </div>

        {/* Selected Placed Rack Properties */}
        <div className="frosted-glass rounded-xl p-4 flex-1 flex flex-col justify-between shadow-lg">
          <div>
            <h4 className="font-bold text-slate-200 text-sm mb-3 flex items-center gap-2 font-display">
              📐 Ajustements de Position
            </h4>

            {activePlaced ? (
              <div className="space-y-4">
                {/* Information Card */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 shadow-sm space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Identifiant</span>
                    <span className="text-[10px] font-bold text-cyan-200 bg-cyan-900/60 px-1.5 py-0.5 rounded">Actif</span>
                  </div>
                  <input
                    id="input-placed-custom-label"
                    type="text"
                    value={activePlaced.customLabel}
                    onChange={(e) => {
                      const updated = shopMap.placedRacks.map((r) => {
                        if (r.id === activePlaced.id) {
                          return { ...r, customLabel: e.target.value };
                        }
                        return r;
                      });
                      onChangeShopMap({ ...shopMap, placedRacks: updated });
                    }}
                    className="w-full font-bold text-slate-200 text-sm border-b border-slate-700 focus:border-sky-600 focus:outline-none bg-transparent py-0.5"
                  />
                  <div className="text-[10px] text-slate-400 space-y-0.5">
                    <div>Modèle d'origine : <strong className="text-slate-200 font-semibold">{activeTemplate?.name}</strong></div>
                    <div>Emplacements 3D : <strong className="text-slate-200 font-semibold">{(activeTemplate?.levels.length || 0) + 1} niveaux</strong></div>
                  </div>
                  
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-700 mt-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Couleur Allée :</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = shopMap.placedRacks.map((r) => {
                            if (r.id === activePlaced.id) {
                              return { ...r, color: 'blue' };
                            }
                            return r;
                          });
                          onChangeShopMap({ ...shopMap, placedRacks: updated });
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                          activePlaced.color === 'orange'
                            ? 'bg-slate-800/50 border-slate-700 hover:border-blue-500 text-slate-400'
                            : 'bg-blue-900/30 border-blue-700/50 text-blue-400 font-bold'
                        }`}
                      >
                        🔵 Bleu (G1/G2/G3)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = shopMap.placedRacks.map((r) => {
                            if (r.id === activePlaced.id) {
                              return { ...r, color: 'orange' };
                            }
                            return r;
                          });
                          onChangeShopMap({ ...shopMap, placedRacks: updated });
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                          activePlaced.color === 'orange'
                            ? 'bg-amber-900/30 border-amber-700/50 text-amber-300 font-bold'
                            : 'bg-slate-800/50 border-slate-700 hover:border-amber-500 text-slate-400'
                        }`}
                      >
                        🟠 Orange (G0)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grid Coordinate Form */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Position X (m)</label>
                      <input
                        id="input-placed-coord-x"
                        type="number"
                        step="0.1"
                        value={activePlaced.x}
                        onChange={(e) => handleCoordChange('x', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-700 rounded bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Position Y (m)</label>
                      <input
                        id="input-placed-coord-y"
                        type="number"
                        step="0.1"
                        value={activePlaced.y}
                        onChange={(e) => handleCoordChange('y', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-700 rounded bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                    <button
                      onClick={() => handleMoveStep('left')}
                      className="flex-1 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-800/50 text-slate-300 text-xs font-bold rounded cursor-pointer"
                      title="Déplacer à gauche"
                    >
                      ◀
                    </button>
                    <button
                      onClick={() => handleMoveStep('right')}
                      className="flex-1 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-800/50 text-slate-300 text-xs font-bold rounded cursor-pointer"
                      title="Déplacer à droite"
                    >
                      ▶
                    </button>
                    <button
                      onClick={() => handleMoveStep('up')}
                      className="flex-1 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-800/50 text-slate-300 text-xs font-bold rounded cursor-pointer"
                      title="Déplacer en haut"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveStep('down')}
                      className="flex-1 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-800/50 text-slate-300 text-xs font-bold rounded cursor-pointer"
                      title="Déplacer en bas"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                 {/* Rotation, Duplicate & Edit link */}
                <div className="space-y-2">
                  <button
                    id="btn-rotate-placed-rack"
                    onClick={() => handleRotate(activePlaced.id)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/50 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <RotateCw size={13} className="text-slate-500" />
                    Faire pivoter de 90° ({activePlaced.rotation}°)
                  </button>

                  <button
                    id="btn-duplicate-placed-rack"
                    onClick={() => {
                      const newId = onDuplicatePlacedRack(activePlaced.id);
                      if (newId) setSelectedPlacedId(newId);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-200 border border-emerald-700/50 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    <Copy size={13} />
                    Dupliquer le Rack (avec stocks)
                  </button>

                  <div className="bg-emerald-900/30/50 border border-emerald-800/50 rounded-lg p-2 mt-2 space-y-2">
                    <label className="block text-[10px] font-bold text-emerald-200 uppercase tracking-wider mb-1">⚡ Générer une Rangée</label>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="block text-emerald-300/70 font-semibold mb-0.5">Quantité (+n)</span>
                        <input type="number" min="1" max="20" defaultValue="4" id="batch-dup-count" className="w-full px-2 py-1 border border-emerald-700/50 rounded text-emerald-100 bg-slate-800" />
                      </div>
                      <div>
                        <span className="block text-emerald-300/70 font-semibold mb-0.5">Espace (m)</span>
                        <input type="number" step="0.1" min="0" defaultValue="0.5" id="batch-dup-spacing" className="w-full px-2 py-1 border border-emerald-700/50 rounded text-emerald-100 bg-slate-800" />
                      </div>
                    </div>
                    <div className="text-[10px]">
                        <span className="block text-emerald-300/70 font-semibold mb-0.5">Direction d'alignement</span>
                        <select id="batch-dup-dir" className="w-full px-2 py-1 border border-emerald-700/50 rounded text-emerald-100 bg-slate-800">
                          <option value="vertical">Verticalement (Bas)</option>
                          <option value="horizontal">Horizontalement (Droite)</option>
                        </select>
                    </div>
                    <button
                      onClick={() => {
                        const count = parseInt((document.getElementById('batch-dup-count') as HTMLInputElement)?.value) || 4;
                        const spacing = parseFloat((document.getElementById('batch-dup-spacing') as HTMLInputElement)?.value) || 0.5;
                        const dir = (document.getElementById('batch-dup-dir') as HTMLSelectElement)?.value as 'horizontal'|'vertical';
                        
                        const newId = onBatchDuplicatePlacedRack(activePlaced.id, count, dir, spacing);
                        if (newId) setSelectedPlacedId(newId);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                    >
                      Déployer la Rangée
                    </button>
                  </div>

                  <button
                    id="btn-edit-rack-3d"
                    onClick={() => onSelectRackFor3D(activePlaced.rackTemplateId, activePlaced.id)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-900/30 hover:bg-cyan-900/60 text-cyan-200 border border-cyan-700/50 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Settings size={13} />
                    Éditer en 3D (Slotting)
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 text-slate-500 my-auto flex flex-col items-center justify-center">
                <Move size={32} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-300">Aucun rack sélectionné</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[160px] mx-auto">
                  Cliquez sur un bloc de rack sur le plan pour éditer sa position, l'orienter ou configurer son stock.
                </p>
              </div>
            )}
          </div>

          {activePlaced && (
            <div className="pt-4 border-t border-slate-700">
              <button
                id="btn-delete-placed-rack"
                onClick={() => handleDeletePlaced(activePlaced.id)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 border border-rose-700/50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                Retirer du plan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Warehouse Dashboard Statistics */}
      <div className="lg:col-span-12 mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="frosted-glass rounded-xl p-4 shadow-lg flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-900/60 text-cyan-200 shrink-0">
            <Compass size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Densité d'Emprise au Sol</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold text-slate-200">{footprintPercentage.toFixed(1)}%</span>
              <span className="text-xs text-slate-500 font-semibold">de l'entrepôt</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">({totalRackFootprint.toFixed(1)} m² sur {mapAreaSqMeters} m²)</p>
          </div>
        </div>

        <div className="frosted-glass rounded-xl p-4 shadow-lg flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-violet-900/50 text-violet-200 shrink-0">
            <Settings size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Capacité Globale Stockage</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold text-slate-200">{globalOccupiedSlots} / {globalTotalSlots}</span>
              <span className="text-xs text-slate-500 font-semibold">emplacements</span>
            </div>
            <div className="w-24 bg-slate-700 h-1 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-indigo-600 h-1"
                style={{ width: `${globalTotalSlots > 0 ? (globalOccupiedSlots / globalTotalSlots) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="frosted-glass rounded-xl p-4 shadow-lg flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-900/50 text-emerald-200 shrink-0">
            <Info size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Alignement & Allées</span>
            <span className="text-xs font-semibold text-emerald-300 mt-1 block">Règles logistiques respectées</span>
            <p className="text-[10px] text-slate-500">Allées minimum de 2,4m configurées pour chariots de picking.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
