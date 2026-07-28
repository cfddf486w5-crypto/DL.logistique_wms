import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle, AlertTriangle, Database, Cpu } from 'lucide-react';
import { workerClient } from '../workers/workerClient';

interface CsvIngestionPanelProps {
  onDataIngested: (type: 'products' | 'locations' | 'waves', data: any[]) => void;
}

export function CsvIngestionPanel({ onDataIngested }: CsvIngestionPanelProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'locations' | 'waves'>('products');
  const [parsingState, setParsingState] = useState<Record<string, { status: 'idle' | 'parsing' | 'processing' | 'success' | 'error', count?: number, error?: string, workerResults?: any }>>({
    products: { status: 'idle' },
    locations: { status: 'idle' },
    waves: { status: 'idle' }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'products' | 'locations' | 'waves') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setParsingState(prev => ({ ...prev, [type]: { status: 'parsing' } }));

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: async (results) => {
        if (results.errors.length > 0) {
          setParsingState(prev => ({ 
            ...prev, 
            [type]: { status: 'error', error: `Parsing error: ${results.errors[0].message}` } 
          }));
          return;
        }

        const data = results.data;
        onDataIngested(type, data);
        
        if (type === 'waves') {
          setParsingState(prev => ({ 
            ...prev, 
            [type]: { status: 'processing', count: data.length } 
          }));
          
          try {
            // Trigger background Web Worker calculations
            const [abcResult, jaccardResult] = await Promise.all([
              workerClient.calculateABC(data),
              workerClient.calculateJaccard(data)
            ]);
            
            setParsingState(prev => ({ 
              ...prev, 
              [type]: { 
                status: 'success', 
                count: data.length,
                workerResults: { abc: abcResult, jaccard: jaccardResult }
              } 
            }));
          } catch (err: any) {
             setParsingState(prev => ({ 
              ...prev, 
              [type]: { status: 'error', error: `Worker error: ${err}` } 
            }));
          }
        } else {
          setParsingState(prev => ({ 
            ...prev, 
            [type]: { status: 'success', count: data.length } 
          }));
        }
      },
      error: (error) => {
        setParsingState(prev => ({ 
          ...prev, 
          [type]: { status: 'error', error: error.message } 
        }));
      }
    });
  };

  const loadDemoData = () => {
    // Generate some demo data for products
    const demoProducts = Array.from({ length: 200 }).map((_, i) => ({
      SKU_ID: `SKU-${1000 + i}`,
      Description: `Demo Product ${i + 1}`,
      Width: 300 + Math.random() * 500,
      Height: 200 + Math.random() * 400,
      Depth: 200 + Math.random() * 400,
      Weight: 5 + Math.random() * 45,
      Category: ['Electronics', 'Apparel', 'Home', 'Tools'][Math.floor(Math.random() * 4)],
      Temp_Zone: 'Ambient',
      Fragility_Flag: Math.random() > 0.8 ? 'Y' : 'N'
    }));
    
    onDataIngested('products', demoProducts);
    setParsingState(prev => ({ ...prev, products: { status: 'success', count: 200 } }));
  };

  const tabs = [
    { id: 'products', label: 'Product.csv', desc: 'SKUs, Dimensions, Weight' },
    { id: 'locations', label: 'Storage_Location.csv', desc: 'Topology, Coords, Limits' },
    { id: 'waves', label: 'Picking_Wave.csv', desc: 'Transactions, Timestamp, Qty' }
  ] as const;

  return (
    <div className="frosted-glass-card rounded-xl p-5 border border-slate-700/50 flex flex-col gap-5 h-full">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-display font-bold text-slate-100 flex items-center gap-2">
            <Database size={20} className="text-cyan-400" />
            Module d'Ingestion des Données
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Glissez-déposez vos fichiers d'extraction WMS pour initialiser le moteur de slotting.
          </p>
        </div>
        <button 
          onClick={loadDemoData}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-semibold text-slate-200 transition-colors"
        >
          Load Demo Dataset
        </button>
      </div>

      <div className="flex border-b border-slate-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20' 
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-slate-900/50 rounded-xl border border-dashed border-slate-600 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
        <input 
          type="file" 
          accept=".csv"
          onChange={(e) => handleFileUpload(e, activeTab)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        {parsingState[activeTab].status === 'idle' && (
          <>
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-slate-700 transition-colors">
              <Upload size={28} className="text-cyan-400" />
            </div>
            <h4 className="text-slate-200 font-bold mb-1">Upload {tabs.find(t => t.id === activeTab)?.label}</h4>
            <p className="text-xs text-slate-400 mb-4">{tabs.find(t => t.id === activeTab)?.desc}</p>
            <span className="px-4 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-xs font-semibold text-slate-300 pointer-events-none group-hover:border-cyan-500/50 transition-colors">
              Browse or drop file
            </span>
          </>
        )}

        {parsingState[activeTab].status === 'parsing' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-cyan-400 font-mono">Parsing CSV...</p>
          </div>
        )}

        {parsingState[activeTab].status === 'processing' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-violet-900/30 flex items-center justify-center text-violet-400">
              <Cpu size={24} className="animate-pulse" />
            </div>
            <h4 className="text-violet-400 font-bold">IA Analysis in Progress...</h4>
            <p className="text-xs text-slate-400">Worker offloading (ABC, Jaccard)</p>
          </div>
        )}

        {parsingState[activeTab].status === 'success' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-400">
              <CheckCircle size={24} />
            </div>
            <h4 className="text-slate-200 font-bold">{parsingState[activeTab].count} records loaded</h4>
            {parsingState[activeTab].workerResults && (
               <p className="text-xs text-emerald-400">IA Analysis Complete</p>
            )}
            <p className="text-xs text-slate-400">Drop a new file to replace</p>
          </div>
        )}

        {parsingState[activeTab].status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-rose-900/30 flex items-center justify-center text-rose-400">
              <AlertTriangle size={24} />
            </div>
            <h4 className="text-rose-400 font-bold text-sm max-w-xs">{parsingState[activeTab].error}</h4>
            <p className="text-xs text-slate-400">Drop a valid CSV file to try again</p>
          </div>
        )}
      </div>
    </div>
  );
}
