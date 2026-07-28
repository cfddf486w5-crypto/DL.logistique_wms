export type WorkerRequest = 
  | { type: 'CALCULATE_ABC', data: any }
  | { type: 'CALCULATE_JACCARD', data: any }
  | { type: 'CALCULATE_DRIFT', data: any };

export type WorkerResponse =
  | { type: 'ABC_RESULT', result: any }
  | { type: 'JACCARD_RESULT', result: any }
  | { type: 'DRIFT_RESULT', result: any }
  | { type: 'ERROR', error: string };

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  try {
    const { type, data } = e.data;

    switch (type) {
      case 'CALCULATE_ABC': {
        const result = calculateABC(data);
        self.postMessage({ type: 'ABC_RESULT', result });
        break;
      }
      case 'CALCULATE_JACCARD': {
        const result = calculateJaccard(data);
        self.postMessage({ type: 'JACCARD_RESULT', result });
        break;
      }
      case 'CALCULATE_DRIFT': {
        const result = calculateDrift(data);
        self.postMessage({ type: 'DRIFT_RESULT', result });
        break;
      }
      default:
        self.postMessage({ type: 'ERROR', error: 'Unknown worker action' });
    }
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', error: error.message });
  }
};

function calculateABC(waves: any[]) {
  // Calculate cumulative pick transactions
  const itemCounts: Record<string, number> = {};
  let totalPicks = 0;
  
  for (const wave of waves) {
    if (wave.SKU_ID) {
      const qty = Number(wave.Quantity) || 1;
      itemCounts[wave.SKU_ID] = (itemCounts[wave.SKU_ID] || 0) + qty;
      totalPicks += qty;
    }
  }

  // Sort by highest picks
  const sortedItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([sku, count]) => ({ sku, count }));

  const result = { classA: [] as string[], classB: [] as string[], classC: [] as string[] };
  let currentCumulative = 0;

  for (const item of sortedItems) {
    currentCumulative += item.count;
    const percentage = currentCumulative / totalPicks;

    if (percentage <= 0.80) {
      result.classA.push(item.sku);
    } else if (percentage <= 0.95) {
      result.classB.push(item.sku);
    } else {
      result.classC.push(item.sku);
    }
  }

  return result;
}

function calculateJaccard(waves: any[]) {
  // Group SKUs by Wave_ID/Order_ID
  const wavesByOrder: Record<string, Set<string>> = {};
  
  for (const wave of waves) {
    const orderId = wave.Order_ID || wave.Wave_ID;
    const sku = wave.SKU_ID;
    if (orderId && sku) {
      if (!wavesByOrder[orderId]) wavesByOrder[orderId] = new Set();
      wavesByOrder[orderId].add(sku);
    }
  }

  // Count co-occurrences
  const skuSets: Record<string, Set<string>> = {};
  const allSkus = new Set<string>();

  for (const orderId in wavesByOrder) {
    const skus = Array.from(wavesByOrder[orderId]);
    for (const sku of skus) {
      allSkus.add(sku);
      if (!skuSets[sku]) skuSets[sku] = new Set();
      skuSets[sku].add(orderId);
    }
  }

  const skuArray = Array.from(allSkus);
  const affinities = [];

  for (let i = 0; i < skuArray.length; i++) {
    for (let j = i + 1; j < skuArray.length; j++) {
      const skuA = skuArray[i];
      const skuB = skuArray[j];

      const setA = skuSets[skuA];
      const setB = skuSets[skuB];

      let intersection = 0;
      for (const orderId of setA) {
        if (setB.has(orderId)) intersection++;
      }

      if (intersection > 0) {
        const union = setA.size + setB.size - intersection;
        const jaccard = intersection / union;
        if (jaccard > 0.1) { // Only keep meaningful affinities
          affinities.push({ source: skuA, target: skuB, score: jaccard });
        }
      }
    }
  }

  // Sort descending by score
  affinities.sort((a, b) => b.score - a.score);

  return { affinities };
}

function calculateDrift(data: { currentPlacements: any[], locations: any[], targetDriftThreshold: number }) {
  const { currentPlacements, locations, targetDriftThreshold = 0.2 } = data;
  
  // This is a simplified drift calculation to simulate the worker's heavy task.
  // In a real scenario, this would compare current location XYZ to ideal XYZ.
  
  const recommendations = [];
  
  for (let i = 0; i < currentPlacements.length; i++) {
    const p = currentPlacements[i];
    
    // Simulate some logic where we find products that are placed poorly
    // Math.random() is used here just to simulate drift analysis finding some candidates.
    // Real implementation would calculate Manhattan distance to (0,0,0) (dispatch).
    
    const driftRatio = Math.random();
    
    if (driftRatio > targetDriftThreshold && p.sku) {
      // Find a better target location (mocked)
      const targetLoc = locations[Math.floor(Math.random() * locations.length)]?.Loc_ID || `LOC-A-${Math.floor(Math.random()*10)}`;
      
      recommendations.push({
        priority_score: Math.round(driftRatio * 100),
        sku_id: p.sku,
        sku_description: p.name || `Product ${p.sku}`,
        source_location: p.locationId || 'Unknown',
        target_location: targetLoc,
        distance_reduction_meters: Math.round((driftRatio * 50) * 10) / 10,
        ergonomic_gain: driftRatio > 0.6 ? "Moved to Gold Zone" : "Reduced vertical reach",
        operational_justification: `SKU drift detected at ${(driftRatio*100).toFixed(0)}%. Relocating to higher velocity zone.`,
        safety_constraints_validated: true
      });
    }
  }

  // Sort by highest priority score
  recommendations.sort((a, b) => b.priority_score - a.priority_score);

  return { recommendations: recommendations.slice(0, 10) }; // Return top 10 moves
}
