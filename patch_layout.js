import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  'className="flex-1 px-6 py-8 flex flex-col items-center"',
  'className="flex-1 px-6 py-8 flex flex-col items-center w-full max-w-[100vw] overflow-x-hidden"'
);

code = code.replace(
  'className="bg-[#111827] backdrop-blur-xl border border-slate-800 p-1.5 rounded-xl flex gap-1 mb-8 shadow-sm print:hidden"',
  'className="bg-[#111827] backdrop-blur-xl border border-slate-800 p-1.5 rounded-xl flex gap-1 mb-8 shadow-sm print:hidden max-w-full overflow-x-auto whitespace-nowrap no-scrollbar"'
);

// add w-full to 3d-configurator wrapper
code = code.replace(
  '<div className="space-y-6">',
  '<div className="w-full max-w-7xl space-y-6">'
);

// add w-full to diagnostic wrapper
code = code.replace(
  '<div className="space-y-4">',
  '<div className="w-full max-w-7xl space-y-4">'
);

// add w-full to digital-twin wrapper
code = code.replace(
  '<DigitalTwinDashboard',
  '<div className="w-full h-full flex-1 flex flex-col min-h-[700px]"><DigitalTwinDashboard'
);
code = code.replace(
  'products={products}\n          />\n        )}',
  'products={products}\n          /></div>\n        )}'
);

// max-w-7xl for 2d map
code = code.replace(
  'activeTab === \'2d-map\' && (\n          <div className="w-full">',
  'activeTab === \'2d-map\' && (\n          <div className="w-full max-w-[1400px]"> /* wide layout for map */'
);


fs.writeFileSync('src/App.tsx', code);
console.log("Layout patched");
