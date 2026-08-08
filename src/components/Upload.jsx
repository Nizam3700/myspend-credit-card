import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, FileText, AlertCircle, CheckCircle, X, 
  Lock, Unlock, Eye, EyeOff, CreditCard, Smartphone, Phone
} from 'lucide-react';
import { parseCSV } from '../utils/csvParser';
import { parsePDF, checkPDFPassword } from '../utils/pdfParser';
import { categorizeTransaction } from '../utils/categoryMatcher';

const Uploaded = ({ onUpload, isDark }) => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [selectedBank, setSelectedBank] = useState('auto');
  const [selectedType, setSelectedType] = useState('kotak'); // 'kotak', 'bhim', 'phonepe'
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordIncorrect, setIsPasswordIncorrect] = useState(false);

  const STATEMENT_TYPES = {
    kotak: { label: 'Kotak Credit Card', icon: CreditCard, color: 'blue' },
    bhim: { label: 'BHIM UPI Statement', icon: Smartphone, color: 'green' },
    phonepe: { label: 'PhonePe Statement', icon: Phone, color: 'purple' },
  };

  const BANK_FORMATS = {
    auto: 'Auto Detect',
    kotak: 'Kotak Bank',
    bhim: 'BHIM UPI',
    phonepe: 'PhonePe',
    hdfc: 'HDFC Bank',
    icici: 'ICICI Bank',
    sbi: 'SBI Card',
    axis: 'Axis Bank',
    other: 'Other'
  };

  const onDrop = useCallback((acceptedFiles) => {
    const validFiles = acceptedFiles.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      return ['csv', 'pdf'].includes(ext);
    });

    if (validFiles.length === 0) {
      setUploadStatus({
        type: 'error',
        message: 'Please upload CSV or PDF files only'
      });
      return;
    }

    const pdfFiles = validFiles.filter(f => 
      f.name.split('.').pop().toLowerCase() === 'pdf'
    );

    setFiles(validFiles.map(file => ({
      file,
      name: file.name,
      size: (file.size / 1024).toFixed(1),
      status: 'pending',
      needsPassword: false,
      isPasswordProtected: false,
      password: null,
      type: selectedType // Store the statement type
    })));

    for (const file of pdfFiles) {
      checkPDFPassword(file).then(needsPassword => {
        setFiles(prev => prev.map(f => {
          if (f.file === file) {
            return { ...f, needsPassword, isPasswordProtected: needsPassword };
          }
          return f;
        }));
      });
    }

    setUploadStatus(null);
    setPreviewData(null);
  }, [selectedType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf']
    },
    maxSize: 5242880
  });

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setIsPasswordIncorrect(true);
      setUploadStatus({
        type: 'error',
        message: 'Please enter a password'
      });
      return;
    }

    const fileObj = files[currentFileIndex];
    if (!fileObj) return;

    try {
      console.log('🔐 Attempting to unlock PDF with password...');
      const transactions = await parsePDF(fileObj.file, selectedBank, password.trim());
      
      if (transactions && transactions.length > 0) {
        console.log('✅ PDF unlocked! Found', transactions.length, 'transactions');
        
        setFiles(prev => prev.map((f, idx) => {
          if (idx === currentFileIndex) {
            return { 
              ...f, 
              status: 'processed', 
              isPasswordProtected: false,
              _transactions: transactions
            };
          }
          return f;
        }));

        setShowPasswordModal(false);
        setPassword('');
        setIsPasswordIncorrect(false);

        const categorizedTransactions = transactions.map(t => ({
          ...t,
          category: categorizeTransaction(t.description),
          merchant: t.description.split(' ').slice(0, 3).join(' '),
          statementType: fileObj.type || selectedType // Add statement type
        }));

        if (window.pendingTransactions) {
          window.pendingTransactions = [...window.pendingTransactions, ...categorizedTransactions];
        } else {
          window.pendingTransactions = categorizedTransactions;
        }

        const previewData = {
          total: window.pendingTransactions.length,
          totalAmount: window.pendingTransactions.reduce((sum, t) => sum + t.amount, 0),
          categories: window.pendingTransactions.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + 1;
            return acc;
          }, {}),
          transactions: window.pendingTransactions.slice(0, 20)
        };

        setPreviewData(previewData);

        setUploadStatus({
          type: 'success',
          message: `✅ PDF unlocked! Found ${transactions.length} transactions.`
        });

      } else {
        setUploadStatus({
          type: 'error',
          message: 'PDF unlocked but no transactions were found.'
        });
      }

    } catch (error) {
      console.error('❌ Password error:', error);
      setIsPasswordIncorrect(true);
      setUploadStatus({
        type: 'error',
        message: error.message || 'Incorrect password. Please try again.'
      });
      setPassword('');
    }
  };

  const processFiles = async () => {
    setIsProcessing(true);
    
    const passwordNeeded = files.some(f => f.isPasswordProtected && !f.password);
    if (passwordNeeded) {
      const index = files.findIndex(f => f.isPasswordProtected && !f.password);
      setCurrentFileIndex(index);
      setShowPasswordModal(true);
      setIsProcessing(false);
      return;
    }

    setUploadStatus({
      type: 'info',
      message: 'Processing your statements...'
    });

    try {
      let allTransactions = [];

      for (const fileObj of files) {
        const file = fileObj.file;
        const ext = file.name.split('.').pop().toLowerCase();
        
        let transactions = [];
        
        if (ext === 'csv') {
          transactions = await parseCSV(file, selectedBank, fileObj.type || selectedType);
        } else if (ext === 'pdf') {
          transactions = await parsePDF(file, selectedBank, fileObj.password || null);
        }

        transactions = transactions.map(t => ({
          ...t,
          category: categorizeTransaction(t.description),
          merchant: t.description.split(' ').slice(0, 3).join(' '),
          statementType: fileObj.type || selectedType // Add statement type
        }));

        allTransactions = [...allTransactions, ...transactions];
      }

      setFiles(files.map(f => ({
        ...f,
        status: 'processed'
      })));

      const previewData = {
        total: allTransactions.length,
        totalAmount: allTransactions.reduce((sum, t) => sum + t.amount, 0),
        categories: allTransactions.reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + 1;
          return acc;
        }, {}),
        transactions: allTransactions.slice(0, 20)
      };

      setPreviewData(previewData);

      setUploadStatus({
        type: 'success',
        message: `Successfully processed ${allTransactions.length} transactions!`
      });

      window.pendingTransactions = allTransactions;

    } catch (error) {
      console.error('Processing error:', error);
      setUploadStatus({
        type: 'error',
        message: `Error processing files: ${error.message}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmUpload = () => {
    if (window.pendingTransactions) {
      onUpload(window.pendingTransactions);
      setFiles([]);
      setPreviewData(null);
      setUploadStatus({
        type: 'success',
        message: 'Data saved successfully!'
      });
      window.pendingTransactions = null;
      setTimeout(() => setUploadStatus(null), 3000);
    }
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
    setPreviewData(null);
    setUploadStatus(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'kotak': return <CreditCard size={16} className="text-blue-500" />;
      case 'bhim': return <Smartphone size={16} className="text-green-500" />;
      case 'phonepe': return <Phone size={16} className="text-purple-500" />;
      default: return <FileText size={16} />;
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'kotak': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'bhim': return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'phonepe': return 'border-purple-500 bg-purple-50 dark:bg-purple-900/20';
      default: return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  // Password Modal
  const PasswordModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'} flex items-center`}>
            <Lock className="mr-2 text-blue-600" size={24} />
            PDF Password Required
          </h3>
          <button
            onClick={() => {
              setShowPasswordModal(false);
              setPassword('');
              setIsPasswordIncorrect(false);
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
          This PDF is password protected. Please enter the password to unlock it.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
              File: {files[currentFileIndex]?.name}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setIsPasswordIncorrect(false);
                }}
                placeholder="Enter PDF password"
                className={`w-full px-4 py-2 pr-12 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isPasswordIncorrect ? 'border-red-500 ring-2 ring-red-200' : 
                  isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-800 border-gray-300'
                }`}
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                autoFocus
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {isPasswordIncorrect && (
              <p className="text-sm text-red-600 mt-1 flex items-center">
                <AlertCircle size={16} className="mr-1" />
                Incorrect password. Please try again.
              </p>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setPassword('');
                setIsPasswordIncorrect(false);
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePasswordSubmit}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Unlock size={18} className="mr-2" />
              Unlock PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {showPasswordModal && <PasswordModal />}
      
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden`}>
        <div className={`bg-gradient-to-r ${isDark ? 'from-gray-700 to-gray-800' : 'from-blue-600 to-blue-700'} px-6 py-8`}>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Upload className="mr-3" size={28} />
            Upload Your Statement
          </h2>
          <p className="text-blue-100 mt-2">
            Your data stays private - it never leaves your device
          </p>
        </div>

        <div className="p-6">
          {/* Statement Type Selection */}
          <div className="mb-6">
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Select Statement Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(STATEMENT_TYPES).map(([key, { label, icon: Icon, color }]) => (
                <button
                  key={key}
                  onClick={() => setSelectedType(key)}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center space-x-2 ${
                    selectedType === key
                      ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20`
                      : isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 text-${color}-500`} />
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bank Selection */}
          <div className="mb-6">
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Select Your Bank (for better parsing)
            </label>
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className={`w-full md:w-64 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isDark 
                  ? 'bg-gray-700 text-white border-gray-600' 
                  : 'bg-white text-gray-800 border-gray-300'
              }`}
            >
              {Object.entries(BANK_FORMATS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                isDark ? 'bg-gray-700' : 'bg-blue-100'
              }`}>
                <Upload className={isDark ? 'text-blue-400' : 'text-blue-600'} size={32} />
              </div>
              <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
                {isDragActive ? 'Drop your files here' : 'Drop your statement here'}
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
                or click to browse files
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-4`}>
                Supports CSV and PDF files (Max 5MB)
              </p>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6">
              <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                Uploaded Files ({files.length})
              </h4>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      file.isPasswordProtected && !file.password 
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300' 
                        : isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {file.isPasswordProtected && !file.password ? (
                        <Lock className="text-yellow-600" size={20} />
                      ) : (
                        <FileText className={isDark ? 'text-gray-400' : 'text-gray-500'} size={20} />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
                          {file.name}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {file.size} KB • {STATEMENT_TYPES[file.type]?.label || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {file.isPasswordProtected && !file.password && (
                        <span className="text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-1 rounded-full">
                          Password Required
                        </span>
                      )}
                      {file.status === 'processed' && (
                        <CheckCircle className="text-green-500" size={20} />
                      )}
                      <button
                        onClick={() => removeFile(index)}
                        className={`p-1 rounded-full transition-colors ${
                          isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                        }`}
                      >
                        <X size={18} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {files.some(f => f.status === 'pending') && (
                <button
                  onClick={processFiles}
                  disabled={isProcessing}
                  className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Process Files'
                  )}
                </button>
              )}
            </div>
          )}

          {/* Status Messages */}
          {uploadStatus && (
            <div className={`mt-4 p-4 rounded-lg flex items-start space-x-3 ${
              uploadStatus.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400' :
              uploadStatus.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
              'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
            }`}>
              {uploadStatus.type === 'error' && <AlertCircle size={20} className="flex-shrink-0" />}
              {uploadStatus.type === 'success' && <CheckCircle size={20} className="flex-shrink-0" />}
              <p className="text-sm">{uploadStatus.message}</p>
            </div>
          )}

          {/* Preview Data */}
          {previewData && (
            <div className="mt-6 border-t pt-6">
              <h4 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'} mb-4`}>📊 Preview</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-blue-50'}`}>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Transactions</p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-blue-700'}`}>{previewData.total}</p>
                </div>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-green-50'}`}>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Amount</p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-green-700'}`}>
                    {formatCurrency(previewData.totalAmount)}
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-purple-50'}`}>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Categories Found</p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-purple-700'}`}>
                    {Object.keys(previewData.categories).length}
                  </p>
                </div>
              </div>

              <button
                onClick={confirmUpload}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                ✅ Confirm & Save Data
              </button>
            </div>
          )}

          <div className={`mt-6 p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <h5 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>📋 Supported Statements:</h5>
            <ul className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} space-y-1 list-disc list-inside`}>
              <li><span className="font-medium text-blue-500">Kotak Credit Card</span> - Credit card statements</li>
              <li><span className="font-medium text-green-500">BHIM UPI</span> - BHIM app transaction history</li>
              <li><span className="font-medium text-purple-500">PhonePe</span> - PhonePe app transaction history</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Uploaded;