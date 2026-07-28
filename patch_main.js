import fs from 'fs';
let code = fs.readFileSync('src/main.tsx', 'utf-8');

const importSettings = `import { SettingsProvider } from './contexts/SettingsContext';\nimport App from './App.tsx';`;
code = code.replace(`import App from './App.tsx';`, importSettings);

const wrapApp = `<SettingsProvider>\n      <App />\n    </SettingsProvider>`;
code = code.replace(`<App />`, wrapApp);

fs.writeFileSync('src/main.tsx', code);
