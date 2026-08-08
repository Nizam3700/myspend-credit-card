import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Upload as UploadIcon, 
  Tags, 
  Receipt, 
  Calendar,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  GitCompare,
  Smartphone,
  Phone
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import Categories from './components/Categories';
import Transactions from './components/Transactions';
import DailyTransactions from './components/DailyTransactions';
import Compare from './components/Compare';
import BHIM from './components/BHIM';
import PhonePe from './components/PhonePe';
import { saveToIndexedDB, loadFromIndexedDB } from './utils/storage';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentMonth, setCurrentMonth] = useState('2026-08');
  const [isLoading, setIsLoading] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    loadFromIndexedDB()
      .then(data => {
        if (data && data.length > 0) {
          console.log('📊 Loaded data from IndexedDB:', data.length);
          setTransactions(data);
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error loading data:', error);
        setIsLoading(false);
      });

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDark(false);
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleUpload = (newTransactions) => {
    console.log('📥 Upload received:', newTransactions.length, 'transactions');
    const updated = [...transactions, ...newTransactions];
    setTransactions(updated);
    saveToIndexedDB(updated)
      .then(() => {
        console.log('💾 Data saved to IndexedDB successfully');
        setCurrentPage('dashboard');
      })
      .catch(error => {
        console.error('❌ Error saving to IndexedDB:', error);
      });
  };

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload', icon: UploadIcon },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'daily', label: 'Daily', icon: Calendar },
    { id: 'compare', label: 'Compare', icon: GitCompare },
    { id: 'bhim', label: 'BHIM', icon: Smartphone },
    { id: 'phonepe', label: 'PhonePe', icon: Phone },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard 
            transactions={transactions} 
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            isDark={isDark}
          />
        );
      case 'upload':
        return <Upload onUpload={handleUpload} isDark={isDark} />;
      case 'categories':
        return <Categories transactions={transactions} isDark={isDark} />;
      case 'transactions':
        return <Transactions transactions={transactions} isDark={isDark} />;
      case 'daily':
        return <DailyTransactions transactions={transactions} isDark={isDark} />;
      case 'compare':
        return <Compare transactions={transactions} isDark={isDark} />;
      case 'bhim':
        return <BHIM transactions={transactions} isDark={isDark} />;
      case 'phonepe':
        return <PhonePe transactions={transactions} isDark={isDark} />;
      default:
        return (
          <Dashboard 
            transactions={transactions} 
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            isDark={isDark}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-screen ${isDark ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full transition-all duration-300 z-50 ${
        isSidebarOpen ? 'w-64' : 'w-20'
      } ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r`}>
        
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <CreditCard className={`w-8 h-8 text-blue-500 ${!isSidebarOpen && 'mx-auto'}`} />
          {isSidebarOpen && (
            <span className="ml-3 text-xl font-bold text-gray-800 dark:text-white">MySpend</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-2 overflow-y-auto h-[calc(100vh-180px)]">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center px-3 py-3 rounded-lg transition-colors mb-1 ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : isDark 
                      ? 'text-gray-300 hover:bg-gray-700' 
                      : 'text-gray-700 hover:bg-gray-100'
                } ${!isSidebarOpen && 'justify-center'}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                {isSidebarOpen && (
                  <span className="ml-3 text-sm font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setIsDark(!isDark)}
            className={`w-full flex items-center px-3 py-3 rounded-lg transition-colors ${
              isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
            } ${!isSidebarOpen && 'justify-center'}`}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {isSidebarOpen && (
              <span className="ml-3 text-sm font-medium">
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`w-full flex items-center justify-center px-3 py-2 mt-2 rounded-lg transition-colors ${
              isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <div className="p-6">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default App;