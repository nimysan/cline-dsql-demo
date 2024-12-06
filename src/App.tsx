import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Orders from './components/Orders';
import { DatabaseMetrics } from './components/DatabaseMetrics';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center space-x-8">
                <h1 className="text-xl font-bold text-gray-800">Order Management</h1>
                <div className="hidden md:flex space-x-4">
                  <Link 
                    to="/" 
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Orders
                  </Link>
                  <Link 
                    to="/metrics" 
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Database Metrics
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<Orders />} />
            <Route path="/metrics" element={<DatabaseMetrics />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
