import fs from 'fs';
let code = fs.readFileSync('src/components/DigitalTwinDashboard.tsx', 'utf-8');

const stateBlock = `  const [isFlowSimActive, setIsFlowSimActive] = useState(false);
  const [flowSimPath, setFlowSimPath] = useState<{x: number, y: number}[]>([]);
  const [flowDistance, setFlowDistance] = useState(0);`;

code = code.replace(stateBlock, '');

const stateInsert = `  // Path logic
  const [simPath, setSimPath] = useState<{x: number, y: number}[]>([]);
  const [isFlowSimActive, setIsFlowSimActive] = useState(false);
  const [flowSimPath, setFlowSimPath] = useState<{x: number, y: number}[]>([]);
  const [flowDistance, setFlowDistance] = useState(0);
`;

code = code.replace("  // Path logic\n  const [simPath, setSimPath] = useState<{x: number, y: number}[]>([]);", stateInsert);

fs.writeFileSync('src/components/DigitalTwinDashboard.tsx', code);
console.log("Patched variables ordering");
