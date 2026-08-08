import React, { useMemo } from 'react';
import { Tags, TrendingUp, TrendingDown, ShoppingBag, Repeat, Gift, CalendarDays } from 'lucide-react';

const CATEGORY_ICONS = {
  'Fuel': '⛽',
  'Grocery': '🛒',
  'Food & Restaurant': '🍔',
  'Shopping': '🛍️',
  'Telecom': '📱',
  'Transport': '🚗',
  'Healthcare': '🏥',
  'Education': '📚',
  'EMI': '📅',
  'Payment': '🔄',
  'Other Credit': '🎁',
  'Other': '📦'
};

const Categories = ({ transactions, isDark }) => {
  const categoryStats = useMemo(() => {
    const stats = {};
    transactions.forEach(t => {
      const isCredit = t.type === 'credit';
      const absAmount = t.amount;
      
      if (!stats[t.category]) {
        stats[t.category] = { 
          total: 0, 
          count: 0, 
          credit: 0, 
          debit: 0,
          purchases: 0,
          payments: 0,
          otherCredits: 0,
          emi: 0
        };
      }
      
      const stat = stats[t.category];
      stat.total += isCredit ? absAmount : -absAmount;
      stat.count += 1;
      
      if (isCredit) {
        stat.credit += absAmount;
        if (t.category === 'Payment') {
          stat.payments += absAmount;
        } else {
          stat.otherCredits += absAmount;
        }
      } else {
        stat.debit += absAmount;
        if (t.category === 'EMI') {
          stat.emi += absAmount;
        } else {
          stat.purchases += absAmount;
        }
      }
    });
    
    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        ...data,
        icon: CATEGORY_ICONS[name] || '📊',
        average: Math.abs(data.total) / data.count,
        isCredit: data.total < 0,
        absTotal: Math.abs(data.total)
      }))
      .sort((a, b) => b.absTotal - a.absTotal);
  }, [transactions]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-lg shadow-sm ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Categories
          </h2>
          <Tags className={isDark ? 'text-gray-400' : 'text-gray-500'} size={24} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryStats.map((category) => (
            <div
              key={category.name}
              className={`p-4 rounded-lg border ${
                isDark 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{category.icon}</span>
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {category.name}
                  </span>
                </div>
                <span className={`text-sm px-2 py-1 rounded ${
                  category.isCredit 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {category.isCredit ? 'CR' : 'DR'}
                </span>
              </div>
              
              <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {formatCurrency(category.absTotal)}
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                {category.purchases > 0 && (
                  <div className={`p-2 rounded ${isDark ? 'bg-gray-600' : 'bg-white'}`}>
                    <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Purchases</div>
                    <div className="font-medium text-red-600 dark:text-red-400">
                      {formatCurrency(category.purchases)}
                    </div>
                  </div>
                )}
                {category.emi > 0 && (
                  <div className={`p-2 rounded ${isDark ? 'bg-gray-600' : 'bg-white'}`}>
                    <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>EMI</div>
                    <div className="font-medium text-orange-600 dark:text-orange-400">
                      {formatCurrency(category.emi)}
                    </div>
                  </div>
                )}
                {category.payments > 0 && (
                  <div className={`p-2 rounded ${isDark ? 'bg-gray-600' : 'bg-white'}`}>
                    <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Payments</div>
                    <div className="font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(category.payments)}
                    </div>
                  </div>
                )}
                {category.otherCredits > 0 && (
                  <div className={`p-2 rounded ${isDark ? 'bg-gray-600' : 'bg-white'}`}>
                    <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Other Credits</div>
                    <div className="font-medium text-blue-600 dark:text-blue-400">
                      {formatCurrency(category.otherCredits)}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between mt-2 text-sm">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  {category.count} transactions
                </span>
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  Avg: {formatCurrency(category.average)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Categories;