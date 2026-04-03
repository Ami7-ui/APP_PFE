import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { FileText, Calendar, Clock, Download, Database, Search, ArrowRight, ExternalLink, Trash2 } from 'lucide-react';

const cardStyle = {
  background: 'rgba(30, 41, 59, 0.4)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '16px',
  padding: '20px',
  transition: 'transform 0.2s ease, border-color 0.2s ease',
  display: 'flex',
  flexDirection: 'column',
  gap: '15px'
};

const formatDate = (dateString) => {
  if (!dateString) return "Date inconnue";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export default function ReportsHistoryPage() {
  const queryClient = useQueryClient();
  const [selectedBase, setSelectedBase] = useState("");
  const [bases, setBases] = useState([]);

  // --- NOUVELLE FONCTION DE SUPPRESSION ---
  const handleReportDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce rapport ?")) return;
    try {
      await api.delete(`/api/reports/${id}`);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    } catch (err) {
      alert("Erreur lors de la suppression.");
    }
  };

  // Récupérer la liste des bases pour le sélecteur
  const { data: basesData } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const res = await api.get('/api/bases');
      const data = res.data || [];
      if (data.length > 0 && !selectedBase) {
        const firstBase = data[0];
        const name = firstBase.Instance || firstBase.nom || firstBase.NOM_INSTANCE || (Array.isArray(firstBase) ? firstBase[1] : null);
        if (name) setSelectedBase(name);
      }
      return data;
    }
  });

  // Récupérer l'historique des rapports pour la base sélectionnée
  const { data: reports, isLoading, isError } = useQuery({
    queryKey: ['reports', selectedBase],
    queryFn: async () => {
      if (!selectedBase) return [];
      console.log(`[DEBUG] Fetching reports for base: ${selectedBase}`);
      const res = await api.get(`/api/reports?nom_base_cible=${selectedBase}`);
      console.log(`[DEBUG] API Response for reports:`, res.data);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!selectedBase
  });

  return (
    <div style={{ color: '#f1f5f9', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ 
          width: '50px', height: '50px', borderRadius: '12px', 
          background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(14, 165, 233, 0.4)'
        }}>
          <FileText size={28} color="white" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Historique des Rapports</h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Consultez et téléchargez les audits PDF générés précédemment.</p>
        </div>
      </div>

      {/* Sélecteur de base */}
      <div style={{ 
        ...cardStyle, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '30px',
        padding: '15px 25px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Database size={20} color="#0ea5e9" />
          <span style={{ fontWeight: 600, color: '#f1f5f9' }}>Base de données cible :</span>
        </div>
        <select 
          value={selectedBase}
          onChange={(e) => setSelectedBase(e.target.value)}
          style={{ 
            padding: '10px 20px', borderRadius: '10px', 
            background: '#0f172a', border: '1px solid #334155', 
            color: 'white', cursor: 'pointer', outline: 'none', width: '300px',
            fontSize: '0.9rem', fontWeight: 500
          }}
        >
          {(basesData || []).map((b, idx) => {
            const name = b.Instance || b.nom || b.NOM_INSTANCE || (Array.isArray(b) ? b[1] : `Base ${idx}`);
            return <option key={idx} value={name}>{name}</option>;
          })}
        </select>
      </div>

      {/* Liste des rapports */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>Chargement de l'historique...</div>
      ) : isError ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#ef4444' }}>Erreur lors de la récupération des rapports.</div>
      ) : (!reports || reports.length === 0) ? (
        <div style={{ 
          textAlign: 'center', padding: '80px 40px', background: 'rgba(255,255,255,0.02)', 
          borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' 
        }}>
          <Search size={48} color="#334155" style={{ marginBottom: '15px' }} />
          <h3 style={{ margin: '0 0 10px 0', color: '#cbd5e1' }}>Aucun rapport trouvé</h3>
          <p style={{ margin: 0, color: '#64748b' }}>Aucun audit PDF n'a encore été généré pour la base <strong>{selectedBase}</strong>.</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
          gap: '20px' 
        }}>
          {(reports || []).map((report) => (
            <div key={report.id} style={cardStyle} className="report-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Clock size={14} /> {report.date && formatDate(report.date).includes(' à ') ? formatDate(report.date).split(' à ')[1] : "--:--"}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f1f5f9', fontWeight: 700, fontSize: '1rem' }}>
                    <Calendar size={18} color="#94a3b8" /> {report.date ? formatDate(report.date).split(' à ')[0] : "Date inconnue"}
                  </div>
                </div>
                <div style={{ 
                  padding: '6px 12px', background: 'rgba(56, 189, 248, 0.1)', 
                  borderRadius: '10px', color: '#38bdf8', fontSize: '0.7rem', fontWeight: 800 
                }}>
                  PDF READY
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', width: '100%' }}></div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} color="#64748b" />
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Audit_DB_{report.id}.pdf
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <a 
                  href={`http://localhost:8000/api/reports/${report.id}/download`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    flex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    padding: '12px', borderRadius: '10px', background: 'linear-gradient(90deg, #0ea5e9, #2563eb)',
                    color: 'white', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
                    transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(14, 165, 233, 0.2)'
                  }}
                >
                  Ouvrir <ExternalLink size={16} />
                </a>
                <button 
                  onClick={() => handleReportDelete(report.id)}
                  style={{ 
                    width: '45px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)',
                    cursor: 'pointer', transition: 'all 0.3s ease'
                  }}
                  title="Supprimer le rapport"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .report-card:hover {
          transform: translateY(-5px);
          border-color: rgba(14, 165, 233, 0.3);
          background: rgba(30, 41, 59, 0.6);
        }
      `}} />
    </div>
  );
}
