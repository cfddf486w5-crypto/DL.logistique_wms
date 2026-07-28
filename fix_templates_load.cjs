const fs = require('fs');
let dt = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /const \[rackTemplates, setRackTemplates\] = useState<Rack\[\]>\(\(\) => \{\n    const saved = localStorage\.getItem\('dl_rack_templates'\);\n    return saved \? JSON\.parse\(saved\) : DEFAULT_RACKS;\n  \}\);/m;

const replacement = `const [rackTemplates, setRackTemplates] = useState<Rack[]>(() => {
    const saved = localStorage.getItem('dl_rack_templates');
    let templates = saved ? JSON.parse(saved) : DEFAULT_RACKS;
    
    // Ensure the required new templates are always there
    const requiredIds = ['rack-102-4-5', 'rack-144-6'];
    requiredIds.forEach(reqId => {
      if (!templates.find((t: any) => t.id === reqId)) {
        const defaultT = DEFAULT_RACKS.find((t) => t.id === reqId);
        if (defaultT) templates.push(defaultT);
      }
    });

    return templates;
  });`;

dt = dt.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', dt);
