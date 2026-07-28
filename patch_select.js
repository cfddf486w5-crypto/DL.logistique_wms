import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  'appearance-none"',
  '"'
);
fs.writeFileSync('src/App.tsx', code);
console.log("Removed appearance-none");
