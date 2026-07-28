import React, { useState } from 'react';
import { Product } from '../../types';

export function useCustomPalletForm(onAddCustomProduct: (p: Product) => void, onComplete: (p: Product) => void) {
  const [palletName, setPalletName] = useState('');
  const [palletWidth, setPalletWidth] = useState(1200);
  const [palletHeight, setPalletHeight] = useState(1200);
  const [palletDepth, setPalletDepth] = useState(800);
  const [palletWeight, setPalletWeight] = useState(500);
  const [palletColor, setPalletColor] = useState('#10B981');
  const [palletRotation, setPalletRotation] = useState<'A' | 'B' | 'C'>('B');
  const [palletTmdClass, setPalletTmdClass] = useState<string>('None');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!palletName.trim()) return;
    
    const newProd: Product = {
      id: `cust-pal-${Date.now()}`,
      name: palletName,
      sku: `PAL-CUST-${Math.floor(100 + Math.random() * 900)}`,
      weight: palletWeight,
      color: palletColor,
      type: 'Palette',
      volumeLiters: Math.round((palletWidth * palletHeight * palletDepth) / 1000000),
      widthMm: palletWidth,
      heightMm: palletHeight,
      depthMm: palletDepth,
      isCustomPallet: true,
      rotationClass: palletRotation,
      tmdClass: palletTmdClass as Product['tmdClass'],
    };
    onAddCustomProduct(newProd);
    onComplete(newProd);
    setPalletName('');
  };

  return {
    palletName, setPalletName,
    palletWidth, setPalletWidth,
    palletHeight, setPalletHeight,
    palletDepth, setPalletDepth,
    palletWeight, setPalletWeight,
    palletColor, setPalletColor,
    palletRotation, setPalletRotation,
    palletTmdClass, setPalletTmdClass,
    handleSubmit
  };
}
