import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SlottingDB extends DBSchema {
  products: {
    key: string;
    value: any;
  };
  locations: {
    key: string;
    value: any;
  };
  waves: {
    key: string;
    value: any;
  };
  state: {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<SlottingDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<SlottingDB>('smart-slotting-db', 1, {
      upgrade(db) {
        db.createObjectStore('products', { keyPath: 'SKU_ID' });
        db.createObjectStore('locations', { keyPath: 'Loc_ID' });
        // Use an auto-incrementing key for waves if they don't have a unique ID, but assuming we can generate one or just use autoIncrement
        db.createObjectStore('waves', { autoIncrement: true });
        db.createObjectStore('state'); // For app-wide state saving
      },
    });
  }
  return dbPromise;
}

export async function clearAllData() {
  const db = await getDB();
  await db.clear('products');
  await db.clear('locations');
  await db.clear('waves');
  await db.clear('state');
}

export async function saveProducts(products: any[]) {
  const db = await getDB();
  const tx = db.transaction('products', 'readwrite');
  await Promise.all(products.map(p => tx.store.put(p)));
  await tx.done;
}

export async function saveLocations(locations: any[]) {
  const db = await getDB();
  const tx = db.transaction('locations', 'readwrite');
  await Promise.all(locations.map(l => tx.store.put(l)));
  await tx.done;
}

export async function saveWaves(waves: any[]) {
  const db = await getDB();
  const tx = db.transaction('waves', 'readwrite');
  await Promise.all(waves.map(w => tx.store.put(w)));
  await tx.done;
}

export async function getAllProducts() {
  const db = await getDB();
  return db.getAll('products');
}

export async function getAllLocations() {
  const db = await getDB();
  return db.getAll('locations');
}

export async function getAllWaves() {
  const db = await getDB();
  return db.getAll('waves');
}
