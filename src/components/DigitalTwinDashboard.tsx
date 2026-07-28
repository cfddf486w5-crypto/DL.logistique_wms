import { useSettings } from '../contexts/SettingsContext';
import { formatMapDistance } from '../utils/units';
import React, { useState, useEffect, useRef } from 'react';
import { ShopMap, Rack, Alveolus, Product, getSlotsCountForLevel } from '../types';
import { findPath } from '../utils/pathfinding';
import { Camera, Layers, ThermometerSun, Flame, Activity, Package, Bell, Map, Target, Box, AlertTriangle, Battery, Navigation, Maximize, CheckCircle, Crosshair, Wifi, ArrowUpRight, Play, Pause, FastForward, Clock, Truck, Rewind, SkipBack, SkipForward } from 'lucide-react';



const getTotalSlotsForRack = (rack: Rack) => {
  let total = getSlotsCountForLevel(rack, 0);
  rack.levels.forEach((l: any, idx: number) => {
    total += getSlotsCountForLevel(rack, idx + 1);
  });
  return total;
};

interface DigitalTwinDashboardProps {
  shopMap: ShopMap;
  rackTemplates: Rack[];
  alveoliStateByRack: Record<string, Alveolus[]>;
  products: Product[];
}

export default function DigitalTwinDashboard({ shopMap, rackTemplates, alveoliStateByRack, products }: DigitalTwinDashboardProps) {
  const { lengthUnit } = useSettings();
  const [activeLayer, setActiveLayer] = useState<'structure' | 'inventory'>('inventory');
  const [activeFilter, setActiveFilter] = useState<'none' | 'velocity' | 'co-occurrence' | 'move-paths'>('velocity');
  const [selectedItem, setSelectedItem] = useState<{ type: 'product' | 'alveolus', data: any } | null>(null);
  const [agvs, setAgvs] = useState<any[]>([]);
  const [pedestrians, setPedestrians] = useState<any[]>([]);

  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [simProgress, setSimProgress] = useState(0);

  // Path logic
  const [simPath, setSimPath] = useState<{x: number, y: number}[]>([]);
  const [isFlowSimActive, setIsFlowSimActive] = useState(false);
  const [flowSimPath, setFlowSimPath] = useState<{x: number, y: number}[]>([]);
  const [flowDistance, setFlowDistance] = useState(0);

  const [pendingMoves, setPendingMoves] = useState([
    { id: 1, sku: 'PAL-CUST-328', src: 'A-12-1', dst: 'C-04-1', save: 45, reason: 'Velocity class shift to A.', checks: [false, false, false] },
    { id: 2, sku: 'SKU-9921', src: 'B-02-4', dst: 'B-02-2', save: 12, reason: 'Ergonomic optimization (weight > 15kg)', checks: [false, false, false] },
    { id: 3, sku: 'SKU-1120', src: 'F-19-1', dst: 'A-01-1', save: 120, reason: 'High affinity with PAL-CUST-328.', checks: [false, false, false] }
  ]);
  const handleToggleCheck = (moveId, checkIndex) => {
    setPendingMoves(current => current.map(m => {
      if (m.id === moveId) {
        const newChecks = [...m.checks];
        newChecks[checkIndex] = !newChecks[checkIndex];
        return { ...m, checks: newChecks };
      }
      return m;
    }));
  };
  const handleConfirmMove = (moveId) => {
    setPendingMoves(current => current.filter(m => m.id !== moveId));
  };
  const [totalDistance, setTotalDistance] = useState(0);

  useEffect(() => {
    if (isSimulationActive && shopMap.placedRacks.length > 2) {
      // Create a mock TSP path using some racks
      const pathRacks = shopMap.placedRacks.slice(0, Math.min(5, shopMap.placedRacks.length));
      
      // Simple greedy nearest neighbor mock
      const path = [];
      // Start at top-left
      path.push({ x: 2, y: 2 });
      
      let current = path[0];
      let dist = 0;
      
      for (const r of pathRacks) {
        const p = { x: r.x + r.gridWidth/2, y: r.y + r.gridLength/2 };
        path.push(p);
        dist += Math.sqrt(Math.pow(p.x - current.x, 2) + Math.pow(p.y - current.y, 2));
        current = p;
      }
      // Return to start
      path.push(path[0]);
      dist += Math.sqrt(Math.pow(path[0].x - current.x, 2) + Math.pow(path[0].y - current.y, 2));
      
      setSimPath(path);
      setTotalDistance(dist);
    } else {
      setSimPath([]);
      setSimProgress(0);
    }
  }, [isSimulationActive, shopMap.placedRacks]);

  // Animation loop
  useEffect(() => {
    let frame: number;
    if (isSimulationActive || isFlowSimActive) {
      const animate = () => {
        setSimProgress(p => (p + 0.002) % 1);
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(frame);
  }, [isSimulationActive, isFlowSimActive]);




  const startPutawayFlow = () => {
    if (isFlowSimActive) {
      setIsFlowSimActive(false);
      setFlowSimPath([]);
      return;
    }

    // Find reception zone
    const receptionZone = shopMap.zones?.find(z => z.type === 'reception');
    let startPoint = { x: 2, y: 2 };
    if (receptionZone) {
      startPoint = { x: receptionZone.x + receptionZone.width/2, y: receptionZone.y + receptionZone.length/2 };
    }

    // Find an empty alveolus (or just a rack for simplicity, say the first rack with occupied === false)
    let targetRack = shopMap.placedRacks.find(rack => {
      const alveoli = alveoliStateByRack[rack.id] || [];
      return alveoli.some(alv => !alv.occupied && !alv.blocked);
    });
    
    if (!targetRack && shopMap.placedRacks.length > 0) {
      targetRack = shopMap.placedRacks[0]; // fallback
    }

    if (targetRack) {
      const isHorizontal = targetRack.rotation === 0 || targetRack.rotation === 180;
      // We want the point in front of the rack, so we offset slightly into the aisle
      // For simplicity, just target the center of the rack, pathfinder will get close
      const goalPoint = { 
        x: targetRack.x + targetRack.gridWidth/2, 
        y: targetRack.y + targetRack.gridLength/2 
      };

      const obstacles = shopMap.placedRacks.map(r => {
        const isH = r.rotation === 0 || r.rotation === 180;
        return {
          x: r.x,
          y: r.y,
          w: isH ? r.gridWidth : r.gridLength,
          h: isH ? r.gridLength : r.gridWidth
        };
      });

      const path = findPath(startPoint, goalPoint, shopMap.widthMeters, shopMap.lengthMeters, obstacles);
      
      let dist = 0;
      for (let i = 0; i < path.length - 1; i++) {
        dist += Math.sqrt(Math.pow(path[i].x - path[i+1].x, 2) + Math.pow(path[i].y - path[i+1].y, 2));
      }

      setFlowSimPath(path);
      setFlowDistance(dist);
      setIsFlowSimActive(true);
    }
  };

  const toggleSimulation = () => {
    setIsSimulationActive(!isSimulationActive);
  };


  // Simulation loop for AGVs and Pedestrians
  useEffect(() => {
    // Generate initial fake AGVs and Pedestrians based on map size
    const initialAgvs = Array.from({ length: 5 }).map((_, i) => ({
      id: `agv-${i}`,
      x: Math.random() * shopMap.widthMeters,
      y: Math.random() * shopMap.lengthMeters,
      direction: Math.random() * 360,
      status: Math.random() > 0.2 ? 'moving' : 'charging',
      battery: Math.floor(Math.random() * 100),
    }));
    
    const initialPeds = Array.from({ length: 3 }).map((_, i) => ({
      id: `ped-${i}`,
      x: Math.random() * shopMap.widthMeters,
      y: Math.random() * shopMap.lengthMeters,
      pulse: 0
    }));

    setAgvs(initialAgvs);
    setPedestrians(initialPeds);

    const interval = setInterval(() => {
      setAgvs(current => current.map(agv => {
        if (agv.status === 'moving') {
          const speed = 0.5; // meters per tick
          const rad = (agv.direction * Math.PI) / 180;
          let nx = agv.x + Math.cos(rad) * speed;
          let ny = agv.y + Math.sin(rad) * speed;
          let ndir = agv.direction;
          
          if (nx < 0 || nx > shopMap.widthMeters || ny < 0 || ny > shopMap.lengthMeters) {
            ndir = (agv.direction + 180) % 360; // bounce back
            nx = Math.max(0, Math.min(nx, shopMap.widthMeters));
            ny = Math.max(0, Math.min(ny, shopMap.lengthMeters));
          }
          // small random turn
          ndir += (Math.random() - 0.5) * 20;

          return { ...agv, x: nx, y: ny, direction: ndir, battery: Math.max(0, agv.battery - 0.1) };
        }
        return agv;
      }));

      setPedestrians(current => current.map(ped => ({
        ...ped,
        x: ped.x + (Math.random() - 0.5) * 0.2,
        y: ped.y + (Math.random() - 0.5) * 0.2,
        pulse: (ped.pulse + 0.1) % 1
      })));
    }, 1000);

    return () => clearInterval(interval);
  }, [shopMap.widthMeters, shopMap.lengthMeters]);


  const meterToPx = 12; 

  const getAlveolusColor = (alv: Alveolus, rackTemplate: Rack) => {
    if (activeFilter === 'velocity') {
      // Simulate ABC velocity class heatmap based on random assignment for now (or derive from sku if we had real state)
      // "Velocity Heatmap (Neon Teal for A, Violet for B, Crimson/Gray for C)"
      const rand = Math.random();
      if (rand > 0.8) return 'bg-cyan-400/90 shadow-[0_0_15px_rgba(6,182,212,0.6)]'; // Class A: Teal
      if (rand > 0.4) return 'bg-violet-500/80 shadow-[0_0_10px_rgba(139,92,246,0.5)]'; // Class B: Violet
      return 'bg-slate-700/60'; // Class C: Crimson/Gray
    }
    
    if (activeFilter === 'co-occurrence' || activeFilter === 'move-paths') {
      return 'bg-slate-800/80 border border-slate-700'; // Dark background for overlays
    }

    // Default Operational State colors
    if (alv.blocked) return 'bg-slate-700/80 blocked-hachure border border-rose-900';
    
    if (alv.isSubdivided && alv.pickBins) {
      const occupiedCount = alv.pickBins.filter(b => b.occupied).length;
      if (occupiedCount === 0) return 'bg-emerald-900/300/20 border border-emerald-500/50'; // Empty
      if (occupiedCount === alv.pickBins.length) return 'bg-cyan-800/80 border border-cyan-700'; // Full
      return 'bg-cyan-900/50 border border-cyan-800'; // Partial
    }

    if (!alv.occupied) return 'bg-emerald-900/300/20 border border-emerald-500/50'; 
    return 'bg-cyan-800/80 border border-cyan-700'; 
  };

  const handleRackClick = (rack: any, alv: Alveolus) => {
    setSelectedItem({ type: 'alveolus', data: { rack, alv } });
  };

  const handleProductSearch = (sku: string) => {
    const prod = products.find(p => p.sku === sku || p.name === sku);
    if (prod) {
      setSelectedItem({ type: 'product', data: prod });
    }
  };

  return (
    <div className="flex flex-col min-h-[700px] h-[calc(100vh-12rem)] bg-[#121214] text-slate-200 overflow-hidden font-sans w-full rounded-2xl border border-slate-800 shadow-2xl relative">
      {/* 6. Bandeau Supérieur : KPI Spatiaux */}
      <div className="h-14 bg-[#1a1a1d] border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="text-emerald-400" />
          <span className="font-display font-bold tracking-wider text-sm">DIGITAL TWIN ENGINE</span>
          <div className="px-2 py-0.5 bg-emerald-900/300/20 text-emerald-400 text-[10px] font-bold rounded animate-pulse">LIVE</div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-slate-300" />
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-cyan-400 transition-all duration-1000" strokeDasharray="88" strokeDashoffset={88 - (88 * 0.84)} />
              </svg>
              <span className="absolute text-[9px] font-bold">84%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase">Taux d'occupation</span>
              <span className="text-xs font-bold text-white">Global</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700"></div>

          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-violet-900/300/20 text-indigo-400 rounded">
              <Navigation size={14} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase">Missions Actives</span>
              <span className="text-xs font-bold text-white">14 AGV mvt / 3 att.</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700"></div>

          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-emerald-900/300/20 text-emerald-400 rounded">
              <ArrowUpRight size={14} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase">Efficacité Trajets</span>
              <span className="text-xs font-bold text-white">+24% vs Moyenne</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700"></div>

          <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-800 p-1.5 rounded transition-colors">
            <div className="relative">
              <Bell size={18} className="text-rose-500" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping"></div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-rose-400 font-bold uppercase">Alerte Critique</span>
              <span className="text-[10px] text-slate-300">Risque surcharge G1</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* 8. Console des Drones d'Inventaire Autonomes */}
        <div className="absolute top-4 right-[21rem] w-72 h-64 bg-[#121214]/90 backdrop-blur-md border border-slate-700 shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-xl flex flex-col z-30 overflow-hidden ring-1 ring-white/5">
          <div className="h-8 bg-slate-800 flex items-center px-3 justify-between shrink-0">
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1.5"><Camera size={12}/> AUDIT DRONE - FLOTTE D1</span>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-900/300 rounded-full animate-pulse"></span>
              <span className="w-1.5 h-1.5 bg-emerald-900/300 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></span>
            </div>
          </div>
          <div className="flex-1 p-3 flex flex-col gap-3">
             <div className="relative w-full h-24 bg-black rounded border border-slate-700 overflow-hidden group">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=400&auto=format&fit=crop')] bg-cover opacity-50 grayscale contrast-125"></div>
                <div className="absolute inset-0 border border-emerald-500/30 m-2 bg-emerald-900/300/10"></div>
                {/* Target box */}
                <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border border-emerald-400/50 flex items-center justify-center">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
                </div>
                
                <div className="absolute bottom-1 left-1 text-[8px] font-mono text-emerald-400 bg-black/50 px-1">CAM-01 / RECON</div>
                <div className="absolute bottom-1 right-1 text-[8px] font-mono text-emerald-400 bg-black/50 px-1">ALT: 4.2m</div>
                <div className="absolute top-1 right-1 text-[8px] font-mono text-emerald-400 bg-black/50 px-1">REC</div>
             </div>
             
             <div className="flex flex-col gap-2">
                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                  <span>PROGRESSION MISSION</span>
                  <span className="text-emerald-400">76%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 w-[76%] shadow-[0_0_10px_#34d399]"></div>
                </div>
                <div className="flex justify-between text-[8px] text-slate-500 font-mono mt-1">
                  <span>ALLÉE: G3, G4</span>
                  <span>DURÉE RESTANTE: 14M</span>
                </div>
             </div>
             
             <div className="flex justify-between gap-2 mt-auto">
                <button className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-[9px] font-bold text-white transition-colors">PLANIFIER NUIT</button>
                <button className="flex-1 py-1.5 bg-rose-600/80 hover:bg-rose-900/300 rounded text-[9px] font-bold text-white transition-colors">RAPPEL URGENCE</button>
             </div>
          </div>
        </div>

        
        {/* Module de Simulation de Flux */}
        <div className="absolute top-[18rem] right-[21rem] w-72 bg-[#121214]/90 backdrop-blur-md border border-slate-700 shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-xl flex flex-col z-30 overflow-hidden ring-1 ring-white/5">
          <div className="h-8 bg-slate-800 flex items-center px-3 justify-between shrink-0">
            <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1.5"><Truck size={12}/> SIMULATION DE FLUX DE TRAFIC</span>
          </div>
          <div className="p-3 flex flex-col gap-3">
             <p className="text-[10px] text-slate-400 leading-tight">
               Calcule le chemin le plus court pour le rangement (Putaway) depuis le quai de réception vers un emplacement vide.
             </p>
             <button 
                onClick={startPutawayFlow}
                className={`w-full py-2 rounded text-xs font-bold transition-all shadow border ${
                  isFlowSimActive ? 'bg-rose-600/20 text-rose-400 border-rose-500/50 hover:bg-rose-600/40' : 'bg-cyan-600 hover:bg-cyan-500 text-white border-violet-600/50/50'
                }`}
             >
                {isFlowSimActive ? 'Arrêter la simulation' : 'Lancer Simulation Putaway'}
             </button>
             
             {isFlowSimActive && (
               <div className="bg-[#1a1a1d] border border-slate-800 rounded p-2 flex flex-col gap-1">
                 <div className="flex justify-between text-[10px]">
                   <span className="text-slate-400">Distance Optimisée:</span>
                   <span className="text-emerald-400 font-bold font-mono">{formatMapDistance(flowDistance, lengthUnit)}</span>
                 </div>
                 <div className="flex justify-between text-[10px]">
                   <span className="text-slate-400">Temps estimé (AGV):</span>
                   <span className="text-white font-mono">{((flowDistance / 1.5)).toFixed(0)} s</span>
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* 3. Barre Latérale Gauche : Outils & Filtres */}
        <div className="w-64 bg-[#161618] border-r border-slate-800 flex flex-col z-20 shrink-0">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Couches Visuelles</h3>
            <div className="space-y-2">
              {[
                { id: 'structure', icon: Box, label: 'Structure & Murs' },
                { id: 'inventory', icon: Package, label: 'Inventaire (Racks)' },
                { id: 'wifi', icon: Wifi, label: 'Réseau RTLS / Wi-Fi' },
                { id: 'sprinklers', icon: Activity, label: 'Tuyauterie / Sécurité' },
              ].map(layer => (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id as any)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                    activeLayer === layer.id ? 'bg-cyan-900/300/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <layer.icon size={14} />
                  {layer.label}
                  {activeLayer === layer.id && <CheckCircle size={12} className="ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Filtres Intelligents</h3>
            <div className="space-y-2">
              <button
                onClick={() => setActiveFilter('none')}
                className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${activeFilter === 'none' ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:bg-slate-800/50'}`}
              >
                None
              </button>
              <button
                onClick={() => setActiveFilter('velocity')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${activeFilter === 'velocity' ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800/50'}`}
              >
                <span>Velocity Heatmap</span>
                <Flame size={12} />
              </button>
              <button
                onClick={() => setActiveFilter('co-occurrence')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${activeFilter === 'co-occurrence' ? 'bg-violet-900/30 text-violet-400 border border-violet-500/30' : 'text-slate-400 hover:bg-slate-800/50'}`}
              >
                <span>Co-occurrence Network</span>
                <Target size={12} />
              </button>
              <button
                onClick={() => setActiveFilter('move-paths')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${activeFilter === 'move-paths' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:bg-slate-800/50'}`}
              >
                <span>Move Path Overlay</span>
                <ArrowUpRight size={12} />
              </button>
            </div>
          </div>

          {/* Mini-map or legend */}
          <div className="p-4 mt-auto">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Légende</h3>
            <div className="space-y-1.5 text-[10px] text-slate-400">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-900/300"></div> Disponible</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Partiel</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-700"></div> Plein (Cap Max)</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-800/500 border border-dashed border-slate-700"></div> Bloqué / Quarantaine</div>
              <div className="flex items-center gap-2 mt-3"><div className="w-2 h-2 rounded-full bg-blue-900/300 animate-pulse"></div> Opérateur (Badge)</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm bg-violet-900/300 shadow-[0_0_5px_#6366f1]"></div> AGV / Robot</div>
            </div>
          </div>
        </div>

        {/* 2. Panneau Central : Moteur 3D */}
        <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-[#121214] to-[#0a0a0b] perspective-[2000px] flex items-center justify-center">
          
          {/* Simulated 3D Scene */}
          <div 
            className="relative transform-gpu transition-transform duration-1000 ease-in-out"
            style={{
              width: shopMap.widthMeters * meterToPx,
              height: shopMap.lengthMeters * meterToPx,
              transform: `rotateX(55deg) rotateZ(-35deg) scale(1.2)`,
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Floor Grid */}
            <div className="absolute inset-0 border border-slate-800"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                backgroundSize: `${meterToPx}px ${meterToPx}px`
              }}
            ></div>

            {/* Walls (Translucent X-Ray) */}
            <div className="absolute top-0 left-0 right-0 h-4 bg-slate-700/20 border border-slate-600/30 origin-top transform-gpu rotateX(-90deg) backdrop-blur-sm"></div>
            <div className="absolute top-0 bottom-0 left-0 w-4 bg-slate-700/20 border border-slate-600/30 origin-left transform-gpu rotateY(90deg) backdrop-blur-sm"></div>

            {/* Safety Zones */}
            {shopMap.zones?.map(zone => (
              <div 
                key={zone.id}
                className="absolute border-2 pointer-events-none"
                style={{
                  left: zone.x * meterToPx,
                  top: zone.y * meterToPx,
                  width: zone.width * meterToPx,
                  height: zone.length * meterToPx,
                  borderColor: zone.color,
                  backgroundColor: `${zone.color}30`,
                  backgroundImage: zone.type === 'emergency' ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,0,0,0.3) 10px, rgba(255,0,0,0.3) 20px)' : 'none',
                  transform: 'translateZ(0.5px)'
                }}
              />
            ))}


            {/* Move Path Overlay Layer */}
            {activeFilter === 'move-paths' && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'translateZ(1px)', overflow: 'visible' }}>
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
                  </marker>
                </defs>
                {/* Randomly connecting some racks with green arrows */}
                {shopMap.placedRacks.slice(0, 3).map((source, i) => {
                  const target = shopMap.placedRacks[(i + 1) % shopMap.placedRacks.length];
                  if (!source || !target) return null;
                  return (
                    <line 
                      key={`move-${i}`}
                      x1={source.x * meterToPx}
                      y1={source.y * meterToPx}
                      x2={target.x * meterToPx}
                      y2={target.y * meterToPx}
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeDasharray="8, 4"
                      className="animate-[dash_5s_linear_infinite]"
                      markerEnd="url(#arrowhead)"
                      style={{ filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.8))' }}
                    />
                  );
                })}
              </svg>
            )}

            {/* Co-occurrence Network Layer */}
            {activeFilter === 'co-occurrence' && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'translateZ(1px)', overflow: 'visible' }}>
                {shopMap.placedRacks.slice(0, 5).map((source, i) => {
                  return shopMap.placedRacks.slice(i + 1, 6).map((target, j) => {
                    if (!source || !target) return null;
                    return (
                      <line 
                        key={`co-${i}-${j}`}
                        x1={source.x * meterToPx}
                        y1={source.y * meterToPx}
                        x2={target.x * meterToPx}
                        y2={target.y * meterToPx}
                        stroke="#8b5cf6"
                        strokeWidth="2"
                        opacity={0.6 - (j * 0.1)}
                        style={{ filter: 'drop-shadow(0 0 15px rgba(139,92,246,0.9))' }}
                      />
                    );
                  });
                })}
              </svg>
            )}

            {/* TSP Simulation Layer */}
            {isSimulationActive && simPath.length > 0 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'translateZ(1px)', overflow: 'visible' }}>
                <polyline 
                  points={simPath.map(p => `${p.x * meterToPx},${p.y * meterToPx}`).join(' ')} 
                  fill="none" 
                  stroke="#38bdf8" 
                  strokeWidth="3" 
                  strokeDasharray="10, 5" 
                  className="animate-[dash_20s_linear_infinite]"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(56,189,248,0.8))' }}
                />
                {/* Simulated AGV dot */}
                <circle
                  cx={simPath[Math.floor(simProgress * (simPath.length - 1))].x * meterToPx}
                  cy={simPath[Math.floor(simProgress * (simPath.length - 1))].y * meterToPx}
                  r="6"
                  fill="#ffffff"
                  stroke="#0284c7"
                  strokeWidth="2"
                  style={{ filter: 'drop-shadow(0 0 15px rgba(255,255,255,1))' }}
                />
              </svg>
            )}


            {/* Flow Simulation Layer */}
            {isFlowSimActive && flowSimPath.length > 0 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'translateZ(2px)', overflow: 'visible' }}>
                {/* Connection Lines */}
                <polyline 
                  points={flowSimPath.map(p => `${p.x * meterToPx},${p.y * meterToPx}`).join(' ')} 
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
                  cx={flowSimPath[flowSimPath.length - 1].x * meterToPx}
                  cy={flowSimPath[flowSimPath.length - 1].y * meterToPx}
                  r="6"
                  fill="#38bdf8"
                  stroke="#0284c7"
                  strokeWidth="2"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(56,189,248,0.8))' }}
                />
                {/* Moving Pallet */}
                <rect
                  width="12"
                  height="12"
                  fill="#f59e0b"
                  stroke="#b45309"
                  strokeWidth="1.5"
                  rx="2"
                  className="animate-pulse"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.8))' }}
                >
                  <animateMotion 
                    dur={`${Math.max(3, flowDistance / 2)}s`} 
                    repeatCount="indefinite" 
                    path={`M ${flowSimPath.map(p => `${p.x * meterToPx},${p.y * meterToPx}`).join(' L ')}`}
                  />
                </rect>
              </svg>
            )}

            {/* Racks in 3D */}
            {activeLayer !== 'structure' && shopMap.placedRacks.map(rack => {
              const template = rackTemplates.find(t => t.id === rack.rackTemplateId);
              if (!template) return null;
              const alveoli = alveoliStateByRack[rack.id] || [];
              const rackWidthPx = rack.gridWidth * meterToPx;
              const rackLengthPx = rack.gridLength * meterToPx;
              const rackHeightPx = (template.levels.length * 1.5) * meterToPx; // approx height

              const isHighlighted = selectedItem?.type === 'alveolus' && selectedItem.data.rack.id === rack.id;

              return (
                <div 
                  key={rack.id}
                  className={`absolute transform-gpu transition-all duration-300 ${isHighlighted ? 'ring-2 ring-yellow-400' : ''}`}
                  style={{
                    left: rack.x * meterToPx,
                    top: rack.y * meterToPx,
                    width: rackWidthPx,
                    height: rackLengthPx,
                    transform: `rotateZ(${rack.rotation}deg) translateZ(0)`,
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {/* Base shadow */}
                  <div className="absolute inset-0 bg-black/50 blur-sm translate-z-[-1px]"></div>
                  
                  {/* Metal Frame (simplified) */}
                  <div className="absolute inset-0 border border-slate-600/50 bg-slate-800/30"></div>

                  {/* Render Alveoli blocks */}
                  {alveoli.map((alv, i) => {
                    // Calculate 3D position within the rack
                    const currentSlotsCount = (template.groundSlotsCount || template.binsPerLevel); // Just approximate using ground
                    const w = rackWidthPx / currentSlotsCount;
                    const h = rackLengthPx;
                    const z = (alv.levelIndex * 1.5) * meterToPx;
                    const left = alv.binIndex * w;

                    const colorClass = getAlveolusColor(alv, template);
                    const isSelectedAlv = selectedItem?.type === 'alveolus' && selectedItem.data.alv.id === alv.id;
                    const isProductMatch = selectedItem?.type === 'product' && 
                      ((alv.isSubdivided && alv.pickBins?.some(b => b.product?.id === selectedItem.data.id)) ||
                       (!alv.isSubdivided && alv.product?.id === selectedItem.data.id));

                    return (
                      <div
                        key={alv.id}
                        onClick={(e) => { e.stopPropagation(); handleRackClick(rack, alv); }}
                        className={`absolute border border-slate-900/50 cursor-pointer transform-gpu transition-all hover:brightness-125
                          ${colorClass}
                          ${isSelectedAlv ? 'ring-2 ring-white ring-offset-1 ring-offset-[#121214]' : ''}
                          ${isProductMatch ? 'animate-pulse bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.8)]' : ''}
                        `}
                        style={{
                          left: left,
                          top: 0,
                          width: w - 2, // gap
                          height: h - 2,
                          transform: `translateZ(${z}px)`,
                          transformStyle: 'preserve-3d'
                        }}
                      >
                        {/* Top face for 3D effect */}
                        <div className="absolute top-0 left-0 w-full h-full bg-[#111827]/10 origin-bottom transform-gpu rotateX(90deg) translateZ(5px)"></div>
                        {/* Front face */}
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-black/30 origin-bottom transform-gpu rotateX(-90deg)"></div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Dynamic Entities: AGVs */}
            {agvs.map(agv => (
              <div 
                key={agv.id}
                className="absolute transform-gpu transition-transform duration-1000 linear"
                style={{
                  left: agv.x * meterToPx,
                  top: agv.y * meterToPx,
                  transform: `translateZ(1px) rotateZ(${agv.direction}deg)`,
                  transformStyle: 'preserve-3d'
                }}
              >
                {/* AGV Body */}
                <div className="w-3 h-4 bg-violet-900/300 rounded-sm shadow-[0_0_10px_rgba(99,102,241,0.5)] border border-indigo-300 relative -translate-x-1/2 -translate-y-1/2">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-6 bg-gradient-to-t from-emerald-400/80 to-transparent clip-triangle origin-bottom rotate-180 pointer-events-none opacity-50"></div>
                  {/* Status light */}
                  <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${agv.status === 'moving' ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]' : 'bg-amber-400'}`}></div>
                </div>
              </div>
            ))}

            {/* Dynamic Entities: Pedestrians */}
            {pedestrians.map(ped => (
              <div 
                key={ped.id}
                className="absolute transform-gpu transition-transform duration-1000 linear"
                style={{
                  left: ped.x * meterToPx,
                  top: ped.y * meterToPx,
                  transform: 'translateZ(2px)'
                }}
              >
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_8px_#60a5fa] relative -translate-x-1/2 -translate-y-1/2">
                  {/* Pulse ring */}
                  <div 
                    className="absolute inset-0 bg-blue-400 rounded-full"
                    style={{ transform: `scale(${1 + ped.pulse * 3})`, opacity: 1 - ped.pulse }}
                  ></div>
                </div>
              </div>
            ))}

          </div>
          
          {/* Overlay gradient for depth */}
          <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent via-transparent to-[#121214] opacity-80"></div>
        </div>

        {/* 4. Barre Latérale Droite : Inspecteur Contextuel */}
        <div className="w-80 bg-[#161618] border-l border-slate-800 flex flex-col z-20 shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{selectedItem ? 'Inspecteur Contextuel' : 'Actions & Paramètres'}</h3>
            <Target size={14} className="text-slate-500" />
          </div>

          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            {!selectedItem && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Operational Parameter Tuner */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-300 uppercase mb-3 flex items-center gap-2">
                    <Activity size={14} className="text-cyan-400" />
                    Operational Parameter Tuner
                  </h4>
                  <div className="space-y-4 bg-slate-800/30 p-3 rounded-lg border border-slate-800/50">
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Re-slotting Drift Trigger</span>
                        <span className="text-cyan-400">20%</span>
                      </div>
                      <input type="range" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" defaultValue="20" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Travel Distance Weight</span>
                        <span className="text-slate-300">60%</span>
                      </div>
                      <input type="range" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" defaultValue="60" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Ergonomics Weight</span>
                        <span className="text-slate-300">40%</span>
                      </div>
                      <input type="range" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" defaultValue="40" />
                    </div>
                  </div>
                </div>

                {/* Actionable Morning Move Queue */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-300 uppercase mb-3 flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-400" />
                    Morning Move Queue
                  </h4>
                  <div className="space-y-2">
                    {pendingMoves.length === 0 ? (
                      <div className="text-xs text-slate-500 italic p-3 text-center border border-dashed border-slate-700 rounded">No pending moves.</div>
                    ) : pendingMoves.map((move) => {
                      const allChecked = move.checks.every(Boolean);
                      return (
                      <div key={move.id} className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-slate-200">{move.sku}</span>
                          <span className="text-[10px] text-emerald-400 font-bold">-{formatMapDistance(move.save, lengthUnit)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mb-2">
                          <span>{move.src}</span>
                          <ArrowUpRight size={10} className="text-cyan-400" />
                          <span className="text-cyan-400">{move.dst}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight mb-3">
                          {move.reason}
                        </p>
                        <div className="space-y-1.5 mb-3 bg-slate-900/50 p-2 rounded">
                          <label className="flex items-center gap-2 text-[9px] text-slate-400 cursor-pointer">
                            <input type="checkbox" checked={move.checks[0]} onChange={() => handleToggleCheck(move.id, 0)} className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/30" />
                            Aisle Clearance Verified
                          </label>
                          <label className="flex items-center gap-2 text-[9px] text-slate-400 cursor-pointer">
                            <input type="checkbox" checked={move.checks[1]} onChange={() => handleToggleCheck(move.id, 1)} className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/30" />
                            Max Rack Weight Checked
                          </label>
                          <label className="flex items-center gap-2 text-[9px] text-slate-400 cursor-pointer">
                            <input type="checkbox" checked={move.checks[2]} onChange={() => handleToggleCheck(move.id, 2)} className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/30" />
                            Temperature Zone Valid
                          </label>
                        </div>
                        <button 
                          disabled={!allChecked}
                          onClick={() => handleConfirmMove(move.id)}
                          className={"mt-1 w-full py-1.5 text-[10px] font-bold rounded border transition-colors " + (allChecked ? "bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-400 border-emerald-800/50" : "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed")}
                        >
                          Confirm Move
                        </button>
                      </div>
                    )
                  })}
                  </div>
                </div>
              </div>
            )}

            {selectedItem?.type === 'alveolus' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <div className="flex items-center gap-2 text-cyan-400 mb-1">
                    <Box size={16} />
                    <h2 className="font-bold text-lg">{selectedItem.data.alv.label}</h2>
                  </div>
                  <p className="text-xs text-slate-400">Rack: {selectedItem.data.rack.customLabel}</p>
                </div>

                {/* 3D Cross-section preview simulation */}
                <div className="h-32 bg-[#121214] rounded-lg border border-slate-800 relative overflow-hidden flex items-center justify-center group">
                   <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent"></div>
                   <div className="w-3/4 h-2/3 border-2 border-slate-600 rounded flex items-end p-2 relative">
                     {selectedItem.data.alv.occupied ? (
                       <div className="w-full h-3/4 bg-amber-700/80 border border-amber-500/50 rounded flex items-center justify-center relative">
                         <span className="text-[10px] font-mono text-amber-200">PALLET_ID_492</span>
                         <div className="absolute -top-6 bg-slate-800 text-[9px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                           420 lbs
                         </div>
                       </div>
                     ) : (
                       <div className="text-xs text-slate-600 w-full text-center">Vide</div>
                     )}
                   </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-[#1a1a1d] p-3 rounded-lg border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">Dernier Scan Opérateur</div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-900/300/20 flex items-center justify-center text-blue-400 text-xs font-bold">AL</div>
                      <span className="text-sm font-medium text-slate-300">Alexandre D. (Il y a 14 min)</span>
                    </div>
                  </div>

                  <div className="bg-[#1a1a1d] p-3 rounded-lg border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">Poids Actuel / Max</div>
                    <div className="flex items-end justify-between">
                      <span className="text-lg font-bold text-white">{selectedItem.data.alv.occupied ? '420' : '0'} <span className="text-xs text-slate-500 font-normal">lbs</span></span>
                      <span className="text-xs text-slate-500">/ 1200 lbs</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 mt-2 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-900/300" style={{ width: selectedItem.data.alv.occupied ? '35%' : '0%' }}></div>
                    </div>
                  </div>

                  <div className="bg-[#1a1a1d] p-3 rounded-lg border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">Contenu</div>
                    {selectedItem.data.alv.product ? (
                      <div className="flex items-center gap-3 mt-2 cursor-pointer hover:bg-slate-800 p-1.5 -mx-1.5 rounded transition-colors" onClick={() => setSelectedItem({type: 'product', data: selectedItem.data.alv.product})}>
                        <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center">
                          <Package size={14} className="text-cyan-400" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-200">{selectedItem.data.alv.product.sku}</div>
                          <div className="text-[10px] text-slate-400 truncate w-40">{selectedItem.data.alv.product.name}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">Aucun produit assigné.</div>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                   <button className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded transition-colors">
                     Bloquer
                   </button>
                   <button className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all">
                     Éditer (WMS)
                   </button>
                </div>
              </div>
            )}

            {selectedItem?.type === 'product' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center shrink-0">
                    {selectedItem.data.imageUrl ? (
                      <img src={selectedItem.data.imageUrl} alt="" className="w-full h-full object-cover rounded-lg opacity-80" />
                    ) : (
                      <Package size={24} className="text-slate-500" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-sm leading-tight mb-1">{selectedItem.data.name}</h2>
                    <div className="text-xs font-mono text-cyan-400">{selectedItem.data.sku}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1a1a1d] p-3 rounded-lg border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">Classe de Rotation</div>
                    <div className="text-lg font-bold text-white flex items-center gap-2">
                      {selectedItem.data.rotationClass || 'B'}
                      {selectedItem.data.rotationClass === 'A' && <Flame size={14} className="text-cyan-400" />}
                    </div>
                  </div>
                  <div className="bg-[#1a1a1d] p-3 rounded-lg border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">Stock Total</div>
                    <div className="text-lg font-bold text-white">124 <span className="text-[10px] font-normal text-slate-500">unités</span></div>
                  </div>
                </div>

                <div className="bg-[#1a1a1d] p-3 rounded-lg border border-slate-800/50">
                  <div className="text-[10px] text-slate-500 uppercase mb-2">Prochaine Péremption (FEFO)</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-400">12 Oct 2026</span>
                    <span className="text-[10px] bg-amber-900/300/20 text-amber-400 px-2 py-0.5 rounded">Lot #8842</span>
                  </div>
                </div>

                <div className="pt-4">
                  <button className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2">
                    <Activity size={14} />
                    Ordonner un inventaire cyclique
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 7. Le Séquenceur Temporel et Gestion de Flotte (Time-Machine) */}
        <div className="absolute bottom-6 left-[17rem] right-[38rem] h-32 bg-[#121214]/95 backdrop-blur-md border border-slate-700 shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden flex flex-col z-30 ring-1 ring-white/5">
          {/* Header */}
          <div className="h-8 bg-[#1a1a1d] border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
            <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-2 tracking-wider">
              <Truck size={14}/> SÉQUENCEUR TEMPOREL & GESTION DE FLOTTE
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-900/300 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-bold text-slate-300">12 AGV EN LIGNE</span>
              </div>
              <div className="h-3 w-px bg-slate-700"></div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-amber-900/300 rounded-full"></div>
                <span className="text-[9px] font-bold text-slate-300">3 EN CHARGE</span>
              </div>
            </div>
          </div>
          
          {/* Controls & Timeline */}
          <div className="flex-1 flex items-center px-5 gap-6">
            {/* Playback Controls */}
            <div className="flex items-center gap-2 shrink-0">
               <button className="w-8 h-8 rounded-full bg-[#1a1a1d] hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                  <Rewind size={14} />
               </button>
               <button onClick={toggleSimulation} className={`w-12 h-12 rounded-full border flex items-center justify-center text-white transition-all transform hover:scale-105 ${isSimulationActive ? 'bg-rose-600 border-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.5)]' : 'bg-cyan-600 hover:bg-cyan-500 border-sky-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]'}`}>
                  {isSimulationActive ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
               </button>
               <button className="w-8 h-8 rounded-full bg-[#1a1a1d] hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                  <FastForward size={14} />
               </button>
            </div>
            
            {/* Timeline Slider */}
            <div className="flex-1 flex flex-col justify-center gap-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                <span>08:00</span>
                <span>12:00</span>
                <span className="text-cyan-400">14:45 (Actuel)</span>
                <span>20:00 (Simulation)</span>
              </div>
              <div className="relative w-full h-3 bg-[#1a1a1d] rounded-full border border-slate-800 shadow-inner overflow-hidden cursor-pointer">
                {/* Progress */}
                <div className="absolute top-0 left-0 bottom-0 w-[60%] bg-gradient-to-r from-cyan-700 to-cyan-400 rounded-full shadow-[0_0_10px_#06b6d4]"></div>
                
                {/* Future simulation pattern */}
                <div className="absolute top-0 left-[60%] right-0 bottom-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, #38bdf8 4px, #38bdf8 8px)' }}></div>
                
                {/* Playhead */}
                <div className="absolute top-1/2 left-[60%] -translate-y-1/2 -translate-x-1/2 w-4 h-6 bg-[#111827] border-2 border-cyan-500 shadow-lg cursor-pointer hover:scale-110 transition-transform rounded-sm z-10"></div>
                
                {/* Heatmap Activity Spikes on Timeline */}
                <div className="absolute top-0 left-[15%] bottom-0 w-2 bg-rose-900/300/50 blur-[1px]"></div>
                <div className="absolute top-0 left-[45%] bottom-0 w-4 bg-orange-500/50 blur-[1px]"></div>
              </div>
            </div>

            {/* Stats / Active Missions */}
            <div className="flex items-center gap-5 pl-5 border-l border-slate-800 shrink-0">
               <div className="flex flex-col">
                 <span className="text-[9px] text-slate-400 font-bold tracking-wider">TRAJETS OPTIMISÉS</span>
                 <span className="text-base font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">{isSimulationActive ? `Trajet: ${formatMapDistance(totalDistance, lengthUnit)}` : "-24.5% km"}</span>
               </div>
               <div className="flex flex-col">
                 <span className="text-[9px] text-slate-400 font-bold tracking-wider">VIT. ROTATION</span>
                 <span className="text-base font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">420/h</span>
               </div>
            </div>
          </div>
        </div>

        {/* 5. Incrustation Splitscreen : Perspective Mobile Opérateur (PIP) */}
        <div className="absolute bottom-6 right-[21rem] w-64 h-48 bg-[#121214] border border-slate-700 shadow-2xl rounded-xl overflow-hidden flex flex-col z-30 ring-4 ring-[#161618]">
          <div className="h-6 bg-slate-800 flex items-center px-2 justify-between">
            <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Maximize size={10}/> TERMINAL PDA - OPÉRATEUR</span>
            <div className="w-1.5 h-1.5 bg-emerald-900/300 rounded-full animate-pulse"></div>
          </div>
          <div className="flex-1 relative bg-slate-900 perspective-1000">
            {/* Simulated First-Person View */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-screen"></div>
            
            {/* HUD Elements */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
               <div className="w-full h-full relative">
                 {/* Guiding line */}
                 <div className="absolute bottom-0 left-1/2 w-1 h-3/4 bg-emerald-400/80 -translate-x-1/2 origin-bottom transform perspective-[500px] rotateX(60deg) shadow-[0_0_15px_#34d399]"></div>
                 {/* Target Arrow */}
                 <div className="absolute top-1/4 left-1/3 transform -translate-x-1/2 -translate-y-1/2 animate-bounce">
                   <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-[12px] border-t-emerald-400 filter drop-shadow-[0_0_8px_#34d399]"></div>
                 </div>
                 {/* Target box highlight */}
                 <div className="absolute top-[20%] left-[25%] w-16 h-12 border-2 border-emerald-400/80 rounded bg-emerald-400/10 shadow-[0_0_10px_#34d399_inset]"></div>
               </div>
            </div>

            {/* Instruction Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur p-2 border-t border-slate-700">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-emerald-400 font-bold">ALLÉE G1 - NIVEAU 2</div>
                  <div className="text-[9px] text-slate-300">Prélèvement: 2x REF-899</div>
                </div>
                <div className="text-xl">➡️</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
// Stub icon
function UsersIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
