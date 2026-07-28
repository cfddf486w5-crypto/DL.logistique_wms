import fs from 'fs';
let code = fs.readFileSync('src/components/RackVisualizer3D.tsx', 'utf-8');

const stateInsert = `
  // Chunking logic for 3D rendering performance
  const [renderedChunkIndex, setRenderedChunkIndex] = useState<number>(1);
  const [isRendering, setIsRendering] = useState<boolean>(true);
  
  React.useEffect(() => {
    const totalLevels = rack.levels.length + 1;
    if (renderedChunkIndex < totalLevels) {
      setIsRendering(true);
      const timer = setTimeout(() => {
        setRenderedChunkIndex(prev => Math.min(prev + 2, totalLevels)); // Load 2 levels per chunk
      }, 16);
      return () => clearTimeout(timer);
    } else {
      setIsRendering(false);
    }
  }, [renderedChunkIndex, rack.levels.length]);

  React.useEffect(() => {
    // Reset chunking when rack changes
    setRenderedChunkIndex(1);
    setIsRendering(true);
  }, [rack.id]);
`;

const stateAnchor = `const [selectedProductToPlace, setSelectedProductToPlace] = useState<Product | null>(null);`;
code = code.replace(stateAnchor, stateAnchor + '\n' + stateInsert);

const returnLevelsAnchor = `return levelsHeights.map((currentLevelHeight, lIdx) => {`;
const returnLevelsReplace = `return levelsHeights.slice(0, renderedChunkIndex).map((currentLevelHeight, lIdx) => {`;
code = code.replace(returnLevelsAnchor, returnLevelsReplace);

// We should also chunk the BACKGROUND BEAMS to avoid rendering them all at once?
// Wait, the front and back beams are small compared to the alveoles.
// But we could add a loading indicator.
const svgStartAnchor = `<div className="absolute top-4 right-4 z-10 flex gap-2">`;
const loadingIndicator = `
          {isRendering && (
            <div className="absolute top-4 left-4 z-10 bg-slate-800/80 backdrop-blur-sm border border-slate-700 text-sky-400 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg">
              <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
              Chargement 3D ({Math.round((renderedChunkIndex / (rack.levels.length + 1)) * 100)}%)
            </div>
          )}
          <div className="absolute top-4 right-4 z-10 flex gap-2">`;

code = code.replace(svgStartAnchor, loadingIndicator);

fs.writeFileSync('src/components/RackVisualizer3D.tsx', code);
console.log("Chunking applied");
