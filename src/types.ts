/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  sku: string;
  weight: number; // in lbs
  color: string;  // hex or tailwind color
  type: 'Palette' | 'Carton' | 'Fut' | 'Bac' | 'Bobine';
  volumeLiters: number;
  widthMm?: number;  // Largeur de la palette (mm)
  heightMm?: number; // Hauteur de la palette (mm)
  depthMm?: number;  // Profondeur de la palette (mm)
  isCustomPallet?: boolean;
  rotationClass?: 'A' | 'B' | 'C';
  tmdClass?: '2.1' | '2.2' | '2.3' | '3' | '4.1' | '4.2' | '4.3' | '5.1' | '5.2' | '6.1' | '8' | 'None';
}

export interface PickBin {
  id: string;        // e.g. "alv-L1-B0-PB0"
  label: string;     // e.g. "PB1"
  occupied: boolean;
  product?: Product | null;
}

export interface Alveolus {
  id: string;      // e.g. "L1-A", "L1-B"
  levelIndex: number; // 0 for ground, 1 for level 1, etc.
  binIndex: number;   // 0 for left, 1 for middle, etc.
  label: string;      // e.g. "Niveau 1 - Alvéole A"
  widthMm: number;
  heightMm: number;
  depthMm: number;
  occupied: boolean;
  product?: Product | null;
  isSubdivided?: boolean;
  blocked?: boolean;
  subdivisionCount?: number;
  pickBins?: PickBin[];
}

export interface BeamLevel {
  id: string;
  levelNumber: number; // 1, 2, 3, etc. (0 is ground)
  heightFromGroundMm: number; // Height of the beam from floor in mm
  beamThicknessMm: number;
  maxLoadLbs?: number;
  slotsCount?: number; // Number of slots for this specific level
  levelType?: 'pick' | 'over'; // Subdivision type: pick (customizable) or over (2 or 3 standard)
}

export interface Rack {
  id: string;
  name: string;
  totalHeightMm: number;     // e.g., 4500
  totalWidthMm: number;      // e.g., 2700
  depthMm: number;           // e.g., 1100
  uprightWidthMm: number;    // largeur du montant d'échelle, e.g., 80
  binsPerLevel: number;
  groundSlotsCount?: number; // Number of slots for the ground level
  groundLevelType?: 'pick' | 'over'; // Type of the ground level
  maxLoadLbs?: number;      // 2 or 3 standard slots per level
  levels: BeamLevel[];       // positions of structural beams
  createdAt: string;
  certificationYear?: number;
}

export interface PlacedRack {
  id: string;                // instance ID on map
  rackTemplateId: string;    // template reference
  customLabel: string;       // e.g. "Rack Allée A - 01"
  x: number;                 // coordinate X on the map grid (in pixels or meters)
  y: number;                 // coordinate Y on the map grid
  rotation: 0 | 90 | 180 | 270; // rotation angle in degrees
  gridWidth: number;         // visual size multiplier on 2D map
  gridLength: number;
  color?: string;            // custom hex or theme color, e.g., 'orange', 'blue'
}

export interface ShopZone {
  id: string;
  type: 'reception' | 'shipping' | 'storage' | 'damaged' | 'aisle' | 'office' | 'emergency' | 'custom';
  x: number;
  y: number;
  width: number;
  length: number;
  label: string;
  color: string;
}

export interface ShopMap {
  widthMeters: number;       // e.g., 40m
  lengthMeters: number;      // e.g., 60m
  gridScalePx: number;       // e.g., 15px per meter
  placedRacks: PlacedRack[];
  zones?: ShopZone[];
  backgroundUrl?: string;    // optional background plan layout
  backgroundScale?: number;  // in percent, e.g. 100
  backgroundOffsetX?: number; // in meters, offset from top-left corner
  backgroundOffsetY?: number; // in meters, offset from top-left corner
  backgroundOpacity?: number; // in percent (0-100)
  aisleLabels?: AisleLabel[];
}

export interface AisleLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  rotation: number;
  fontSize: number;
}

export function getSlotsCountForLevel(rack: Rack, levelIndex: number): number {
  const isGround = levelIndex === 0;
  const levelType = isGround 
    ? (rack.groundLevelType || 'pick') 
    : (rack.levels[levelIndex - 1]?.levelType || 'over');
    
  if (isGround) {
    if (levelType === 'over') {
      const val = rack.groundSlotsCount || rack.binsPerLevel || 3;
      return Math.min(3, Math.max(2, val));
    } else {
      return rack.groundSlotsCount || 5;
    }
  } else {
    const levelObj = rack.levels[levelIndex - 1];
    if (levelType === 'over') {
      const val = levelObj?.slotsCount || rack.binsPerLevel || 3;
      return Math.min(3, Math.max(2, val));
    } else {
      return levelObj?.slotsCount || 5;
    }
  }
}
