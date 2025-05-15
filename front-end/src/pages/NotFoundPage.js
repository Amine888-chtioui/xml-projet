// src/pages/NotFoundPage.js
import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center mt-20">
      <h1 className="text-6xl font-bold text-gray-800">404</h1>
      <h2 className="text-3xl font-semibold text-gray-600 mt-4">Page non trouvée</h2>
      <p className="text-gray-500 mt-2">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <div className="mt-8">
        <Link
          to="/"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;