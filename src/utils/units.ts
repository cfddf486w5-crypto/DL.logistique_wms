export type LengthUnit = 'mm' | 'cm' | 'in' | 'ft';
export type VolumeUnit = 'L' | 'cm3' | 'm3' | 'in3' | 'ft3';

export const convertLength = (valueMm: number, targetUnit: LengthUnit): number => {
  switch (targetUnit) {
    case 'cm': return valueMm / 10;
    case 'in': return valueMm / 25.4;
    case 'ft': return valueMm / 304.8;
    case 'mm':
    default: return valueMm;
  }
};

export const formatLength = (valueMm: number, targetUnit: LengthUnit, decimals: number = 1): string => {
  const converted = convertLength(valueMm, targetUnit);
  if (targetUnit === 'mm') return `${converted.toFixed(0)} mm`;
  if (targetUnit === 'in') return `${converted.toFixed(decimals)} po`;
  if (targetUnit === 'ft') return `${converted.toFixed(decimals)} pi`;
  return `${converted.toFixed(decimals)} ${targetUnit}`;
};

export const convertVolume = (valueLiters: number, targetUnit: VolumeUnit): number => {
  switch (targetUnit) {
    case 'cm3': return valueLiters * 1000;
    case 'm3': return valueLiters / 1000;
    case 'in3': return valueLiters * 61.0237;
    case 'ft3': return valueLiters * 0.0353147;
    case 'L':
    default: return valueLiters;
  }
};

export const formatVolume = (valueLiters: number, targetUnit: VolumeUnit, decimals: number = 1): string => {
  const converted = convertVolume(valueLiters, targetUnit);
  if (targetUnit === 'in3') return `${converted.toFixed(decimals)} po³`;
  if (targetUnit === 'ft3') return `${converted.toFixed(decimals)} pi³`;
  if (targetUnit === 'm3') return `${converted.toFixed(decimals)} m³`;
  if (targetUnit === 'cm3') return `${converted.toFixed(decimals)} cm³`;
  return `${converted.toFixed(decimals)} L`;
};

export const formatMapDistance = (valueMeters: number, targetUnit: LengthUnit, decimals: number = 1): string => {
  if (targetUnit === 'in' || targetUnit === 'ft') {
    const feet = valueMeters * 3.28084;
    return `${feet.toFixed(decimals)} pi`;
  }
  return `${valueMeters.toFixed(decimals)} m`;
};
