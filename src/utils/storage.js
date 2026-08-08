const DB_NAME = 'MySpendDB';
const STORE_NAME = 'transactions';
const DB_VERSION = 2; // Increment version

// Open/initialize database
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date');
        store.createIndex('category', 'category');
        store.createIndex('month', 'month');
        store.createIndex('statementType', 'statementType');
      } else {
        // Upgrade existing store
        const store = event.target.transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains('statementType')) {
          store.createIndex('statementType', 'statementType');
        }
      }
    };
  });
}

// Save transactions
export async function saveToIndexedDB(transactions) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = resolve;
      request.onerror = reject;
    });
    
    for (const t of transactions) {
      const date = new Date(t.date);
      t.month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      t.statementType = t.statementType || 'kotak'; // Default to kotak
      store.add(t);
    }
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
    throw error;
  }
}

// Load transactions
export async function loadFromIndexedDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error loading from IndexedDB:', error);
    return [];
  }
}

// Get transactions by type
export async function getTransactionsByType(type) {
  try {
    const all = await loadFromIndexedDB();
    return all.filter(t => t.statementType === type);
  } catch (error) {
    console.error('Error getting transactions by type:', error);
    return [];
  }
}

// ... rest of existing functions

// Delete all data
export async function clearAllData() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Get transactions by month
export async function getTransactionsByMonth(year, month) {
  const all = await loadFromIndexedDB();
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  return all.filter(t => {
    const date = new Date(t.date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === monthStr;
  });
}