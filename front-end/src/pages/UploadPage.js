// src/pages/UploadPage.js
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { xmlService } from '../services/api';
import axios from 'axios';

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingPhase, setProcessingPhase] = useState('');
  const [previewXml, setPreviewXml] = useState(null);
  const navigate = useNavigate();
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    validateAndSetFile(file);
  };
  
  const validateAndSetFile = (file) => {
    if (!file) return;
    
    // Vérifier le type de fichier (accepter .xml et application/xml)
    if (file.type !== 'text/xml' && file.type !== 'application/xml' && !file.name.endsWith('.xml')) {
      toast.error('Veuillez sélectionner un fichier XML valide');
      setSelectedFile(null);
      setPreviewXml(null);
      return;
    }
    
    setSelectedFile(file);
    
    // Prévisualiser le fichier XML
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const xmlContent = event.target.result;
        
        // Vérifier si c'est un XML valide
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');
        
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
          toast.error('Le fichier XML semble être mal formé');
          setPreviewXml(null);
          return;
        }
        
        // Extraire quelques éléments pour la prévisualisation
        const previewData = {
          content: xmlContent.substring(0, 1000) + '...',
          title: getXmlNodeValue(xmlDoc, '//Text[@Name="Text3"]/TextValue') || 'Rapport de maintenance',
          fromDate: getXmlNodeValue(xmlDoc, '//Field[@Name="vonDate1"]/FormattedValue'),
          toDate: getXmlNodeValue(xmlDoc, '//Field[@Name="bisDate1"]/FormattedValue'),
          printDate: getXmlNodeValue(xmlDoc, '//Field[@Name="Field3"]/FormattedValue'),
          totalStopTime: getXmlNodeValue(xmlDoc, '//Field[@FieldName="{#Total-stop-time}"]/FormattedValue')
        };
        
        setPreviewXml(previewData);
      } catch (error) {
        console.error('Erreur lors de la lecture du fichier XML:', error);
        toast.error('Erreur lors de la lecture du fichier XML');
        setPreviewXml(null);
      }
    };
    reader.readAsText(file);
  };
  
  const getXmlNodeValue = (xmlDoc, xpath) => {
    const result = xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue ? result.singleNodeValue.textContent : null;
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    validateAndSetFile(file);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier XML');
      return;
    }
    
    setIsLoading(true);
    setUploadProgress(0);
    setProcessingPhase('upload');
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      // Configuration pour suivre la progression de l'upload
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      };
      
      // Upload du fichier
      setProcessingPhase('upload');
      const response = await xmlService.uploadXml(formData, config);
      
      // Traitement du fichier sur le serveur
      setProcessingPhase('processing');
      
      if (response.data.success) {
        // Afficher un toast de réussite
        toast.success('Fichier XML traité avec succès !');
        
        // Indiquer les statistiques importantes
        if (response.data.data && response.data.data.summary) {
          const summary = response.data.data.summary;
          toast.info(`${summary.totalDowntime} minutes d'arrêt analysées. ${Object.keys(summary.countByMachine).length} machines concernées.`);
        }
        
        // Rediriger vers la page d'analyse
        setTimeout(() => {
          navigate('/analytics');
        }, 1500);
      } else {
        toast.error(response.data.message || 'Une erreur est survenue lors du traitement du fichier');
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload du fichier:', error);
      toast.error(
        error.response?.data?.message || 
        'Erreur lors de l\'upload du fichier. Veuillez réessayer.'
      );
    } finally {
      setIsLoading(false);
      setProcessingPhase('');
    }
  };
  
  // Version simplifiée pour démonstration
  const handleDemoSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier XML');
      return;
    }
    
    setIsLoading(true);
    setUploadProgress(0);
    
    // Simuler un upload progressif
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
    
    // Simuler le traitement côté serveur
    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      setProcessingPhase('processing');
      
      setTimeout(() => {
        setIsLoading(false);
        setProcessingPhase('');
        toast.success('Fichier XML traité avec succès !');
        navigate('/analytics');
      }, 1500);
    }, 2000);
  };
  
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded shadow-md">
      <h1 className="text-2xl font-bold mb-6">Import de Fichier XML</h1>
      
      {isLoading ? (
        <div className="text-center py-8">
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="mt-2 text-sm text-gray-600">{uploadProgress}%</p>
          </div>
          
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          
          <p className="text-gray-600">
            {processingPhase === 'upload' ? 'Upload du fichier XML en cours...' : 'Traitement du fichier XML en cours...'}
          </p>
          <p className="mt-2 text-sm text-gray-500">Veuillez patienter, cette opération peut prendre quelques instants.</p>
        </div>
      ) : (
        <div>
          <p className="mb-6 text-gray-600">
            Importez un fichier XML de rapport de maintenance pour analyser les arrêts non planifiés des machines.
            Le système extraira automatiquement les temps d'arrêt, les machines concernées et les types d'erreur.
          </p>
          
          <form onSubmit={handleDemoSubmit}>
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
                {selectedFile ? (
                  <span className="font-medium text-blue-600">{selectedFile.name}</span>
                ) : (
                  'Cliquez ou glissez-déposez un fichier XML ici'
                )}
              </p>
              
              <input 
                id="fileInput"
                type="file" 
                className="hidden" 
                accept=".xml,application/xml,text/xml" 
                onChange={handleFileChange}
              />
            </div>
            
            {previewXml && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-blue-800 mb-2">Aperçu du fichier :</h3>
                <div className="text-sm">
                  <p><strong>Titre :</strong> {previewXml.title}</p>
                  <p><strong>Période :</strong> {previewXml.fromDate} - {previewXml.toDate}</p>
                  <p><strong>Date d'impression :</strong> {previewXml.printDate}</p>
                  <p><strong>Temps d'arrêt total :</strong> {previewXml.totalStopTime} heures</p>
                </div>
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">
                  <pre>{previewXml.content}</pre>
                </div>
              </div>
            )}
            
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
              Le système attend un fichier XML contenant des données de maintenance avec :
            </p>
            <ul className="list-disc pl-5 mt-2 text-sm text-gray-600">
              <li>Des groupes pour les segments et machines</li>
              <li>Des détails sur les arrêts (identifiants, durées, codes d'erreur)</li>
              <li>Des informations sur les types d'erreur et les emplacements</li>
              <li>Des résumés des temps d'arrêt par machine</li>
            </ul>
            <p className="text-sm text-gray-600 mt-2">
              Le format exact doit suivre la structure Crystal Report utilisée pour les rapports de maintenance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;