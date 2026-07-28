const fs = require('fs');
let rv = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

rv = rv.replace(/const \[palletRotation, setPalletRotation\] = useState<'A' \| 'B' \| 'C'>\('B'\);/, "const [palletRotation, setPalletRotation] = useState<'A' | 'B' | 'C'>('B');\n  const [palletTmdClass, setPalletTmdClass] = useState<string>('None');");

fs.writeFileSync('src/components/RackVisualizer3D.tsx', rv);
