import React from 'react';
import Orders from './components/Orders';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-800">Order Management</h1>
            </div>
          </div>
        </div>
      </nav>
      <main>
        <Orders />
      </main>
    </div>
  );
}

export default App;
