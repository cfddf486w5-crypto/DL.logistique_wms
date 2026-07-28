import fs from 'fs';
let code = fs.readFileSync('src/components/DiagnosticReport.tsx', 'utf-8');

const importSettings = `import { useSettings } from '../contexts/SettingsContext';\nimport { formatLength } from '../utils/units';\nimport React from 'react';`;
code = code.replace(`import React from 'react';`, importSettings);

const startComp = `export default function DiagnosticReport({ rack, alveoli }: DiagnosticReportProps) {`;
const insertSettings = `export default function DiagnosticReport({ rack, alveoli }: DiagnosticReportProps) {\n  const { lengthUnit } = useSettings();`;
code = code.replace(startComp, insertSettings);

// 139: <td className="font-mono text-slate-200 text-right py-1.5">{rack.totalHeightMm} mm</td>
code = code.replace(
  /<td className="font-mono text-slate-200 text-right py-1\.5">\{rack\.totalHeightMm\} mm<\/td>/g,
  '<td className="font-mono text-slate-200 text-right py-1.5">{formatLength(rack.totalHeightMm, lengthUnit)}</td>'
);

code = code.replace(
  /<td className="font-mono text-slate-200 text-right py-1\.5">\{rack\.totalWidthMm\} mm<\/td>/g,
  '<td className="font-mono text-slate-200 text-right py-1.5">{formatLength(rack.totalWidthMm, lengthUnit)}</td>'
);

code = code.replace(
  /<td className="font-mono text-slate-200 text-right py-1\.5">\{rack\.depthMm\} mm<\/td>/g,
  '<td className="font-mono text-slate-200 text-right py-1.5">{formatLength(rack.depthMm, lengthUnit)}</td>'
);

code = code.replace(
  /<td className="font-mono text-slate-200 text-right py-1\.5">\{rack\.uprightWidthMm\} mm<\/td>/g,
  '<td className="font-mono text-slate-200 text-right py-1.5">{formatLength(rack.uprightWidthMm, lengthUnit)}</td>'
);

code = code.replace(
  /<td className="p-2\.5 font-mono">\{level\.heightFromGroundMm\} mm<\/td>/g,
  '<td className="p-2.5 font-mono">{formatLength(level.heightFromGroundMm, lengthUnit)}</td>'
);

code = code.replace(
  /<td className="p-2\.5 font-mono text-sky-700 font-bold print:text-blue-600">\{Math\.round\(clearanceHeight\)\} mm<\/td>/g,
  '<td className="p-2.5 font-mono text-sky-700 font-bold print:text-blue-600">{formatLength(clearanceHeight, lengthUnit, 0)}</td>'
);

code = code.replace(
  /<td className="p-2\.5 font-mono">0 mm<\/td>/g,
  '<td className="p-2.5 font-mono">{formatLength(0, lengthUnit)}</td>'
);

code = code.replace(
  /\{rack\.levels\[0\] \? rack\.levels\[0\]\.heightFromGroundMm - 100 : rack\.totalHeightMm\} mm/g,
  '{formatLength(rack.levels[0] ? rack.levels[0].heightFromGroundMm - 100 : rack.totalHeightMm, lengthUnit)}'
);

// 330
code = code.replace(
  /béton d'épaisseur minimale de 150 mm/g,
  "béton d'épaisseur minimale de {formatLength(150, lengthUnit)}"
);

// 344
code = code.replace(
  /Un espace libre d'au moins 100 mm/g,
  "Un espace libre d'au moins {formatLength(100, lengthUnit)}"
);

fs.writeFileSync('src/components/DiagnosticReport.tsx', code);
