import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(
  "import React, { useState, useEffect, useRef, useCallback } from 'react';",
  "import React, { useState, useEffect, useRef, useCallback } from 'react';\nimport { motion, AnimatePresence } from 'motion/react';"
);
fs.writeFileSync('src/App.tsx', code);
