// src/pages/UploadPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/xml') {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
      toast.error('Veuillez sélectionner un fichier XML valide');
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/xml') {
      setSelectedFile(file);
    } else {
      toast.error('Veuillez déposer un fichier XML valide');
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier XML');
      return;
    }
    
    setIsLoading(true);
    
    // Simuler un upload pour l'instant (à remplacer par l'appel API réel)
    setTimeout(() => {
      toast.success('Fichier XML traité avec succès');
      setIsLoading(false);
      navigate('/analytics');
    }, 2000);
    
    // Implémentation réelle avec Axios (à décommenter plus tard)
    /*
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      const response = await axios.post('/api/upload-xml', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        toast.success('Fichier XML traité avec succès');
        navigate('/analytics');
      } else {
        toast.error(response.data.message || 'Une erreur est survenue');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(
        error.response?.data?.message || 
        'Erreur lors de l\'upload du fichier'
      );
    } finally {
      setIsLoading(false);
    }
    */
  };
  
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded shadow-md">
      <h1 className="text-2xl font-bold mb-6">Import de Fichier XML</h1>
      
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Traitement du fichier XML en cours...</p>
        </div>
      ) : (
        <div>
          <p className="mb-6 text-gray-600">
            Importez un fichier XML de rapport de maintenance pour analyser les arrêts non planifiés des machines.
          </p>
          
          <form onSubmit={handleSubmit}>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              
              <p className="mt-2 text-sm text-gray-600">
                {selectedFile ? selectedFile.name : 'Cliquez ou glissez-déposez un fichier XML ici'}
              </p>
              
              <input 
                id="fileInput"
                type="file" 
                className="hidden" 
                accept=".xml" 
                onChange={handleFileChange}
              />
            </div>
            
            <div className="mt-6">
              <button 
                type="submit" 
                className={`w-full py-2 px-4 rounded font-medium ${
                  selectedFile 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!selectedFile}
              >
                Importer et Analyser
              </button>
            </div>
          </form>
          
          <div className="mt-8 bg-blue-50 p-4 rounded">
            <h3 className="font-semibold text-blue-800">Format attendu :</h3>
            <p className="text-sm text-gray-600 mt-2">
              Le système attend un fichier XML contenant des données de maintenance avec des éléments tels que &lt;Machine&gt;, &lt;Downtime&gt;, 
              et des attributs comme ID, dates de début/fin, durée, codes d'erreur, etc.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;