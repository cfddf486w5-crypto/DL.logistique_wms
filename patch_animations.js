import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('AnimatePresence')) {
  code = code.replace(
    "import { motion } from 'motion/react';",
    "import { motion, AnimatePresence } from 'motion/react';"
  );
  if (!code.includes("import { motion, AnimatePresence } from 'motion/react';")) {
    code = code.replace(
      "import React, { useState, useEffect, Suspense } from 'react';",
      "import React, { useState, useEffect, Suspense } from 'react';\nimport { motion, AnimatePresence } from 'motion/react';"
    );
  }
}

// Ingestion
code = code.replace(
  `{activeTab === 'ingestion' && (
          <div className="w-full max-w-5xl mx-auto h-[600px]">
            <CsvIngestionPanel onDataIngested={handleDataIngested} />
          </div>
        )}`,
  `<AnimatePresence mode="wait">
          {activeTab === 'ingestion' && (
            <motion.div 
              key="ingestion"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-5xl mx-auto"
            >
              <CsvIngestionPanel onDataIngested={handleDataIngested} />
            </motion.div>
          )}
        </AnimatePresence>`
);

// 2D Map
code = code.replace(
  `{activeTab === '2d-map' && (
          <div className="w-full max-w-7xl mx-auto">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center p-10 text-slate-500 font-medium animate-pulse">Chargement de la carte...</div>}><ShopFloorMap`,
  `<AnimatePresence mode="wait">
          {activeTab === '2d-map' && (
            <motion.div 
              key="2d-map"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-7xl mx-auto"
            >
              <Suspense fallback={<div className="flex-1 flex items-center justify-center p-10 text-slate-500 font-medium animate-pulse">Chargement de la carte...</div>}><ShopFloorMap`
);
code = code.replace(
  `canRedo={historyPointer < history.length - 1}
            /></Suspense>
          </div>
        )}`,
  `canRedo={historyPointer < history.length - 1}
              /></Suspense>
            </motion.div>
          )}
        </AnimatePresence>`
);

// 3D Config
code = code.replace(
  `{activeTab === '3d-configurator' && (
          <div className="w-full max-w-7xl mx-auto space-y-6">`,
  `<AnimatePresence mode="wait">
          {activeTab === '3d-configurator' && (
            <motion.div 
              key="3d-configurator"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-7xl mx-auto space-y-6"
            >`
);
code = code.replace(
  `onDeleteCustomProduct={(id) => setProducts(products.filter(p => p.id !== id))}
            />
          </div>
        )}`,
  `onDeleteCustomProduct={(id) => setProducts(products.filter(p => p.id !== id))}
              />
            </motion.div>
          )}
        </AnimatePresence>`
);

// Diag
code = code.replace(
  `{activeTab === 'diagnostic' && (
          <div className="w-full max-w-7xl mx-auto space-y-4">`,
  `<AnimatePresence mode="wait">
          {activeTab === 'diagnostic' && (
            <motion.div 
              key="diagnostic"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-7xl mx-auto space-y-4"
            >`
);
code = code.replace(
  `alveoli={activeAlveoli}
            />
          </div>
        )}`,
  `alveoli={activeAlveoli}
              />
            </motion.div>
          )}
        </AnimatePresence>`
);

// Analytics
code = code.replace(
  `{activeTab === 'analytics' && (
          <div className="max-w-7xl mx-auto w-full">`,
  `<AnimatePresence mode="wait">
          {activeTab === 'analytics' && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto w-full"
            >`
);
code = code.replace(
  `rackTemplates={rackTemplates}
            />
          </div>
        )}`,
  `rackTemplates={rackTemplates}
              />
            </motion.div>
          )}
        </AnimatePresence>`
);

// Twin
code = code.replace(
  `{activeTab === 'digital-twin' && (
          <div className="w-full max-w-7xl mx-auto h-full flex-1 flex flex-col min-h-[700px]"><DigitalTwinDashboard`,
  `<AnimatePresence mode="wait">
          {activeTab === 'digital-twin' && (
            <motion.div 
              key="digital-twin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-7xl mx-auto h-full flex-1 flex flex-col min-h-[700px]"
            ><DigitalTwinDashboard`
);
code = code.replace(
  `products={products}
          /></div>
        )}`,
  `products={products}
            /></motion.div>
          )}
        </AnimatePresence>`
);

// To fix layout jump on transition due to AnimatePresence mode wait... actually it's fine.

fs.writeFileSync('src/App.tsx', code);
console.log("Animations patched");
