const fs = require('fs');

let dt = fs.readFileSync('src/data/defaultData.ts', 'utf-8');

const newRacks = `  {
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
`;

dt = dt.replace("export const DEFAULT_RACKS: Rack[] = [", "export const DEFAULT_RACKS: Rack[] = [\n" + newRacks);

fs.writeFileSync('src/data/defaultData.ts', dt);
