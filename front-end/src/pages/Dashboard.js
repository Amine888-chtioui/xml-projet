// src/pages/Dashboard.js - Mise à jour pour inclure l'analyse temporelle
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { statsService, reportService } from "../services/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import TemporalStatsChart from "../components/TemporalStatsChart"; // Nouveau composant

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [summaryData, setSummaryData] = useState({
    total_incidents: 0,
    total_downtime: 0,
    avg_downtime: 0,
    estimated_cost: 0,
  });
  const [topMachines, setTopMachines] = useState([]);
  const [topErrorTypes, setTopErrorTypes] = useState([]);
  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);

        // Charger les données du tableau de bord
        const response = await statsService.getDashboardStats();

        if (response?.data) {
          const { summary, by_machine, by_error_type, time_evolution } =
            response.data;

          // Mettre à jour les données de résumé
          setSummaryData({
            total_incidents: summary.total_incidents || 0,
            total_downtime: summary.total_downtime || 0,
            avg_downtime: summary.total_incidents
              ? Math.round(summary.total_downtime / summary.total_incidents)
              : 0,
            estimated_cost: Math.round((summary.total_downtime / 60) * 100), // 100€ par heure
          });

          // Mettre à jour les principales machines
          setTopMachines(by_machine || []);

          // Mettre à jour les principaux types d'erreur
          setTopErrorTypes(by_error_type || []);
        } else {
          // Données de démonstration
          setSummaryData({
            total_incidents: 42,
            total_downtime: 2550, // 42.5 heures
            avg_downtime: 61, // ~1 heure par incident
            estimated_cost: 4250, // 42.5 * 100€
          });

          setTopMachines([
            {
              name: "Komax Alpha 355 (ALPHA 158)",
              total_downtime: 245,
              incident_count: 12,
            },
            {
              name: "Komax Alpha 488 10M (ALPHA 162)",
              total_downtime: 230,
              incident_count: 8,
            },
            {
              name: "Komax Alpha 488 7M (ALPHA 166)",
              total_downtime: 140,
              incident_count: 5,
            },
            {
              name: "Komax Alpha 488 S 7M (ALPHA 146)",
              total_downtime: 85,
              incident_count: 3,
            },
            {
              name: "Komax Alpha 355 (ALPHA 176)",
              total_downtime: 45,
              incident_count: 2,
            },
          ]);

          setTopErrorTypes([
            {
              error_type: "1 Mechanical (01 Breakage)",
              total_downtime: 230,
              incident_count: 12,
            },
            {
              error_type: "2 Electrical (02 Wear)",
              total_downtime: 190,
              incident_count: 15,
            },
            {
              error_type: "6 Maintenance (02 Wear)",
              total_downtime: 150,
              incident_count: 8,
            },
            {
              error_type: "1 Mechanical (04 Blockage)",
              total_downtime: 100,
              incident_count: 5,
            },
            {
              error_type: "7 Inspection (Preventive)",
              total_downtime: 80,
              incident_count: 3,
            },
          ]);
        }

        // Charger les rapports récents
        try {
          const reportsResponse = await reportService.getLatestReports();
          if (reportsResponse?.data) {
            setRecentReports(reportsResponse.data);
          } else {
            // Données de démonstration pour les rapports récents
            setRecentReports([
              {
                id: 1,
                name: "Rapport de maintenance Avril 2025",
                created_at: "2025-05-09T10:15:30Z",
                incident_count: 15,
                total_downtime_minutes: 840,
              },
              {
                id: 2,
                name: "Rapport d'arrêts semaine 18",
                created_at: "2025-05-05T14:22:15Z",
                incident_count: 12,
                total_downtime_minutes: 720,
              },
              {
                id: 3,
                name: "Maintenance préventive machines série A",
                created_at: "2025-04-28T09:45:22Z",
                incident_count: 8,
                total_downtime_minutes: 480,
              },
            ]);
          }
        } catch (error) {
          console.error(
            "Erreur lors du chargement des rapports récents:",
            error
          );
          // Utiliser des données de démonstration en cas d'erreur
          setRecentReports([]);
        }
      } catch (error) {
        console.error(
          "Erreur lors du chargement des données du tableau de bord:",
          error
        );
        // Utiliser des données de démonstration en cas d'erreur
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getBarFill = (index) => {
    const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];
    return COLORS[index % COLORS.length];
  };

  const renderCustomTooltip = (props) => {
    const { active, payload } = props;

    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">
            Temps d'arrêt: {formatDuration(data.total_downtime)}
          </p>
          <p className="text-sm text-gray-600">
            Incidents: {data.incident_count}
          </p>
          <p className="text-sm text-gray-600">
            Moyenne:{" "}
            {formatDuration(
              Math.round(data.total_downtime / data.incident_count)
            )}
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <Link
          to="/upload"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Importer un nouveau fichier
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-blue-800">
            Nombre total d'incidents
          </h3>
          <p className="mt-1 text-3xl font-semibold text-blue-900">
            {isLoading ? (
              <div className="animate-pulse h-8 w-16 bg-blue-200 rounded"></div>
            ) : (
              summaryData.total_incidents
            )}
          </p>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-red-800">
            Temps d'arrêt total
          </h3>
          <p className="mt-1 text-3xl font-semibold text-red-900">
            {isLoading ? (
              <div className="animate-pulse h-8 w-24 bg-red-200 rounded"></div>
            ) : (
              formatDuration(summaryData.total_downtime)
            )}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-green-800">
            Durée moyenne par incident
          </h3>
          <p className="mt-1 text-3xl font-semibold text-green-900">
            {isLoading ? (
              <div className="animate-pulse h-8 w-16 bg-green-200 rounded"></div>
            ) : (
              formatDuration(summaryData.avg_downtime)
            )}
          </p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
          <h3 className="text-sm font-medium text-yellow-800">Coût estimé</h3>
          <p className="mt-1 text-3xl font-semibold text-yellow-900">
            {isLoading ? (
              <div className="animate-pulse h-8 w-20 bg-yellow-200 rounded"></div>
            ) : (
              `${summaryData.estimated_cost.toLocaleString()} €`
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Graphique des machines principales */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">
            Principales machines avec temps d'arrêt
          </h2>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : topMachines.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topMachines}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  layout="vertical"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={150}
                  />
                  <Tooltip content={renderCustomTooltip} />
                  <Bar dataKey="total_downtime" name="Temps d'arrêt (min)">
                    {topMachines.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarFill(index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex justify-center items-center h-64 text-gray-500">
              Aucune donnée disponible
            </div>
          )}

          <div className="mt-4 text-right">
            <Link
              to="/analytics"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Voir l'analyse complète →
            </Link>
          </div>
        </div>

        {/* Liste des rapports récents */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Rapports récents</h2>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentReports.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {recentReports.map((report) => (
                <div key={report.id} className="py-3">
                  <h3 className="font-medium">{report.name}</h3>
                  <div className="mt-1 flex justify-between text-sm text-gray-600">
                    <span>Importé le {formatDate(report.created_at)}</span>
                    <span>{report.incident_count} incidents</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    Temps d'arrêt total:{" "}
                    {formatDuration(report.total_downtime_minutes)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <p>Aucun rapport importé récemment</p>
              <Link
                to="/upload"
                className="mt-2 inline-block text-blue-600 hover:text-blue-800 font-medium"
              >
                Importer un fichier XML
              </Link>
            </div>
          )}

          <div className="mt-4 text-right">
            <Link
              to="/upload"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Importer un nouveau rapport →
            </Link>
          </div>
        </div>
      </div>

      {/* Nouveau composant pour l'analyse temporelle */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">
          Évolution temporelle des arrêts
        </h2>
        <TemporalStatsChart filters={{}} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Accès rapide</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/analytics"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h3 className="font-medium text-blue-600">Analyse complète</h3>
            <p className="mt-2 text-gray-600">
              Accéder à l'analyse détaillée de tous les arrêts machines.
            </p>
          </Link>

          <Link
            to="/upload"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h3 className="font-medium text-blue-600">Importer un fichier</h3>
            <p className="mt-2 text-gray-600">
              Importer un nouveau fichier XML pour analyse.
            </p>
          </Link>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-medium text-blue-600">Exporter des données</h3>
            <p className="mt-2 text-gray-600">
              Exporter les analyses en format CSV, Excel ou PDF.
            </p>
            <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
              Bientôt disponible
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
