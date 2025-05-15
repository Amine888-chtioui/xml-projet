// src/components/Footer.js
import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-800 text-white py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-2 md:mb-0">
            <p className="text-sm">
              &copy; {currentYear} XML Maintenance Analyzer - Tous droits réservés
            </p>
          </div>
          <div className="flex space-x-4">
            <a href="/about" className="text-sm text-gray-300 hover:text-white">
              À propos
            </a>
            <a href="/contact" className="text-sm text-gray-300 hover:text-white">
              Contact
            </a>
            <a href="/help" className="text-sm text-gray-300 hover:text-white">
              Aide
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;