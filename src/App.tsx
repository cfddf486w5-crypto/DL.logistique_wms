/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSettings } from './contexts/SettingsContext';
import { LengthUnit, VolumeUnit } from './utils/units';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rack, Alveolus, Product, ShopMap, PlacedRack, getSlotsCountForLevel } from './types';
import { DEFAULT_PRODUCTS, DEFAULT_RACKS, DEFAULT_SHOP_MAP } from './data/defaultData';
import RackVisualizer3D from './components/RackVisualizer3D';
import { Suspense, lazy } from "react";
const ShopFloorMap = lazy(() => import("./components/ShopFloorMap"));
import DiagnosticReport from './components/DiagnosticReport';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import FullScreenMap from './components/FullScreenMap';
import DigitalTwinDashboard from './components/DigitalTwinDashboard';
import { LayoutGrid, Layers, FileText, Plus, RefreshCw, Download, FileJson, Info, Check, Shield, Activity, Maximize, Box, X, Database, ChevronDown } from 'lucide-react';
import { CsvIngestionPanel } from './components/CsvIngestionPanel';
import { saveProducts, saveLocations, saveWaves, clearAllData } from './db/indexedDB';

export default function App() {
  const { lengthUnit, setLengthUnit, volumeUnit, setVolumeUnit } = useSettings();
  const [activeTab, setActiveTab] = useState<'ingestion' | '2d-map' | '3d-configurator' | 'diagnostic' | 'analytics' | 'digital-twin'>('ingestion');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullScreenMapOpen, setIsFullScreenMapOpen] = useState(false);




  // Master State loaded from localStorage if available
  const [rackTemplates, setRackTemplates] = useState<Rack[]>(() => {
    const saved = localStorage.getItem('dl_rack_templates');
    let templates = saved ? JSON.parse(saved) : DEFAULT_RACKS;
    
    // Ensure the required new templates are always there
    const requiredIds = ['rack-102-4-5', 'rack-144-6'];
    requiredIds.forEach(reqId => {
      if (!templates.find((t: any) => t.id === reqId)) {
        const defaultT = DEFAULT_RACKS.find((t) => t.id === reqId);
        if (defaultT) templates.push(defaultT);
      }
    });

    return templates;
  });

  const [shopMap, setShopMap] = useState<ShopMap>(() => {
    const saved = localStorage.getItem('dl_shop_map');
    const parsed = saved ? JSON.parse(saved) : DEFAULT_SHOP_MAP;
    if (parsed && parsed.backgroundUrl && parsed.backgroundUrl.includes('/src/assets/images/')) {
      parsed.backgroundUrl = DEFAULT_SHOP_MAP.backgroundUrl;
    }
    return parsed;
  });

  // --- Undo/Redo logic ---
  const [history, setHistory] = useState([shopMap]);
  const [historyPointer, setHistoryPointer] = useState(0);
  const isUndoRedoAction = useRef(false);

  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setHistory(prev => {
        const currentInHistory = prev[historyPointer];
        // Only save if it actually changed
        if (JSON.stringify(currentInHistory) !== JSON.stringify(shopMap)) {
          const newHistory = prev.slice(0, historyPointer + 1);
          newHistory.push(shopMap);
          // Keep history from growing unbounded (e.g. max 50 items)
          if (newHistory.length > 50) newHistory.shift();
          setHistoryPointer(newHistory.length - 1);
          return newHistory;
        }
        return prev;
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [shopMap]); // Exclude historyPointer from deps to avoid bugs, the setter gets 'prev' anyway

  const undo = useCallback(() => {
    setHistoryPointer(prev => {
      if (prev > 0) {
        isUndoRedoAction.current = true;
        const newPointer = prev - 1;
        setHistory(hist => {
          setShopMap(hist[newPointer]);
          return hist;
        });
        return newPointer;
      }
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setHistoryPointer(prev => {
      setHistory(hist => {
        if (prev < hist.length - 1) {
          isUndoRedoAction.current = true;
          const newPointer = prev + 1;
          setShopMap(hist[newPointer]);
          return hist;
        }
        return hist;
      });
      return prev;
    });
  }, []);

  // Global Keyboard listener for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
  // -------------------------

  // Master State for all available products (including custom loaded pallets)
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('dl_products');
    return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
  });

  // Track slotting contents (products in alvéoles) separately per placed rack on the map:
  // Keys are placedRackIds
  const [alveoliStateByRack, setAlveoliStateByRack] = useState<Record<string, Alveolus[]>>(() => {
    const saved = localStorage.getItem('dl_alveoli_state_by_rack');
    if (saved) {
      return JSON.parse(saved);
    }
    
    // Fallback: build default slotting for placed racks
    const initial: Record<string, Alveolus[]> = {};
    DEFAULT_SHOP_MAP.placedRacks.forEach((pr) => {
      const temp = DEFAULT_RACKS.find((t) => t.id === pr.rackTemplateId);
      if (temp) {
        initial[pr.id] = generateEmptyAlveoliForRack(temp);
      }
    });
    return initial;
  });

  // Active edit template in the 3D visualizer
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    return DEFAULT_RACKS[0].id;
  });

  // If editing a specific rack instance from the map, we track its placed ID
  const [activeEditingPlacedId, setActiveEditingPlacedId] = useState<string | null>(null);

  // Quick Notification Banner State
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);

  // Template creation states
  const [showCreateTemplateForm, setShowCreateTemplateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('Nouveau Palettier Modulaire');
  const [newTemplateHeight, setNewTemplateHeight] = useState(3600);
  const [newTemplateWidth, setNewTemplateWidth] = useState(2700);
  const [newTemplateDepth, setNewTemplateDepth] = useState(1100);
  const [newTemplateBins, setNewTemplateBins] = useState(3);

  // Save states to LocalStorage
  useEffect(() => {
    localStorage.setItem('dl_rack_templates', JSON.stringify(rackTemplates));
  }, [rackTemplates]);

  useEffect(() => {
    localStorage.setItem('dl_shop_map', JSON.stringify(shopMap));
  }, [shopMap]);

  useEffect(() => {
    localStorage.setItem('dl_alveoli_state_by_rack', JSON.stringify(alveoliStateByRack));
  }, [alveoliStateByRack]);

  useEffect(() => {
    localStorage.setItem('dl_products', JSON.stringify(products));
  }, [products]);

  // Toast notifier helper
  const showNotification = (msg: string) => {
    setNotifyMessage(msg);
    setTimeout(() => {
      setNotifyMessage(null);
    }, 4000);
  };

  // Helper to construct a fresh set of empty slots based on template parameters
  function generateEmptyAlveoliForRack(rack: Rack): Alveolus[] {
    const arr: Alveolus[] = [];
    const levelsHeights = [0, ...rack.levels.map((l) => l.heightFromGroundMm)];
    const topCap = rack.totalHeightMm;

    levelsHeights.forEach((bottomMm, lIdx) => {
      const topMm = lIdx === rack.levels.length ? topCap : rack.levels[lIdx].heightFromGroundMm - rack.levels[lIdx].beamThicknessMm;
      const heightMm = topMm - bottomMm;
      const currentSlotsCount = getSlotsCountForLevel(rack, lIdx);
      const slotWidthMm = (rack.totalWidthMm - 2 * rack.uprightWidthMm) / currentSlotsCount;

      for (let bIdx = 0; bIdx < currentSlotsCount; bIdx++) {
        const alph = String.fromCharCode(65 + bIdx); // A, B, C, D...
        arr.push({
          id: `alv-L${lIdx}-B${bIdx}`,
          levelIndex: lIdx,
          binIndex: bIdx,
          label: `Niveau ${lIdx} - Alvéole ${alph}`,
          widthMm: slotWidthMm,
          heightMm: heightMm,
          depthMm: rack.depthMm,
          occupied: false,
          product: null,
        });
      }
    });

    return arr;
  }

  // Handle template creation
  const handleCreateTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newRack: Rack = {
      id: `rack-custom-${Date.now()}`,
      name: newTemplateName,
      totalHeightMm: newTemplateHeight,
      totalWidthMm: newTemplateWidth,
      depthMm: newTemplateDepth,
      uprightWidthMm: 90,
      binsPerLevel: newTemplateBins,
      levels: [
        { id: `b-${Date.now()}-1`, levelNumber: 1, heightFromGroundMm: Math.round(newTemplateHeight / 3), beamThicknessMm: 100, maxLoadLbs: 4000 },
        { id: `b-${Date.now()}-2`, levelNumber: 2, heightFromGroundMm: Math.round((newTemplateHeight / 3) * 2), beamThicknessMm: 100, maxLoadLbs: 4000 }
      ],
      createdAt: new Date().toISOString(),
    };

    setRackTemplates([...rackTemplates, newRack]);
    setSelectedTemplateId(newRack.id);
    setShowCreateTemplateForm(false);
    showNotification(`Modèle de rack "${newTemplateName}" créé avec succès !`);
  };

  // Reset workspace
  const handleResetWorkspace = () => {
    if (confirm("Voulez-vous réinitialiser l'ensemble du plan et des configurations ? Vos modifications locales seront effacées.")) {
      localStorage.removeItem('dl_rack_templates');
      localStorage.removeItem('dl_shop_map');
      localStorage.removeItem('dl_alveoli_state_by_rack');
      localStorage.removeItem('dl_products');
      
      setRackTemplates(DEFAULT_RACKS);
      setShopMap(DEFAULT_SHOP_MAP);
      setProducts(DEFAULT_PRODUCTS);
      
      const initial: Record<string, Alveolus[]> = {};
      DEFAULT_SHOP_MAP.placedRacks.forEach((pr) => {
        const temp = DEFAULT_RACKS.find((t) => t.id === pr.rackTemplateId);
        if (temp) {
          initial[pr.id] = generateEmptyAlveoliForRack(temp);
        }
      });
      setAlveoliStateByRack(initial);
      setSelectedTemplateId(DEFAULT_RACKS[0].id);
      setActiveEditingPlacedId(null);
      setActiveTab('2d-map');
      showNotification("Espace de travail réinitialisé aux valeurs d'usine.");
    }
  };

  // Export layout data as JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify({
        templates: rackTemplates,
        map: shopMap,
        alveoli: alveoliStateByRack
      }, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `DL_Warehouse_Layout_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification("Fichier d'implantation exporté avec succès !");
  };

  // Import layout data from JSON
  const handleDataIngested = async (type: 'products' | 'locations' | 'waves', data: any[]) => {
    console.log(`Ingested ${data.length} records for ${type}`);
    if (type === 'products') await saveProducts(data);
    if (type === 'locations') await saveLocations(data);
    if (type === 'waves') await saveWaves(data);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const resultStr = event.target?.result as string;
        const parsed = JSON.parse(resultStr);
        if (parsed.templates && parsed.map && parsed.alveoli) {
          if (parsed.map.backgroundUrl && parsed.map.backgroundUrl.includes('/src/assets/images/')) {
            parsed.map.backgroundUrl = DEFAULT_SHOP_MAP.backgroundUrl;
          }
          setRackTemplates(parsed.templates);
          setShopMap(parsed.map);
          setAlveoliStateByRack(parsed.alveoli);
          showNotification("Configuration d'implantation chargée avec succès !");
        } else {
          showNotification("Erreur: Le format du fichier JSON importé n'est pas correct.");
        }
      } catch (err) {
        showNotification("Erreur lors de la lecture du fichier JSON.");
      }
    };
    reader.readAsText(file);
  };

  // Duplicate a placed rack with its associated alveoli state (stock assignment)
  const handleDuplicatePlacedRack = (placedId: string) => {
    const original = shopMap.placedRacks.find(r => r.id === placedId);
    if (!original) return '';

    const newId = `placed-${Date.now()}`;
    const newPlaced: PlacedRack = {
      ...original,
      id: newId,
      customLabel: `${original.customLabel} (Copie)`,
      // Offset position slightly to make the copy visible
      x: Math.min(shopMap.widthMeters - original.gridWidth, original.x + 1.5),
      y: Math.min(shopMap.lengthMeters - original.gridLength, original.y + 1.5),
    };

    // Duplicate corresponding stock (alveoli) configuration
    const originalAlveoli = alveoliStateByRack[placedId];
    if (originalAlveoli) {
      const clonedAlveoli = JSON.parse(JSON.stringify(originalAlveoli));
      setAlveoliStateByRack((prev) => ({
        ...prev,
        [newId]: clonedAlveoli,
      }));
    } else {
      // If none existed, generate a fresh blank list for the new instance
      const template = rackTemplates.find((r) => r.id === original.rackTemplateId);
      if (template) {
        setAlveoliStateByRack((prev) => ({
          ...prev,
          [newId]: generateEmptyAlveoliForRack(template),
        }));
      }
    }

    setShopMap((prev) => ({
      ...prev,
      placedRacks: [...prev.placedRacks, newPlaced],
    }));

    showNotification(`Rack "${original.customLabel}" dupliqué avec son stock !`);
    return newId;
  };

  const handleBatchDuplicatePlacedRack = (placedId: string, count: number, direction: 'horizontal' | 'vertical', spacing: number) => {
    const original = shopMap.placedRacks.find(r => r.id === placedId);
    if (!original) return '';

    const newRacks: PlacedRack[] = [];
    const newAlveoliState = { ...alveoliStateByRack };
    const originalAlveoli = alveoliStateByRack[placedId];

    let currentX = original.x;
    let currentY = original.y;
    
    // Adjust spacing if rack is rotated
    const isRotated = original.rotation === 90 || original.rotation === 270;
    const effWidth = isRotated ? original.gridLength : original.gridWidth;
    const effLength = isRotated ? original.gridWidth : original.gridLength;

    for (let i = 0; i < count; i++) {
      if (direction === 'horizontal') {
        currentX += effWidth + spacing;
      } else {
        currentY += effLength + spacing;
      }

      const newId = `placed-${Date.now()}-${i}`;
      newRacks.push({
        ...original,
        id: newId,
        customLabel: `${original.customLabel} (Copie ${i + 1})`,
        x: Math.min(shopMap.widthMeters - effWidth, Math.max(0, currentX)),
        y: Math.min(shopMap.lengthMeters - effLength, Math.max(0, currentY)),
      });

      if (originalAlveoli) {
        newAlveoliState[newId] = JSON.parse(JSON.stringify(originalAlveoli));
      } else {
        const template = rackTemplates.find((r) => r.id === original.rackTemplateId);
        if (template) {
          newAlveoliState[newId] = generateEmptyAlveoliForRack(template);
        }
      }
    }

    setShopMap(prev => ({
      ...prev,
      placedRacks: [...prev.placedRacks, ...newRacks]
    }));
    
    setAlveoliStateByRack(newAlveoliState);
    
    showNotification(`${count} racks générés à partir de "${original.customLabel}"`);
    return newRacks.length > 0 ? newRacks[newRacks.length - 1].id : '';
  };

  // Callback to edit a specific placed rack on map in 3D Viewport
  const handleSelectRackFor3D = (templateId: string, placedRackId?: string) => {
    setSelectedTemplateId(templateId);
    if (placedRackId) {
      setActiveEditingPlacedId(placedRackId);
      
      // If this instance does not have slots initialized in state yet, build them!
      if (!alveoliStateByRack[placedRackId]) {
        const template = rackTemplates.find((r) => r.id === templateId);
        if (template) {
          setAlveoliStateByRack({
            ...alveoliStateByRack,
            [placedRackId]: generateEmptyAlveoliForRack(template),
          });
        }
      }
      showNotification(`Focus activé sur le rack "${shopMap.placedRacks.find(r => r.id === placedRackId)?.customLabel}"`);
    } else {
      setActiveEditingPlacedId(null);
    }
    setActiveTab('3d-configurator');
  };

  // Active elements references
  const activeTemplate = rackTemplates.find((t) => t.id === selectedTemplateId) || rackTemplates[0];

  // Retrieve current active slots (either the instance's specific slot states, or template's fallback slots)
  const activeAlveoli = activeEditingPlacedId
    ? alveoliStateByRack[activeEditingPlacedId] || generateEmptyAlveoliForRack(activeTemplate)
    : generateEmptyAlveoliForRack(activeTemplate);

  // Update active slots
  const handleAlveoliChange = (updatedAlveoli: Alveolus[]) => {
    if (activeEditingPlacedId) {
      setAlveoliStateByRack({
        ...alveoliStateByRack,
        [activeEditingPlacedId]: updatedAlveoli,
      });
    } else {
      // General Template scratchpad (save to templates dictionary for simulation)
      // Since template is generic, we can just save to a general local state or notification
      showNotification("Modifications de stock enregistrées pour cette session de simulation !");
    }
  };

  // When a rack template structure itself is updated in 3D:
  const handleRackTemplateChange = (updatedRack: Rack) => {
    // 1. Update the template list
    const updatedTemplates = rackTemplates.map((r) => (r.id === updatedRack.id ? updatedRack : r));
    setRackTemplates(updatedTemplates);

    // 2. Synchronize dimensions for all instances on the 2D map using this template!
    const updatedPlacedRacks = shopMap.placedRacks.map((pr) => {
      if (pr.rackTemplateId === updatedRack.id) {
        return {
          ...pr,
          gridWidth: updatedRack.totalWidthMm / 1000,
          gridLength: updatedRack.depthMm / 1000,
        };
      }
      return pr;
    });
    setShopMap({
      ...shopMap,
      placedRacks: updatedPlacedRacks,
    });

    // 3. Re-generate / Synchronize slot definitions for all instances of this template
    // preserving as many loaded products as possible based on LevelIndex and BinIndex coordinates!
    const nextAlveoliState = { ...alveoliStateByRack };
    
    // Update instances matching this template
    shopMap.placedRacks.forEach((pr) => {
      if (pr.rackTemplateId === updatedRack.id) {
        const oldSlots = alveoliStateByRack[pr.id] || [];
        const freshSlots = generateEmptyAlveoliForRack(updatedRack);

        // Map old products into new slots matching same levelIndex and binIndex
        const mergedSlots = freshSlots.map((newS) => {
          const match = oldSlots.find((oldS) => oldS.levelIndex === newS.levelIndex && oldS.binIndex === newS.binIndex);
          if (match && match.occupied) {
            return {
              ...newS,
              occupied: true,
              product: match.product,
            };
          }
          return newS;
        });

        nextAlveoliState[pr.id] = mergedSlots;
      }
    });

    setAlveoliStateByRack(nextAlveoliState);
    showNotification(`Structure du modèle "${updatedRack.name}" mise à jour.`);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] font-sans text-slate-200 flex flex-col selection:bg-cyan-900 selection:text-cyan-100">
      {/* Global Header */}
      <header className="bg-[#111827] border-b border-slate-800 shadow-sm sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
              <Layers size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-display font-extrabold text-slate-100 tracking-tight leading-none">
                SMART <span className="text-cyan-400">SLOTTING</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">PWA OFFLINE ENGINE</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-cyan-400 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
            >
              <Info size={14} />
              Help / SOP
            </button>
            <button
              onClick={handleResetWorkspace}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
              title="Purger toutes les données"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Download size={15} />
              Exporter
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-violet-900/40 hover:bg-violet-800/60 text-violet-300 border border-violet-700/50 text-xs font-bold rounded-lg transition-colors cursor-pointer">
              <FileJson size={15} />
              Importer
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
            
            <div className="flex items-center bg-slate-800 rounded-lg p-1 gap-1 border border-slate-700">
              <select 
                value={lengthUnit} 
                onChange={e => setLengthUnit(e.target.value as LengthUnit)}
                className="bg-transparent text-xs font-bold text-slate-300 focus:outline-none cursor-pointer pl-2 pr-1 py-1"
                title="Unité de Longueur"
              >
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="in">pouce (in)</option>
                <option value="ft">pied (ft)</option>
              </select>
              <div className="w-[1px] h-4 bg-slate-700"></div>
              <select 
                value={volumeUnit} 
                onChange={e => setVolumeUnit(e.target.value as VolumeUnit)}
                className="bg-transparent text-xs font-bold text-slate-300 focus:outline-none cursor-pointer pl-1 pr-2 py-1"
                title="Unité de Volume"
              >
                <option value="L">L</option>
                <option value="m3">m³</option>
                <option value="cm3">cm³</option>
                <option value="in3">po³</option>
                <option value="ft3">pi³</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      
      {/* SOP / Help Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Info size={18} className="text-cyan-400" />
                Standard Operating Procedures (SOP) & Help
              </h2>
              <button onClick={() => setIsHelpModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6 text-sm text-slate-300">
              <section>
                <h3 className="text-cyan-400 font-bold mb-2 uppercase text-xs tracking-wide">1. PWA Offline Engine</h3>
                <p>This application is a 100% Offline-First Progressive Web App. All computations, including Jaccard similarity matrices and Manhattan distance algorithms, run securely in your local browser using Web Workers. No data is sent to external servers.</p>
              </section>
              <section>
                <h3 className="text-cyan-400 font-bold mb-2 uppercase text-xs tracking-wide">2. Data Ingestion</h3>
                <p>Use the "Ingestion" tab to load your <code>Product.csv</code>, <code>Storage_Location.csv</code>, and <code>Picking_Wave.csv</code> files. The system automatically stores these in IndexedDB for persistence.</p>
              </section>
              <section>
                <h3 className="text-violet-400 font-bold mb-2 uppercase text-xs tracking-wide">3. Dynamic Slotting (Digital Twin)</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Velocity Heatmap:</strong> Visualizes Class A (Teal), Class B (Violet), and Class C (Dark) items based on pick frequency.</li>
                  <li><strong>Co-occurrence:</strong> Highlights product affinities to optimize multi-line order picking routes.</li>
                  <li><strong>Move Queue:</strong> Generates automated relocation tasks evaluated against drift thresholds, weight limits, and ergonomics (golden zone).</li>
                </ul>
              </section>
              <section>
                <h3 className="text-emerald-400 font-bold mb-2 uppercase text-xs tracking-wide">4. Keyboard Shortcuts</h3>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-slate-800 p-2 rounded flex justify-between"><span>Switch to Ingestion</span><kbd className="font-mono text-xs bg-slate-950 px-1 rounded">1</kbd></div>
                  <div className="bg-slate-800 p-2 rounded flex justify-between"><span>Switch to Catalog</span><kbd className="font-mono text-xs bg-slate-950 px-1 rounded">2</kbd></div>
                  <div className="bg-slate-800 p-2 rounded flex justify-between"><span>Switch to Mapping</span><kbd className="font-mono text-xs bg-slate-950 px-1 rounded">3</kbd></div>
                  <div className="bg-slate-800 p-2 rounded flex justify-between"><span>Switch to Dashboard</span><kbd className="font-mono text-xs bg-slate-950 px-1 rounded">4</kbd></div>
                </div>
              </section>
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
              <button onClick={() => setIsHelpModalOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold text-xs">Acknowledge</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-6 py-8 flex flex-col items-center w-full max-w-[100vw] overflow-x-hidden">
        {/* Navigation Tabs (Centered) */}
        <div className="w-full max-w-7xl mx-auto mb-8 print:hidden">
          {/* Mobile Dropdown */}
          <div className="md:hidden relative z-50">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-full bg-[#111827] border border-slate-800 text-cyan-400 text-sm font-bold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 flex justify-between items-center"
            >
              <span>{
                activeTab === 'ingestion' ? 'Data Ingestion' :
                activeTab === '2d-map' ? "Plan d'Implantation 2D" :
                activeTab === '3d-configurator' ? "Modélisation Alvéoles" :
                activeTab === 'diagnostic' ? "Fiche Diagnostic (A4)" :
                activeTab === 'analytics' ? "Performances" :
                "Jumeau Numérique 3D"
              }</span>
              <ChevronDown size={16} className={`transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isMobileMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border border-slate-800 rounded-xl shadow-xl overflow-hidden z-50">
                {[
                  { id: 'ingestion', label: 'Data Ingestion' },
                  { id: '2d-map', label: "Plan d'Implantation 2D" },
                  { id: '3d-configurator', label: "Modélisation Alvéoles" },
                  { id: 'diagnostic', label: "Fiche Diagnostic (A4)" },
                  { id: 'analytics', label: "Performances" },
                  { id: 'digital-twin', label: "Jumeau Numérique 3D" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${activeTab === item.id ? 'bg-cyan-900/40 text-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex bg-[#111827] backdrop-blur-xl border border-slate-800 p-1.5 rounded-xl gap-1 shadow-sm max-w-max mx-auto overflow-x-auto whitespace-nowrap no-scrollbar">
          <button
            id="tab-btn-ingestion"
            onClick={() => setActiveTab('ingestion')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ingestion'
                ? 'bg-cyan-900 text-cyan-100 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database size={15} />
            Data Ingestion
          </button>
          
          <button
            id="tab-btn-map"
            onClick={() => setActiveTab('2d-map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === '2d-map'
                ? 'bg-cyan-900 text-cyan-100 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid size={15} />
            Plan d'Implantation 2D
          </button>
          
          <button
            id="tab-btn-3d"
            onClick={() => setActiveTab('3d-configurator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === '3d-configurator'
                ? 'bg-cyan-900 text-cyan-100 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={15} />
            Modélisation Alvéoles
          </button>

          <button
            id="tab-btn-diag"
            onClick={() => setActiveTab('diagnostic')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'diagnostic'
                ? 'bg-cyan-900 text-cyan-100 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText size={15} />
            Fiche Diagnostic (A4)
          </button>
          
          <button
            id="tab-btn-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-cyan-900 text-cyan-100 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity size={15} />
            Performances
          </button>
          <button
            id="tab-btn-digital-twin"
            onClick={() => setActiveTab('digital-twin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'digital-twin'
                ? 'bg-[#121214] text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-1 ring-cyan-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box size={15} />
            Jumeau Numérique 3D
          </button>
          
          <button
            id="btn-fullscreen-map"
            onClick={() => setIsFullScreenMapOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer bg-slate-800 text-slate-100 hover:bg-slate-700 shadow-md ml-4 hidden md:flex"
          >
            <Maximize size={15} />
            Map 2D (Plein Écran)
          </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'ingestion' && (
            <motion.div 
              key="ingestion"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-5xl mx-auto flex-1 flex flex-col min-h-[500px]"
            >
              <CsvIngestionPanel onDataIngested={handleDataIngested} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === '2d-map' && (
            <motion.div 
              key="2d-map"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-7xl mx-auto flex-1 flex flex-col"
            >
              <Suspense fallback={<div className="flex-1 flex items-center justify-center p-10 text-slate-500 font-medium animate-pulse">Chargement de la carte...</div>}><ShopFloorMap
              shopMap={shopMap}
              onChangeShopMap={setShopMap}
              rackTemplates={rackTemplates}
              onSelectRackFor3D={handleSelectRackFor3D}
              alveoliStateByRack={alveoliStateByRack}
              onDuplicatePlacedRack={handleDuplicatePlacedRack}
              onBatchDuplicatePlacedRack={handleBatchDuplicatePlacedRack}
              onUndo={undo}
              onRedo={redo}
              canUndo={historyPointer > 0}
              canRedo={historyPointer < history.length - 1}
              /></Suspense>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === '3d-configurator' && (
            <motion.div 
              key="3d-configurator"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-7xl mx-auto space-y-6"
            >
            {/* Context Selector general template (Hidden if instance active) */}
            {!activeEditingPlacedId && (
              <div className="frosted-glass rounded-xl p-4 shadow-lg flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Sélectionner un modèle général à éditer :</span>
                  <select
                    id="select-general-template-3d"
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectRackFor3D(e.target.value)}
                    className="text-xs font-bold text-slate-200 bg-slate-800 px-3 py-1.5 border border-slate-700 text-slate-200 rounded-lg focus:outline-none cursor-pointer"
                  >
                    {rackTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setShowCreateTemplateForm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <Plus size={14} />
                  Nouveau Gabarit
                </button>
              </div>
            )}

            {activeEditingPlacedId && (
              <div className="bg-cyan-900/40 border border-cyan-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-3 text-cyan-200">
                  <Info size={18} className="text-cyan-400" />
                  <div>
                    <div className="text-sm font-bold">Édition d'une instance spécifique (Surcharge Locale)</div>
                    <div className="text-xs">
                      Vous modifiez le contenu du rack <span className="font-mono bg-cyan-900/60 text-cyan-200 px-1 rounded">{shopMap.placedRacks.find(r => r.id === activeEditingPlacedId)?.customLabel}</span>. 
                      Ces modifications n'affectent que cette instance sur le plan 2D.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveEditingPlacedId(null)}
                  className="px-3 py-1.5 bg-[#111827] text-cyan-400 border border-cyan-600/50 text-xs font-bold rounded-lg hover:bg-cyan-900/50 transition-colors cursor-pointer"
                >
                  Retour aux modèles généraux
                </button>
              </div>
            )}

            <RackVisualizer3D
              rack={activeTemplate}
              alveoli={activeAlveoli}
              onChangeRack={handleRackTemplateChange}
              onChangeAlveoli={handleAlveoliChange}
              availableProducts={products}
              onAddCustomProduct={(newProd) => setProducts([...products, newProd])}
              onDeleteCustomProduct={(id) => setProducts(products.filter(p => p.id !== id))}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'diagnostic' && (
            <motion.div 
              key="diagnostic"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-7xl mx-auto space-y-4"
            >
            <div className="frosted-glass rounded-xl p-4 shadow-lg flex flex-wrap justify-between items-center gap-4 print:hidden">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span>Cibler le rack pour la fiche diagnostic :</span>
                <select
                  id="select-diagnostic-target"
                  value={activeEditingPlacedId || selectedTemplateId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matchedPlaced = shopMap.placedRacks.find(r => r.id === val);
                    if (matchedPlaced) {
                      setActiveEditingPlacedId(val);
                      setSelectedTemplateId(matchedPlaced.rackTemplateId);
                    } else {
                      setActiveEditingPlacedId(null);
                      setSelectedTemplateId(val);
                    }
                  }}
                  className="text-xs font-bold text-slate-200 bg-slate-800 px-3 py-1.5 border border-slate-700 text-slate-200 rounded-lg cursor-pointer"
                >
                  <optgroup label="Racks Implantés sur le Plan 2D" className="bg-[#111827] text-slate-200">
                    {shopMap.placedRacks.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.customLabel} ({rackTemplates.find(t => t.id === pr.rackTemplateId)?.name})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Modèles Génériques" className="bg-[#111827] text-slate-200">
                    {rackTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        Gabarit : {t.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <p className="text-xs text-slate-500 font-medium">
                La fiche s'adapte automatiquement avec les dimensions, produits et consignes EN 15635 du rack ciblé.
              </p>
            </div>

            <DiagnosticReport
              rack={activeTemplate}
              alveoli={activeAlveoli}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'analytics' && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-7xl mx-auto flex-1 flex flex-col"
            >
            <AnalyticsDashboard
              shopMap={shopMap}
              alveoliStateByRack={alveoliStateByRack}
              rackTemplates={rackTemplates}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'digital-twin' && (
            <motion.div 
              key="digital-twin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-7xl mx-auto h-full flex-1 flex flex-col min-h-[700px]"
            ><DigitalTwinDashboard
            shopMap={shopMap}
            rackTemplates={rackTemplates}
            alveoliStateByRack={alveoliStateByRack}
            products={products}
            /></motion.div>
          )}
        </AnimatePresence>

        {isFullScreenMapOpen && (
          <FullScreenMap
            shopMap={shopMap}
            rackTemplates={rackTemplates}
            alveoliStateByRack={alveoliStateByRack}
            onClose={() => setIsFullScreenMapOpen(false)}
          />
        )}
      </main>

      
      {/* Quick Notification Banner */}
      {notifyMessage && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl font-bold text-sm z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <Check size={18} />
          {notifyMessage}
        </div>
      )}

      {/* Modal New Template */}
      {showCreateTemplateForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] rounded-2xl shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-extrabold text-slate-200 flex items-center gap-2">
                <Plus size={20} className="text-cyan-400" />
                Nouveau Gabarit de Palettier
              </h2>
              <button onClick={() => setShowCreateTemplateForm(false)} className="text-slate-400 hover:text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTemplateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nom du modèle</label>
                <input type="text" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} required className="w-full text-sm px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Hauteur (mm)</label>
                  <input type="number" value={newTemplateHeight} onChange={e => setNewTemplateHeight(Number(e.target.value))} required className="w-full text-sm px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Largeur (mm)</label>
                  <input type="number" value={newTemplateWidth} onChange={e => setNewTemplateWidth(Number(e.target.value))} required className="w-full text-sm px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Profondeur (mm)</label>
                  <input type="number" value={newTemplateDepth} onChange={e => setNewTemplateDepth(Number(e.target.value))} required className="w-full text-sm px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Alvéoles par niveau</label>
                <input type="number" value={newTemplateBins} onChange={e => setNewTemplateBins(Number(e.target.value))} required className="w-full text-sm px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateTemplateForm(false)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:bg-slate-800 rounded-lg">Annuler</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-md shadow-sky-600/30">Créer le gabarit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Brand Footer */}
      <footer className="bg-slate-800/90 backdrop-blur-md text-slate-400 text-xs py-6 mt-12 border-t border-slate-700 print:hidden">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-200 font-extrabold">
              <Shield size={16} className="text-cyan-400" />
              <span className="font-display tracking-wider">DL. MAPPING · ENGINE</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Application d'optimisation d'alvéoles logistiques et d'implantation en entrepôt.</p>
          </div>
          <div className="text-[11px] text-slate-500">
            Cabinet Certifié de Diagnostic & Conformité EN 15635 · &copy; 2026. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
