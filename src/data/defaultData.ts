/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Rack, ShopMap } from '../types';
import defaultBackgroundUrl from '../assets/images/warehouse_layout_bg_1783739522503.jpg';

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Palette Europe (Alimentaire)',
    sku: 'PAL-EUR-AGRO-01',
    weight: 925,
    color: '#E07A5F',
    type: 'Palette',
    volumeLiters: 1200,
    widthMm: 1016,
    heightMm: 1200,
    depthMm: 1219,
    rotationClass: 'A',
  },
  {
    id: 'prod-2',
    name: 'Fûts Chimiques (Sécurisés)',
    sku: 'CHM-FUT-BLUE-99',
    weight: 750,
    color: '#3D5A80',
    type: 'Fut',
    volumeLiters: 900,
    widthMm: 1016,
    heightMm: 1000,
    depthMm: 1219,
    rotationClass: 'C',
  },
  {
    id: 'prod-3',
    name: 'Bobine d\'Acier Lourde',
    sku: 'MET-BOB-COIL-05',
    weight: 1250,
    color: '#7F8C8D',
    type: 'Bobine',
    volumeLiters: 650,
    widthMm: 1016,
    heightMm: 1000,
    depthMm: 1016,
    rotationClass: 'C',
  },
  {
    id: 'prod-4',
    name: 'Cartons High-Tech (Électronique)',
    sku: 'CAR-HITECH-EL-04',
    weight: 110,
    color: '#3A86C8',
    type: 'Carton',
    volumeLiters: 450,
    widthMm: 800,
    heightMm: 800,
    depthMm: 700,
    rotationClass: 'B',
  },
  {
    id: 'prod-5',
    name: 'Bacs Plastiques de Picking',
    sku: 'BAC-BIN-YEL-22',
    weight: 35,
    color: '#F4D03F',
    type: 'Bac',
    volumeLiters: 200,
    widthMm: 600,
    heightMm: 500,
    depthMm: 500,
    rotationClass: 'A',
  },
  {
    id: 'prod-6',
    name: 'Palette Bois (Pièces Machines)',
    sku: 'PAL-WOOD-MACH-88',
    weight: 950,
    color: '#8D6E63',
    type: 'Palette',
    volumeLiters: 1100,
    widthMm: 1219,
    heightMm: 1300,
    depthMm: 1016,
  }
];

export const DEFAULT_RACKS: Rack[] = [
  {
    id: 'rack-102-4-5',
    name: '4.5 po instep - 102 po',
    totalHeightMm: 4877, // 16 ft
    totalWidthMm: 2791, // 102 po (2591mm) + 2x100mm uprights
    depthMm: 1067, // 42 po
    uprightWidthMm: 100,
    binsPerLevel: 2,
    levels: [
      { id: 'b1-102', levelNumber: 1, heightFromGroundMm: 1219, beamThicknessMm: 114 }, // 4.5 po = 114mm
      { id: 'b2-102', levelNumber: 2, heightFromGroundMm: 2438, beamThicknessMm: 114 },
      { id: 'b3-102', levelNumber: 3, heightFromGroundMm: 3657, beamThicknessMm: 114 }
    ],
    certificationYear: 2023,
    maxLoadLbs: 20000,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rack-144-6',
    name: '6 po double C-shape - 144 po',
    totalHeightMm: 6096, // 20 ft
    totalWidthMm: 3858, // 144 po (3658mm) + 2x100mm uprights
    depthMm: 1067, // 42 po
    uprightWidthMm: 100,
    binsPerLevel: 3,
    levels: [
      { id: 'b1-144', levelNumber: 1, heightFromGroundMm: 1219, beamThicknessMm: 152 }, // 6 po = 152mm
      { id: 'b2-144', levelNumber: 2, heightFromGroundMm: 2438, beamThicknessMm: 152 },
      { id: 'b3-144', levelNumber: 3, heightFromGroundMm: 3657, beamThicknessMm: 152 },
      { id: 'b4-144', levelNumber: 4, heightFromGroundMm: 4876, beamThicknessMm: 152 }
    ],
    certificationYear: 2023,
    maxLoadLbs: 25000,
    createdAt: new Date().toISOString(),
  },

  {
    id: 'rack-standard-3',
    name: 'Rack Standard Lourd (3 Palettes)',
    totalHeightMm: 4877,
    totalWidthMm: 2438,
    depthMm: 1067,
    uprightWidthMm: 100,
    binsPerLevel: 2,
    levels: [
      { id: 'b1', levelNumber: 1, heightFromGroundMm: 1300, beamThicknessMm: 100 },
      { id: 'b2', levelNumber: 2, heightFromGroundMm: 2600, beamThicknessMm: 100 },
      { id: 'b3', levelNumber: 3, heightFromGroundMm: 3800, beamThicknessMm: 100 }
    ],
    createdAt: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'rack-moyen-2',
    name: 'Rack Intermédiaire (2 Palettes)',
    totalHeightMm: 3600,
    totalWidthMm: 1800,
    depthMm: 1000,
    uprightWidthMm: 80,
    binsPerLevel: 2,
    levels: [
      { id: 'b2-1', levelNumber: 1, heightFromGroundMm: 1200, beamThicknessMm: 80 },
      { id: 'b2-2', levelNumber: 2, heightFromGroundMm: 2400, beamThicknessMm: 80 }
    ],
    createdAt: new Date('2026-02-01').toISOString(),
  },
  {
    id: 'rack-picking-haute-densite',
    name: 'Rayonnage Picking Légers',
    totalHeightMm: 2200,
    totalWidthMm: 2000,
    depthMm: 800,
    uprightWidthMm: 60,
    binsPerLevel: 4,
    levels: [
      { id: 'bp-1', levelNumber: 1, heightFromGroundMm: 600, beamThicknessMm: 50 },
      { id: 'bp-2', levelNumber: 2, heightFromGroundMm: 1100, beamThicknessMm: 50 },
      { id: 'bp-3', levelNumber: 3, heightFromGroundMm: 1600, beamThicknessMm: 50 }
    ],
    createdAt: new Date('2026-03-01').toISOString(),
  }
];

export const DEFAULT_SHOP_MAP: ShopMap = {
  widthMeters: 75,
  lengthMeters: 55,
  gridScalePx: 12, // pixels per meter
  backgroundUrl: defaultBackgroundUrl,
  backgroundScale: 100,
  backgroundOffsetX: 0,
  backgroundOffsetY: 0,
  backgroundOpacity: 45,
  placedRacks: [
    // 1. Column of vertical orange racks on the left (Blocks G08, G0C, G0D, G0E, G0F, G0G)
    { id: 'g08-1', rackTemplateId: 'rack-standard-3', customLabel: 'G08-01', x: 3, y: 5, rotation: 90, gridWidth: 2.44, gridLength: 1.07, color: 'orange' },
    { id: 'g08-2', rackTemplateId: 'rack-standard-3', customLabel: 'G08-02', x: 3, y: 8, rotation: 90, gridWidth: 2.44, gridLength: 1.07, color: 'orange' },
    
    { id: 'g0c-1', rackTemplateId: 'rack-standard-3', customLabel: 'G0C-01', x: 3, y: 13, rotation: 90, gridWidth: 2.44, gridLength: 1.07, color: 'orange' },
    { id: 'g0c-2', rackTemplateId: 'rack-standard-3', customLabel: 'G0C-02', x: 3, y: 16, rotation: 90, gridWidth: 2.44, gridLength: 1.07, color: 'orange' },
    
    { id: 'g0d-1', rackTemplateId: 'rack-standard-3', customLabel: 'G0D-01', x: 3, y: 21, rotation: 90, gridWidth: 2.44, gridLength: 1.07, color: 'orange' },
    { id: 'g0d-2', rackTemplateId: 'rack-standard-3', customLabel: 'G0D-02', x: 3, y: 24, rotation: 90, gridWidth: 2.44, gridLength: 1.07, color: 'orange' },
    
    { id: 'g0e-1', rackTemplateId: 'rack-standard-3', customLabel: 'G0E-01', x: 3, y: 29, rotation: 90, gridWidth: 2.44, gridLength: 1.07, color: 'orange' },
    { id: 'g0e-2', rackTemplateId: 'rack-standard-3', customLabel: 'G0E-02', x: 3, y: 32, rotation: 90, gridWidth: 2.44, gridLength: 1.07, color: 'orange' },

    { id: 'g0f-1', rackTemplateId: 'rack-standard-3', customLabel: 'G0F-01', x: 8, y: 13, rotation: 90, gridWidth: 2.44, gridLength: 1.07, color: 'orange' },
    { id: 'g0f-2', rackTemplateId: 'rack-standard-3', customLabel: 'G0F-02', x: 8, y: 16, rotation: 90, gridWidth: 2.44, gridLength: 1.07, color: 'orange' },

    { id: 'g0g-1', rackTemplateId: 'rack-standard-3', customLabel: 'G0G-01', x: 8, y: 21, rotation: 90, gridWidth: 2.44, gridLength: 1.07, color: 'orange' },
    { id: 'g0g-2', rackTemplateId: 'rack-standard-3', customLabel: 'G0G-02', x: 8, y: 24, rotation: 90, gridWidth: 2.44, gridLength: 1.07, color: 'orange' },

    { id: 'g0h-1', rackTemplateId: 'rack-standard-3', customLabel: 'G0H-01', x: 8, y: 29, rotation: 90, gridWidth: 2.44, gridLength: 1.07, color: 'orange' },
    { id: 'g0h-2', rackTemplateId: 'rack-standard-3', customLabel: 'G0H-02', x: 8, y: 32, rotation: 90, gridWidth: 2.44, gridLength: 1.07, color: 'orange' },

    // 2. Parallel horizontal blue rows of racks in center and right (Separated by central walkway at X=35)
    // Row 1 (y=5): G2B and G1P
    { id: 'g2b-1', rackTemplateId: 'rack-standard-3', customLabel: 'G2B-01', x: 18, y: 5, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g2b-2', rackTemplateId: 'rack-standard-3', customLabel: 'G2B-02', x: 21, y: 5, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g2b-3', rackTemplateId: 'rack-standard-3', customLabel: 'G2B-03', x: 24, y: 5, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g1p-1', rackTemplateId: 'rack-standard-3', customLabel: 'G1P-01', x: 38, y: 5, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g1p-2', rackTemplateId: 'rack-standard-3', customLabel: 'G1P-02', x: 41, y: 5, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g1p-3', rackTemplateId: 'rack-standard-3', customLabel: 'G1P-03', x: 44, y: 5, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g1p-4', rackTemplateId: 'rack-standard-3', customLabel: 'G1P-04', x: 55, y: 5, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g1p-5', rackTemplateId: 'rack-standard-3', customLabel: 'G1P-05', x: 58, y: 5, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g1p-6', rackTemplateId: 'rack-standard-3', customLabel: 'G1P-06', x: 61, y: 5, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },

    // Row 2 (y=11): G1M and G1K
    { id: 'g1m-1', rackTemplateId: 'rack-standard-3', customLabel: 'G1M-01', x: 18, y: 11, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g1m-2', rackTemplateId: 'rack-standard-3', customLabel: 'G1M-02', x: 21, y: 11, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g1m-3', rackTemplateId: 'rack-standard-3', customLabel: 'G1M-03', x: 24, y: 11, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g1k-1', rackTemplateId: 'rack-standard-3', customLabel: 'G1K-01', x: 38, y: 11, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g1k-2', rackTemplateId: 'rack-standard-3', customLabel: 'G1K-02', x: 41, y: 11, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g1k-3', rackTemplateId: 'rack-standard-3', customLabel: 'G1K-03', x: 44, y: 11, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g1k-4', rackTemplateId: 'rack-standard-3', customLabel: 'G1K-04', x: 55, y: 11, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g1k-5', rackTemplateId: 'rack-standard-3', customLabel: 'G1K-05', x: 58, y: 11, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g1k-6', rackTemplateId: 'rack-standard-3', customLabel: 'G1K-06', x: 61, y: 11, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },

    // Row 3 (y=18): G3A and G3B
    { id: 'g3a-1', rackTemplateId: 'rack-standard-3', customLabel: 'G3A-01', x: 18, y: 18, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3a-2', rackTemplateId: 'rack-standard-3', customLabel: 'G3A-02', x: 21, y: 18, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3a-3', rackTemplateId: 'rack-standard-3', customLabel: 'G3A-03', x: 24, y: 18, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3b-1', rackTemplateId: 'rack-standard-3', customLabel: 'G3B-01', x: 38, y: 18, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3b-2', rackTemplateId: 'rack-standard-3', customLabel: 'G3B-02', x: 41, y: 18, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3b-3', rackTemplateId: 'rack-standard-3', customLabel: 'G3B-03', x: 44, y: 18, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3b-4', rackTemplateId: 'rack-standard-3', customLabel: 'G3B-04', x: 55, y: 18, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3b-5', rackTemplateId: 'rack-standard-3', customLabel: 'G3B-05', x: 58, y: 18, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3b-6', rackTemplateId: 'rack-standard-3', customLabel: 'G3B-06', x: 61, y: 18, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },

    // Row 4 (y=25): G3D and G3E
    { id: 'g3d-1', rackTemplateId: 'rack-standard-3', customLabel: 'G3D-01', x: 18, y: 25, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3d-2', rackTemplateId: 'rack-standard-3', customLabel: 'G3D-02', x: 21, y: 25, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3d-3', rackTemplateId: 'rack-standard-3', customLabel: 'G3D-03', x: 24, y: 25, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3e-1', rackTemplateId: 'rack-standard-3', customLabel: 'G3E-01', x: 38, y: 25, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3e-2', rackTemplateId: 'rack-standard-3', customLabel: 'G3E-02', x: 41, y: 25, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3e-3', rackTemplateId: 'rack-standard-3', customLabel: 'G3E-03', x: 44, y: 25, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3e-4', rackTemplateId: 'rack-standard-3', customLabel: 'G3E-04', x: 55, y: 25, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3e-5', rackTemplateId: 'rack-standard-3', customLabel: 'G3E-05', x: 58, y: 25, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3e-6', rackTemplateId: 'rack-standard-3', customLabel: 'G3E-06', x: 61, y: 25, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },

    // Row 5 (y=32): G3F and G3H
    { id: 'g3f-1', rackTemplateId: 'rack-standard-3', customLabel: 'G3F-01', x: 18, y: 32, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3f-2', rackTemplateId: 'rack-standard-3', customLabel: 'G3F-02', x: 21, y: 32, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3f-3', rackTemplateId: 'rack-standard-3', customLabel: 'G3F-03', x: 24, y: 32, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3h-1', rackTemplateId: 'rack-standard-3', customLabel: 'G3H-01', x: 38, y: 32, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3h-2', rackTemplateId: 'rack-standard-3', customLabel: 'G3H-02', x: 41, y: 32, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3h-3', rackTemplateId: 'rack-standard-3', customLabel: 'G3H-03', x: 44, y: 32, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3h-4', rackTemplateId: 'rack-standard-3', customLabel: 'G3H-04', x: 55, y: 32, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3h-5', rackTemplateId: 'rack-standard-3', customLabel: 'G3H-05', x: 58, y: 32, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g3h-6', rackTemplateId: 'rack-standard-3', customLabel: 'G3H-06', x: 61, y: 32, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },

    // Row 6 (y=39): G1A and G7A
    { id: 'g1a-1', rackTemplateId: 'rack-standard-3', customLabel: 'G1A-01', x: 18, y: 39, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g1a-2', rackTemplateId: 'rack-standard-3', customLabel: 'G1A-02', x: 21, y: 39, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g1a-3', rackTemplateId: 'rack-standard-3', customLabel: 'G1A-03', x: 24, y: 39, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g7a-1', rackTemplateId: 'rack-standard-3', customLabel: 'G7A-01', x: 38, y: 39, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g7a-2', rackTemplateId: 'rack-standard-3', customLabel: 'G7A-02', x: 41, y: 39, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g7a-3', rackTemplateId: 'rack-standard-3', customLabel: 'G7A-03', x: 44, y: 39, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g7a-4', rackTemplateId: 'rack-standard-3', customLabel: 'G7A-04', x: 55, y: 39, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g7a-5', rackTemplateId: 'rack-standard-3', customLabel: 'G7A-05', x: 58, y: 39, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
    { id: 'g7a-6', rackTemplateId: 'rack-standard-3', customLabel: 'G7A-06', x: 61, y: 39, rotation: 0, gridWidth: 2.44, gridLength: 1.07, color: 'blue' },
  ],
};
