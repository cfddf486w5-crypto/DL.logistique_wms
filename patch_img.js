import fs from 'fs';
let code = fs.readFileSync('src/components/ShopFloorMap.tsx', 'utf-8');

code = code.replace(
  "opacity: (shopMap.backgroundOpacity !== undefined ? shopMap.backgroundOpacity : 50) / 100,",
  "opacity: (shopMap.backgroundOpacity !== undefined ? shopMap.backgroundOpacity : 50) / 100,\n                  filter: 'invert(1) hue-rotate(180deg) brightness(0.7) contrast(1.2)',\n                  mixBlendMode: 'lighten',"
);

fs.writeFileSync('src/components/ShopFloorMap.tsx', code);
console.log("Background image inverted");
