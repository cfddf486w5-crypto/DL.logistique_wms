const fs = require('fs');
let dt = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

if (!dt.includes('CheckCircle,')) {
  dt = dt.replace("import { Trash2, AlertCircle, Plus, LayoutGrid, Package, ShieldAlert, ArrowLeft, ArrowRight, Expand, Move } from 'lucide-react';", 
  "import { Trash2, AlertCircle, Plus, LayoutGrid, Package, ShieldAlert, ArrowLeft, ArrowRight, Expand, Move, CheckCircle } from 'lucide-react';");
}

fs.writeFileSync('src/components/RackVisualizer3D.tsx', dt);
