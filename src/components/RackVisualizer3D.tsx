/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { formatLength, formatVolume } from '../utils/units';
import { Rack, Alveolus, Product, BeamLevel, getSlotsCountForLevel } from '../types';
import { Plus, Trash2, Box, HelpCircle, AlertTriangle, ArrowUpDown, ShieldAlert, CheckCircle, Move, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AddLevelModal } from './RackModals/AddLevelModal';
import { StructureConfigModal } from './RackModals/StructureConfigModal';
import { LevelEditModal } from './RackModals/LevelEditModal';
import { RackKPIs } from './RackVisualizer/RackKPIs';
import { RackAlveoliTable } from './RackVisualizer/RackAlveoliTable';
import { checkTMDCompatibility } from '../utils/tmdMatrix';
import { ErgonomicAnalysis } from './RackVisualizer/ErgonomicAnalysis';
import { useCustomPalletForm } from './RackVisualizer/useCustomPalletForm';

interface RackVisualizer3DProps {
  rack: Rack;
  onChangeRack: (updatedRack: Rack) => void;
  alveoli: Alveolus[];
  onChangeAlveoli: (updatedAlveoli: Alveolus[]) => void;
  availableProducts: Product[];
  onAddCustomProduct: (newProd: Product) => void;
  onDeleteCustomProduct: (id: string) => void;
}

export interface CollisionResult {
  hasCollision: boolean;
  reasons: string[];
  collidesWithUprights: boolean;
  collidesWithBeams: boolean;
  collidesWithAdjacent: string[]; // IDs of adjacent alveoli it collides with
}


// Matrice de ségrégation des matières dangereuses (TMD / RMD)
// P = Permis, X = Interdit, A = Autorisée (sous condition), FS = Séparation Feu
const tmdMatrix: Record<string, Record<string, string>> = {
  '2.1': { '2.1': 'P', '2.2': 'P', '2.3': 'X', '3': 'P', '4.1': 'P', '4.2': 'A', '4.3': 'FS', '5.1': 'X', '5.2': 'X', '6.1': 'X', '8': 'X' },
  '2.2': { '2.1': 'P', '2.2': 'P', '2.3': 'P', '3': 'P', '4.1': 'P', '4.2': 'P', '4.3': 'P', '5.1': 'P', '5.2': 'P', '6.1': 'P', '8': 'P' },
  '2.3': { '2.1': 'X', '2.2': 'P', '2.3': 'P', '3': 'X', '4.1': 'A', '4.2': 'A', '4.3': 'FS', '5.1': 'A', '5.2': 'X', '6.1': 'FS', '8': 'A' },
  '3': { '2.1': 'P', '2.2': 'P', '2.3': 'X', '3': 'P', '4.1': 'P', '4.2': 'A', '4.3': 'A', '5.1': 'X', '5.2': 'X', '6.1': 'FS', '8': 'A' },
  '4.1': { '2.1': 'P', '2.2': 'P', '2.3': 'A', '3': 'P', '4.1': 'P', '4.2': 'A', '4.3': 'FS', '5.1': 'X', '5.2': 'X', '6.1': 'FS', '8': 'A' },
  '4.2': { '2.1': 'A', '2.2': 'P', '2.3': 'A', '3': 'A', '4.1': 'A', '4.2': 'P', '4.3': 'FS', '5.1': 'X', '5.2': 'X', '6.1': 'FS', '8': 'A' },
  '4.3': { '2.1': 'FS', '2.2': 'P', '2.3': 'FS', '3': 'A', '4.1': 'FS', '4.2': 'FS', '4.3': 'P', '5.1': 'X', '5.2': 'X', '6.1': 'FS', '8': 'X' },
  '5.1': { '2.1': 'X', '2.2': 'P', '2.3': 'A', '3': 'X', '4.1': 'X', '4.2': 'X', '4.3': 'X', '5.1': 'P', '5.2': 'X', '6.1': 'A', '8': 'X' },
  '5.2': { '2.1': 'X', '2.2': 'P', '2.3': 'X', '3': 'X', '4.1': 'X', '4.2': 'X', '4.3': 'X', '5.1': 'X', '5.2': 'P', '6.1': 'X', '8': 'X' },
  '6.1': { '2.1': 'X', '2.2': 'P', '2.3': 'FS', '3': 'FS', '4.1': 'FS', '4.2': 'FS', '4.3': 'FS', '5.1': 'A', '5.2': 'X', '6.1': 'P', '8': 'A' },
  '8': { '2.1': 'X', '2.2': 'P', '2.3': 'A', '3': 'A', '4.1': 'A', '4.2': 'A', '4.3': 'X', '5.1': 'X', '5.2': 'X', '6.1': 'A', '8': 'P' },
};

function checkHazardSegregation(p1: Product, p2: Product): string | null {
  if (!p1.tmdClass || !p2.tmdClass || p1.tmdClass === 'None' || p2.tmdClass === 'None') return null;
  const rule = tmdMatrix[p1.tmdClass]?.[p2.tmdClass];
  if (rule === 'X') {
    return `Incompatibilité chimique TMD (RMD Art. 41) : Classe ${p1.tmdClass} et Classe ${p2.tmdClass} interdites d'être stockées de manière adjacente.`;
  } else if (rule === 'FS') {
    return `Séparation incendie requise TMD : Classe ${p1.tmdClass} et Classe ${p2.tmdClass} nécessitent une barrière coupe-feu (FS).`;
  }
  return null;
}

export const checkCollisions = (
  targetAlv: Alveolus,
  prod: Product,
  allAlveoli: Alveolus[],
  rack: Rack,
  targetPickBinIndex?: number,
  lengthUnit: any = "mm"
): CollisionResult => {
  const reasons: string[] = [];
  let collidesWithUprights = false;
  let collidesWithBeams = false;
  const collidesWithAdjacent: string[] = [];

  // 1. Get product dimensions (fallback to default sizes if none specified)
  const pWidth = prod.widthMm || 1200;
  const pHeight = prod.heightMm || 1200;
  const pDepth = prod.depthMm || 800;

  // 2. Get slot parameters
  const currentSlotsCount = getSlotsCountForLevel(rack, targetAlv.levelIndex);
  const slotWidthMm = (rack.totalWidthMm - 2 * rack.uprightWidthMm) / currentSlotsCount;
  const subdivCount = targetAlv.isSubdivided ? (targetAlv.subdivisionCount || 1) : 1;
  const targetBinWidth = slotWidthMm / subdivCount;
  const pbIdx = targetPickBinIndex !== undefined ? targetPickBinIndex : 0;

  // Vertical clearance check with the beam above (or total height)
  if (pHeight > targetAlv.heightMm) {
    collidesWithBeams = true;
    reasons.push(
      `Hauteur excessive (${formatLength(pHeight, lengthUnit)}) : Le colis entre en collision verticale avec la lisse supérieure (hauteur disponible utile : ${formatLength(targetAlv.heightMm, lengthUnit)}).`
    );
  }

  
  // Check weight capacity
  // 1. Level capacity
  const targetLevel = rack.levels.find(l => l.levelNumber === targetLIdx);
  if (targetLevel && targetLevel.maxLoadLbs) {
    let currentLevelWeight = 0;
    allAlveoli.filter(a => a.levelIndex === targetLIdx).forEach(a => {
      if (a.id !== targetAlv.id) {
        if (a.isSubdivided && a.pickBins) {
           a.pickBins.forEach(b => { if (b.occupied && b.product) currentLevelWeight += (b.product.weight || 0); });
        } else if (a.occupied && a.product) {
           currentLevelWeight += (a.product.weight || 0);
        }
      } else {
        if (a.isSubdivided && a.pickBins) {
           a.pickBins.forEach((b, idx) => { if (idx !== pbIdx && b.occupied && b.product) currentLevelWeight += (b.product.weight || 0); });
        }
      }
    });
    if (currentLevelWeight + (prod.weight || 0) > targetLevel.maxLoadLbs) {
      reasons.push(`Surcharge Lisse : Le poids total du niveau (${currentLevelWeight + (prod.weight || 0)} lbs) dépasserait la capacité maximale de ${targetLevel.maxLoadLbs} lbs.`);
      collidesWithBeams = true; // Use this to trigger error visuals
    }
  }

  // Validation Solaire/Sismique de la capacité (CCQ/CNB 2020)
  const certYear = rack.certificationYear || 1990;
  let dynamicMaxLoad = rack.maxLoadLbs || 25000;
  if (certYear >= 2022) {
    dynamicMaxLoad = Math.min(dynamicMaxLoad, 15000);
  } else if (certYear >= 2000) {
    dynamicMaxLoad = Math.min(dynamicMaxLoad, 20000);
  } else if (certYear >= 1990) {
    dynamicMaxLoad = Math.min(dynamicMaxLoad, 23000);
  } else {
    dynamicMaxLoad = Math.min(dynamicMaxLoad, 25000);
  }

  // 2. Total rack capacity (remplacé pour utiliser dynamicMaxLoad)
  if (true) {
    let currentRackWeight = 0;
    allAlveoli.forEach(a => {
      if (a.id !== targetAlv.id) {
        if (a.isSubdivided && a.pickBins) {
           a.pickBins.forEach(b => { if (b.occupied && b.product) currentRackWeight += (b.product.weight || 0); });
        } else if (a.occupied && a.product) {
           currentRackWeight += (a.product.weight || 0);
        }
      } else {
        if (a.isSubdivided && a.pickBins) {
           a.pickBins.forEach((b, idx) => { if (idx !== pbIdx && b.occupied && b.product) currentRackWeight += (b.product.weight || 0); });
        }
      }
    });
    if (currentRackWeight + (prod.weight || 0) > dynamicMaxLoad) {
      reasons.push(`Surcharge Rack (Sismique ${certYear}) : Le poids total du rack (${currentRackWeight + (prod.weight || 0)} lbs) dépasserait la capacité admissible de ${dynamicMaxLoad} lbs.`);
      collidesWithUprights = true;
    }
  }

  // 3. Horizontal overlap checks
  const targetBIdx = targetAlv.binIndex;
  const targetLIdx = targetAlv.levelIndex;

  const targetSlotStart = rack.uprightWidthMm + targetBIdx * slotWidthMm + (targetAlv.isSubdivided ? pbIdx * targetBinWidth : 0);
  const targetSlotCenter = targetSlotStart + (targetAlv.isSubdivided ? targetBinWidth : slotWidthMm) / 2;
  const targetLeft = targetSlotCenter - pWidth / 2;
  const targetRight = targetSlotCenter + pWidth / 2;

  // Left upright check (Norme CSA A344 : 75 mm de dégagement)
  if (targetLeft < rack.uprightWidthMm + 75) {
    collidesWithUprights = true;
    reasons.push(
      `Dégagement latéral gauche insuffisant (CSA A344) : Il faut au minimum ${formatLength(75, lengthUnit)} de jeu entre la charge et le montant (actuel: ${formatLength(targetLeft - rack.uprightWidthMm, lengthUnit)}).`
    );
  }

  // Right upright check (Norme CSA A344 : 75 mm de dégagement)
  const rightUprightStart = rack.totalWidthMm - rack.uprightWidthMm;
  if (targetRight > rightUprightStart - 75) {
    collidesWithUprights = true;
    reasons.push(
      `Dégagement latéral droit insuffisant (CSA A344) : Il faut au minimum ${formatLength(75, lengthUnit)} de jeu entre la charge et le montant (actuel: ${formatLength(rightUprightStart - targetRight, lengthUnit)}).`
    );
  }

  // Check collision inside the same subdivided alveolus
  if (targetAlv.isSubdivided && targetAlv.pickBins) {
    targetAlv.pickBins.forEach((bin, idx) => {
      if (idx !== pbIdx && bin.occupied && bin.product) {
        const otherWidth = bin.product.widthMm || 1200;
        const otherSlotStart = rack.uprightWidthMm + targetBIdx * slotWidthMm + idx * targetBinWidth;
        const otherSlotCenter = otherSlotStart + targetBinWidth / 2;
        const otherLeft = otherSlotCenter - otherWidth / 2;
        const otherRight = otherSlotCenter + otherWidth / 2;

        const overlapStart = Math.max(targetLeft, otherLeft);
        const overlapEnd = Math.min(targetRight, otherRight);

        if (overlapStart < overlapEnd + 75) {
          collidesWithAdjacent.push(targetAlv.id);
          const clearance = Math.round(otherLeft - targetRight);
          if (overlapStart < overlapEnd) {
             const overlapAmt = Math.round(overlapEnd - overlapStart);
             reasons.push(
               `Collision Bac interne : Chevauchement de ${formatLength(overlapAmt, lengthUnit)} avec le produit du bac voisin ${bin.label} (${bin.product.name}).`
             );
          } else {
             reasons.push(
               `Dégagement latéral insuffisant (CSA A344) : ${formatLength(clearance, lengthUnit)} de jeu avec le bac voisin ${bin.label} (minimum ${formatLength(75, lengthUnit)} requis).`
             );
          }
        }
      }
    });
  }

  // Check collision with adjacent products on the SAME level
  allAlveoli.forEach((otherAlv) => {
    // Only check other occupied slots on the same level (and skip checking itself if same alveolus, handled above for inner bins)
    if (otherAlv.id !== targetAlv.id && otherAlv.levelIndex === targetLIdx && otherAlv.occupied) {
      if (otherAlv.isSubdivided && otherAlv.pickBins) {
        const otherSubdivCount = otherAlv.subdivisionCount || 1;
        const otherBinWidth = slotWidthMm / otherSubdivCount;
        otherAlv.pickBins.forEach((otherBin, otherPbIdx) => {
          if (otherBin.occupied && otherBin.product) {
            const otherProd = otherBin.product;
            const otherWidth = otherProd.widthMm || 1200;
            const otherSlotStart = rack.uprightWidthMm + otherAlv.binIndex * slotWidthMm + otherPbIdx * otherBinWidth;
            const otherSlotCenter = otherSlotStart + otherBinWidth / 2;
            const otherLeft = otherSlotCenter - otherWidth / 2;
            const otherRight = otherSlotCenter + otherWidth / 2;

            const overlapStart = Math.max(targetLeft, otherLeft);
            const overlapEnd = Math.min(targetRight, otherRight);

            if (overlapStart < overlapEnd) {
              collidesWithAdjacent.push(otherAlv.id);
              const overlapAmt = Math.round(overlapEnd - overlapStart);
              reasons.push(
                `Collision alvéole adjacente : Chevauchement de ${formatLength(overlapAmt, lengthUnit)} avec le produit du bac voisin ${otherBin.label} (${otherProd.name}).`
              );
            }
          }
        });
      } else if (otherAlv.product) {
        const otherProd = otherAlv.product;
        const otherWidth = otherProd.widthMm || 1200;
        
        const otherSlotStart = rack.uprightWidthMm + otherAlv.binIndex * slotWidthMm;
        const otherSlotCenter = otherSlotStart + slotWidthMm / 2;
        const otherLeft = otherSlotCenter - otherWidth / 2;
        const otherRight = otherSlotCenter + otherWidth / 2;

        // Check overlap of intervals [targetLeft, targetRight] and [otherLeft, otherRight]
        const overlapStart = Math.max(targetLeft, otherLeft);
        const overlapEnd = Math.min(targetRight, otherRight);

        if (overlapStart < overlapEnd) {
          collidesWithAdjacent.push(otherAlv.id);
          const overlapAmt = Math.round(overlapEnd - overlapStart);
          reasons.push(
            `Collision alvéole adjacente : Chevauchement de ${formatLength(overlapAmt, lengthUnit)} avec la palette de l'alvéole voisine ${otherAlv.id} (${otherProd.name}).`
          );
        }
      }
    }
  });

  
  // 4. TMD Compatibility Check (Matrice d'incompatibilité chimique TMD)
  const getProductAt = (lIdx: number, bIdx: number, subIdx?: number) => {
    const a = allAlveoli.find(a => a.levelIndex === lIdx && a.binIndex === bIdx);
    if (!a || !a.occupied) return null;
    if (a.isSubdivided && a.pickBins && subIdx !== undefined) {
      return a.pickBins[subIdx]?.product || null;
    }
    return a.product || null;
  };

  const getAdjacentProducts = () => {
    const products: Array<{p: Product, dir: string, alvId: string}> = [];
    if (!targetAlv.isSubdivided) {
      const leftP = getProductAt(targetLIdx, targetBIdx - 1);
      if (leftP) products.push({p: leftP, dir: 'Gauche', alvId: allAlveoli.find(a => a.levelIndex === targetLIdx && a.binIndex === targetBIdx - 1)!.id});
      
      const rightP = getProductAt(targetLIdx, targetBIdx + 1);
      if (rightP) products.push({p: rightP, dir: 'Droite', alvId: allAlveoli.find(a => a.levelIndex === targetLIdx && a.binIndex === targetBIdx + 1)!.id});
      
      const topP = getProductAt(targetLIdx + 1, targetBIdx);
      if (topP) products.push({p: topP, dir: 'Dessus', alvId: allAlveoli.find(a => a.levelIndex === targetLIdx + 1 && a.binIndex === targetBIdx)!.id});
      
      const bottomP = getProductAt(targetLIdx - 1, targetBIdx);
      if (bottomP) products.push({p: bottomP, dir: 'Dessous', alvId: allAlveoli.find(a => a.levelIndex === targetLIdx - 1 && a.binIndex === targetBIdx)!.id});
    } else {
      if (pbIdx > 0) {
        const leftP = getProductAt(targetLIdx, targetBIdx, pbIdx - 1);
        if (leftP) products.push({p: leftP, dir: 'Gauche (même alvéole)', alvId: targetAlv.id});
      } else {
        const leftAlv = allAlveoli.find(a => a.levelIndex === targetLIdx && a.binIndex === targetBIdx - 1);
        if (leftAlv) {
          if (leftAlv.isSubdivided && leftAlv.pickBins) {
            const leftP = leftAlv.pickBins[leftAlv.pickBins.length - 1]?.product;
            if (leftP) products.push({p: leftP, dir: 'Gauche', alvId: leftAlv.id});
          } else if (leftAlv.product) {
            products.push({p: leftAlv.product, dir: 'Gauche', alvId: leftAlv.id});
          }
        }
      }
      
      if (pbIdx < subdivCount - 1) {
        const rightP = getProductAt(targetLIdx, targetBIdx, pbIdx + 1);
        if (rightP) products.push({p: rightP, dir: 'Droite (même alvéole)', alvId: targetAlv.id});
      } else {
        const rightAlv = allAlveoli.find(a => a.levelIndex === targetLIdx && a.binIndex === targetBIdx + 1);
        if (rightAlv) {
          if (rightAlv.isSubdivided && rightAlv.pickBins) {
            const rightP = rightAlv.pickBins[0]?.product;
            if (rightP) products.push({p: rightP, dir: 'Droite', alvId: rightAlv.id});
          } else if (rightAlv.product) {
            products.push({p: rightAlv.product, dir: 'Droite', alvId: rightAlv.id});
          }
        }
      }
      
      const topAlv = allAlveoli.find(a => a.levelIndex === targetLIdx + 1 && a.binIndex === targetBIdx);
      if (topAlv && topAlv.occupied) {
        if (topAlv.isSubdivided && topAlv.pickBins) {
          const topP = topAlv.pickBins[pbIdx]?.product || topAlv.pickBins[0]?.product;
          if (topP) products.push({p: topP, dir: 'Dessus', alvId: topAlv.id});
        } else if (topAlv.product) {
          products.push({p: topAlv.product, dir: 'Dessus', alvId: topAlv.id});
        }
      }
      
      const bottomAlv = allAlveoli.find(a => a.levelIndex === targetLIdx - 1 && a.binIndex === targetBIdx);
      if (bottomAlv && bottomAlv.occupied) {
        if (bottomAlv.isSubdivided && bottomAlv.pickBins) {
          const bottomP = bottomAlv.pickBins[pbIdx]?.product || bottomAlv.pickBins[0]?.product;
          if (bottomP) products.push({p: bottomP, dir: 'Dessous', alvId: bottomAlv.id});
        } else if (bottomAlv.product) {
          products.push({p: bottomAlv.product, dir: 'Dessous', alvId: bottomAlv.id});
        }
      }
    }
    return products;
  };

  const adjProducts = getAdjacentProducts();
  adjProducts.forEach(({p, dir, alvId}) => {
    if (!checkTMDCompatibility(prod.tmdClass, p.tmdClass)) {
      reasons.push(`Incompatibilité TMD (${dir}): Le produit ${prod.sku} (Classe ${prod.tmdClass || 'Non-spécifiée'}) ne peut pas être stocké à côté du produit ${p.sku} (Classe ${p.tmdClass || 'Non-spécifiée'}).`);
      if (!collidesWithAdjacent.includes(alvId)) {
        collidesWithAdjacent.push(alvId);
      }
    }
  });

  return {
    hasCollision: reasons.length > 0,
    reasons,
    collidesWithUprights,
    collidesWithBeams,
    collidesWithAdjacent,
  };
};

export default function RackVisualizer3D({
  rack,
  onChangeRack,
  alveoli,
  onChangeAlveoli,
  availableProducts,
  onAddCustomProduct,
  onDeleteCustomProduct,
}: RackVisualizer3DProps) {
  const { lengthUnit, volumeUnit } = useSettings();
  const [hoveredAlveolusId, setHoveredAlveolusId] = useState<string | null>(null);
  const [selectedAlveolusId, setSelectedAlveolusId] = useState<string | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [showStructureModal, setShowStructureModal] = useState<boolean>(false);
  const [selectedPickBinIndex, setSelectedPickBinIndex] = useState<number>(0);
  const [showAddLevelModal, setShowAddLevelModal] = useState(false);
  const [newLevelHeight, setNewLevelHeight] = useState<number>(1800);
  const [showGoldenZone, setShowGoldenZone] = useState<boolean>(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const showLocalError = (msg: string) => {
    setLocalError(msg);
    setTimeout(() => {
      setLocalError((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  // Loading & Custom Pallets config
  const [sidebarTab, setSidebarTab] = useState<'select' | 'create'>('select');
  const [selectedProductToPlace, setSelectedProductToPlace] = useState<Product | null>(null);

  // Chunking logic for 3D rendering performance
  const [renderedChunkIndex, setRenderedChunkIndex] = useState<number>(1);
  const [isRendering, setIsRendering] = useState<boolean>(true);
  
  React.useEffect(() => {
    const totalLevels = rack.levels.length + 1;
    if (renderedChunkIndex < totalLevels) {
      setIsRendering(true);
      const timer = setTimeout(() => {
        setRenderedChunkIndex(prev => Math.min(prev + 2, totalLevels)); // Load 2 levels per chunk
      }, 16);
      return () => clearTimeout(timer);
    } else {
      setIsRendering(false);
    }
  }, [renderedChunkIndex, rack.levels.length]);

  React.useEffect(() => {
    // Reset chunking when rack changes
    setRenderedChunkIndex(1);
    setIsRendering(true);
  }, [rack.id]);


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


  // Custom Pallet Form State
  // Pallet Creation Form State
  const {
    palletName, setPalletName,
    palletWidth, setPalletWidth,
    palletHeight, setPalletHeight,
    palletDepth, setPalletDepth,
    palletWeight, setPalletWeight,
    palletColor, setPalletColor,
    palletRotation, setPalletRotation,
    palletTmdClass, setPalletTmdClass,
    handleSubmit: handleCustomPalletSubmit
  } = useCustomPalletForm(onAddCustomProduct, (newProd) => {
    setSelectedProductToPlace(newProd);
    setSidebarTab('select');
  });

  // Math conversions

  // Render scale factor
  // We want the rack to fit within a ~500px high area.
  const paddingY = 60;
  const paddingX = 120;
  const svgHeight = 520;
  const svgWidth = 720;
  const usableHeight = svgHeight - 2 * paddingY; // ~400px
  const scale = usableHeight / rack.totalHeightMm; // e.g., 400px / 4500mm = 0.088px/mm

  // Standard dimensions translated to pixels
  const rackWidthPx = rack.totalWidthMm * scale;
  const rackHeightPx = rack.totalHeightMm * scale;
  const depthOffsetPx = 45; // 3D depth visual offset
  const rackDepthPx = rack.depthMm * scale * 0.6; // scaled slightly down for better 3D look

  const effectiveScale = scale * zoom;
  let lodLevel: 'low' | 'medium' | 'high' = 'high';
  if (effectiveScale < 0.05) lodLevel = 'low';
  else if (effectiveScale < 0.1) lodLevel = 'medium';


  // Coordinates of the front-left base of the rack:
  const baseX = (svgWidth - rackWidthPx - depthOffsetPx) / 2 + 10;
  const baseY = svgHeight - paddingY;

  // Helper to convert mm height (from ground) to SVG Y coordinate
  const mmToY = (heightMm: number) => {
    return baseY - heightMm * scale;
  };

  // Adjust beam height
  const adjustBeamHeight = (levelId: string, direction: 'up' | 'down') => {
    const levelIndex = rack.levels.findIndex((l) => l.id === levelId);
    if (levelIndex === -1) return;

    const level = rack.levels[levelIndex];
    const step = 100; // 10 cm adjustments
    const currentHeight = level.heightFromGroundMm;
    let newHeight = direction === 'up' ? currentHeight + step : currentHeight - step;

    // Constraints
    const prevHeight = levelIndex === 0 ? 0 : rack.levels[levelIndex - 1].heightFromGroundMm;
    const nextHeight =
      levelIndex === rack.levels.length - 1
        ? rack.totalHeightMm
        : rack.levels[levelIndex + 1].heightFromGroundMm;

    // Minimum gap of 150mm for realistic safety
    if (newHeight > prevHeight + 150 && newHeight < nextHeight - 150) {
      const updatedLevels = [...rack.levels];
      updatedLevels[levelIndex] = {
        ...level,
        heightFromGroundMm: newHeight,
      };
      
      // Sort levels just in case
      updatedLevels.sort((a, b) => a.heightFromGroundMm - b.heightFromGroundMm);

      // Apply changes to rack
      onChangeRack({
        ...rack,
        levels: updatedLevels,
      });
    }
  };

  // Level editing helpers for LevelEditModal
  const handleUpdateLevelHeight = (levelId: string, height: number) => {
    const levelIndex = rack.levels.findIndex((l) => l.id === levelId);
    if (levelIndex === -1) return;

    // Constraints
    const prevHeight = levelIndex === 0 ? 0 : rack.levels[levelIndex - 1].heightFromGroundMm;
    const nextHeight =
      levelIndex === rack.levels.length - 1
        ? rack.totalHeightMm
        : rack.levels[levelIndex + 1].heightFromGroundMm;

    if (height > prevHeight + 150 && height < nextHeight - 150) {
      const updatedLevels = rack.levels.map((l) => {
        if (l.id === levelId) {
          return { ...l, heightFromGroundMm: height };
        }
        return l;
      });
      onChangeRack({ ...rack, levels: updatedLevels });
    } else {
      showLocalError("Écart insuffisant ou hauteur hors limites (min 150mm par rapport aux autres niveaux).");
    }
  };

  const handleUpdateLevelType = (levelId: string, type: 'pick' | 'over', defaultSlots: number) => {
    const updatedLevels = rack.levels.map((l) => {
      if (l.id === levelId) {
        return { ...l, levelType: type, slotsCount: defaultSlots };
      }
      return l;
    });
    onChangeRack({ ...rack, levels: updatedLevels });
  };

  const handleUpdateLevelSlots = (levelId: string, slotsCount: number) => {
    const updatedLevels = rack.levels.map((l) => {
      if (l.id === levelId) {
        return { ...l, slotsCount };
      }
      return l;
    });
    onChangeRack({ ...rack, levels: updatedLevels });
  };

  const handleUpdateLevelLoad = (levelId: string, maxLoad: number) => {
    const updatedLevels = rack.levels.map((l) => {
      if (l.id === levelId) {
        return { ...l, maxLoadLbs: maxLoad };
      }
      return l;
    });
    onChangeRack({ ...rack, levels: updatedLevels });
  };

  const handleUpdateLevelThickness = (levelId: string, thickness: number) => {
    const updatedLevels = rack.levels.map((l) => {
      if (l.id === levelId) {
        return { ...l, beamThicknessMm: thickness };
      }
      return l;
    });
    onChangeRack({ ...rack, levels: updatedLevels });
  };

  // Add a beam level
  const handleAddLevel = () => {
    if (newLevelHeight <= 0 || newLevelHeight >= rack.totalHeightMm) {
      showLocalError("La hauteur de la lisse doit être comprise entre 0 et la hauteur totale du rack.");
      return;
    }

    // Check overlaps
    const tooClose = rack.levels.some(
      (l) => Math.abs(l.heightFromGroundMm - newLevelHeight) < 150
    );

    if (tooClose) {
      showLocalError("La lisse est trop proche d'un niveau existant (min 150mm d'espacement requis).");
      return;
    }

    const newLevel: BeamLevel = {
      id: `beam-${Date.now()}`,
      levelNumber: 0, // recalculated below
      heightFromGroundMm: newLevelHeight,
      beamThicknessMm: 100,
    };

    const updatedLevels = [...rack.levels, newLevel];
    // Sort and re-number levels
    updatedLevels.sort((a, b) => a.heightFromGroundMm - b.heightFromGroundMm);
    const finalLevels = updatedLevels.map((l, idx) => ({
      ...l,
      levelNumber: idx + 1,
    }));

    onChangeRack({
      ...rack,
      levels: finalLevels,
    });
    setShowAddLevelModal(false);
  };

  // Delete a beam level
  const handleDeleteLevel = (levelId: string) => {
    if (rack.levels.length <= 1) {
      showLocalError("Le rack doit comporter au moins un niveau de lisses.");
      return;
    }

    const updatedLevels = rack.levels
      .filter((l) => l.id !== levelId)
      .map((l, idx) => ({
        ...l,
        levelNumber: idx + 1,
      }));

    onChangeRack({
      ...rack,
      levels: updatedLevels,
    });
  };

  // Slotting operations
  const handleSelectAlveolus = (alveolusId: string | null) => {
    setSelectedAlveolusId(alveolusId);
    setSidebarTab('select');
    setSelectedPickBinIndex(0);
    if (alveolusId) {
      const alv = alveoli.find(a => a.id === alveolusId);
      if (alv) {
        if (alv.isSubdivided && alv.pickBins && alv.pickBins[0]) {
          const firstBin = alv.pickBins[0];
          if (firstBin.occupied && firstBin.product) {
            setSelectedProductToPlace(firstBin.product);
          } else {
            setSelectedProductToPlace(null);
          }
        } else if (alv.occupied && alv.product) {
          setSelectedProductToPlace(alv.product);
        } else {
          setSelectedProductToPlace(null);
        }
      } else {
        setSelectedProductToPlace(null);
      }
    } else {
      setSelectedProductToPlace(null);
    }
  };

  const assignProductToAlveolus = (alveolusId: string, product: Product | null, pickBinIndex?: number) => {
    const updated = alveoli.map((alv) => {
      if (alv.id === alveolusId) {
        if (alv.isSubdivided && alv.pickBins) {
          const pbIdx = pickBinIndex !== undefined ? pickBinIndex : selectedPickBinIndex;
          const updatedBins = alv.pickBins.map((bin, idx) => {
            if (idx === pbIdx) {
              return {
                ...bin,
                occupied: product !== null,
                product: product,
              };
            }
            return bin;
          });
          const isAnyOccupied = updatedBins.some(b => b.occupied);
          return {
            ...alv,
            pickBins: updatedBins,
            occupied: isAnyOccupied,
            product: isAnyOccupied ? updatedBins.find(b => b.occupied)?.product : null,
          };
        } else {
          return {
            ...alv,
            occupied: product !== null,
            product: product,
          };
        }
      }
      return alv;
    });
    onChangeAlveoli(updated);
    
    const targetAlv = updated.find(a => a.id === alveolusId);
    if (!targetAlv?.isSubdivided) {
      setSelectedAlveolusId(null);
      setSelectedProductToPlace(null);
    }
  };

  const handleSetSubdivision = (alveolusId: string, count: number) => {
    const updated = alveoli.map((alv) => {
      if (alv.id === alveolusId) {
        if (count === 1) {
          return {
            ...alv,
            isSubdivided: false,
            subdivisionCount: 1,
            pickBins: undefined,
            occupied: false,
            product: null,
          };
        } else {
          const pickBins = Array.from({ length: count }).map((_, idx) => {
            const binLabel = `L${alv.levelIndex}-${String.fromCharCode(65 + alv.binIndex)}-B${idx + 1}`;
            return {
              id: `${alv.id}-PB${idx}`,
              label: binLabel,
              occupied: false,
              product: null,
            };
          });
          return {
            ...alv,
            isSubdivided: true,
            subdivisionCount: count,
            pickBins,
            occupied: false,
            product: null,
          };
        }
      }
      return alv;
    });
    onChangeAlveoli(updated);
    setSelectedPickBinIndex(0);
    setSelectedProductToPlace(null);
  };

  const handleBulkFill = (prod: Product) => {
    const currentAlveoli = JSON.parse(JSON.stringify(alveoli)) as Alveolus[];
    let filledCount = 0;

    for (let i = 0; i < currentAlveoli.length; i++) {
      const alv = currentAlveoli[i];
      if (!alv.occupied) {
        const col = checkCollisions(alv, prod, currentAlveoli, rack);
        if (!col.hasCollision) {
          currentAlveoli[i] = {
            ...alv,
            occupied: true,
            product: prod,
          };
          filledCount++;
        }
      }
    }

    if (filledCount > 0) {
      onChangeAlveoli(currentAlveoli);
    } else {
      showLocalError("Aucun emplacement libre ne respecte les consignes de sécurité (poids/taille/distance lisses) pour ce produit.");
    }
  };

  const handleBulkClear = () => {
    if (confirm("Voulez-vous vraiment vider entièrement ce rack ? Tous les colis stockés seront retirés.")) {
      const cleared = alveoli.map((alv) => ({
        ...alv,
        occupied: false,
        product: null,
      }));
      onChangeAlveoli(cleared);
    }
  };

  // Calculate global statistics
  const { totalSlotsCount, occupiedSlotsCount, totalWeightLbs, totalVolumeLiters } = React.useMemo(() => {
    let tSlots = 0;
    let oSlots = 0;
    let tWeight = 0;
    let tVol = 0;

    alveoli.forEach((alv) => {
      tVol += (alv.widthMm * alv.heightMm * alv.depthMm) / 1000000;
      if (alv.isSubdivided && alv.pickBins) {
        tSlots += alv.subdivisionCount || 1;
        alv.pickBins.forEach((pb) => {
          if (pb.occupied) {
            oSlots++;
            if (pb.product) {
              tWeight += pb.product.weight || 0;
            }
          }
        });
      } else {
        tSlots += 1;
        if (alv.occupied) {
          oSlots++;
          if (alv.product) {
            tWeight += alv.product.weight || 0;
          }
        }
      }
    });

    return { totalSlotsCount: tSlots, occupiedSlotsCount: oSlots, totalWeightLbs: tWeight, totalVolumeLiters: tVol };
  }, [alveoli]);

  const occupancyRate = React.useMemo(() => totalSlotsCount > 0 ? (occupiedSlotsCount / totalSlotsCount) * 100 : 0, [totalSlotsCount, occupiedSlotsCount]);

  // Active selected alveolus and its real-time collision detection
  const activeAlv = React.useMemo(() => selectedAlveolusId ? alveoli.find((a) => a.id === selectedAlveolusId) : null, [selectedAlveolusId, alveoli]);
  const collisionResult = React.useMemo(() => (activeAlv && selectedProductToPlace)
    ? checkCollisions(activeAlv, selectedProductToPlace, alveoli, rack, activeAlv.isSubdivided ? selectedPickBinIndex : undefined, lengthUnit)
    : null, [activeAlv, selectedProductToPlace, alveoli, rack, selectedPickBinIndex]);

  // Calculate Dynamic Center of Gravity (CG)
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

  // Compute actual volume of stored items (based on custom dimensions of placed items)
  const totalStoredVolumeLiters = React.useMemo(() => alveoli.reduce((sum, alv) => {
    if (alv.isSubdivided && alv.pickBins) {
      let subdivVol = 0;
      alv.pickBins.forEach((pb) => {
        if (pb.occupied && pb.product) {
          const pW = pb.product.widthMm || 400;
          const pH = pb.product.heightMm || 400;
          const pD = pb.product.depthMm || 400;
          subdivVol += (pW * pH * pD) / 1000000;
        }
      });
      return sum + subdivVol;
    } else {
      if (!alv.occupied || !alv.product) return sum;
      const pW = alv.product.widthMm || 1200;
      const pH = alv.product.heightMm || 1200;
      const pD = alv.product.depthMm || 800;
      return sum + (pW * pH * pD) / 1000000;
    }
  }, 0), [alveoli]);

  const volumetricOccupancyRate = React.useMemo(() => totalVolumeLiters > 0 ? (totalStoredVolumeLiters / totalVolumeLiters) * 100 : 0, [totalStoredVolumeLiters, totalVolumeLiters]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Visual Workspace & Sidebar Controls */}
      <div className="lg:col-span-12 frosted-glass rounded-xl shadow-lg overflow-hidden flex flex-col">
        {/* Header toolbar */}
        <div className="border-b border-slate-700 bg-slate-800/50 px-4 py-3 flex flex-wrap justify-between items-center gap-2">
          <div>
            <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2 font-display">
              <span className="w-2 h-2 rounded-full bg-cyan-600 animate-pulse"></span>
              Modélisation 3D Interactive & Slotting
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Ajustez les lisses directement ou cliquez sur une alvéole pour simuler le chargement.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              id="btn-show-structure-config"
              onClick={() => setShowStructureModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-md shadow-slate-800/10"
            >
              ⚙️ Configurer Structure
            </button>
            <button
              id="btn-add-level"
              onClick={() => {
                // Pre-fill next level height logically
                const maxLevel = rack.levels[rack.levels.length - 1]?.heightFromGroundMm || 0;
                const suggestion = Math.min(maxLevel + 1200, rack.totalHeightMm - 500);
                setNewLevelHeight(suggestion > maxLevel ? suggestion : rack.totalHeightMm - 400);
                setShowAddLevelModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-md shadow-sky-600/10"
            >
              <Plus size={14} />
              Ajouter une Lisse
            </button>
          </div>
        </div>

        {/* 3D Render Area */}
        <div className="flex-1 bg-[#f8fafc] p-6 relative flex items-center justify-center min-h-[480px]">
          {/* Local Error Alert Toast Overlay */}
          {localError && (
            <div className="absolute top-4 right-4 z-20 bg-rose-900/30 border border-rose-700/50 px-4 py-2.5 rounded-xl text-rose-800 shadow-xl max-w-sm flex items-start gap-2.5">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-rose-600" />
              <div>
                <span className="font-extrabold text-xs block text-rose-900">Alerte de Sécurité / Conformité</span>
                <span className="text-[11px] block leading-tight text-rose-400 mt-0.5">{localError}</span>
              </div>
            </div>
          )}

          {/* Legend / Safety Indicator */}
          <div className="absolute top-4 left-4 text-xs text-slate-400 bg-slate-800/95 shadow-md border border-slate-700 p-3 rounded-lg flex flex-col gap-1.5 pointer-events-none z-10">
            <div className="font-bold text-slate-200 mb-0.5">Légende & Infos</div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1.5 bg-[#4A90E2] rounded-xs inline-block"></span>
              <span>Montants Échelle (Bleu)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1.5 bg-[#FF6B35] rounded-xs inline-block"></span>
              <span>Lisses d'Acier (Orange)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 border border-dashed border-slate-500 rounded-xs inline-block"></span>
              <span>Alvéole Libre</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-violet-900/300 rounded-xs inline-block"></span>
              <span>Palette Chargée</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xs inline-block"></span>
              <span className="text-emerald-400 font-bold">Golden Zone</span>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-slate-700/50 text-[10px] text-slate-500">
              Silhouette Humaine: 1,75 m (Ergonomie)
            </div>
          </div>

          {/* Isometric / 3D Rack SVG Viewer */}
          
          {/* Controls for zoom reset */}
          
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            {isRendering && (
              <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 text-sky-400 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg">
                <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                Chargement 3D ({Math.round((renderedChunkIndex / (rack.levels.length + 1)) * 100)}%)
              </div>
            )}
            
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 p-3 rounded-lg shadow-xl w-[210px] pointer-events-none">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Occupation Vol.</span>
                <span className={`text-xs font-black ${volumetricOccupancyRate > 90 ? 'text-rose-500' : volumetricOccupancyRate > 75 ? 'text-amber-500' : 'text-emerald-400'}`}>
                  {volumetricOccupancyRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                <div 
                  className={`h-full ${volumetricOccupancyRate > 90 ? 'bg-rose-500' : volumetricOccupancyRate > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, volumetricOccupancyRate)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 font-medium">
                <span>{formatVolume(totalStoredVolumeLiters, volumeUnit, 1)}</span>
                <span>/ {formatVolume(totalVolumeLiters, volumeUnit, 1)}</span>
              </div>
            </div>
          </div>
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button 
              onClick={() => setShowGoldenZone(!showGoldenZone)} 
              className={`border p-1.5 rounded flex items-center gap-1.5 text-xs font-bold transition-colors ${showGoldenZone ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`} 
              title="Zone Ergonomique (Golden Zone)"
            >
              <Activity size={16} />
              <span className="hidden sm:inline">Golden Zone</span>
            </button>
            <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="bg-slate-800 border border-slate-700 text-slate-300 p-1.5 rounded hover:bg-slate-700" title="Recentrer">
              <Move size={16} />
            </button>
          </div>
          <svg
            id="rack-3d-svg"
            viewBox={`${pan.x} ${pan.y} ${svgWidth / zoom} ${svgHeight / zoom}`}
            className="w-full max-w-[660px] h-auto drop-shadow-2xl select-none cursor-grab active:cursor-grabbing"
            onWheel={handleSvgWheel}
            onMouseDown={handleSvgMouseDown}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onMouseLeave={handleSvgMouseUp}
          >
                        {/* Grid floor representing warehouse floor */}
            {showGoldenZone && (
              <g style={{ pointerEvents: 'none' }}>
                {/* Back Plane */}
                <polygon
                  points={`
                    ${baseX - 50},${mmToY(1500)}
                    ${baseX + rackWidthPx + 50},${mmToY(1500)}
                    ${baseX + rackWidthPx + 50},${mmToY(600)}
                    ${baseX - 50},${mmToY(600)}
                  `}
                  fill="#10b981"
                  opacity="0.08"
                />
                {/* Side Depth */}
                <polygon
                  points={`
                    ${baseX + rackWidthPx + 50},${mmToY(1500)}
                    ${baseX + rackWidthPx + depthOffsetPx + 50},${mmToY(1500) - rackDepthPx}
                    ${baseX + rackWidthPx + depthOffsetPx + 50},${mmToY(600) - rackDepthPx}
                    ${baseX + rackWidthPx + 50},${mmToY(600)}
                  `}
                  fill="#059669"
                  opacity="0.12"
                />
                {/* Top face */}
                <polygon
                  points={`
                    ${baseX - 50},${mmToY(1500)}
                    ${baseX - 50 + depthOffsetPx},${mmToY(1500) - rackDepthPx}
                    ${baseX + rackWidthPx + depthOffsetPx + 50},${mmToY(1500) - rackDepthPx}
                    ${baseX + rackWidthPx + 50},${mmToY(1500)}
                  `}
                  fill="#34d399"
                  opacity="0.1"
                />
                {/* Bottom face */}
                <polygon
                  points={`
                    ${baseX - 50},${mmToY(600)}
                    ${baseX - 50 + depthOffsetPx},${mmToY(600) - rackDepthPx}
                    ${baseX + rackWidthPx + depthOffsetPx + 50},${mmToY(600) - rackDepthPx}
                    ${baseX + rackWidthPx + 50},${mmToY(600)}
                  `}
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
                  transform={`rotate(-90 ${baseX - 65} ${mmToY(1050)})`}
                  textAnchor="middle"
                >
                  Golden Zone (TMS)
                </text>
              </g>
            )}
            <g opacity="0.3" style={{ display: lodLevel === 'low' ? 'none' : 'block' }}>
              <polygon
                points={`
                  ${baseX - 150},${baseY} 
                  ${baseX + rackWidthPx + 150},${baseY} 
                  ${baseX + rackWidthPx + depthOffsetPx + 150},${baseY - rackDepthPx} 
                  ${baseX - 150 + depthOffsetPx},${baseY - rackDepthPx}
                `}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {/* Floor grid lines */}
              {Array.from({ length: 6 }).map((_, i) => {
                const ratio = i / 5;
                const x1 = baseX - 150 + (rackWidthPx + 300) * ratio;
                const x2 = baseX - 150 + depthOffsetPx + (rackWidthPx + 300) * ratio;
                return (
                  <line
                    key={`grid-x-${i}`}
                    x1={x1}
                    y1={baseY}
                    x2={x2}
                    y2={baseY - rackDepthPx}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                );
              })}
            </g>

            {/* HUMAN SILHOUETTE - 1.75m visual helper (drawn next to the rack) */}
            <g transform={`translate(${baseX - 60}, ${baseY})`} className="opacity-80" style={{ display: lodLevel === 'low' ? 'none' : 'block' }}>
              {/* Ground scale line */}
              <line x1="-15" y1="0" x2="35" y2="0" stroke="#94A3B8" strokeWidth="2" />
              
              {/* Height reference marks */}
              <line x1="20" y1="0" x2="20" y2={-1750 * scale} stroke="#64748B" strokeWidth="1" strokeDasharray="2 2" />
              {/* 1.75m indicator */}
              <text x="25" y={-1750 * scale + 4} fill="#94A3B8" fontSize="10" fontFamily="monospace">1.75m</text>
              <line x1="15" y1={-1750 * scale} x2="25" y2={-1750 * scale} stroke="#94A3B8" strokeWidth="1" />
              
              {/* Human figure representation (1.75m = 1750mm) */}
              {/* Head */}
              <circle cx="0" cy={-1630 * scale} r={90 * scale} fill="#94A3B8" />
              {/* Neck */}
              <line x1="0" y1={-1540 * scale} x2="0" y2={-1480 * scale} stroke="#94A3B8" strokeWidth={5 * scale} />
              {/* Body / Torso */}
              <polygon
                points={`
                  -${120 * scale},${-1480 * scale} 
                  ${120 * scale},${-1480 * scale} 
                  ${90 * scale},${-850 * scale} 
                  -${90 * scale},${-850 * scale}
                `}
                fill="#64748B"
              />
              {/* Legs */}
              <line x1={-50 * scale} y1={-850 * scale} x2={-50 * scale} y2="0" stroke="#475569" strokeWidth={12 * scale} strokeLinecap="round" />
              <line x1={50 * scale} y1={-850 * scale} x2={50 * scale} y2="0" stroke="#475569" strokeWidth={12 * scale} strokeLinecap="round" />
              {/* Arms */}
              <line x1={-110 * scale} y1={-1450 * scale} x2={-140 * scale} y2={-950 * scale} stroke="#64748B" strokeWidth={8 * scale} strokeLinecap="round" />
              <line x1={110 * scale} y1={-1450 * scale} x2={140 * scale} y2={-950 * scale} stroke="#64748B" strokeWidth={8 * scale} strokeLinecap="round" />

              {/* Eye level line (forklift reach reference) */}
              <line x1="0" y1={-1630 * scale} x2="150" y2={-1630 * scale} stroke="#F59E0B" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
              <text x="60" y={-1630 * scale - 4} fill="#F59E0B" fontSize="8">Niveau des yeux (Picking)</text>
            </g>

            {/* RACK STRUCTURE DRAWING */}

            {/* 1. BACK VERTICAL UPRIGHTS (Echelles Arrière - drawn first for occlusion) */}
            <g opacity="0.7">
              {/* Left back upright */}
              <rect
                x={baseX + depthOffsetPx}
                y={baseY - rackHeightPx - rackDepthPx}
                width={rack.uprightWidthMm * scale}
                height={rackHeightPx}
                fill="#1E293B"
                stroke="#475569"
                strokeWidth="0.5"
              />
              {/* Right back upright */}
              <rect
                x={baseX + rackWidthPx - rack.uprightWidthMm * scale + depthOffsetPx}
                y={baseY - rackHeightPx - rackDepthPx}
                width={rack.uprightWidthMm * scale}
                height={rackHeightPx}
                fill="#1E293B"
                stroke="#475569"
                strokeWidth="0.5"
              />
              
              {/* Back diagonals (structural cross bracing) */}
              {Array.from({ length: 4 }).map((_, idx) => {
                const step = rack.totalHeightMm / 4;
                const yTop = baseY - (idx + 1) * step * scale - rackDepthPx;
                const yBottom = baseY - idx * step * scale - rackDepthPx;
                return (
                  <g key={`back-brace-${idx}`} stroke="#475569" strokeWidth="1" opacity="0.4">
                    <line
                      x1={baseX + depthOffsetPx + (rack.uprightWidthMm * scale) / 2}
                      y1={yBottom}
                      x2={baseX + rackWidthPx - (rack.uprightWidthMm * scale) / 2 + depthOffsetPx}
                      y2={yTop}
                    />
                    <line
                      x1={baseX + depthOffsetPx + (rack.uprightWidthMm * scale) / 2}
                      y1={yTop}
                      x2={baseX + rackWidthPx - (rack.uprightWidthMm * scale) / 2 + depthOffsetPx}
                      y2={yBottom}
                    />
                  </g>
                );
              })}
            </g>

            {/* BACK HORIZONTAL BEAMS (Lisses Arrière) */}
            {rack.levels.map((level) => {
              const y = mmToY(level.heightFromGroundMm) - rackDepthPx;
              const height = level.beamThicknessMm * scale;
              return (
                <rect
                  key={`back-beam-${level?.id}`}
                  x={baseX + depthOffsetPx + rack.uprightWidthMm * scale}
                  y={y}
                  width={rackWidthPx - 2 * rack.uprightWidthMm * scale}
                  height={height}
                  fill="#78350F" // Dark brown/orange steel shadow
                  opacity="0.8"
                />
              );
            })}

            {/* 2. ALVEOLES & LOADED PRODUCTS (SLOTTING - drawn layer by layer from ground to top) */}
            {(() => {
              const levelsHeights = [0, ...rack.levels.map((l) => l.heightFromGroundMm)];
              const topCap = rack.totalHeightMm;

              return levelsHeights.slice(0, renderedChunkIndex).map((currentLevelHeight, lIdx) => {
                const bottomMm = currentLevelHeight;
                const topMm = lIdx === rack.levels.length ? topCap : rack.levels[lIdx].heightFromGroundMm - (rack.levels[lIdx].beamThicknessMm);
                const heightMm = topMm - bottomMm;

                const currentSlotsCount = getSlotsCountForLevel(rack, lIdx);
                const slotWidthMm = (rack.totalWidthMm - 2 * rack.uprightWidthMm) / currentSlotsCount;

                return Array.from({ length: currentSlotsCount }).map((_, bIdx) => {
                  const alveolusId = `alv-L${lIdx}-B${bIdx}`;
                  const currentAlveolus = alveoli.find((a) => a.id === alveolusId) || {
                    id: alveolusId,
                    levelIndex: lIdx,
                    binIndex: bIdx,
                    label: `Niv. ${lIdx} - Pos. ${bIdx + 1}`,
                    widthMm: slotWidthMm,
                    heightMm: heightMm,
                    depthMm: rack.depthMm,
                    occupied: false,
                    product: null,
                  };

                  // Slot visual coordinates
                  const xLeftMm = rack.uprightWidthMm + bIdx * slotWidthMm;
                  const xRightMm = xLeftMm + slotWidthMm;

                  const xFrontLeft = baseX + xLeftMm * scale;
                  const xFrontRight = baseX + xRightMm * scale;
                  
                  const yFrontBottom = mmToY(bottomMm);
                  const yFrontTop = mmToY(topMm);

                  const xBackLeft = xFrontLeft + depthOffsetPx;
                  const xBackRight = xFrontRight + depthOffsetPx;
                  const yBackBottom = yFrontBottom - rackDepthPx;
                  const yBackTop = yFrontTop - rackDepthPx;

                  const isHovered = hoveredAlveolusId === alveolusId;
                  const isSelected = selectedAlveolusId === alveolusId;

                  const subdivCount = currentAlveolus.isSubdivided ? (currentAlveolus.subdivisionCount || 1) : 1;
                  const binWidthMm = slotWidthMm / subdivCount;

                  // Render single slot group
                  return (
                    <g
                      key={`slot-render-${lIdx}-${bIdx}`}
                      onMouseEnter={() => setHoveredAlveolusId(alveolusId)}
                      onMouseLeave={() => setHoveredAlveolusId(null)}
                      onClick={() => setSelectedAlveolusId(alveolusId)}
                      className="cursor-pointer"
                    >
                      {/* Interactive click boundary */}
                      <polygon
                        points={`
                          ${xFrontLeft},${yFrontBottom} 
                          ${xFrontRight},${yFrontBottom} 
                          ${xBackRight},${yBackBottom} 
                          ${xBackLeft},${yBackBottom}
                        `}
                        fill={isHovered ? 'rgba(59, 130, 246, 0.15)' : 'transparent'}
                        stroke={isHovered ? '#3B82F6' : 'none'}
                        strokeWidth="1.5"
                      />

                      {/* Alveolus transparent outline (Dashed Box shape) */}
                      <polygon
                        points={`
                          ${xFrontLeft},${yFrontBottom} 
                          ${xFrontRight},${yFrontBottom} 
                          ${xFrontRight},${yFrontTop} 
                          ${xFrontLeft},${yFrontTop}
                        `}
                        fill="none"
                        stroke={isHovered ? '#3B82F6' : '#475569'}
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        opacity={isHovered ? 0.8 : 0.25}
                      />
                      
                      {/* Depth visual lines */}
                      <line x1={xFrontLeft} y1={yFrontBottom} x2={xBackLeft} y2={yBackBottom} stroke="#475569" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
                      <line x1={xFrontRight} y1={yFrontBottom} x2={xBackRight} y2={yBackBottom} stroke="#475569" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
                      <line x1={xFrontLeft} y1={yFrontTop} x2={xBackLeft} y2={yBackTop} stroke="#475569" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
                      <line x1={xFrontRight} y1={yFrontTop} x2={xBackRight} y2={yBackTop} stroke="#475569" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />

                      {/* Inner sub-bin separators if subdivided */}
                      {currentAlveolus.isSubdivided && Array.from({ length: subdivCount - 1 }).map((_, i) => {
                        const divXMm = xLeftMm + (i + 1) * binWidthMm;
                        const divXFront = baseX + divXMm * scale;
                        const divXBack = divXFront + depthOffsetPx;
                        return (
                          <g key={`divider-${i}`} opacity="0.4">
                            {/* Vertical divider line */}
                            <line
                              x1={divXFront}
                              y1={yFrontBottom}
                              x2={divXFront}
                              y2={yFrontTop}
                              stroke="#64748B"
                              strokeWidth="1.5"
                              strokeDasharray="2 2"
                            />
                            {/* Shelf separator line */}
                            <line
                              x1={divXFront}
                              y1={yFrontBottom}
                              x2={divXBack}
                              y2={yBackBottom}
                              stroke="#64748B"
                              strokeWidth="1.5"
                              strokeDasharray="2 2"
                            />
                          </g>
                        );
                      })}

                      {/* Render Product Box(es) inside the slot */}
                      {(() => {
                        const isTargetSlot = selectedAlveolusId === alveolusId;

                        // Create an array representing either the subdivisions or a single virtual bin
                        const binsToDraw = currentAlveolus.isSubdivided
                          ? Array.from({ length: subdivCount }).map((_, pbIdx) => {
                              const binObj = currentAlveolus.pickBins?.[pbIdx];
                              const isTargetBin = isTargetSlot && selectedPickBinIndex === pbIdx;
                              const productToDraw = isTargetBin ? selectedProductToPlace : (binObj?.occupied ? binObj.product : null);
                              const isPreview = isTargetBin && selectedProductToPlace !== (binObj?.occupied ? binObj.product : null);
                              return {
                                pbIdx,
                                productToDraw,
                                isPreview,
                                widthMm: binWidthMm,
                                label: binObj?.label || `${currentAlveolus.id}-PB${pbIdx}`,
                              };
                            })
                          : [{
                              pbIdx: 0,
                              productToDraw: isTargetSlot ? selectedProductToPlace : (currentAlveolus.occupied ? currentAlveolus.product : null),
                              isPreview: isTargetSlot && selectedProductToPlace !== (currentAlveolus.occupied ? currentAlveolus.product : null),
                              widthMm: slotWidthMm,
                              label: currentAlveolus.label,
                            }];

                        return binsToDraw.map(({ pbIdx, productToDraw, isPreview, widthMm, label }) => {
                          if (!productToDraw) return null;

                          // Adjust size of the box to fit inside the bin nicely
                          const isSub = currentAlveolus.isSubdivided;
                          const boxW = isSub ? Math.min(productToDraw.widthMm || 400, widthMm - 10) : (productToDraw.widthMm || (slotWidthMm - 30));
                          const boxH = isSub ? Math.min(productToDraw.heightMm || 400, heightMm - 10) : (productToDraw.heightMm || (heightMm - 100));
                          const boxD = isSub ? Math.min(productToDraw.depthMm || 400, rack.depthMm - 10) : (productToDraw.depthMm || (rack.depthMm - 40));

                          // Center the box horizontally inside its slot or sub-bin
                          const xCenterMm = xLeftMm + pbIdx * widthMm + widthMm / 2;
                          const bxLeftMm = xCenterMm - boxW / 2;
                          const bxRightMm = xCenterMm + boxW / 2;

                          // Left front of the box
                          const bxFrontLeft = baseX + bxLeftMm * scale;
                          const bxFrontRight = baseX + bxRightMm * scale;
                          
                          const byFrontBottom = mmToY(bottomMm + 5); // sit slightly on the beam/floor
                          const byFrontTop = byFrontBottom - boxH * scale;

                          // 3D projections
                          const bDepthPx = boxD * scale * 0.6;
                          
                          const bxBackLeft = bxFrontLeft + depthOffsetPx * 0.8;
                          const bxBackRight = bxFrontRight + depthOffsetPx * 0.8;
                          const byBackBottom = byFrontBottom - bDepthPx;
                          const byBackTop = byFrontTop - bDepthPx;

                          // Collision styling
                          const isTargetBin = isTargetSlot && (!isSub || selectedPickBinIndex === pbIdx);
                          const hasCollisionHere = isTargetBin && collisionResult?.hasCollision;
                          const isCollidingAdjacent = collisionResult?.collidesWithAdjacent.includes(alveolusId);
                          
                          let baseColor = productToDraw.color || '#3B82F6';
                          let strokeColor = isHovered ? '#FFFFFF' : 'rgba(0,0,0,0.15)';
                          let strokeWidth = "1";
                          let strokeDash = "0";
                          let boxOpacity = isPreview ? "0.75" : "1";

                          if (hasCollisionHere) {
                            baseColor = '#EF4444';
                            strokeColor = '#F87171';
                            strokeWidth = "2";
                            strokeDash = "3 3";
                            boxOpacity = "0.85";
                          } else if (isCollidingAdjacent) {
                            strokeColor = '#EF4444';
                            strokeWidth = "2.5";
                            boxOpacity = "0.9";
                          } else if (isPreview) {
                            strokeColor = '#10B981';
                            strokeWidth = "1.5";
                            strokeDash = "2 2";
                          }

                          return (
                            <g key={`box-${pbIdx}`} className={`${hasCollisionHere || isCollidingAdjacent ? 'animate-pulse' : 'transition-all duration-300'}`} opacity={boxOpacity}>
                              {/* Left Side Face */}
                              <polygon
                                points={`
                                  ${bxFrontLeft},${byFrontBottom} 
                                  ${bxBackLeft},${byBackBottom} 
                                  ${bxBackLeft},${byBackTop} 
                                  ${bxFrontLeft},${byFrontTop}
                                `}
                                fill={baseColor}
                                style={{ filter: 'brightness(0.7)' }}
                              />
                              
                              {/* Top Face */}
                              <polygon
                                points={`
                                  ${bxFrontLeft},${byFrontTop} 
                                  ${bxFrontRight},${byFrontTop} 
                                  ${bxBackRight},${byBackTop} 
                                  ${bxBackLeft},${byBackTop}
                                `}
                                fill={baseColor}
                                style={{ filter: 'brightness(1.15)' }}
                              />

                              {/* Front Face */}
                              <polygon
                                points={`
                                  ${bxFrontLeft},${byFrontBottom} 
                                  ${bxFrontRight},${byFrontBottom} 
                                  ${bxFrontRight},${byFrontTop} 
                                  ${bxFrontLeft},${byFrontTop}
                                `}
                                fill={baseColor}
                                stroke={strokeColor}
                                strokeWidth={strokeWidth}
                                strokeDasharray={strokeDash}
                              />

                              {/* Mini support under the product (pallet or plastic bin box footer) */}
                              {productToDraw.type === 'Palette' ? (
                                <>
                                  <polygon
                                    points={`
                                      ${bxFrontLeft - 2},${byFrontBottom} 
                                      ${bxFrontRight + 2},${byFrontBottom} 
                                      ${bxFrontRight + 2 + depthOffsetPx * 0.8},${byFrontBottom - 12} 
                                      ${bxFrontLeft - 2 + depthOffsetPx * 0.8},${byFrontBottom - 12}
                                    `}
                                    fill="#8B5A2B" // wooden brown palette
                                  />
                                  <rect
                                    x={bxFrontLeft - 2}
                                    y={byFrontBottom}
                                    width={(bxFrontRight - bxFrontLeft) + 4}
                                    height="6"
                                    fill="#A0522D"
                                    stroke="#5C2E0B"
                                    strokeWidth="0.5"
                                  />
                                </>
                              ) : (
                                <rect
                                  x={bxFrontLeft}
                                  y={byFrontBottom}
                                  width={bxFrontRight - bxFrontLeft}
                                  height="2"
                                  fill="#475569"
                                  opacity="0.3"
                                />
                              )}

                              {/* SKU or weight label centered on the box front */}
                              <text
                                x={(bxFrontLeft + bxFrontRight) / 2}
                                y={(byFrontBottom + byFrontTop) / 2 + 3}
                                fill="#FFFFFF"
                                fontSize={isSub ? "7" : "9"}
                                fontWeight="bold"
                                textAnchor="middle"
                                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                                className="pointer-events-none"
                              >
                                {productToDraw.weight} lbs
                              </text>

                              {/* Subdivided bin label or brief ID at the bottom of the box front */}
                              <text
                                x={(bxFrontLeft + bxFrontRight) / 2}
                                y={byFrontBottom - 4}
                                fill="rgba(255,255,255,0.9)"
                                fontSize="6.5"
                                fontFamily="monospace"
                                fontWeight="semibold"
                                textAnchor="middle"
                                style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.9)' }}
                                className="pointer-events-none"
                              >
                                {isSub ? label.split('-').pop() : ''}
                              </text>

                              {/* Collision Warning Icon */}
                              {hasCollisionHere && (
                                <g transform={`translate(${(bxFrontLeft + bxFrontRight) / 2 - 6}, ${(byFrontBottom + byFrontTop) / 2 - 18})`}>
                                  <circle cx="6" cy="6" r="6" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1" />
                                  <text x="6" y="9" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">!</text>
                                </g>
                              )}
                            </g>
                          );
                        });
                      })()}

                      {/* Display brief ID on hover / select inside slot */}
                      {(isHovered || isSelected) && (
                        <g className="pointer-events-none">
                          <rect
                            x={(xFrontLeft + xFrontRight) / 2 - 50}
                            y={(yFrontBottom + yFrontTop) / 2 - 12}
                            width="100"
                            height="18"
                            rx="3"
                            fill="rgba(15, 23, 42, 0.85)"
                            stroke="#3B82F6"
                            strokeWidth="1"
                          />
                          <text
                            x={(xFrontLeft + xFrontRight) / 2}
                            y={(yFrontBottom + yFrontTop) / 2}
                            fill="#FFFFFF"
                            fontSize="8"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {currentAlveolus.isSubdivided ? `${currentAlveolus.label} (${subdivCount} Bacs)` : currentAlveolus.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                });
              });
            })()}

            {/* Center of Gravity (CG) Marker */}
            {cgResult.totalMass > 0 && lodLevel !== 'low' && (
              <g className="transition-all duration-700 ease-out" transform={`translate(${baseX + cgResult.x * scale}, ${baseY - cgResult.y * scale})`}>
                <circle cx="0" cy="0" r="12" fill={(!cgResult.isBalancedX || !cgResult.isBalancedY) ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)"} className="animate-ping" />
                <circle cx="0" cy="0" r="6" fill={(!cgResult.isBalancedX || !cgResult.isBalancedY) ? "#EF4444" : "#10B981"} stroke="#FFFFFF" strokeWidth="2" />
                <path d="M-6,0 L6,0 M0,-6 L0,6" stroke="#FFFFFF" strokeWidth="1" />
                <text x="10" y="-10" fill={(!cgResult.isBalancedX || !cgResult.isBalancedY) ? "#EF4444" : "#10B981"} fontSize="10" fontWeight="bold" className="drop-shadow-md">CG</text>
              </g>
            )}
            {/* 3. FRONT STRUCTURAL FRAMES (Echelles Avant) */}
            {/* Left front upright */}
            <rect
              x={baseX}
              y={baseY - rackHeightPx}
              width={rack.uprightWidthMm * scale}
              height={rackHeightPx}
              fill={collisionResult?.collidesWithUprights ? "#7F1D1D" : "#1E40AF"}
              stroke={collisionResult?.collidesWithUprights ? "#EF4444" : "#60A5FA"}
              strokeWidth={collisionResult?.collidesWithUprights ? "2.5" : "0.75"}
              className={collisionResult?.collidesWithUprights ? "animate-pulse" : ""}
            />
            {/* Right front upright */}
            <rect
              x={baseX + rackWidthPx - rack.uprightWidthMm * scale}
              y={baseY - rackHeightPx}
              width={rack.uprightWidthMm * scale}
              height={rackHeightPx}
              fill={collisionResult?.collidesWithUprights ? "#7F1D1D" : "#1E40AF"}
              stroke={collisionResult?.collidesWithUprights ? "#EF4444" : "#60A5FA"}
              strokeWidth={collisionResult?.collidesWithUprights ? "2.5" : "0.75"}
              className={collisionResult?.collidesWithUprights ? "animate-pulse" : ""}
            />

            {/* Front structural diagonal braces on columns (Left side Scale bracing details) */}
            {lodLevel !== 'low' && Array.from({ length: 6 }).map((_, i) => {
              const hStep = rack.totalHeightMm / 6;
              const yTop = baseY - (i + 1) * hStep * scale;
              const yBot = baseY - i * hStep * scale;
              return (
                <g key={`front-bracing-detail-${i}`} stroke="#60A5FA" strokeWidth="0.5" opacity="0.3">
                  {/* Left column depth cross brace details */}
                  <line x1={baseX} y1={yBot} x2={baseX + depthOffsetPx} y2={yBot - rackDepthPx} />
                  <line x1={baseX} y1={yTop} x2={baseX + depthOffsetPx} y2={yTop - rackDepthPx} />
                  <line x1={baseX} y1={yBot} x2={baseX + depthOffsetPx} y2={yTop - rackDepthPx} />
                  
                  {/* Right column depth cross brace details */}
                  <line x1={baseX + rackWidthPx} y1={yBot} x2={baseX + rackWidthPx + depthOffsetPx} y2={yBot - rackDepthPx} />
                  <line x1={baseX + rackWidthPx} y1={yTop} x2={baseX + rackWidthPx + depthOffsetPx} y2={yTop - rackDepthPx} />
                  <line x1={baseX + rackWidthPx} y1={yBot} x2={baseX + rackWidthPx + depthOffsetPx} y2={yTop - rackDepthPx} />
                </g>
              );
            })}

            {/* FRONT HORIZONTAL BEAMS (Lisses Avant & Micro-ajusteurs) */}
            {rack.levels.map((level) => {
              const y = mmToY(level.heightFromGroundMm);
              const height = level.beamThicknessMm * scale;
              return (
                <g key={`front-beam-g-${level?.id}`}>
                  {/* The Orange Steel Beam (La Lisse) */}
                  {(() => {
                    const isCollidingBeam = collisionResult?.collidesWithBeams && activeAlv && level?.levelNumber === activeAlv.levelIndex + 1;
                    const isSelectedBeam = selectedLevelId === level?.id;
                    return (
                      <rect
                        x={baseX + rack.uprightWidthMm * scale}
                        y={y}
                        width={rackWidthPx - 2 * rack.uprightWidthMm * scale}
                        height={height}
                        fill={isCollidingBeam ? "#EF4444" : isSelectedBeam ? "#3B82F6" : (lodLevel === 'low' ? "#C2410C" : "url(#orange-steel-gradient)")}
                        stroke={isCollidingBeam ? "#DC2626" : isSelectedBeam ? "#2563EB" : "#C2410C"}
                        strokeWidth={isCollidingBeam || isSelectedBeam ? "2.5" : "1"}
                        className={`filter drop-shadow-md cursor-pointer hover:brightness-110 transition ${isCollidingBeam ? "animate-pulse" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLevelId(level?.id);
                        }}
                      />
                    );
                  })()}
                  
                  {/* Beams Bolt details on scale joints */}
                  {lodLevel === 'high' && <circle cx={baseX + (rack.uprightWidthMm * scale) + 5} cy={y + height/2} r="1.5" fill="#E2E8F0" />}
                  {lodLevel === 'high' && <circle cx={baseX + rackWidthPx - (rack.uprightWidthMm * scale) - 5} cy={y + height/2} r="1.5" fill="#E2E8F0" />}

                  {/* Real-time Adjustment controls inline inside the SVG (visible when hovering near the beam) */}
                  <g className="hover-trigger transition-opacity duration-200">
                    {/* UP adjust button */}
                    <g
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustBeamHeight(level?.id, 'up');
                      }}
                      className="cursor-pointer"
                    >
                      <circle cx={baseX + rackWidthPx + 20} cy={y - 8} r="8" fill="#1E293B" stroke="#475569" strokeWidth="1" />
                      <text x={baseX + rackWidthPx + 20} y={y - 5} fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">▲</text>
                    </g>

                    {/* DOWN adjust button */}
                    <g
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustBeamHeight(level?.id, 'down');
                      }}
                      className="cursor-pointer"
                    >
                      <circle cx={baseX + rackWidthPx + 20} cy={y + height + 8} r="8" fill="#1E293B" stroke="#475569" strokeWidth="1" />
                      <text x={baseX + rackWidthPx + 20} y={y + height + 11} fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">▼</text>
                    </g>

                    {/* Delete Level (X button on left side) */}
                    <g
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Voulez-vous vraiment supprimer le niveau de lisses n°${level?.levelNumber} ?`)) {
                          handleDeleteLevel(level?.id);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <circle cx={baseX - 20} cy={y + height/2} r="8" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />
                      <text x={baseX - 20} y={y + height/2 + 3} fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">×</text>
                    </g>

                    {/* Height callout text */}
                    <text
                      x={baseX + rackWidthPx / 2}
                      y={y - 4}
                      fill="#FF6B35"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      Niveau {level?.levelNumber} : H = {formatLength(level.heightFromGroundMm, lengthUnit)}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* SVG Definitions for realistic rendering */}
            <defs>
              <linearGradient id="orange-steel-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FF8C42" />
                <stop offset="50%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#C2410C" />
              </linearGradient>
            </defs>
          </svg>

          {/* Quick instructions overlap */}
          <div className="absolute bottom-4 right-4 text-[10px] text-slate-400 bg-slate-800/95 px-2.5 py-1 rounded-md border border-slate-700 pointer-events-none shadow-sm font-semibold">
            Utilisez les flèches <span className="text-orange-600 font-bold">▲ ▼</span> sur le côté pour ajuster l'élévation.
          </div>
        </div>
      </div>

      {/* Sidebar Configurations & Active Slot details */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        {/* Rack Dimension Panel */}
        <div className="frosted-glass rounded-xl p-4 shadow-lg">
          <h4 className="font-bold text-slate-200 text-sm mb-3 flex items-center gap-2 font-display">
            ⚙️ Paramètres Structurels
          </h4>
          
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Nom du modèle
              </label>
              <input
                id="input-rack-name"
                type="text"
                value={rack.name}
                onChange={(e) => onChangeRack({ ...rack, name: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Hauteur Totale (mm)
                </label>
                <input
                  id="input-rack-height"
                  type="number"
                  step="100"
                  min="1800"
                  max="6000"
                  value={rack.totalHeightMm}
                  onChange={(e) => onChangeRack({ ...rack, totalHeightMm: parseInt(e.target.value) || 3000 })}
                  className="w-full text-xs px-3 py-2 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Largeur Totale (mm)
                </label>
                <input
                  id="input-rack-width"
                  type="number"
                  step="100"
                  min="1200"
                  max="4000"
                  value={rack.totalWidthMm}
                  onChange={(e) => onChangeRack({ ...rack, totalWidthMm: parseInt(e.target.value) || 2700 })}
                  className="w-full text-xs px-3 py-2 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Profondeur (mm)
                </label>
                <input
                  id="input-rack-depth"
                  type="number"
                  step="50"
                  min="600"
                  max="1500"
                  value={rack.depthMm}
                  onChange={(e) => onChangeRack({ ...rack, depthMm: parseInt(e.target.value) || 1100 })}
                  className="w-full text-xs px-3 py-2 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Alvéoles par niveau
                </label>
                <select
                  id="select-bins-per-level"
                  value={rack.binsPerLevel}
                  onChange={(e) => onChangeRack({ ...rack, binsPerLevel: parseInt(e.target.value) || 3 })}
                  className="w-full text-xs px-3 py-2 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-500 bg-slate-800 text-slate-200 cursor-pointer"
                >
                  <option value={2}>2 (Grandes Palettes)</option>
                  <option value={3}>3 (Standard Europe)</option>
                  <option value={4}>4 (Picking Carton)</option>
                  <option value={5}>5 (Haute Densité)</option>
                </select>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-300 mt-4 mb-2">Configuration par niveau (Pick vs Over)</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {( [null, ...rack.levels] as (null | typeof rack.levels[0])[] ).map((level, idx) => {
                  const isGround = idx === 0;
                  const levelId = isGround ? 'ground' : level?.id;
                  const levelNum = isGround ? 0 : level?.levelNumber || idx;
                  const lName = isGround ? 'Sol' : `Niveau ${levelNum}`;
                  
                  const currentType = isGround 
                    ? (rack.groundLevelType || 'pick') 
                    : (level?.levelType || 'over');
                    
                  const currentCount = isGround 
                    ? (rack.groundSlotsCount || 5) 
                    : (level?.slotsCount || 3);
                  
                  return (
                    <div key={levelId} className="bg-slate-800/50 p-2 border border-slate-700 rounded-lg flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-300">{lName}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const newRack = { ...rack };
                              if (isGround) {
                                newRack.groundLevelType = 'pick';
                                newRack.groundSlotsCount = 5;
                              } else {
                                const updatedLevels = [...rack.levels];
                                if (level) {
                                  const lvlIdx = updatedLevels.findIndex(l => l.id === level.id);
                                  if (lvlIdx !== -1) {
                                    updatedLevels[lvlIdx] = {
                                      ...level,
                                      levelType: 'pick',
                                      slotsCount: 5
                                    };
                                  }
                                }
                                newRack.levels = updatedLevels;
                              }
                              onChangeRack(newRack);
                            }}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold transition ${
                              currentType === 'pick'
                                ? 'bg-cyan-900/300 text-white shadow-sm'
                                : 'bg-slate-700 text-slate-400 hover:bg-slate-300'
                            }`}
                          >
                            Pick
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newRack = { ...rack };
                              if (isGround) {
                                newRack.groundLevelType = 'over';
                                newRack.groundSlotsCount = 3;
                              } else {
                                const updatedLevels = [...rack.levels];
                                if (level) {
                                  const lvlIdx = updatedLevels.findIndex(l => l.id === level.id);
                                  if (lvlIdx !== -1) {
                                    updatedLevels[lvlIdx] = {
                                      ...level,
                                      levelType: 'over',
                                      slotsCount: 3
                                    };
                                  }
                                }
                                newRack.levels = updatedLevels;
                              }
                              onChangeRack(newRack);
                            }}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold transition ${
                              currentType === 'over'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-700 text-slate-400 hover:bg-slate-300'
                            }`}
                          >
                            Over
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-500">
                          {currentType === 'pick' 
                            ? 'Sections / Boîtes :' 
                            : 'Palettes :'
                          }
                        </span>
                        <select
                          value={currentCount}
                          onChange={(e) => {
                            const newCount = parseInt(e.target.value);
                            const newRack = { ...rack };
                            if (isGround) {
                              newRack.groundSlotsCount = newCount;
                            } else {
                              const updatedLevels = [...rack.levels];
                              if (level) {
                                  const lvlIdx = updatedLevels.findIndex(l => l.id === level.id);
                                  if (lvlIdx !== -1) {
                                    updatedLevels[lvlIdx] = {
                                      ...level,
                                      slotsCount: newCount
                                    };
                                  }
                              }
                              newRack.levels = updatedLevels;
                            }
                            onChangeRack(newRack);
                          }}
                          className="text-[10px] px-1 py-0.5 border border-slate-700 rounded bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono font-medium cursor-pointer"
                        >
                          {currentType === 'pick' 
                            ? Array.from({length: 20}, (_, i) => i + 1).map(n => (
                                <option key={n} value={n}>{n} sec.</option>
                              ))
                            : [2, 3].map(n => (
                                <option key={n} value={n}>{n} pal. (Over)</option>
                              ))
                          }
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Subdivision Globale (Pick Bins)
                </label>
                <select
                  id="select-rack-subdivision"
                  value={alveoli[0]?.subdivisionCount || 1}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || 1;
                    const updatedAlveoli = alveoli.map(alv => {
                      if (count === 1) {
                        return {
                          ...alv,
                          isSubdivided: false,
                          subdivisionCount: 1,
                          pickBins: undefined,
                          occupied: false,
                          product: null,
                        };
                      } else {
                        const pickBins = Array.from({ length: count }).map((_, idx) => {
                          const binLabel = `L${alv.levelIndex}-${String.fromCharCode(65 + alv.binIndex)}-B${idx + 1}`;
                          return {
                            id: `${alv.id}-PB${idx}`,
                            label: binLabel,
                            occupied: false,
                            product: null,
                          };
                        });
                        return {
                          ...alv,
                          isSubdivided: true,
                          subdivisionCount: count,
                          pickBins,
                          occupied: false,
                          product: null,
                        };
                      }
                    });
                    onChangeAlveoli(updatedAlveoli);
                  }}
                  className="w-full text-xs px-3 py-2 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-500 bg-slate-800 text-slate-200 cursor-pointer"
                >
                  <option value={1}>Standard (1 par alvéole)</option>
                  <option value={2}>2 Bacs</option>
                  <option value={3}>3 Bacs</option>
                  <option value={4}>4 Bacs</option>
                  <option value={6}>6 Bacs</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Alveolus / Product Slotter */}
        <div className="frosted-glass rounded-xl p-4 flex-1 flex flex-col shadow-lg">
          <h4 className="font-bold text-slate-200 text-sm mb-3 flex items-center gap-2 font-display">
            📦 Remplissage de l'Alvéole
          </h4>

          {selectedAlveolusId ? (() => {
            const alv = alveoli.find((a) => a.id === selectedAlveolusId);
            if (!alv) return <p className="text-xs text-slate-500">Alvéole introuvable.</p>;

            const volLiters = (alv.widthMm * alv.heightMm * alv.depthMm) / 1000000;

            return (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3 flex-1 flex flex-col">
                  {/* Target Slot Badge */}
                  <div className="bg-cyan-900/30 border border-cyan-700/50 rounded-lg p-2.5 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-cyan-200 tracking-wider uppercase block">Emplacement ciblé</span>
                      <span className="font-bold text-slate-200 text-sm block font-display">{alv.label}</span>
                      <span className="text-[10px] text-sky-700/80 block font-semibold">Identifiant unique : {alv.id}</span>
                    </div>
                    {alv.occupied && alv.product && !alv.isSubdivided && (
                      <div className="text-right text-[10px] text-violet-300 font-bold">
                        <span className="font-semibold block text-slate-500">Actuel :</span>
                        <span>{alv.product.name}</span>
                      </div>
                    )}
                    {alv.isSubdivided && (
                      <div className="text-right text-[10px] text-sky-700 font-bold">
                        <span className="font-semibold block text-slate-500">Structure :</span>
                        <span>{alv.subdivisionCount} Pick Bins</span>
                      </div>
                    )}
                  </div>

                  {/* Subdivision / Pick Bins option */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">📐 Subdivision de l'alvéole</span>
                      <span className="text-[9px] font-mono text-cyan-400 bg-cyan-900/60/50 px-1.5 py-0.5 rounded font-bold">Pick Bins</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Subdivisez cette alvéole en petits compartiments (bacs plastiques/cartons) de prélèvement.
                    </p>
                    <div className="grid grid-cols-5 gap-1">
                      {[1, 2, 3, 4, 6].map((count) => {
                        const isCurrent = (alv.subdivisionCount || 1) === count && alv.isSubdivided === (count > 1);
                        return (
                          <button
                            key={count}
                            type="button"
                            onClick={() => handleSetSubdivision(alv.id, count)}
                            className={`py-1 rounded text-[10px] font-semibold border transition-all text-center cursor-pointer ${
                              isCurrent
                                ? 'bg-cyan-600 border-sky-600 text-white shadow-sm'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-800/50'
                            }`}
                          >
                            {count === 1 ? 'Standard' : `${count} Bacs`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slot Volume Details */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-800/50 p-2.5 rounded-lg border border-slate-700 text-[11px] text-slate-400">
                    <div>
                      <span className="text-slate-500 font-semibold block">Largeur disponible :</span>
                      <strong className="text-slate-200 font-mono">
                        {alv.isSubdivided 
                          ? `${formatLength(alv.widthMm / (alv.subdivisionCount || 1), lengthUnit)} / bac` 
                          : `${formatLength(alv.widthMm, lengthUnit)}`}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block">Hauteur utile :</span>
                      <strong className="text-slate-200 font-mono">{formatLength(alv.heightMm, lengthUnit)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block">Profondeur utile :</span>
                      <strong className="text-slate-200 font-mono">{formatLength(alv.depthMm, lengthUnit)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block">Volume utile :</span>
                      <strong className="text-sky-700 font-mono text-[11px] font-bold">
                        {alv.isSubdivided 
                          ? `${(volLiters / (alv.subdivisionCount || 1)).toFixed(1)} L / bac`
                          : `${volLiters.toFixed(1)} L`}
                      </strong>
                    </div>
                  </div>

                  {/* If subdivided, render Pick Bins Selector */}
                  {alv.isSubdivided && alv.pickBins && (
                    <div className="space-y-1.5 bg-cyan-900/30/50 border border-sky-100 p-2 rounded-lg">
                      <span className="text-[10px] font-bold text-cyan-200 uppercase tracking-wider block">Sélectionnez le bac à configurer :</span>
                      <div className="grid grid-cols-2 gap-1.5 max-h-[110px] overflow-y-auto">
                        {alv.pickBins.map((bin, idx) => {
                          const isBinSelected = selectedPickBinIndex === idx;
                          return (
                            <button
                              key={bin.id}
                              type="button"
                              onClick={() => {
                                setSelectedPickBinIndex(idx);
                                if (bin.occupied && bin.product) {
                                  setSelectedProductToPlace(bin.product);
                                } else {
                                  setSelectedProductToPlace(null);
                                }
                              }}
                              className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                isBinSelected
                                  ? 'bg-slate-800 border-sky-500 ring-2 ring-sky-500/20 text-sky-900 shadow-sm'
                                  : 'bg-slate-800/30 border-slate-700 hover:bg-slate-800/50 text-slate-300'
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="font-extrabold text-[11px] text-cyan-200 font-mono">{bin.label}</span>
                                <span className="text-[9px] text-slate-400 font-mono">#{idx+1}</span>
                              </div>
                              <div className="mt-1 text-[10px] truncate w-full">
                                {bin.occupied && bin.product ? (
                                  <span className="flex items-center gap-1.5 truncate">
                                    <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: bin.product.color }}></span>
                                    <span className="font-semibold text-slate-200 truncate">{bin.product.name}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[9px]">Vide</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tab Selector Header */}
                  <div className="flex border-b border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setSidebarTab('select')}
                      className={`flex-1 pb-1.5 font-bold border-b-2 text-center transition-colors cursor-pointer ${
                        sidebarTab === 'select'
                          ? 'border-sky-600 text-sky-700'
                          : 'border-transparent text-slate-500 hover:text-slate-100'
                      }`}
                    >
                      Choisir Produit
                    </button>
                    <button
                      type="button"
                      onClick={() => setSidebarTab('create')}
                      className={`flex-1 pb-1.5 font-bold border-b-2 text-center transition-colors cursor-pointer ${
                        sidebarTab === 'create'
                          ? 'border-sky-600 text-sky-700'
                          : 'border-transparent text-slate-500 hover:text-slate-100'
                      }`}
                    >
                      + Créer Palette Custom
                    </button>
                  </div>

                  {/* Tab Contents */}
                  {sidebarTab === 'select' ? (
                    <div className="space-y-3 flex-1 flex flex-col min-h-0">
                      <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1 flex-1 min-h-[100px]">
                        {availableProducts.map((prod) => {
                          const isSelectedPreview = selectedProductToPlace?.id === prod.id;
                          return (
                            <button
                              key={prod.id}
                              onClick={() => setSelectedProductToPlace(prod)}
                              className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all text-xs cursor-pointer ${
                                isSelectedPreview
                                  ? 'bg-cyan-900/30 border-sky-400 text-sky-900 ring-2 ring-sky-500/5'
                                  : 'bg-slate-800 border-slate-700 hover:bg-slate-800/50 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-3 h-3 rounded-full border border-black/10 inline-block shrink-0"
                                  style={{ backgroundColor: prod.color }}
                                ></span>
                                <div className="min-w-0 truncate">
                                  <div className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                                    {prod.name}
                                    {prod.rotationClass && (
                                      <span className={`text-[9px] font-mono px-1 py-[1px] rounded font-bold uppercase tracking-wider
                                        ${prod.rotationClass === 'A' ? 'bg-cyan-900/50 text-cyan-200 border border-cyan-500/30' :
                                          prod.rotationClass === 'B' ? 'bg-violet-900/50 text-violet-300 border border-violet-500/30' :
                                          'bg-rose-900/30 text-rose-400 border border-rose-500/30'}`}
                                      >
                                        Cl.{prod.rotationClass}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-500 truncate">
                                    {prod.sku} {prod.widthMm ? `(${prod.widthMm}x${prod.heightMm}x${prod.depthMm})` : ''}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <div className="text-right text-[10px] text-slate-500">
                                  <strong className="text-slate-200">{prod.weight} lbs</strong>
                                  <div className="text-[9px] font-mono">{prod.type}</div>
                                </div>
                                {prod.isCustomPallet && (
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`Voulez-vous supprimer la palette personnalisée "${prod.name}" ?`)) {
                                        if (selectedProductToPlace?.id === prod.id) {
                                          setSelectedProductToPlace(null);
                                        }
                                        onDeleteCustomProduct(prod.id);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-900/30 rounded transition-colors cursor-pointer"
                                    title="Supprimer cette palette personnalisée"
                                  >
                                    <Trash2 size={12} />
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Preview details & Real-time Collision Feedback Card */}
                      {selectedProductToPlace && (
                        <div className="mt-1 space-y-2">
                          <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700 text-xs text-slate-400">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gabarit sélectionné</span>
                            <div className="flex justify-between items-center mt-1">
                              <span className="font-bold text-slate-200">{selectedProductToPlace.name}</span>
                              <span className="font-mono text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-500">
                                {formatLength(selectedProductToPlace.widthMm || 1200, lengthUnit)} x {formatLength(selectedProductToPlace.heightMm || 1200, lengthUnit)} x {formatLength(selectedProductToPlace.depthMm || 800, lengthUnit)}
                              </span>
                            </div>
                          </div>

                          {/* Collision Warnings list */}
                          {collisionResult && collisionResult.hasCollision ? (
                            <div className="bg-rose-900/30 border border-rose-700/50 text-rose-800 rounded-lg p-2.5 text-xs space-y-1.5">
                              <span className="font-extrabold flex items-center gap-1 text-rose-400 uppercase tracking-wider text-[10px]">
                                <AlertTriangle size={12} /> CONFLIT DE COLLISION DETECTÉ !
                              </span>
                              <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                                {collisionResult.reasons.map((r, i) => (
                                  <li key={i}>{r}</li>
                                ))}
                              </ul>
                              <span className="text-[10px] text-rose-600/80 block italic">Veuillez libérer la place ou utiliser une palette de plus petit gabarit.</span>
                            </div>
                          ) : (
                            <div className="bg-emerald-900/30 border border-emerald-700/50 text-emerald-200 rounded-lg p-2.5 text-[11px] flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-900/300 animate-ping"></span>
                              <span className="font-medium">Aucune collision physique détectée. Espace de sécurité EN 15635 conforme.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Create Palette Form Tab */
                    <form onSubmit={handleCustomPalletSubmit} className="space-y-3 mt-1 text-xs">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Nom de la Palette
                        </label>
                        <input
                          id="input-pallet-name"
                          type="text"
                          placeholder="Ex: Palette Euro XL"
                          value={palletName}
                          onChange={(e) => setPalletName(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Classe de Rotation (ABC)
                        </label>
                        <select
                          value={palletRotation}
                          onChange={(e) => setPalletRotation(e.target.value as 'A'|'B'|'C')}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                        >
                          <option value="A">A - Très Rapide (Idéal sol / N1)</option>
                          <option value="B">B - Moyen (Idéal N2 / N3)</option>
                          <option value="C">C - Lent (Idéal N4+)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Matière Dangereuse (TMD)
                        </label>
                        <select
                          value={palletTmdClass}
                          onChange={(e) => setPalletTmdClass(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none focus:border-orange-500 cursor-pointer"
                        >
                          <option value="None">Aucune / Non applicable</option>
                          <option value="2.1">Classe 2.1 (Gaz Inflammable)</option>
                          <option value="2.2">Classe 2.2 (Gaz Ininflammable)</option>
                          <option value="3">Classe 3 (Liquide Inflammable)</option>
                          <option value="4.1">Classe 4.1 (Solide Inflammable)</option>
                          <option value="5.1">Classe 5.1 (Comburant)</option>
                          <option value="6.1">Classe 6.1 (Toxique)</option>
                          <option value="8">Classe 8 (Corrosif)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 text-center">
                            Largeur (mm)
                          </label>
                          <input
                            id="input-pallet-width"
                            type="number"
                            min="200"
                            max="3000"
                            value={palletWidth}
                            onChange={(e) => setPalletWidth(parseInt(e.target.value) || 1200)}
                            className="w-full text-xs px-2 py-1.5 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 text-center">
                            Hauteur (mm)
                          </label>
                          <input
                            id="input-pallet-height"
                            type="number"
                            min="200"
                            max="3000"
                            value={palletHeight}
                            onChange={(e) => setPalletHeight(parseInt(e.target.value) || 1200)}
                            className="w-full text-xs px-2 py-1.5 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 text-center">
                            Profondeur (mm)
                          </label>
                          <input
                            id="input-pallet-depth"
                            type="number"
                            min="200"
                            max="3000"
                            value={palletDepth}
                            onChange={(e) => setPalletDepth(parseInt(e.target.value) || 800)}
                            className="w-full text-xs px-2 py-1.5 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-center"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            Poids de charge (lbs)
                          </label>
                          <input
                            id="input-pallet-weight"
                            type="number"
                            min="1"
                            max="3000"
                            value={palletWeight}
                            onChange={(e) => setPalletWeight(parseInt(e.target.value) || 500)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            Couleur Palette
                          </label>
                          <div className="flex gap-2 items-center h-8">
                            <input
                              type="color"
                              value={palletColor}
                              onChange={(e) => setPalletColor(e.target.value)}
                              className="w-8 h-8 rounded border-none bg-transparent cursor-pointer shrink-0"
                            />
                            <span className="text-[10px] font-mono text-slate-500 uppercase select-all font-semibold">{palletColor}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs mt-2 transition-colors cursor-pointer"
                      >
                        Enregistrer la Palette Custom
                      </button>
                    </form>
                  )}
                </div>

                {/* Footer Controls of filling */}
                <div className="pt-3 border-t border-slate-700 flex flex-col gap-2">
                  {selectedProductToPlace && sidebarTab === 'select' && (
                    <button
                      onClick={() => {
                        if (collisionResult?.hasCollision) {
                          alert("Impossible de charger la palette : Un conflit de collision physique ou mécanique a été détecté.");
                          return;
                        }
                        assignProductToAlveolus(alv.id, selectedProductToPlace, alv.isSubdivided ? selectedPickBinIndex : undefined);
                      }}
                      disabled={collisionResult?.hasCollision}
                      className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        collisionResult?.hasCollision
                          ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-50'
                          : 'bg-cyan-600 hover:bg-sky-700 text-white font-bold shadow-lg shadow-sky-600/10'
                      }`}
                    >
                      Confirmer le chargement
                    </button>
                  )}

                  <div className="flex gap-2">
                    {alv.occupied && (
                      <button
                        onClick={() => {
                          if (alv.isSubdivided) {
                            assignProductToAlveolus(alv.id, null, selectedPickBinIndex);
                          } else {
                            assignProductToAlveolus(alv.id, null);
                          }
                          setSelectedProductToPlace(null);
                        }}
                        className="flex-1 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 border border-rose-700/50 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Trash2 size={13} />
                        {alv.isSubdivided ? "Vider le Bac" : "Vider l'alvéole"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedAlveolusId(null);
                        setSelectedProductToPlace(null);
                      }}
                      className="flex-1 bg-slate-800/50 hover:bg-slate-800 text-slate-300 border border-slate-700 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center"
                    >
                      Fermer
                    </button>
                  </div>

                  {alv.isSubdivided && alv.occupied && (
                    <button
                      onClick={() => {
                        if (confirm("Voulez-vous vider tous les bacs de cette alvéole ?")) {
                          const updated = alveoli.map((a) => {
                            if (a.id === alv.id) {
                              const clearedBins = a.pickBins?.map(b => ({ ...b, occupied: false, product: null }));
                              return {
                                ...a,
                                pickBins: clearedBins,
                                occupied: false,
                                product: null,
                              };
                            }
                            return a;
                          });
                          onChangeAlveoli(updated);
                          setSelectedProductToPlace(null);
                        }
                      }}
                      className="w-full bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 border border-rose-700/50 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 mt-1"
                    >
                      <Trash2 size={13} />
                      Vider TOUS les Bacs
                    </button>
                  )}
                </div>
              </div>
            );
          })() : (
            <div className="flex-1 flex flex-col justify-between p-1">
              {/* Informative placeholder */}
              <div className="text-center py-5 px-3 text-slate-500 bg-slate-800/50 rounded-xl border border-slate-700">
                <Box size={32} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-300">Aucune alvéole sélectionnée</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
                  Cliquez directement sur une alvéole dans le schéma 3D pour configurer son contenu individuellement.
                </p>
              </div>

              {/* Mass operations panel */}
              <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-widest block">⚡ Actions de Slotting Global</span>
                
                <div className="space-y-2.5 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                  <label className="block text-[10px] font-semibold text-slate-500">
                    Produit pour le remplissage rapide :
                  </label>
                  <select
                    id="select-bulk-product"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none cursor-pointer"
                    defaultValue={availableProducts[0]?.id || ''}
                  >
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.weight} lbs)
                      </option>
                    ))}
                  </select>

                  <button
                    id="btn-bulk-fill"
                    onClick={() => {
                      const selectEl = document.getElementById('select-bulk-product') as HTMLSelectElement | null;
                      if (selectEl) {
                        const prod = availableProducts.find(p => p.id === selectEl.value);
                        if (prod) handleBulkFill(prod);
                      }
                    }}
                    className="w-full py-2 px-3 bg-cyan-900/30 hover:bg-cyan-900/60 text-cyan-200 border border-cyan-700/50 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Box size={13} />
                    Auto-Slotting Intelligent
                  </button>
                  <p className="text-[9px] text-slate-500 text-center leading-normal">
                    Remplit automatiquement les cases vides sans déclencher de collisions ou surcharges de lisses.
                  </p>
                </div>

                <button
                  id="btn-bulk-clear"
                  onClick={handleBulkClear}
                  className="w-full py-2 px-3 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 border border-rose-700/50 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} />
                  Vider entièrement le rack
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add custom beam level height */}
      <AddLevelModal
        show={showAddLevelModal}
        onClose={() => setShowAddLevelModal(false)}
        rack={rack}
        newLevelHeight={newLevelHeight}
        setNewLevelHeight={setNewLevelHeight}
        onAddLevel={handleAddLevel}
      />

      <StructureConfigModal
        show={showStructureModal}
        onClose={() => setShowStructureModal(false)}
        rack={rack}
        onChangeRack={onChangeRack}
        setNewLevelHeight={setNewLevelHeight}
        onShowAddLevelModal={() => setShowAddLevelModal(true)}
        setSelectedLevelId={setSelectedLevelId}
        handleDeleteLevel={handleDeleteLevel}
      />

      <LevelEditModal
        selectedLevelId={selectedLevelId}
        onClose={() => setSelectedLevelId(null)}
        rack={rack}
        handleUpdateLevelHeight={handleUpdateLevelHeight}
        handleUpdateLevelThickness={handleUpdateLevelThickness}
        handleUpdateLevelType={handleUpdateLevelType}
        handleUpdateLevelSlots={handleUpdateLevelSlots}
        handleUpdateLevelLoad={handleUpdateLevelLoad}
        handleDeleteLevel={handleDeleteLevel}
      />

      {/* Synchronized Real-Time KPIs & Grid Table */}
      <div className="lg:col-span-12 mt-4 space-y-4">
        <RackKPIs
          totalVolumeLiters={totalVolumeLiters}
          totalStoredVolumeLiters={totalStoredVolumeLiters}
          volumetricOccupancyRate={volumetricOccupancyRate}
          occupancyRate={occupancyRate}
          totalWeightLbs={totalWeightLbs}
          rack={rack}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RackAlveoliTable
              alveoli={alveoli}
              hoveredAlveolusId={hoveredAlveolusId}
              setHoveredAlveolusId={setHoveredAlveolusId}
              selectedAlveolusId={selectedAlveolusId}
              setSelectedAlveolusId={setSelectedAlveolusId}
            />
          </div>
          <div className="lg:col-span-1 h-full">
            <ErgonomicAnalysis rack={rack} alveoli={alveoli} />
          </div>
        </div>
      </div>
    </div>
  );
}
