import fs from 'fs';
let code = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

// I need to clean up around 2. BACKGROUND BEAMS and 3. FRONT STRUCTURAL
// Let's find the exact text in the file and replace it.

const brokenPattern = `)}
            {/* 2. BACKGROUND BEAMS (Lisses arrière) */}
            {lodLevel !== 'low' && (`;

const fixedPattern = `)}
            {/* 2. BACKGROUND BEAMS (Lisses arrière) */}`;

code = code.replace(brokenPattern, fixedPattern);

const brokenPattern2 = `})()}

            )}
            {/* 3. FRONT STRUCTURAL FRAMES (Echelles Avant) */}`;

const fixedPattern2 = `})()}
            {/* 3. FRONT STRUCTURAL FRAMES (Echelles Avant) */}`;

code = code.replace(brokenPattern2, fixedPattern2);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', code);
console.log("Syntax fixed");
