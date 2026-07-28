import fs from 'fs';
let code = fs.readFileSync('src/components/FullScreenMap.tsx', 'utf-8');

code = code.replace(
  "filter: 'grayscale(30%)'",
  "filter: 'invert(1) hue-rotate(180deg) brightness(0.7) contrast(1.2)'"
);
code = code.replace(
  "opacity-40 mix-blend-screen",
  "opacity-50 mix-blend-lighten"
);

fs.writeFileSync('src/components/FullScreenMap.tsx', code);
console.log("FullScreenMap patched");
