// utils/csvParser.js - Alternative with CDN

export async function parseCSV(file, bankFormat = 'auto') {
  try {
    // Load PapaParse from CDN if not available
    const Papa = await loadPapaParse();
    
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
        complete: (results) => {
          try {
            const transactions = extractTransactions(results.data, bankFormat);
            resolve(transactions);
          } catch (error) {
            reject(new Error(`Failed to parse CSV: ${error.message}`));
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  } catch (error) {
    throw new Error(`Failed to load CSV parser: ${error.message}`);
  }
}

async function loadPapaParse() {
  if (window.Papa) {
    return window.Papa;
  }
  
  // Load from CDN
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  
  return window.Papa;
}