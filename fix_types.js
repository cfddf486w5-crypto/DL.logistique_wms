import fs from 'fs';
let code = fs.readFileSync('src/components/ShopFloorMap.tsx', 'utf-8');

if (code.includes('let newSnapX = null;')) {
    code = code.replace('let newSnapX = null;', 'let newSnapX: number | null = null;');
    code = code.replace('let newSnapY = null;', 'let newSnapY: number | null = null;');
    fs.writeFileSync('src/components/ShopFloorMap.tsx', code);
    console.log("Types fixed");
}
