import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Calendar, ArrowUpCircle, ArrowDownCircle,
  ChevronLeft, ChevronRight, Download, ShoppingBag, Repeat, Gift, CalendarDays
} from 'lucide-react';

const TRANSACTION_TYPES = {
  PURCHASE: 'purchase',
  PAYMENT: 'payment',
  OTHER_CREDIT: 'other_credit',
  EMI: 'emi'
};

const Transactions = ({ transactions, isDark }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Classify transaction type
  const classifyTransaction = (t) => {
    const desc = t.description.toLowerCase();
    const isCredit = t.type === 'credit' || t.amount < 0;

    // Check for EMI
    if (desc.includes('emi') || desc.includes('convert') || desc.includes('instalment')) {
      return TRANSACTION_TYPES.EMI;
    }

    // Check for Payment
    if (isCredit && (desc.includes('payment') || desc.includes('pay') || 
        desc.includes('credit card payment') || desc.includes('card payment'))) {
      return TRANSACTION_TYPES.PAYMENT;
    }

    // Check for Other Credits
    if (isCredit) {
      return TRANSACTION_TYPES.OTHER_CREDIT;
    }

    return TRANSACTION_TYPES.PURCHASE;
  };

  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return ['all', ...Array.from(cats)];
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    
    // Search
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.merchant.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }
    
    // Type filter
    if (filterType === 'debit') {
      filtered = filtered.filter(t => t.type !== 'credit' && t.amount > 0);
    } else if (filterType === 'credit') {
      filtered = filtered.filter(t => t.type === 'credit' || t.amount < 0);
    } else if (filterType === 'emi') {
      filtered = filtered.filter(t => classifyTransaction(t) === TRANSACTION_TYPES.EMI);
    } else if (filterType === 'payment') {
      filtered = filtered.filter(t => classifyTransaction(t) === TRANSACTION_TYPES.PAYMENT);
    } else if (filterType === 'other_credit') {
      filtered = filtered.filter(t => classifyTransaction(t) === TRANSACTION_TYPES.OTHER_CREDIT);
    } else if (filterType === 'purchase') {
      filtered = filtered.filter(t => classifyTransaction(t) === TRANSACTION_TYPES.PURCHASE);
    }
    
    return filtered.sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);
  }, [transactions, searchTerm, filterCategory, filterType]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getTransactionTypeInfo = (t) => {
    const type = classifyTransaction(t);
    const isCredit = t.type === 'credit' || t.amount < 0;
    
    switch(type) {
      case TRANSACTION_TYPES.EMI:
        return { 
          label: 'EMI', 
          icon: CalendarDays, 
          color: 'text-orange-600 dark:text-orange-400',
          bg: 'bg-orange-100 dark:bg-orange-900/30'
        };
      case TRANSACTION_TYPES.PAYMENT:
        return { 
          label: 'Payment', 
          icon: Repeat, 
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-100 dark:bg-green-900/30'
        };
      case TRANSACTION_TYPES.OTHER_CREDIT:
        return { 
          label: 'Other Credit', 
          icon: Gift, 
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-100 dark:bg-blue-900/30'
        };
      default:
        return { 
          label: 'Purchase', 
          icon: ShoppingBag, 
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-100 dark:bg-red-900/30'
        };
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Merchant', 'Category', 'Amount', 'Type', 'Transaction Type'];
    const csvData = filteredTransactions.map(t => {
      const typeInfo = getTransactionTypeInfo(t);
      const isCredit = t.type === 'credit' || t.amount < 0;
      return [
        t.date,
        t.description,
        t.merchant,
        t.category,
        t.amount,
        isCredit ? 'CR' : 'DR',
        typeInfo.label
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-lg shadow-sm ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Transactions
          </h2>
          
          <div className="flex space-x-2">
            <button
              onClick={exportCSV}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                isDark 
                  ? 'bg-gray-700 text-white hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Download size={18} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`} size={18} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isDark 
                  ? 'bg-gray-700 text-white border-gray-600' 
                  : 'bg-gray-50 text-gray-800 border-gray-300'
              }`}
            />
          </div>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isDark 
                ? 'bg-gray-700 text-white border-gray-600' 
                : 'bg-gray-50 text-gray-800 border-gray-300'
            }`}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isDark 
                ? 'bg-gray-700 text-white border-gray-600' 
                : 'bg-gray-50 text-gray-800 border-gray-300'
            }`}
          >
            <option value="all">All Types</option>
            <option value="debit">DR (Debit)</option>
            <option value="credit">CR (Credit)</option>
            <option value="purchase">🛍️ Purchases</option>
            <option value="payment">🔄 Payments</option>
            <option value="other_credit">🎁 Other Credits</option>
            <option value="emi">📅 EMI</option>
          </select>
        </div>

        {/* Transaction Count */}
        <div className={`mb-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Showing {filteredTransactions.length} transactions
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className={`text-left py-3 px-4 text-sm font-medium ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>Date</th>
                <th className={`text-left py-3 px-4 text-sm font-medium ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>Description</th>
                <th className={`text-left py-3 px-4 text-sm font-medium ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>Category</th>
                <th className={`text-left py-3 px-4 text-sm font-medium ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>Type</th>
                <th className={`text-right py-3 px-4 text-sm font-medium ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>Amount</th>
                <th className={`text-center py-3 px-4 text-sm font-medium ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>CR/DR</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((t, index) => {
                const isCredit = t.type === 'credit' || t.amount < 0;
                const typeInfo = getTransactionTypeInfo(t);
                const Icon = typeInfo.icon;
                
                return (
                  <tr
                    key={index}
                    className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}
                  >
                    <td className={`py-3 px-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {formatDate(t.date)}
                    </td>
                    <td className={`py-3 px-4 text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      <div className="flex items-center space-x-2">
                        <Icon size={14} className={typeInfo.color} />
                        <span>{t.description}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm px-2 py-1 rounded ${
                        isDark 
                          ? 'bg-gray-700 text-gray-300' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {t.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${typeInfo.bg} ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-sm font-medium text-right ${
                      isCredit 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatCurrency(Math.abs(t.amount))}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                        isCredit
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {isCredit ? (
                          <ArrowUpCircle size={14} />
                        ) : (
                          <ArrowDownCircle size={14} />
                        )}
                        <span>{isCredit ? 'CR' : 'DR'}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of{' '}
              {filteredTransactions.length} transactions
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg ${
                  isDark 
                    ? 'bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                }`}
              >
                <ChevronLeft size={18} />
              </button>
              <span className={`px-4 py-2 rounded-lg ${
                isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'
              }`}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg ${
                  isDark 
                    ? 'bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                }`}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;