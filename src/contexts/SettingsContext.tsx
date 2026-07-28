import React, { createContext, useContext, useState, useEffect } from 'react';
import { LengthUnit, VolumeUnit } from '../utils/units';

interface SettingsContextType {
  lengthUnit: LengthUnit;
  setLengthUnit: (unit: LengthUnit) => void;
  volumeUnit: VolumeUnit;
  setVolumeUnit: (unit: VolumeUnit) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>(() => {
    return (localStorage.getItem('wms-length-unit') as LengthUnit) || 'mm';
  });
  
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>(() => {
    return (localStorage.getItem('wms-volume-unit') as VolumeUnit) || 'm3';
  });

  useEffect(() => {
    localStorage.setItem('wms-length-unit', lengthUnit);
  }, [lengthUnit]);

  useEffect(() => {
    localStorage.setItem('wms-volume-unit', volumeUnit);
  }, [volumeUnit]);

  return (
    <SettingsContext.Provider value={{ lengthUnit, setLengthUnit, volumeUnit, setVolumeUnit }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
