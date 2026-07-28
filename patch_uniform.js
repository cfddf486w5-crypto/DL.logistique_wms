import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Ingestion
code = code.replace(
  '<div className="w-full max-w-4xl h-[600px]">',
  '<div className="w-full max-w-5xl mx-auto h-[600px]">'
);

// 2D Map
code = code.replace(
  '<div className="w-full max-w-[1400px]">',
  '<div className="w-full max-w-7xl mx-auto">'
);

// 3D Config
code = code.replace(
  '<div className="w-full max-w-7xl space-y-6">',
  '<div className="w-full max-w-7xl mx-auto space-y-6">'
);

// Diag
code = code.replace(
  '<div className="w-full max-w-7xl space-y-4">',
  '<div className="w-full max-w-7xl mx-auto space-y-4">'
);

// Twin
code = code.replace(
  '<div className="w-full h-full flex-1 flex flex-col min-h-[700px]">',
  '<div className="w-full max-w-7xl mx-auto h-full flex-1 flex flex-col min-h-[700px]">'
);

fs.writeFileSync('src/App.tsx', code);
