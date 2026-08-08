// utils/pdfParser.js - Updated to support multiple statement formats

let pdfjsLibGlobal = null;
let isPDFJSScriptLoading = false;
let pdfJSScriptPromise = null;

// Load PDF.js from CDN
async function loadPDFJS() {
  if (pdfjsLibGlobal) {
    return pdfjsLibGlobal;
  }

  if (window.pdfjsLib) {
    pdfjsLibGlobal = window.pdfjsLib;
    return pdfjsLibGlobal;
  }

  if (isPDFJSScriptLoading && pdfJSScriptPromise) {
    await pdfJSScriptPromise;
    return pdfjsLibGlobal;
  }

  isPDFJSScriptLoading = true;
  
  pdfJSScriptPromise = new Promise((resolve, reject) => {
    try {
      console.log('📥 Loading PDF.js from CDN...');
      
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      
      script.onload = () => {
        console.log('✅ PDF.js loaded successfully');
        pdfjsLibGlobal = window.pdfjsLib;
        
        if (pdfjsLibGlobal) {
          pdfjsLibGlobal.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        
        isPDFJSScriptLoading = false;
        resolve(pdfjsLibGlobal);
      };
      
      script.onerror = () => {
        console.error('❌ Failed to load PDF.js from CDN');
        isPDFJSScriptLoading = false;
        reject(new Error('Failed to load PDF.js library'));
      };
      
      document.head.appendChild(script);
    } catch (error) {
      isPDFJSScriptLoading = false;
      reject(error);
    }
  });

  await pdfJSScriptPromise;
  return pdfjsLibGlobal;
}

// Check if PDF needs password
export async function checkPDFPassword(file) {
  try {
    const pdfjsLib = await loadPDFJS();
    if (!pdfjsLib) {
      console.error('❌ PDF.js not loaded');
      return false;
    }
    
    const arrayBuffer = await file.arrayBuffer();
    
    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      await loadingTask.promise;
      console.log('✅ PDF does not need password');
      return false;
    } catch (error) {
      console.log('🔐 Password check error:', error.message);
      if (error.message && (
        error.message.toLowerCase().includes('password') || 
        error.message.toLowerCase().includes('encrypted') ||
        error.message.toLowerCase().includes('incorrect')
      )) {
        console.log('🔐 PDF needs password');
        return true;
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking PDF password:', error);
    return false;
  }
}

// Parse PDF with optional password
export async function parsePDF(file, bankFormat = 'auto', password = null) {
  try {
    console.log('📄 Starting PDF parse...');
    
    const pdfjsLib = await loadPDFJS();
    if (!pdfjsLib) {
      throw new Error('PDF.js library failed to load');
    }
    
    const arrayBuffer = await file.arrayBuffer();
    
    let loadingTask;
    const docConfig = { 
      data: arrayBuffer,
      useSystemFonts: true,
      verbosity: 0
    };
    
    if (password && password.trim() !== '') {
      console.log('🔐 Attempting to unlock PDF with password...');
      docConfig.password = password.trim();
    }
    
    loadingTask = pdfjsLib.getDocument(docConfig);
    
    console.log('⏳ Waiting for PDF to load...');
    const pdf = await loadingTask.promise;
    console.log('✅ PDF loaded successfully! Pages:', pdf.numPages);
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`📄 Reading page ${i}/${pdf.numPages}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    console.log('📄 Total text extracted:', fullText.length, 'characters');
    console.log('📄 First 500 chars:', fullText.substring(0, 500));
    
    if (fullText.trim().length === 0) {
      console.warn('⚠️ No text found in PDF.');
      return [];
    }
    
    // Extract transactions from the text
    const transactions = extractTransactionsFromText(fullText, bankFormat);
    console.log('📊 Extracted transactions:', transactions.length);
    
    return transactions;
    
  } catch (error) {
    console.error('❌ PDF parsing error:', error);
    
    if (error.message) {
      const msg = error.message.toLowerCase();
      if (msg.includes('password') || msg.includes('incorrect password')) {
        throw new Error('Incorrect password. Please try again.');
      }
      if (msg.includes('encrypted')) {
        throw new Error('This PDF is password protected. Please provide a password.');
      }
    }
    
    throw new Error(`Failed to parse PDF: ${error.message || 'Unknown error'}`);
  }
}

// Extract transactions from text - Supports multiple formats
function extractTransactionsFromText(text, bankFormat = 'auto') {
  const transactionMap = new Map();
  const seenTransactions = new Set();
  
  console.log('🔍 Looking for transactions in text...');
  
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  console.log(`📄 Total lines: ${lines.length}`);
  
  // Try to detect the statement format
  const isBHIMFormat = text.includes('Transaction Statement for') || text.includes('BHIM');
  const isPhonePeFormat = text.includes('PhonePe') || text.includes('Transaction ID');
  const isKotakFormat = text.includes('Transactions Details from') || text.includes('Purchases made in this cycle');
  
  console.log(`📄 Detected format: ${isKotakFormat ? 'Kotak' : isBHIMFormat ? 'BHIM' : isPhonePeFormat ? 'PhonePe' : 'Unknown'}`);
  
  // For BHIM and PhonePe format (tabular with headers)
  if (isBHIMFormat || isPhonePeFormat || bankFormat === 'bhim' || bankFormat === 'phonepe') {
    console.log('📄 Processing BHIM/PhonePe format...');
    return extractUPITransactions(text, bankFormat);
  }
  
  // For Kotak format
  if (isKotakFormat || bankFormat === 'kotak' || bankFormat === 'auto') {
    console.log('📄 Processing Kotak format...');
    return extractKotakTransactions(text);
  }
  
  // Try both formats
  console.log('📄 Trying both formats...');
  let transactions = extractKotakTransactions(text);
  if (transactions.length === 0) {
    transactions = extractUPITransactions(text, bankFormat);
  }
  
  return transactions;
}

// Extract Kotak credit card transactions
function extractKotakTransactions(text) {
  const transactionMap = new Map();
  const seenTransactions = new Set();
  const ccbillTracker = new Set();
  
  console.log('🔍 Looking for Kotak transactions...');
  
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  const datePattern = /\d{1,2}-\w{3}-\d{2,4}/;
  const amountPattern = /[\d,]+\.\d{2}/;
  
  let transactionLines = [];
  let currentSection = 'purchases';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('Payments and Other Credits')) {
      currentSection = 'credits';
      continue;
    }
    
    if (line.includes('Purchases made in this cycle') || line.includes('Purchases made')) {
      currentSection = 'purchases';
      continue;
    }
    
    if (line.includes('EMI & Loans') || line.includes('EMI PRIN') || line.includes('EMI INT')) {
      currentSection = 'emi';
      continue;
    }
    
    if (datePattern.test(line) && amountPattern.test(line)) {
      if (!line.includes('Date') && !line.includes('Description') && !line.includes('Amount')) {
        transactionLines.push({ line, section: currentSection });
      }
    }
  }
  
  console.log(`📊 Found ${transactionLines.length} potential Kotak transaction lines`);
  
  for (const { line, section } of transactionLines) {
    const transaction = parseKotakLine(line, section);
    if (transaction) {
      const desc = transaction.description.toLowerCase();
      if (desc.includes('ccbill')) {
        const refMatch = desc.match(/ccbill[-\s]*(\d+)/);
        if (refMatch) {
          const ref = refMatch[1];
          if (ccbillTracker.has(ref)) continue;
          ccbillTracker.add(ref);
        }
      }
      
      const key = createKotakKey(transaction);
      if (!seenTransactions.has(key)) {
        seenTransactions.add(key);
        transactionMap.set(key, transaction);
      }
    }
  }
  
  // Aggressive approach for Kotak
  if (transactionMap.size === 0) {
    console.log('⚠️ No Kotak transactions found with standard parsing, trying aggressive...');
    const allMatches = text.match(/(\d{1,2}-\w{3}-\d{2,4})\s+([A-Za-z0-9\s\/\.\-&()]+?)\s+([\d,]+\.\d{2})/gi);
    
    if (allMatches) {
      for (const match of allMatches) {
        const dateMatch = match.match(/(\d{1,2}-\w{3}-\d{2,4})/);
        const amountMatch = match.match(/([\d,]+\.\d{2})/);
        
        if (dateMatch && amountMatch) {
          const date = dateMatch[1];
          const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
          let description = match.replace(date, '').replace(amountMatch[1], '').trim();
          description = description.replace(/\s*Cr\s*/gi, ' ').replace(/\s*Dr\s*/gi, ' ').trim();
          
          if (description && description.length > 2 && amount > 0 && amount < 10000000) {
            const transaction = {
              date: formatKotakDate(date),
              description: cleanDescription(description),
              amount: Math.abs(amount),
              type: description.toLowerCase().includes('ccbill') ? 'credit' : 'debit',
              merchant: cleanDescription(description).split(' ').slice(0, 3).join(' '),
              category: categorizeTransaction(description)
            };
            
            const key = createKotakKey(transaction);
            if (!seenTransactions.has(key)) {
              seenTransactions.add(key);
              transactionMap.set(key, transaction);
            }
          }
        }
      }
    }
  }
  
  return Array.from(transactionMap.values());
}

// Parse Kotak transaction line
function parseKotakLine(line, section) {
  line = line.replace(/\s+/g, ' ').trim();
  if (line.length < 10) return null;
  
  const dateMatch = line.match(/(\d{1,2}-\w{3,9}-\d{2,4})/);
  if (!dateMatch) return null;
  
  const date = dateMatch[1];
  const amountMatch = line.match(/([\d,]+\.\d{2})/);
  if (!amountMatch) return null;
  
  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (!amount || amount <= 0 || amount > 10000000) return null;
  
  const dateEnd = line.indexOf(date) + date.length;
  const amountStart = line.indexOf(amountMatch[1]);
  let description = line.substring(dateEnd, amountStart).trim();
  
  description = description.replace(/\s*Cr\s*/gi, ' ').replace(/\s*Dr\s*/gi, ' ').trim();
  if (!description || description.length < 2) return null;
  
  let type = 'debit';
  const descLower = description.toLowerCase();
  
  if (descLower.includes('ccbill') || descLower.includes('payment')) type = 'credit';
  if (descLower.includes('convert to emi') || descLower.includes('emi pr') || descLower.includes('emi int')) type = 'debit';
  if (descLower.includes('surcharge')) type = 'debit';
  if (section === 'credits' && !descLower.includes('convert to emi')) type = 'credit';
  
  return {
    date: formatKotakDate(date),
    description: cleanDescription(description),
    amount: Math.abs(amount),
    type: type,
    merchant: cleanDescription(description).split(' ').slice(0, 3).join(' '),
    category: categorizeTransaction(description)
  };
}

// Create unique key for Kotak
function createKotakKey(transaction) {
  const desc = transaction.description.toLowerCase().trim();
  const amount = transaction.amount;
  const date = transaction.date;
  
  const ccbillMatch = desc.match(/ccbill[-\s]*(\d+)/);
  if (ccbillMatch) return `ccbill-${ccbillMatch[1]}`;
  
  const upiMatch = desc.match(/upi[-\s]*k[-\s]*(\d+)/i);
  if (upiMatch) return `upi-${upiMatch[1]}`;
  
  return `${date}-${amount}-${desc.substring(0, 25)}`;
}

// Format Kotak date
function formatKotakDate(dateStr) {
  try {
    const monthMap = {
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
      'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    };
    
    const match = dateStr.match(/(\d{1,2})-(\w{3})-(\d{2,4})/);
    if (match) {
      const day = parseInt(match[1]);
      const month = monthMap[match[2].toLowerCase()] || parseInt(match[2]);
      let year = parseInt(match[3]);
      if (year < 100) year += 2000;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return dateStr;
  } catch (e) { return dateStr; }
}

// ============================================
// BHIM / PhonePe UPI Transaction Parser
// ============================================

function extractUPITransactions(text, bankFormat) {
  const transactionMap = new Map();
  const seenTransactions = new Set();
  
  console.log('🔍 Looking for UPI transactions (BHIM/PhonePe)...');
  
  // Clean the text - remove extra spaces
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Pattern for BHIM format: 
  // "Jul 30, 2026 07:08 pm  DEBIT   ₹ 25 Paid to HARISHANKAR KUSHWAHA"
  // "Jul 30, 2026 08:31 am  CREDIT   ₹ 1,200 Received from Masjid E Abdur Rahaman"
  
  // Pattern 1: Date with time, then Type, then Amount, then Description
  const pattern1 = /([A-Za-z]{3}\s\d{1,2},\s\d{4}\s\d{1,2}:\d{2}\s[ap]m)\s+(DEBIT|CREDIT)\s+₹\s*([\d,]+)\s+(.+?)(?=(?:[A-Za-z]{3}\s\d{1,2},\s\d{4}|$))/gi;
  
  // Pattern 2: Date without time, then Type, then Amount, then Description
  const pattern2 = /([A-Za-z]{3}\s\d{1,2},\s\d{4})\s+(DEBIT|CREDIT)\s+₹\s*([\d,]+)\s+(.+?)(?=(?:[A-Za-z]{3}\s\d{1,2},\s\d{4}|$))/gi;
  
  // Pattern 3: Transaction ID based extraction (PhonePe)
  const pattern3 = /Transaction ID\s+([A-Z0-9]+).*?(?:DEBIT|CREDIT)\s+₹\s*([\d,]+)\s+(.+?)(?=(?:Transaction ID|$))/gi;
  
  let matches = [];
  let allMatches = [...cleanText.matchAll(pattern1)];
  if (allMatches.length === 0) {
    allMatches = [...cleanText.matchAll(pattern2)];
  }
  if (allMatches.length === 0) {
    allMatches = [...cleanText.matchAll(pattern3)];
  }
  
  console.log(`📊 Found ${allMatches.length} UPI transactions using pattern`);
  
  for (const match of allMatches) {
    let dateStr = match[1] || '';
    let type = match[2] || '';
    let amountStr = match[3] || '';
    let description = match[4] || '';
    
    // Clean up
    amountStr = amountStr.replace(/,/g, '');
    const amount = parseFloat(amountStr);
    
    if (!amount || amount <= 0) continue;
    
    // Clean description
    description = description.replace(/Transaction ID\s+[A-Z0-9]+\s*/gi, '');
    description = description.replace(/UTR No\.\s+[\d]+\s*/gi, '');
    description = description.replace(/Paid by\s+[^\s]+\s*/gi, '');
    description = description.trim();
    
    // Determine if credit or debit
    const isCredit = type.toUpperCase() === 'CREDIT' || description.toLowerCase().includes('received from');
    const isDebit = type.toUpperCase() === 'DEBIT' || description.toLowerCase().includes('paid to');
    
    let transactionType = 'debit';
    if (isCredit) transactionType = 'credit';
    if (isDebit) transactionType = 'debit';
    
    // Parse date
    let formattedDate = formatUPIDate(dateStr);
    
    // Create transaction
    const transaction = {
      date: formattedDate,
      description: cleanDescription(description),
      amount: Math.abs(amount),
      type: transactionType,
      merchant: cleanDescription(description).split(' ').slice(0, 3).join(' '),
      category: categorizeUPITransaction(description, bankFormat)
    };
    
    const key = `${formattedDate}-${transactionType}-${amount}-${description.substring(0, 20)}`;
    
    if (!seenTransactions.has(key)) {
      seenTransactions.add(key);
      transactionMap.set(key, transaction);
    }
  }
  
  // If no transactions found, try line-by-line parsing
  if (transactionMap.size === 0) {
    console.log('⚠️ No UPI transactions found with patterns, trying line-by-line...');
    
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 10);
    
    for (const line of lines) {
      // Try to find DEBIT/CREDIT in the line
      if (!line.includes('DEBIT') && !line.includes('CREDIT')) continue;
      
      // Try to find amount
      const amountMatch = line.match(/₹\s*([\d,]+)/);
      if (!amountMatch) continue;
      
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (!amount || amount <= 0) continue;
      
      // Determine type
      const isCredit = line.includes('CREDIT') || line.includes('Received');
      const isDebit = line.includes('DEBIT') || line.includes('Paid');
      
      let type = 'debit';
      if (isCredit) type = 'credit';
      if (isDebit) type = 'debit';
      
      // Try to find date
      const dateMatch = line.match(/([A-Za-z]{3}\s\d{1,2},\s\d{4})/);
      let formattedDate = formatUPIDate(dateMatch ? dateMatch[1] : '');
      
      // Extract description - everything after the amount
      let description = line.replace(/DEBIT|CREDIT/gi, '');
      description = description.replace(/₹\s*[\d,]+/g, '');
      description = description.replace(/[A-Za-z]{3}\s\d{1,2},\s\d{4}/g, '');
      description = description.replace(/\d{1,2}:\d{2}\s[ap]m/g, '');
      description = description.trim();
      
      if (description.length < 2) continue;
      
      const transaction = {
        date: formattedDate || formatUPIDate('Jan 1, 2026'),
        description: cleanDescription(description),
        amount: Math.abs(amount),
        type: type,
        merchant: cleanDescription(description).split(' ').slice(0, 3).join(' '),
        category: categorizeUPITransaction(description, bankFormat)
      };
      
      const key = `${transaction.date}-${type}-${amount}-${description.substring(0, 20)}`;
      
      if (!seenTransactions.has(key)) {
        seenTransactions.add(key);
        transactionMap.set(key, transaction);
      }
    }
  }
  
  console.log(`📊 Final UPI transactions: ${transactionMap.size}`);
  return Array.from(transactionMap.values());
}

// Format UPI date (Jul 30, 2026 -> 2026-07-30)
function formatUPIDate(dateStr) {
  try {
    if (!dateStr) return '2026-07-01';
    
    const monthMap = {
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
      'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    };
    
    // Handle "Jul 30, 2026 07:08 pm" or "Jul 30, 2026"
    const match = dateStr.match(/([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})/);
    if (match) {
      const month = monthMap[match[1].toLowerCase()] || 1;
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    
    return dateStr;
  } catch (e) {
    return '2026-07-01';
  }
}

// Categorize UPI transactions
function categorizeUPITransaction(description, bankFormat) {
  const desc = description.toLowerCase();
  
  // Check for common patterns
  if (desc.includes('received from') || desc.includes('credit')) return 'Other Credit';
  if (desc.includes('paid to') || desc.includes('debit')) {
    // Try to categorize based on merchant
    if (desc.includes('transport') || desc.includes('travel') || desc.includes('cab')) return 'Transport';
    if (desc.includes('food') || desc.includes('restaurant') || desc.includes('cafe')) return 'Food & Restaurant';
    if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('fresh')) return 'Grocery';
    if (desc.includes('fuel') || desc.includes('petrol') || desc.includes('gas')) return 'Fuel';
    if (desc.includes('medical') || desc.includes('hospital') || desc.includes('pharmacy')) return 'Healthcare';
    if (desc.includes('shopping') || desc.includes('store') || desc.includes('mall')) return 'Shopping';
    if (desc.includes('bill') || desc.includes('utility') || desc.includes('electricity')) return 'Bills';
    if (desc.includes('recharge') || desc.includes('mobile') || desc.includes('phone')) return 'Telecom';
    if (desc.includes('upi') || desc.includes('payment')) return 'Other';
  }
  
  return categorizeTransaction(description);
}

// Legacy categorize function
function categorizeTransaction(description) {
  const desc = description.toLowerCase();
  
  if (desc.includes('convert to emi') || desc.includes('emi pr') || desc.includes('emi int')) return 'EMI';
  if (desc.includes('ccbill') || desc.includes('payment')) return 'Payment';
  if (desc.includes('refund') || desc.includes('cashback') || desc.includes('reward')) return 'Other Credit';
  if (desc.includes('fuel') || desc.includes('petrol') || desc.includes('hpcl') || desc.includes('iocl') || desc.includes('bpcl')) return 'Fuel';
  if (desc.includes('grocery') || desc.includes('fresh') || desc.includes('supermarket') || desc.includes('dmart')) return 'Grocery';
  if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('food') || desc.includes('swiggy')) return 'Food & Restaurant';
  if (desc.includes('flipkart') || desc.includes('amazon') || desc.includes('shopping') || desc.includes('fashion')) return 'Shopping';
  if (desc.includes('transport') || desc.includes('freight') || desc.includes('travel')) return 'Transport';
  if (desc.includes('telecom') || desc.includes('mobile') || desc.includes('phone') || desc.includes('airtel')) return 'Telecom';
  if (desc.includes('medical') || desc.includes('hospital') || desc.includes('pharmacy')) return 'Healthcare';
  if (desc.includes('bill') || desc.includes('electricity') || desc.includes('water')) return 'Bills';
  if (desc.includes('surcharge')) return 'Surcharge';
  
  return 'Other';
}

// Clean description
function cleanDescription(desc) {
  return desc
    .replace(/[^\w\s\/\.\-&()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}