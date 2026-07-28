export type TMDClass = '2.1' | '2.2' | '2.3' | '3' | '4.1' | '4.2' | '4.3' | '5.1' | '5.2' | '6.1' | '8' | 'None';

// Defines pairs of incompatible classes
export const tmdIncompatibilities: Record<TMDClass, TMDClass[]> = {
  '2.1': ['3', '5.1', '5.2'],
  '2.2': [],
  '2.3': [],
  '3': ['2.1', '4.2', '5.1', '5.2'],
  '4.1': ['5.1', '5.2'],
  '4.2': ['3', '5.1', '5.2'],
  '4.3': ['8'],
  '5.1': ['2.1', '3', '4.1', '4.2', '8'],
  '5.2': ['2.1', '3', '4.1', '4.2', '8'],
  '6.1': ['None'], // Often segregated from non-dangerous (like food)
  '8': ['4.3', '5.1', '5.2'],
  'None': ['6.1']
};

export const checkTMDCompatibility = (class1?: string, class2?: string): boolean => {
  if (!class1 || !class2 || class1 === 'None' && class2 !== '6.1' || class2 === 'None' && class1 !== '6.1') return true;
  
  const incompatibles1 = tmdIncompatibilities[class1 as TMDClass] || [];
  const incompatibles2 = tmdIncompatibilities[class2 as TMDClass] || [];
  
  if (incompatibles1.includes(class2 as TMDClass)) return false;
  if (incompatibles2.includes(class1 as TMDClass)) return false;
  
  return true;
};
