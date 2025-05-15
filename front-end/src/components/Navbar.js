import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Check if a route is active
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className="bg-blue-600 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Logo and desktop navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-white font-bold text-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                XML Analyzer
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
              <Link to="/" className={`px-3 py-2 rounded-md ${isActive('/') ? 'bg-blue-700 text-white' : 'text-white hover:bg-blue-700 hover:text-white'}`}>
                Dashboard
              </Link>
              <Link to="/analytics" className={`px-3 py-2 rounded-md ${isActive('/analytics') ? 'bg-blue-700 text-white' : 'text-white hover:bg-blue-700 hover:text-white'}`}>
                Analytics
              </Link>
              <Link to="/upload" className={`px-3 py-2 rounded-md ${isActive('/upload') ? 'bg-blue-700 text-white' : 'text-white hover:bg-blue-700 hover:text-white'}`}>
                Upload XML
              </Link>
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button 
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-blue-700">
          <div className="pt-2 pb-3 space-y-1">
            <Link 
              to="/" 
              className={`block px-3 py-2 text-base font-medium ${isActive('/') ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-800'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              to="/analytics" 
              className={`block px-3 py-2 text-base font-medium ${isActive('/analytics') ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-800'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Analytics
            </Link>
            <Link 
              to="/upload" 
              className={`block px-3 py-2 text-base font-medium ${isActive('/upload') ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-800'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Upload XML
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;