import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('isMobileMenuOpen')) {
  code = code.replace(
    'const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);',
    'const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);\n  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);'
  );
  
  code = code.replace(
    "import { Layers, Box, FileText, Database, Activity, LayoutGrid, Info, X, Shield, Printer, Save, FileUp, Play, Flame, BarChart2, TrendingUp, Cpu, Maximize } from 'lucide-react';",
    "import { Layers, Box, FileText, Database, Activity, LayoutGrid, Info, X, Shield, Printer, Save, FileUp, Play, Flame, BarChart2, TrendingUp, Cpu, Maximize, ChevronDown } from 'lucide-react';"
  );
  
  const oldMobile = `          {/* Mobile Dropdown */}
          <div className="md:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full bg-[#111827] border border-slate-800 text-cyan-400 text-sm font-bold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 "
            >
              <option value="ingestion">Data Ingestion</option>
              <option value="2d-map">Plan d'Implantation 2D</option>
              <option value="3d-configurator">Modélisation Alvéoles</option>
              <option value="diagnostic">Fiche Diagnostic (A4)</option>
              <option value="analytics">Performances</option>
              <option value="digital-twin">Jumeau Numérique 3D</option>
            </select>
          </div>`;
          
  const newMobile = `          {/* Mobile Dropdown */}
          <div className="md:hidden relative z-50">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-full bg-[#111827] border border-slate-800 text-cyan-400 text-sm font-bold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 flex justify-between items-center"
            >
              <span>{
                activeTab === 'ingestion' ? 'Data Ingestion' :
                activeTab === '2d-map' ? "Plan d'Implantation 2D" :
                activeTab === '3d-configurator' ? "Modélisation Alvéoles" :
                activeTab === 'diagnostic' ? "Fiche Diagnostic (A4)" :
                activeTab === 'analytics' ? "Performances" :
                "Jumeau Numérique 3D"
              }</span>
              <ChevronDown size={16} className={\`transition-transform \${isMobileMenuOpen ? 'rotate-180' : ''}\`} />
            </button>
            
            {isMobileMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border border-slate-800 rounded-xl shadow-xl overflow-hidden z-50">
                {[
                  { id: 'ingestion', label: 'Data Ingestion' },
                  { id: '2d-map', label: "Plan d'Implantation 2D" },
                  { id: '3d-configurator', label: "Modélisation Alvéoles" },
                  { id: 'diagnostic', label: "Fiche Diagnostic (A4)" },
                  { id: 'analytics', label: "Performances" },
                  { id: 'digital-twin', label: "Jumeau Numérique 3D" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={\`w-full text-left px-4 py-3 text-sm font-bold transition-colors \${activeTab === item.id ? 'bg-cyan-900/40 text-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}\`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>`;
          
  code = code.replace(oldMobile, newMobile);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Dropdown patched");
} else {
  console.log("Dropdown already patched");
}
