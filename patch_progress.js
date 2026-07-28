import fs from 'fs';
let code = fs.readFileSync('src/components/DigitalTwinDashboard.tsx', 'utf-8');

const oldEffect = `
  // Animation loop
  useEffect(() => {
    let frame: number;
    if (isSimulationActive) {
      const animate = () => {
        setSimProgress(p => (p + 0.002) % 1);
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(frame);
  }, [isSimulationActive]);
`;

const newEffect = `
  // Animation loop
  useEffect(() => {
    let frame: number;
    if (isSimulationActive || isFlowSimActive) {
      const animate = () => {
        setSimProgress(p => (p + 0.002) % 1);
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(frame);
  }, [isSimulationActive, isFlowSimActive]);
`;

code = code.replace(oldEffect, newEffect);
fs.writeFileSync('src/components/DigitalTwinDashboard.tsx', code);
console.log("simProgress fixed");
