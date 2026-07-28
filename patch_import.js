import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "import { LayoutGrid, Layers, FileText, Plus, RefreshCw, Download, FileJson, Info, Check, Shield, Activity, Maximize, Box, X, Database } from 'lucide-react';",
  "import { LayoutGrid, Layers, FileText, Plus, RefreshCw, Download, FileJson, Info, Check, Shield, Activity, Maximize, Box, X, Database, ChevronDown } from 'lucide-react';"
);

fs.writeFileSync('src/App.tsx', code);
