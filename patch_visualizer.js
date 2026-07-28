import fs from 'fs';
let code = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

if (!code.includes('ErgonomicAnalysis')) {
  code = code.replace(
    "import { RackAlveoliTable } from './RackVisualizer/RackAlveoliTable';",
    "import { RackAlveoliTable } from './RackVisualizer/RackAlveoliTable';\nimport { ErgonomicAnalysis } from './RackVisualizer/ErgonomicAnalysis';"
  );
  
  const oldTables = `<RackAlveoliTable
          alveoli={alveoli}
          hoveredAlveolusId={hoveredAlveolusId}
          setHoveredAlveolusId={setHoveredAlveolusId}
          selectedAlveolusId={selectedAlveolusId}
          setSelectedAlveolusId={setSelectedAlveolusId}
        />`;
        
  const newTables = `<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RackAlveoliTable
              alveoli={alveoli}
              hoveredAlveolusId={hoveredAlveolusId}
              setHoveredAlveolusId={setHoveredAlveolusId}
              selectedAlveolusId={selectedAlveolusId}
              setSelectedAlveolusId={setSelectedAlveolusId}
            />
          </div>
          <div className="lg:col-span-1 h-full">
            <ErgonomicAnalysis rack={rack} alveoli={alveoli} />
          </div>
        </div>`;
        
  code = code.replace(oldTables, newTables);
  fs.writeFileSync('src/components/RackVisualizer3D.tsx', code);
  console.log("Patched visualizer");
} else {
  console.log("Already patched");
}
