import fs from 'fs';
let code = fs.readFileSync('src/components/RackVisualizer/useCustomPalletForm.ts', 'utf-8');
code = code.replace("import { useState } from 'react';", "import React, { useState } from 'react';");
fs.writeFileSync('src/components/RackVisualizer/useCustomPalletForm.ts', code);
