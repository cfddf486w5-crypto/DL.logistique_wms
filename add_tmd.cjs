const fs = require('fs');

let types = fs.readFileSync('src/types.ts', 'utf-8');
if (!types.includes("tmdClass?: string;")) {
  types = types.replace("rotationClass?: 'A' | 'B' | 'C'; // A = Très rapide, B = Moyen, C = Lent", "rotationClass?: 'A' | 'B' | 'C';\n  tmdClass?: '2.1' | '2.2' | '2.3' | '3' | '4.1' | '4.2' | '4.3' | '5.1' | '5.2' | '6.1' | '8' | 'None';");
  fs.writeFileSync('src/types.ts', types);
}
