// Keyword-based categorization engine
const CATEGORY_RULES = {
  'Fuel': [
    'HPCL', 'IOCL', 'BPCL', 'SHELL', 'PETROL', 'DIESEL', 'FUEL', 
    'INDIAN OIL', 'HINDUSTAN PETROLEUM', 'BHARAT PETROLEUM'
  ],
  'Grocery': [
    'DMART', 'RELIANCE SMART', 'MORE', 'BIG BAZAAR', 'GROCERY', 
    'SUPERMARKET', 'FRESH', 'VEGETABLES', 'FRUITS', 'KIRANA'
  ],
  'Food & Restaurant': [
    'SWIGGY', 'ZOMATO', 'KFC', 'MCDONALDS', 'MCDONALD', 'PIZZA HUT',
    'DOMINO', 'RESTAURANT', 'CAFE', 'FOOD', 'DINING', 'EAT', 'MEAL'
  ],
  'Shopping': [
    'AMAZON', 'FLIPKART', 'MYNTRA', 'SHOPPING', 'CLOTHES', 'FASHION',
    'ELECTRONICS', 'GADGETS', 'ONLINE STORE'
  ],
  'Bills': [
    'ELECTRICITY', 'WATER', 'GAS', 'PHONE', 'INTERNET', 'CABLE',
    'RENT', 'MAINTENANCE', 'INSURANCE', 'EMI'
  ]
};

export function categorizeTransaction(description) {
  const upperDesc = description.toUpperCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    for (const keyword of keywords) {
      if (upperDesc.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'Other';
}

// User can override categorization
const userOverrides = {};

export function getCategory(description) {
  // Check if user has manually set a category for this merchant
  const merchant = description.trim().toUpperCase();
  if (userOverrides[merchant]) {
    return userOverrides[merchant];
  }
  
  // Auto-categorize
  return categorizeTransaction(description);
}

export function setUserOverride(description, category) {
  const merchant = description.trim().toUpperCase();
  userOverrides[merchant] = category;
  // Save to localStorage
  localStorage.setItem('categoryOverrides', JSON.stringify(userOverrides));
}

// Load user overrides on startup
export function loadUserOverrides() {
  const saved = localStorage.getItem('categoryOverrides');
  if (saved) {
    Object.assign(userOverrides, JSON.parse(saved));
  }
}