import React, { useMemo, useState } from 'react';
import { 
  Calendar, ChevronLeft, ChevronRight, 
  ArrowUpCircle, ArrowDownCircle, Search,
  BarChart3, CheckSquare, Square, Calculator,
  Trash2, Download, Copy, Filter, X
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts';

const DailyTransactions = ({ transactions, isDark }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'list'
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Date filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Get all unique categories for filter
  const allCategories = useMemo(() => {
    const cats = new Set();
    transactions.forEach(t => cats.add(t.category));
    return ['all', ...Array.from(cats)];
  }, [transactions]);

  // Filter transactions by date range and other filters
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    
    // Date range filter
    if (startDate) {
      filtered = filtered.filter(t => t.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(t => t.date <= endDate);
    }
    
    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }
    
    // Type filter
    if (filterType === 'credit') {
      filtered = filtered.filter(t => t.type === 'credit');
    } else if (filterType === 'debit') {
      filtered = filtered.filter(t => t.type !== 'credit');
    }
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [transactions, startDate, endDate, filterCategory, filterType, searchTerm]);

  // Group transactions by date
  const dailyData = useMemo(() => {
    const grouped = {};
    filteredTransactions.forEach(t => {
      if (!grouped[t.date]) {
        grouped[t.date] = {
          date: t.date,
          transactions: [],
          totalDebit: 0,
          totalCredit: 0,
          net: 0,
          count: 0
        };
      }
      const day = grouped[t.date];
      day.transactions.push(t);
      day.count += 1;
      if (t.type === 'credit') {
        day.totalCredit += t.amount;
      } else {
        day.totalDebit += t.amount;
      }
      day.net = day.totalCredit - day.totalDebit;
    });
    
    return Object.values(grouped)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredTransactions]);

  // Chart data
  const chartData = useMemo(() => {
    return [...dailyData]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(day => ({
        date: new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        fullDate: day.date,
        debit: day.totalDebit,
        credit: day.totalCredit,
        net: day.net,
        count: day.count
      }));
  }, [dailyData]);

  // Get selected transactions
  const getSelectedTransactions = () => {
    const selected = [];
    dailyData.forEach(day => {
      day.transactions.forEach(t => {
        const key = `${t.date}-${t.description}-${t.amount}`;
        if (selectedTransactions.has(key)) {
          selected.push(t);
        }
      });
    });
    return selected;
  };

  // Calculate selected totals
  const selectedTotals = useMemo(() => {
    const selected = getSelectedTransactions();
    let totalDebit = 0;
    let totalCredit = 0;
    selected.forEach(t => {
      if (t.type === 'credit') {
        totalCredit += t.amount;
      } else {
        totalDebit += t.amount;
      }
    });
    return { totalDebit, totalCredit, net: totalCredit - totalDebit, count: selected.length };
  }, [selectedTransactions, dailyData]);

  // Toggle transaction selection
  const toggleTransaction = (t) => {
    const key = `${t.date}-${t.description}-${t.amount}`;
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedTransactions(newSelected);
    setSelectAll(false);
  };

  // Toggle select all for a day
  const toggleSelectAllDay = (day) => {
    const allKeys = day.transactions.map(t => `${t.date}-${t.description}-${t.amount}`);
    const selected = new Set(selectedTransactions);
    const allSelected = allKeys.every(key => selected.has(key));
    
    if (allSelected) {
      allKeys.forEach(key => selected.delete(key));
    } else {
      allKeys.forEach(key => selected.add(key));
    }
    setSelectedTransactions(selected);
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedTransactions(new Set());
    setSelectAll(false);
  };

  // Copy selected to clipboard
  const copySelected = () => {
    const selected = getSelectedTransactions();
    if (selected.length === 0) return;
    
    const text = selected.map(t => 
      `${t.date} | ${t.description} | ${t.amount} | ${t.type.toUpperCase()}`
    ).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      alert(`✅ Copied ${selected.length} transactions to clipboard!`);
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilterCategory('all');
    setFilterType('all');
    setSearchTerm('');
  };

  // Check if any filter is active
  const hasActiveFilters = startDate || endDate || filterCategory !== 'all' || filterType !== 'all' || searchTerm;

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
      weekday: 'short',
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatDateForInput = (dateStr) => {
    return dateStr; // Already in YYYY-MM-DD format
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-4 rounded-lg shadow-lg border ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {formatDateDisplay(data.fullDate)}
          </p>
          <p className="text-red-600 dark:text-red-400">
            DR: {formatCurrency(data.debit)}
          </p>
          <p className="text-green-600 dark:text-green-400">
            CR: {formatCurrency(data.credit)}
          </p>
          <p className={`font-medium ${data.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Net: {formatCurrency(Math.abs(data.net))} {data.net >= 0 ? 'CR' : 'DR'}
          </p>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {data.count} transactions
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-lg shadow-sm ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Daily Transactions
          </h2>
          
          <div className="flex items-center space-x-4">
            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-2 text-sm ${
                hasActiveFilters
                  ? 'bg-blue-600 text-white'
                  : isDark 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter size={16} />
              <span>Filter</span>
              {hasActiveFilters && (
                <span className="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {startDate || endDate ? '📅' : ''}
                  {filterCategory !== 'all' ? '🏷️' : ''}
                  {filterType !== 'all' ? '📊' : ''}
                  {searchTerm ? '🔍' : ''}
                </span>
              )}
            </button>

            {/* View toggle */}
            <div className={`flex rounded-lg overflow-hidden border ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1.5 text-sm flex items-center space-x-1 ${
                  viewMode === 'chart'
                    ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                    : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                }`}
              >
                <BarChart3 size={16} />
                <span>Chart</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm ${
                  viewMode === 'list'
                    ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                    : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                }`}
              >
                List
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`} size={18} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-40 pl-10 pr-4 py-1.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                  isDark 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-gray-50 text-gray-800 border-gray-300'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilter && (
          <div className={`p-4 rounded-lg mb-6 border ${
            isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                🔍 Filters
              </h3>
              <button
                onClick={clearFilters}
                className={`text-sm flex items-center space-x-1 ${
                  isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <X size={14} />
                <span>Clear All</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDark 
                      ? 'bg-gray-600 text-white border-gray-500' 
                      : 'bg-white text-gray-800 border-gray-300'
                  }`}
                />
              </div>
              
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDark 
                      ? 'bg-gray-600 text-white border-gray-500' 
                      : 'bg-white text-gray-800 border-gray-300'
                  }`}
                />
              </div>
              
              {/* Category Filter */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDark 
                      ? 'bg-gray-600 text-white border-gray-500' 
                      : 'bg-white text-gray-800 border-gray-300'
                  }`}
                >
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Type Filter */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Transaction Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDark 
                      ? 'bg-gray-600 text-white border-gray-500' 
                      : 'bg-white text-gray-800 border-gray-300'
                  }`}
                >
                  <option value="all">All Types</option>
                  <option value="debit">DR (Debit)</option>
                  <option value="credit">CR (Credit)</option>
                </select>
              </div>
            </div>
            
            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className="mt-3 flex flex-wrap gap-2">
                {startDate && (
                  <span className={`text-xs px-2 py-1 rounded flex items-center space-x-1 ${
                    isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`}>
                    <span>📅 From: {formatDateDisplay(startDate)}</span>
                    <button onClick={() => setStartDate('')} className="hover:text-red-500">
                      <X size={12} />
                    </button>
                  </span>
                )}
                {endDate && (
                  <span className={`text-xs px-2 py-1 rounded flex items-center space-x-1 ${
                    isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`}>
                    <span>📅 To: {formatDateDisplay(endDate)}</span>
                    <button onClick={() => setEndDate('')} className="hover:text-red-500">
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filterCategory !== 'all' && (
                  <span className={`text-xs px-2 py-1 rounded flex items-center space-x-1 ${
                    isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`}>
                    <span>🏷️ {filterCategory}</span>
                    <button onClick={() => setFilterCategory('all')} className="hover:text-red-500">
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filterType !== 'all' && (
                  <span className={`text-xs px-2 py-1 rounded flex items-center space-x-1 ${
                    isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`}>
                    <span>📊 {filterType.toUpperCase()}</span>
                    <button onClick={() => setFilterType('all')} className="hover:text-red-500">
                      <X size={12} />
                    </button>
                  </span>
                )}
                {searchTerm && (
                  <span className={`text-xs px-2 py-1 rounded flex items-center space-x-1 ${
                    isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`}>
                    <span>🔍 {searchTerm}</span>
                    <button onClick={() => setSearchTerm('')} className="hover:text-red-500">
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Chart View */}
        {viewMode === 'chart' && chartData.length > 0 && (
          <div className="mb-6">
            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Daily CR vs DR Trend
                  {hasActiveFilters && (
                    <span className="ml-2 text-xs text-blue-500">
                      (Filtered)
                    </span>
                  )}
                </h3>
                <div className="flex items-center space-x-4 text-xs">
                  <span className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>DR</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>CR</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <div className="w-3 h-0.5 bg-blue-500"></div>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Net</span>
                  </span>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
                  <XAxis 
                    dataKey="date" 
                    stroke={isDark ? '#9CA3AF' : '#6B7280'}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    stroke={isDark ? '#9CA3AF' : '#6B7280'}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="debit" name="DR" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="credit" name="CR" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  <Line 
                    type="monotone" 
                    dataKey="net" 
                    name="Net" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Selection Summary Bar */}
        {selectedTransactions.size > 0 && (
          <div className={`p-4 rounded-lg mb-4 border-2 border-blue-500 ${
            isDark ? 'bg-blue-900/20' : 'bg-blue-50'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <Calculator className="text-blue-500" size={20} />
                <div>
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    Selected: {selectedTotals.count} transactions
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  DR: <span className="text-red-600 dark:text-red-400 font-medium">
                    {formatCurrency(selectedTotals.totalDebit)}
                  </span>
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  CR: <span className="text-green-600 dark:text-green-400 font-medium">
                    {formatCurrency(selectedTotals.totalCredit)}
                  </span>
                </div>
                <div className={`text-sm font-medium ${
                  selectedTotals.net >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  Net: {formatCurrency(Math.abs(selectedTotals.net))} {selectedTotals.net >= 0 ? 'CR' : 'DR'}
                </div>
                <button
                  onClick={copySelected}
                  className={`px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1 ${
                    isDark 
                      ? 'bg-gray-700 text-white hover:bg-gray-600' 
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Copy size={14} />
                  <span>Copy</span>
                </button>
                <button
                  onClick={clearSelections}
                  className={`px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1 ${
                    isDark 
                      ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' 
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                >
                  <Trash2 size={14} />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        {dailyData.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Days</div>
              <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {dailyData.length}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total DR</div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatCurrency(dailyData.reduce((sum, d) => sum + d.totalDebit, 0))}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total CR</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(dailyData.reduce((sum, d) => sum + d.totalCredit, 0))}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Transactions</div>
              <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {filteredTransactions.length}
              </div>
            </div>
          </div>
        )}

        {/* List View with Selection */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {dailyData.length === 0 ? (
              <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {hasActiveFilters ? 'No transactions match your filters' : 'No transactions found'}
              </div>
            ) : (
              dailyData.map((day, index) => {
                const isExpanded = selectedDate === day.date;
                const dayTransactions = day.transactions;
                const totalDebit = dayTransactions.filter(t => t.type !== 'credit').reduce((sum, t) => sum + t.amount, 0);
                const totalCredit = dayTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
                
                const allDayKeys = dayTransactions.map(t => `${t.date}-${t.description}-${t.amount}`);
                const allSelected = allDayKeys.every(key => selectedTransactions.has(key));
                const someSelected = allDayKeys.some(key => selectedTransactions.has(key));
                
                return (
                  <div
                    key={index}
                    className={`rounded-lg border overflow-hidden ${
                      isDark ? 'border-gray-700' : 'border-gray-200'
                    }`}
                  >
                    {/* Day Header */}
                    <div
                      className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                        isExpanded 
                          ? isDark ? 'bg-gray-700' : 'bg-gray-100'
                          : isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedDate(isExpanded ? null : day.date)}
                    >
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectAllDay(day);
                          }}
                          className={`p-1 rounded ${
                            allSelected 
                              ? 'text-blue-500' 
                              : someSelected 
                                ? 'text-blue-300' 
                                : isDark ? 'text-gray-500' : 'text-gray-400'
                          }`}
                        >
                          {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                        
                        <Calendar className={isDark ? 'text-gray-400' : 'text-gray-500'} size={20} />
                        <div>
                          <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            {formatDateDisplay(day.date)}
                          </div>
                          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {day.transactions.length} transactions
                            {someSelected && !allSelected && ` (${allDayKeys.filter(k => selectedTransactions.has(k)).length} selected)`}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          {totalDebit > 0 && (
                            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              DR: <span className="text-red-600 dark:text-red-400 font-medium">
                                {formatCurrency(totalDebit)}
                              </span>
                            </div>
                          )}
                          {totalCredit > 0 && (
                            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              CR: <span className="text-green-600 dark:text-green-400 font-medium">
                                {formatCurrency(totalCredit)}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className={`text-sm font-semibold ${
                          day.net >= 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(Math.abs(day.net))}
                          <span className="text-xs ml-1">
                            {day.net >= 0 ? 'CR' : 'DR'}
                          </span>
                        </div>
                        
                        <ChevronRight 
                          className={`transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          } ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                          size={20}
                        />
                      </div>
                    </div>

                    {/* Transactions List with Checkboxes */}
                    {isExpanded && (
                      <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="space-y-2">
                          {dayTransactions.map((t, idx) => {
                            const isCredit = t.type === 'credit';
                            const key = `${t.date}-${t.description}-${t.amount}`;
                            const isSelected = selectedTransactions.has(key);
                            
                            return (
                              <div
                                key={idx}
                                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                                  isSelected 
                                    ? isDark ? 'bg-blue-900/30 border border-blue-500' : 'bg-blue-50 border border-blue-500'
                                    : isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                                }`}
                              >
                                <div className="flex items-center space-x-3 flex-1">
                                  <button
                                    onClick={() => toggleTransaction(t)}
                                    className={`p-1 rounded ${
                                      isSelected 
                                        ? 'text-blue-500' 
                                        : isDark ? 'text-gray-500' : 'text-gray-400'
                                    }`}
                                  >
                                    {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                  </button>
                                  
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
                                      <span className={`text-xs px-2 py-0.5 rounded ${
                                        isCredit
                                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      }`}>
                                        {isCredit ? 'CR' : 'DR'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className={`text-right font-medium ${
                                  isCredit
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {formatCurrency(t.amount)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyTransactions;