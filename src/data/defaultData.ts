/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Rack, ShopMap } from '../types';

export const DEFAULT_PRODUCTS: Product[] = [];

export const DEFAULT_RACKS: Rack[] = [
  {
    id: 'rack-standard-3',
    name: 'Palettier Standard (3 Niveaux - 102 po)',
    totalHeightMm: 4877, // 16 ft
    totalWidthMm: 2791, // 102 po (2591mm) + 2x100mm montant
    depthMm: 1067, // 42 po
    uprightWidthMm: 100,
    binsPerLevel: 2,
    levels: [
      { id: 'b1-102', levelNumber: 1, heightFromGroundMm: 1219, beamThicknessMm: 114 },
      { id: 'b2-102', levelNumber: 2, heightFromGroundMm: 2438, beamThicknessMm: 114 },
      { id: 'b3-102', levelNumber: 3, heightFromGroundMm: 3657, beamThicknessMm: 114 }
    ],
    certificationYear: 2024,
    maxLoadLbs: 20000,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rack-144-6',
    name: 'Palettier Grand Format (4 Niveaux - 144 po)',
    totalHeightMm: 6096, // 20 ft
    totalWidthMm: 3858, // 144 po (3658mm) + 2x100mm montant
    depthMm: 1067, // 42 po
    uprightWidthMm: 100,
    binsPerLevel: 3,
    levels: [
      { id: 'b1-144', levelNumber: 1, heightFromGroundMm: 1219, beamThicknessMm: 152 },
      { id: 'b2-144', levelNumber: 2, heightFromGroundMm: 2438, beamThicknessMm: 152 },
      { id: 'b3-144', levelNumber: 3, heightFromGroundMm: 3657, beamThicknessMm: 152 },
      { id: 'b4-144', levelNumber: 4, heightFromGroundMm: 4876, beamThicknessMm: 152 }
    ],
    certificationYear: 2024,
    maxLoadLbs: 25000,
    createdAt: new Date().toISOString(),
  }
];

export const DEFAULT_SHOP_MAP: ShopMap = {
  widthMeters: 50,
  lengthMeters: 40,
  gridScalePx: 14, // pixels per meter
  backgroundUrl: '',
  backgroundScale: 100,
  backgroundOffsetX: 0,
  backgroundOffsetY: 0,
  backgroundOpacity: 100,
  placedRacks: [],
};
