const fs = require('fs');
let dt = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

if (!dt.includes('CheckCircle')) {
  dt = dt.replace("import { Plus, Trash2, Box, HelpCircle, AlertTriangle, ArrowUpDown, ShieldAlert } from 'lucide-react';", 
  "import { Plus, Trash2, Box, HelpCircle, AlertTriangle, ArrowUpDown, ShieldAlert, CheckCircle } from 'lucide-react';");
  fs.writeFileSync('src/components/RackVisualizer3D.tsx', dt);
}

