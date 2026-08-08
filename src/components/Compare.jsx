import React, { useMemo, useState } from 'react';
import { 
  GitCompare, CheckCircle, XCircle, AlertCircle,
  Calendar, Search, Filter, ArrowRight, CreditCard,
  Smartphone, Phone
} from 'lucide-react';

const Compare = ({ transactions, isDark }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMatch, setFilterMatch] = useState('all'); // 'all', 'matched', 'unmatched'

  // Separate transactions by type
  const kotakTransactions = useMemo(() => {
    return transactions.filter(t => t.statementType === 'kotak' || !t.statementType);
  }, [transactions]);

  const bhimTransactions = useMemo(() => {
    return transactions.filter(t => t.statementType === 'bhim');
  }, [transactions]);

  const phonePeTransactions = useMemo(() => {
    return transactions.filter(t => t.statementType === 'phonepe');
  }, [transactions]);

  // Find matching transactions between Kotak and BHIM
  const matchedWithBHIM = useMemo(() => {
    const matches = [];
    const bhimMap = new Map();
    
    // Group BHIM transactions by date + amount
    bhimTransactions.forEach(t => {
      const key = `${t.date}_${t.amount}`;
      if (!bhimMap.has(key)) {
        bhimMap.set(key, []);
      }
      bhimMap.get(key).push(t);
    });

    kotakTransactions.forEach(kotakT => {
      const key = `${kotakT.date}_${kotakT.amount}`;
      const bhimMatches = bhimMap.get(key) || [];
      
      bhimMatches.forEach(bhimT => {
        matches.push({
          kotak: kotakT,
          bhim: bhimT,
          date: kotakT.date,
          amount: kotakT.amount,
          matched: true
        });
      });
    });

    return matches;
  }, [kotakTransactions, bhimTransactions]);

  // Find matching transactions between Kotak and PhonePe
  const matchedWithPhonePe = useMemo(() => {
    const matches = [];
    const phonePeMap = new Map();
    
    phonePeTransactions.forEach(t => {
      const key = `${t.date}_${t.amount}`;
      if (!phonePeMap.has(key)) {
        phonePeMap.set(key, []);
      }
      phonePeMap.get(key).push(t);
    });

    kotakTransactions.forEach(kotakT => {
      const key = `${kotakT.date}_${kotakT.amount}`;
      const phonePeMatches = phonePeMap.get(key) || [];
      
      phonePeMatches.forEach(phonePeT => {
        matches.push({
          kotak: kotakT,
          phonePe: phonePeT,
          date: kotakT.date,
          amount: kotakT.amount,
          matched: true
        });
      });
    });

    return matches;
  }, [kotakTransactions, phonePeTransactions]);

  // Find unmatched Kotak transactions
  const unmatchedKotak = useMemo(() => {
    const matchedKeys = new Set();
    
    // Add all matched BHIM keys
    matchedWithBHIM.forEach(m => {
      matchedKeys.add(`${m.kotak.date}_${m.kotak.amount}_${m.kotak.description}`);
    });
    
    // Add all matched PhonePe keys
    matchedWithPhonePe.forEach(m => {
      matchedKeys.add(`${m.kotak.date}_${m.kotak.amount}_${m.kotak.description}`);
    });

    return kotakTransactions.filter(t => {
      const key = `${t.date}_${t.amount}_${t.description}`;
      return !matchedKeys.has(key);
    });
  }, [kotakTransactions, matchedWithBHIM, matchedWithPhonePe]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDateDisplay = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getFilteredMatches = (matches) => {
    let filtered = matches;
    
    if (searchTerm) {
      filtered = filtered.filter(m => 
        m.kotak.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.bhim?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phonePe?.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-6 rounded-lg shadow-sm border-l-4 border-blue-500 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Kotak Transactions</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {kotakTransactions.length}
              </div>
            </div>
            <CreditCard className="text-blue-500" size={32} />
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-sm border-l-4 border-green-500 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>BHIM Transactions</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {bhimTransactions.length}
              </div>
            </div>
            <Smartphone className="text-green-500" size={32} />
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-sm border-l-4 border-purple-500 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>PhonePe Transactions</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {phonePeTransactions.length}
              </div>
            </div>
            <Phone className="text-purple-500" size={32} />
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-sm border-l-4 border-orange-500 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Unmatched Kotak</div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {unmatchedKotak.length}
              </div>
            </div>
            <AlertCircle className="text-orange-500" size={32} />
          </div>
        </div>
      </div>

      {/* Matched with BHIM */}
      <div className={`p-6 rounded-lg shadow-sm ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            🔗 Matched with BHIM
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm ${
            isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
          }`}>
            {matchedWithBHIM.length} matches
          </span>
        </div>

        {matchedWithBHIM.length === 0 ? (
          <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            No matching transactions found between Kotak and BHIM
          </div>
        ) : (
          <div className="space-y-2">
            {getFilteredMatches(matchedWithBHIM).slice(0, 20).map((match, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isDark ? 'bg-gray-700' : 'bg-green-50'
                }`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  <CheckCircle className="text-green-500" size={18} />
                  <div>
                    <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {match.kotak.description}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDateDisplay(match.date)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {formatCurrency(match.amount)}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Kotak → BHIM
                    </div>
                  </div>
                  <ArrowRight className={isDark ? 'text-gray-400' : 'text-gray-500'} size={16} />
                </div>
              </div>
            ))}
            {matchedWithBHIM.length > 20 && (
              <div className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                + {matchedWithBHIM.length - 20} more matches
              </div>
            )}
          </div>
        )}
      </div>

      {/* Matched with PhonePe */}
      <div className={`p-6 rounded-lg shadow-sm ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            🔗 Matched with PhonePe
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm ${
            isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
          }`}>
            {matchedWithPhonePe.length} matches
          </span>
        </div>

        {matchedWithPhonePe.length === 0 ? (
          <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            No matching transactions found between Kotak and PhonePe
          </div>
        ) : (
          <div className="space-y-2">
            {getFilteredMatches(matchedWithPhonePe).slice(0, 20).map((match, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isDark ? 'bg-gray-700' : 'bg-purple-50'
                }`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  <CheckCircle className="text-purple-500" size={18} />
                  <div>
                    <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {match.kotak.description}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDateDisplay(match.date)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {formatCurrency(match.amount)}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Kotak → PhonePe
                    </div>
                  </div>
                  <ArrowRight className={isDark ? 'text-gray-400' : 'text-gray-500'} size={16} />
                </div>
              </div>
            ))}
            {matchedWithPhonePe.length > 20 && (
              <div className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                + {matchedWithPhonePe.length - 20} more matches
              </div>
            )}
          </div>
        )}
      </div>

      {/* Unmatched Kotak Transactions */}
      {unmatchedKotak.length > 0 && (
        <div className={`p-6 rounded-lg shadow-sm ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              ⚠️ Unmatched Kotak Transactions
            </h3>
            <span className={`px-3 py-1 rounded-full text-sm ${
              isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
            }`}>
              {unmatchedKotak.length} transactions
            </span>
          </div>

          <div className="space-y-2">
            {unmatchedKotak.slice(0, 20).map((t, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isDark ? 'bg-gray-700' : 'bg-yellow-50'
                }`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  <XCircle className="text-yellow-500" size={18} />
                  <div>
                    <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {t.description}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDateDisplay(t.date)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {formatCurrency(t.amount)}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    No match found
                  </div>
                </div>
              </div>
            ))}
            {unmatchedKotak.length > 20 && (
              <div className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                + {unmatchedKotak.length - 20} more unmatched transactions
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Compare;