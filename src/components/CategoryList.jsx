import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const CATEGORY_ICONS = {
  'Fuel': '⛽',
  'Grocery': '🛒',
  'Food & Restaurant': '🍔',
  'Shopping': '🛍️',
  'Bills': '📄',
  'Other': '📦'
};

const CategoryList = ({ data, selectedCategory, onCategoryClick }) => {
  // Sort by amount descending
  const sortedData = [...data].sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-2">
      {sortedData.map((item, index) => {
        const isSelected = selectedCategory === item.category;
        const icon = CATEGORY_ICONS[item.category] || '📊';
        
        return (
          <div
            key={index}
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
              isSelected 
                ? 'bg-blue-50 border-2 border-blue-500' 
                : 'hover:bg-gray-50 border-2 border-transparent'
            }`}
            onClick={() => onCategoryClick(item.category)}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <div className="font-medium text-gray-800">{item.category}</div>
                <div className="text-sm text-gray-500">{item.percentage}% of total</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-gray-800">₹{item.amount.toLocaleString()}</div>
              <div className="text-sm text-gray-500">
                {item.amount > 5000 ? '🔴 High' : '🟢 Normal'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryList;