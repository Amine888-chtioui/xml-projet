// src/components/Navbar.js
import React from 'react';

const Navbar = () => {
  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <span className="text-xl font-bold">XML Maintenance Analyzer</span>
          </div>
          <div className="flex space-x-4">
            <a href="/" className="px-3 py-2 rounded hover:bg-blue-700">
              Dashboard
            </a>
            <a href="/upload" className="px-3 py-2 rounded hover:bg-blue-700">
              Upload XML
            </a>
            <a href="/analytics" className="px-3 py-2 rounded hover:bg-blue-700">
              Analytics
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;