import React, { useMemo, useState } from 'react';
import { 
  Smartphone, Search, Filter, Calendar,
  ArrowUpCircle, ArrowDownCircle, Download
} from 'lucide-react';

const BHIM = ({ transactions, isDark }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const bhimTransactions = useMemo(() => {
    return transactions.filter(t => t.statementType === 'bhim');
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let filtered = bhimTransactions;
    
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterType === 'debit') {
      filtered = filtered.filter(t => t.type !== 'credit');
    } else if (filterType === 'credit') {
      filtered = filtered.filter(t => t.type === 'credit');
    }
    
    return filtered;
  }, [bhimTransactions, searchTerm, filterType]);

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

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-lg shadow-sm ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex items-center space-x-3">
            <Smartphone className="text-green-500" size={28} />
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              BHIM Transactions
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`} size={18} />
              <input
                type="text"
                placeholder="Search BHIM..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-40 pl-10 pr-4 py-1.5 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm ${
                  isDark 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-gray-50 text-gray-800 border-gray-300'
                }`}
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                isDark 
                  ? 'bg-gray-700 text-white border-gray-600' 
                  : 'bg-gray-50 text-gray-800 border-gray-300'
              }`}
            >
              <option value="all">All Types</option>
              <option value="debit">DR</option>
              <option value="credit">CR</option>
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Transactions</div>
            <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {bhimTransactions.length}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total DR</div>
            <div className="text-lg font-bold text-red-600 dark:text-red-400">
              {formatCurrency(bhimTransactions.filter(t => t.type !== 'credit').reduce((sum, t) => sum + t.amount, 0))}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total CR</div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(bhimTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0))}
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-2">
          {filteredTransactions.length === 0 ? (
            <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No BHIM transactions found
            </div>
          ) : (
            filteredTransactions.map((t, index) => {
              const isCredit = t.type === 'credit';
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isDark ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {t.description}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        isDark 
                          ? 'bg-gray-600 text-gray-300' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {t.category}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDateDisplay(t.date)}
                      </span>
                    </div>
                  </div>
                  <div className={`text-right font-medium ${
                    isCredit
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatCurrency(t.amount)}
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {isCredit ? 'CR' : 'DR'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default BHIM;