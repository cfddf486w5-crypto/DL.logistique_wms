import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2 } from 'lucide-react';
import { Rack } from '../../types';

interface StructureConfigModalProps {
  show: boolean;
  onClose: () => void;
  rack: Rack;
  onChangeRack: (rack: Rack) => void;
  setNewLevelHeight: (h: number) => void;
  onShowAddLevelModal: () => void;
  setSelectedLevelId: (id: string | null) => void;
  handleDeleteLevel: (id: string) => void;
}

export function StructureConfigModal({
  show,
  onClose,
  rack,
  onChangeRack,
  setNewLevelHeight,
  onShowAddLevelModal,
  setSelectedLevelId,
  handleDeleteLevel
}: StructureConfigModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#111827] border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
          >
            <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
              <h4 className="font-bold text-slate-200 text-sm font-display flex items-center gap-2">
                ⚙️ Configuration de la Structure du Rack
              </h4>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer animate-none"
              >
                &times;
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Section 1: Dimensions Globales */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Dimensions Globales (mm)</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Hauteur Totale (mm)
                    </label>
                    <input
                      type="number"
                      value={rack.totalHeightMm}
                      onChange={(e) => onChangeRack({ ...rack, totalHeightMm: parseInt(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 border border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Largeur Utile (mm)
                    </label>
                    <input
                      type="number"
                      value={rack.totalWidthMm}
                      onChange={(e) => onChangeRack({ ...rack, totalWidthMm: parseInt(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 border border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Profondeur Utile (mm)
                    </label>
                    <input
                      type="number"
                      value={rack.depthMm}
                      onChange={(e) => onChangeRack({ ...rack, depthMm: parseInt(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 border border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Largeur des Montants (mm)
                    </label>
                    <input
                      type="number"
                      value={rack.uprightWidthMm}
                      onChange={(e) => onChangeRack({ ...rack, uprightWidthMm: parseInt(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 border border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Certification & Sécurité */}
              <div className="pt-2 border-t border-slate-100">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Certification & Sécurité</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Charge Max Totale (lbs)
                    </label>
                    <input
                      type="number"
                      value={rack.maxLoadLbs || 25000}
                      onChange={(e) => onChangeRack({ ...rack, maxLoadLbs: parseInt(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 border border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Année de Certification (CNB)
                    </label>
                    <input
                      type="number"
                      value={rack.certificationYear || 2024}
                      onChange={(e) => onChangeRack({ ...rack, certificationYear: parseInt(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 border border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Niveau 0 (Sol) */}
              <div className="pt-2 border-t border-slate-100">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Niveau 0 (Sol)</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Type de niveau au Sol
                    </label>
                    <select
                      value={rack.groundLevelType || 'over'}
                      onChange={(e) => onChangeRack({
                        ...rack,
                        groundLevelType: e.target.value as 'pick' | 'over',
                        groundSlotsCount: e.target.value === 'pick' ? (rack.groundSlotsCount || 4) : 3
                      })}
                      className="w-full px-2.5 py-1.5 border border-slate-700 rounded-lg text-xs bg-[#111827] text-slate-100"
                    >
                      <option value="over">Standard Overstock</option>
                      <option value="pick">Pick Bins (Customisable)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Nombre d'alvéoles (Sol)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={rack.groundSlotsCount || 3}
                      onChange={(e) => onChangeRack({ ...rack, groundSlotsCount: parseInt(e.target.value) || 1 })}
                      className="w-full px-2.5 py-1.5 border border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Liste des Lisses (Beams) */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Niveaux de Lisses</h5>
                  <button
                    type="button"
                    onClick={() => {
                      const maxLevel = rack.levels[rack.levels.length - 1]?.heightFromGroundMm || 0;
                      const suggestion = Math.min(maxLevel + 1200, rack.totalHeightMm - 500);
                      setNewLevelHeight(suggestion > maxLevel ? suggestion : rack.totalHeightMm - 400);
                      onClose();
                      onShowAddLevelModal();
                    }}
                    className="text-[11px] font-bold text-sky-650 hover:text-sky-700 flex items-center gap-0.5"
                  >
                    <Plus size={12} /> Ajouter une lisse
                  </button>
                </div>
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {rack.levels.map((level) => (
                    <div key={level.id} className="flex items-center justify-between p-2.5 bg-slate-800/50 rounded-lg border border-slate-150 text-xs">
                      <div>
                        <p className="font-semibold text-slate-200">Lisse Niv {level.levelNumber}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Hauteur : {level.heightFromGroundMm} mm | Alvéoles : {level.slotsCount || 3} ({level.levelType || 'over'})
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLevelId(level.id);
                            onClose();
                          }}
                          className="px-2 py-1 bg-[#111827] hover:bg-slate-800 border border-slate-700 rounded text-[10px] font-semibold text-slate-300 transition-colors cursor-pointer"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Voulez-vous vraiment supprimer le niveau de lisses n°${level.levelNumber} ?`)) {
                              handleDeleteLevel(level.id);
                            }
                          }}
                          className="p-1 hover:bg-rose-900/30 text-rose-600 rounded border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-800/50 border-t border-slate-700 flex justify-end gap-2 text-xs">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg cursor-pointer font-bold transition-colors"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
