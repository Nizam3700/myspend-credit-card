import React, { useMemo, useState } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Wallet, 
  CreditCard, ArrowUpCircle, ArrowDownCircle,
  Calendar, ShoppingBag, Repeat, Gift, CalendarDays
} from 'lucide-react';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF9FF3', '#54A0FF'];

const Dashboard = ({ transactions, currentMonth, onMonthChange, isDark }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Filter transactions for current month
  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = new Date(t.date);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return month === currentMonth;
    });
  }, [transactions, currentMonth]);

  // Categorize transactions into Purchases, Payments, Other Credits, EMI
  const categorizedTransactions = useMemo(() => {
    let purchases = [];
    let payments = [];
    let otherCredits = [];
    let emiTransactions = [];

    monthlyTransactions.forEach(t => {
      const desc = t.description.toLowerCase();
      const isCredit = t.type === 'credit';
      const absAmount = t.amount;

      // Check for EMI
      if (desc.includes('emi') || desc.includes('convert') || desc.includes('instalment') ||
          t.category === 'EMI') {
        emiTransactions.push({ ...t, absAmount });
        return;
      }

      // Check for Payment (when you pay your credit card bill)
      if (isCredit && (desc.includes('payment') || desc.includes('ccbill') || 
          desc.includes('credit card payment') || desc.includes('card payment'))) {
        payments.push({ ...t, absAmount });
        return;
      }

      // Check for Other Credits (refunds, cashback, rewards, reversals)
      if (isCredit) {
        otherCredits.push({ ...t, absAmount });
        return;
      }

      // Regular Purchase (Debit)
      if (!isCredit) {
        purchases.push({ ...t, absAmount });
      }
    });

    return { purchases, payments, otherCredits, emiTransactions };
  }, [monthlyTransactions]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalPurchases = categorizedTransactions.purchases.reduce((sum, t) => sum + t.absAmount, 0);
    const totalPayments = categorizedTransactions.payments.reduce((sum, t) => sum + t.absAmount, 0);
    const totalOtherCredits = categorizedTransactions.otherCredits.reduce((sum, t) => sum + t.absAmount, 0);
    const totalEMI = categorizedTransactions.emiTransactions.reduce((sum, t) => sum + t.absAmount, 0);
    
    const totalDebit = totalPurchases + totalEMI;
    const totalCredit = totalPayments + totalOtherCredits;
    const netAmount = totalCredit - totalDebit;

    return {
      totalPurchases,
      totalPayments,
      totalOtherCredits,
      totalEMI,
      totalDebit,
      totalCredit,
      netAmount
    };
  }, [categorizedTransactions]);

  // Category totals (only for purchases + EMI)
  const categoryData = useMemo(() => {
    const categories = {};
    
    // Add purchases
    categorizedTransactions.purchases.forEach(t => {
      if (!categories[t.category]) {
        categories[t.category] = 0;
      }
      categories[t.category] += t.absAmount;
    });
    
    // Add EMI as a separate category
    if (categorizedTransactions.emiTransactions.length > 0) {
      categories['EMI'] = categorizedTransactions.emiTransactions.reduce((sum, t) => sum + t.absAmount, 0);
    }
    
    const total = Object.values(categories).reduce((sum, val) => sum + val, 0);
    
    return Object.entries(categories)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? ((amount / total) * 100).toFixed(1) : 0,
        // Add display label with amount
        displayLabel: `${category} (₹${amount.toLocaleString()})`
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categorizedTransactions]);

  // Daily trend with credit and debit
  const dailyTrend = useMemo(() => {
    const days = {};
    monthlyTransactions.forEach(t => {
      const day = t.date;
      const amount = t.type === 'credit' ? t.amount : -t.amount;
      if (!days[day]) days[day] = { date: day, debit: 0, credit: 0 };
      if (t.type === 'credit') {
        days[day].credit += Math.abs(t.amount);
      } else {
        days[day].debit += Math.abs(t.amount);
      }
    });
    
    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  }, [monthlyTransactions]);

  // Get available months
  const availableMonths = useMemo(() => {
    const months = new Set();
    transactions.forEach(t => {
      const date = new Date(t.date);
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort();
  }, [transactions]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Custom Tooltip for Pie Chart - Shows amount
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-3 rounded-lg shadow-lg border ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {data.category}
          </p>
          <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {formatCurrency(data.amount)}
          </p>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {data.percentage}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom Legend for Pie Chart - Shows amount
  const CustomPieLegend = ({ payload }) => {
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {payload.map((entry, index) => (
          <div 
            key={`legend-${index}`}
            className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isDark ? 'bg-gray-700' : 'bg-gray-100'
            }`}
            onClick={() => setSelectedCategory(
              selectedCategory === entry.payload.category ? null : entry.payload.category
            )}
            style={{ cursor: 'pointer' }}
          >
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
              {entry.payload.category}
            </span>
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatCurrency(entry.payload.amount)}
            </span>
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              ({entry.payload.percentage}%)
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (transactions.length === 0) {
    return (
      <div className={`p-8 rounded-lg text-center ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        <Wallet className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
          No Data Found
        </h3>
        <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Upload your first statement to see your dashboard
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className={`flex items-center justify-between p-4 rounded-lg shadow-sm ${
        isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
      }`}>
        <div className="flex items-center space-x-4">
          <Calendar className={isDark ? 'text-gray-400' : 'text-gray-500'} size={20} />
          <select 
            value={currentMonth} 
            onChange={(e) => onMonthChange(e.target.value)}
            className={`px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isDark 
                ? 'bg-gray-700 text-white border-gray-600' 
                : 'bg-white text-gray-800 border-gray-300'
            }`}
          >
            {availableMonths.map(month => (
              <option key={month} value={month}>
                {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>
        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {monthlyTransactions.length} transactions
        </div>
      </div>

      {/* Summary Cards - Categorized */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Purchases Card */}
        <div className={`p-6 rounded-lg shadow-sm border-l-4 border-red-500 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Purchases (DR)</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(totals.totalPurchases)}
              </div>
              <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {categorizedTransactions.purchases.length} transactions
              </div>
            </div>
            <ShoppingBag className="text-red-500" size={32} />
          </div>
        </div>

        {/* EMI Card */}
        {totals.totalEMI > 0 && (
          <div className={`p-6 rounded-lg shadow-sm border-l-4 border-orange-500 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>EMI (DR)</div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(totals.totalEMI)}
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {categorizedTransactions.emiTransactions.length} transactions
                </div>
              </div>
              <CalendarDays className="text-orange-500" size={32} />
            </div>
          </div>
        )}

        {/* Payments Card */}
        {totals.totalPayments > 0 && (
          <div className={`p-6 rounded-lg shadow-sm border-l-4 border-green-500 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Payments (CR)</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(totals.totalPayments)}
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {categorizedTransactions.payments.length} transactions
                </div>
              </div>
              <Repeat className="text-green-500" size={32} />
            </div>
          </div>
        )}

        {/* Other Credits Card */}
        {totals.totalOtherCredits > 0 && (
          <div className={`p-6 rounded-lg shadow-sm border-l-4 border-blue-500 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Other Credits (CR)</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(totals.totalOtherCredits)}
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {categorizedTransactions.otherCredits.length} transactions
                </div>
              </div>
              <Gift className="text-blue-500" size={32} />
            </div>
          </div>
        )}

        {/* Net Balance Card */}
        <div className={`p-6 rounded-lg shadow-sm border-l-4 ${
          totals.netAmount >= 0 ? 'border-blue-500' : 'border-orange-500'
        } ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Net Balance</div>
              <div className={`text-2xl font-bold ${
                totals.netAmount >= 0 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-orange-600 dark:text-orange-400'
              }`}>
                {formatCurrency(totals.netAmount)}
              </div>
              <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {totals.netAmount >= 0 ? 'Positive balance' : 'Amount due'}
              </div>
            </div>
            <Wallet className={totals.netAmount >= 0 ? 'text-blue-500' : 'text-orange-500'} size={32} />
          </div>
        </div>
      </div>

      {/* Transaction Summary */}
      <div className={`p-6 rounded-lg shadow-sm ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
          Transaction Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Debit (DR)</div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totals.totalDebit)}
            </div>
          </div>
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Credit (CR)</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totals.totalCredit)}
            </div>
          </div>
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>EMI Total</div>
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(totals.totalEMI)}
            </div>
          </div>
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Avg per Purchase</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {categorizedTransactions.purchases.length > 0 
                ? formatCurrency(totals.totalPurchases / categorizedTransactions.purchases.length)
                : formatCurrency(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Spending by Category WITH AMOUNTS */}
        <div className={`p-6 rounded-lg shadow-sm ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Spending by Category
          </h3>
          {categoryData.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="amount"
                    nameKey="category"
                    onClick={(data) => setSelectedCategory(
                      selectedCategory === data.category ? null : data.category
                    )}
                    className="cursor-pointer"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legend with Amounts */}
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {categoryData.map((item, index) => (
                  <div 
                    key={index}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs cursor-pointer transition-all ${
                      selectedCategory === item.category
                        ? isDark ? 'bg-blue-900/50 border border-blue-500' : 'bg-blue-100 border border-blue-500'
                        : isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    onClick={() => setSelectedCategory(
                      selectedCategory === item.category ? null : item.category
                    )}
                  >
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      {item.category}
                    </span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(item.amount)}
                    </span>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                      ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">No spending data</div>
          )}
        </div>

        {/* Bar Chart - Daily Trend with CR/DR */}
        <div className={`p-6 rounded-lg shadow-sm ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Daily Trend (CR vs DR)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyTrend}>
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
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDark ? '#1F2937' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  color: isDark ? 'white' : 'black'
                }}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="debit" name="DR (Spending)" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="credit" name="CR (Credits)" fill="#22C55E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown List with Amount Display */}
      <div className={`p-6 rounded-lg shadow-sm ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
          Category Breakdown
        </h3>
        <div className="space-y-2">
          {categoryData.map((item, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                selectedCategory === item.category 
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500' 
                  : isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedCategory(
                selectedCategory === item.category ? null : item.category
              )}
            >
              <div className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div>
                  <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {item.category}
                    {item.category === 'EMI' && (
                      <span className="ml-2 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full">
                        Converted
                      </span>
                    )}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {item.percentage}% of total
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {formatCurrency(item.amount)}
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {item.category === 'EMI' ? 'EMI' : 'DR'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;