const fs = require('fs');
let code = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

const regex = /\{Array\.from\(\{length: 20\}, \(_, i\) => i \+ 1\)\.map\(n => \(\s*<option key=\{n\} value=\{n\}>\{n\}<\/option>\s*\)\)\}/g;

const replacement = `{Array.from({length: isGround ? 20 : 5}, (_, i) => (isGround ? i + 1 : i + 2)).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', code);
