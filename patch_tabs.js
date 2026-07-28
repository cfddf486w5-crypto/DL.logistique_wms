import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldTabs = `<div className="bg-[#111827] backdrop-blur-xl border border-slate-800 p-1.5 rounded-xl flex gap-1 mb-8 shadow-sm print:hidden max-w-full overflow-x-auto whitespace-nowrap no-scrollbar">
          <button
            id="tab-btn-ingestion"`;

const newTabs = `<div className="w-full max-w-7xl mx-auto mb-8 print:hidden">
          {/* Mobile Dropdown */}
          <div className="md:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full bg-[#111827] border border-slate-800 text-cyan-400 text-sm font-bold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none"
            >
              <option value="ingestion">Data Ingestion</option>
              <option value="2d-map">Plan d'Implantation 2D</option>
              <option value="3d-configurator">Modélisation Alvéoles</option>
              <option value="diagnostic">Fiche Diagnostic (A4)</option>
              <option value="analytics">Performances</option>
              <option value="digital-twin">Jumeau Numérique 3D</option>
            </select>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex bg-[#111827] backdrop-blur-xl border border-slate-800 p-1.5 rounded-xl gap-1 shadow-sm max-w-max mx-auto overflow-x-auto whitespace-nowrap no-scrollbar">
          <button
            id="tab-btn-ingestion"`;

code = code.replace(oldTabs, newTabs);

code = code.replace(
  'id="btn-fullscreen-map"\n            onClick={() => setIsFullScreenMapOpen(true)}\n            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer bg-slate-800 text-slate-100 hover:bg-slate-700 shadow-md ml-4"',
  'id="btn-fullscreen-map"\n            onClick={() => setIsFullScreenMapOpen(true)}\n            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer bg-slate-800 text-slate-100 hover:bg-slate-700 shadow-md ml-4 hidden md:flex"'
);

// Close the wrapper
code = code.replace(
  '          </button>\n        </div>\n\n        {activeTab === \'ingestion\'',
  '          </button>\n          </div>\n        </div>\n\n        {activeTab === \'ingestion\''
);

fs.writeFileSync('src/App.tsx', code);
console.log("Tabs patched");
