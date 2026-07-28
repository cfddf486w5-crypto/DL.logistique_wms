import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rack } from '../../types';

interface AddLevelModalProps {
  show: boolean;
  onClose: () => void;
  rack: Rack;
  newLevelHeight: number;
  setNewLevelHeight: (h: number) => void;
  onAddLevel: () => void;
}

export function AddLevelModal({
  show,
  onClose,
  rack,
  newLevelHeight,
  setNewLevelHeight,
  onAddLevel
}: AddLevelModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#111827] border border-slate-700 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden"
          >
            <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
              <h4 className="font-bold text-slate-200 text-sm font-display">Ajouter un Niveau d'Isse</h4>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Configurez la hauteur de la nouvelle paire de lisses. Elle doit être à une distance sécuritaire des autres niveaux (min 400mm).
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Hauteur par rapport au sol (mm)
                </label>
                <div className="relative">
                  <input
                    id="input-new-beam-height"
                    type="number"
                    step="100"
                    min="400"
                    max={rack.totalHeightMm - 400}
                    value={newLevelHeight}
                    onChange={(e) => setNewLevelHeight(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#111827] text-slate-200 focus:outline-none focus:border-sky-500 text-xs font-mono"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-mono">mm</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setNewLevelHeight(1200)}
                    className="px-2 py-1 bg-slate-800/50 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded text-[10px] cursor-pointer"
                  >
                    Bas (1200mm)
                  </button>
                  <button
                    onClick={() => setNewLevelHeight(2400)}
                    className="px-2 py-1 bg-slate-800/50 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded text-[10px] cursor-pointer"
                  >
                    Milieu (2400mm)
                  </button>
                  <button
                    onClick={() => setNewLevelHeight(3600)}
                    className="px-2 py-1 bg-slate-800/50 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded text-[10px] cursor-pointer"
                  >
                    Haut (3600mm)
                  </button>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 bg-slate-800/50 border-t border-slate-700 flex justify-end gap-2 text-xs">
              <button
                onClick={onClose}
                className="px-3 py-2 bg-[#111827] text-slate-300 hover:bg-slate-800/50 border border-slate-700 rounded-lg cursor-pointer font-medium"
              >
                Annuler
              </button>
              <button
                id="btn-confirm-add-level"
                onClick={onAddLevel}
                className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg cursor-pointer font-bold"
              >
                Valider la lisse
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
