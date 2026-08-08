import React, { useMemo, useState } from 'react';

const MonthlyView = ({ transactions }) => {
  const [selectedMonth, setSelectedMonth] = useState(null);
  
  // Group transactions by month
  const monthlyData = useMemo(() => {
    const groups = {};
    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[monthKey]) {
        groups[monthKey] = { total: 0, count: 0, transactions: [] };
      }
      groups[monthKey].total += t.amount;
      groups[monthKey].count += 1;
      groups[monthKey].transactions.push(t);
    });
    return groups;
  }, [transactions]);

  // Sort months descending
  const sortedMonths = useMemo(() => {
    return Object.entries(monthlyData)
      .sort((a, b) => b[0].localeCompare(a[0]));
  }, [monthlyData]);

  return (
    <div className="space-y-3">
      {sortedMonths.map(([monthKey, data]) => {
        const date = new Date(monthKey + '-01');
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const isExpanded = selectedMonth === monthKey;
        
        return (
          <div key={monthKey} className="border rounded-lg overflow-hidden">
            <div
              className={`flex justify-between items-center p-4 cursor-pointer transition-colors ${
                isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedMonth(isExpanded ? null : monthKey)}
            >
              <div>
                <div className="font-semibold">{monthName}</div>
                <div className="text-sm text-gray-500">{data.count} transactions</div>
              </div>
              <div className="text-right">
                <div className="font-bold">₹{data.total.toLocaleString()}</div>
                <div className="text-sm text-gray-500">
                  {data.total > 40000 ? '🔴 High' : data.total > 25000 ? '🟡 Medium' : '🟢 Low'}
                </div>
              </div>
            </div>
            
            {isExpanded && (
              <div className="p-4 bg-gray-50 border-t">
                <div className="space-y-2">
                  {data.transactions.slice(0, 10).map((t, idx) => (
                    <div key={idx} className="flex justify-between text-sm p-2 bg-white rounded">
                      <span>{new Date(t.date).toLocaleDateString()}</span>
                      <span className="text-gray-600">{t.description.slice(0, 30)}</span>
                      <span className="font-medium">₹{t.amount}</span>
                    </div>
                  ))}
                  {data.transactions.length > 10 && (
                    <div className="text-sm text-gray-500 text-center">
                      + {data.transactions.length - 10} more transactions
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MonthlyView;