import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rack } from '../../types';

interface LevelEditModalProps {
  selectedLevelId: string | null;
  onClose: () => void;
  rack: Rack;
  handleUpdateLevelHeight: (id: string, val: number) => void;
  handleUpdateLevelThickness: (id: string, val: number) => void;
  handleUpdateLevelType: (id: string, val: 'pick' | 'over', slots: number) => void;
  handleUpdateLevelSlots: (id: string, val: number) => void;
  handleUpdateLevelLoad: (id: string, val: number) => void;
  handleDeleteLevel: (id: string) => void;
}

export function LevelEditModal({
  selectedLevelId,
  onClose,
  rack,
  handleUpdateLevelHeight,
  handleUpdateLevelThickness,
  handleUpdateLevelType,
  handleUpdateLevelSlots,
  handleUpdateLevelLoad,
  handleDeleteLevel
}: LevelEditModalProps) {
  if (!selectedLevelId) return null;
  
  const level = rack.levels.find((l) => l.id === selectedLevelId);
  if (!level) return null;
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[#111827] border border-slate-700 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden"
        >
          <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
            <h4 className="font-bold text-slate-200 text-sm font-display">
              Modifier la Lisse Niv {level.levelNumber}
            </h4>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
            >
              &times;
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Height Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Hauteur par rapport au sol (mm)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="100"
                  min="400"
                  max={rack.totalHeightMm - 400}
                  value={level.heightFromGroundMm}
                  onChange={(e) => handleUpdateLevelHeight(level.id, parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#111827] text-slate-100 focus:outline-none focus:border-sky-500 text-xs font-mono"
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-mono">mm</span>
              </div>
            </div>

            {/* Beam Thickness Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Épaisseur de la Lisse (mm)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="10"
                  min="40"
                  max="200"
                  value={level.beamThicknessMm}
                  onChange={(e) => handleUpdateLevelThickness(level.id, parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#111827] text-slate-100 focus:outline-none focus:border-sky-500 text-xs font-mono"
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-mono">mm</span>
              </div>
            </div>

            {/* Level Type Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Configuration du Niveau
              </label>
              <select
                value={level.levelType || 'over'}
                onChange={(e) => handleUpdateLevelType(level.id, e.target.value as 'pick' | 'over', e.target.value === 'pick' ? 4 : 3)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#111827] text-slate-100 text-xs"
              >
                <option value="over">Standard Overstock (Palettes)</option>
                <option value="pick">Pick Bins (Multi-produits/Cartons)</option>
              </select>
            </div>

            {/* Slots Count Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre d'Alvéoles
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={level.slotsCount || 3}
                onChange={(e) => handleUpdateLevelSlots(level.id, parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#111827] text-slate-100 text-xs font-mono"
              />
            </div>

            {/* Max Load Lbs Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Charge Maximale Admissible (lbs)
              </label>
              <input
                type="number"
                step="500"
                min="1000"
                max="15000"
                value={level.maxLoadLbs || 6000}
                onChange={(e) => handleUpdateLevelLoad(level.id, parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#111827] text-slate-100 text-xs font-mono"
              />
            </div>
          </div>

          <div className="px-4 py-3 bg-slate-800/50 border-t border-slate-700 flex justify-between items-center text-xs">
            <button
              onClick={() => {
                if (confirm(`Voulez-vous vraiment supprimer le niveau de lisses n°${level.levelNumber} ?`)) {
                  handleDeleteLevel(level.id);
                  onClose();
                }
              }}
              className="px-3 py-2 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 border border-rose-700/50 rounded-lg cursor-pointer font-semibold transition-colors"
            >
              Supprimer Lisse
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg cursor-pointer transition-colors"
            >
              Valider
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
