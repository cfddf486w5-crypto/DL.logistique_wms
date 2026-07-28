import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  '<div className="w-full max-w-[1400px]"> /* wide layout for map */',
  '<div className="w-full max-w-[1400px]">'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed comment");
