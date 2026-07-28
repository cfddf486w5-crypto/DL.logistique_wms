import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// For ingestion
code = code.replace(
  'className="w-full max-w-5xl mx-auto"',
  'className="w-full max-w-5xl mx-auto flex-1 flex flex-col min-h-[500px]"'
);

// For 2d map
code = code.replace(
  'className="w-full max-w-7xl mx-auto"',
  'className="w-full max-w-7xl mx-auto flex-1 flex flex-col"'
);

// For analytics
code = code.replace(
  'className="max-w-7xl mx-auto w-full"',
  'className="w-full max-w-7xl mx-auto flex-1 flex flex-col"'
);

fs.writeFileSync('src/App.tsx', code);
console.log("App heights patched");
