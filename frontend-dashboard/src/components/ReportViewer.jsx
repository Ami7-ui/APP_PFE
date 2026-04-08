import React from 'react';
import { Database, Calendar, Activity, ChevronRight, FileText, Bot } from 'lucide-react';
import AiResponseViewer from './AiResponseViewer';

const cardStyle = {
  background: 'rgba(15, 23, 42, 0.6)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
};

/**
 * ReportViewer : Affiche un rapport d'audit consolidé (Métriques + IA).
 * Peut être utilisé avec des données passées en props (Historique)
 * ou avec les données issues du store (Prévisualisation actuelle).
 */
export default function ReportViewer({ data, baseName, isHistorical = false }) {
  // Extraction des données (priorité aux props, sinon fallback structure)
  const auditData = data?.audit_data || data;
  const aiResponse = data?.ai_response;
  const dateStr = data?.date ? new Date(data.date).toLocaleString('fr-FR') : new Date().toLocaleString('fr-FR');
  const targetBase = baseName || data?.base || 'Base de données standard';

  if (!auditData && !aiResponse) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
        <Activity size={40} style={{ marginBottom: '15px', opacity: 0.5 }} />
        <p>Aucune donnée de rapport disponible pour l'affichage.</p>
      </div>
    );
  }

  const renderMetricsCategory = (category, metrics) => {
    if (!metrics || typeof metrics !== 'object' || metrics.error) return null;
    
    return (
      <div key={category} style={{ marginBottom: '25px' }}>
        <h5 style={{ 
          fontSize: '0.9rem', 
          color: '#38bdf8', 
          marginBottom: '12px', 
          borderBottom: '1px solid rgba(56, 189, 248, 0.1)', 
          paddingBottom: '6px',
          display: 'flex', alignItems: 'center', gap: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 700
        }}>
          <ChevronRight size={14} /> {category}
        </h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {Object.entries(metrics).map(([k, v]) => {
            let valStr = String(v);
            if (typeof v === 'object' && v !== null) {
                valStr = Array.isArray(v) ? `Tableau (${v.length} entrées)` : "Objet complexe";
            }
            return (
              <div key={k} style={{ 
                background: 'rgba(30, 41, 59, 0.3)', 
                padding: '12px 16px', 
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 600, wordBreak: 'break-all' }}>{valStr}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ ...cardStyle, marginTop: isHistorical ? 0 : '24px', animation: 'fadeIn 0.5s ease', borderTop: '4px solid #0ea5e9' }}>
      {/* En-tête du Rapport */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)' }}>
            <FileText size={24} color="white" />
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem', fontWeight: 800 }}>Rapport d'Audit Oracle</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 4 }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Database size={14} /> {targetBase}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={14} /> {dateStr}
                </span>
            </div>
          </div>
        </div>
        <div style={{ 
            background: 'rgba(14, 165, 233, 0.1)', 
            padding: '6px 14px', 
            borderRadius: '20px', 
            border: '1px solid rgba(14, 165, 233, 0.2)',
            color: '#0ea5e9',
            fontSize: '0.75rem',
            fontWeight: 700
        }}>
            DOCUMENT OFFICIEL
        </div>
      </div>

      {/* PARTIE 1 - MÉTRIQUES BRUTES */}
      <div style={{ marginBottom: '45px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc', marginBottom: '20px', fontSize: '1.1rem', fontWeight: 700 }}>
          <Activity size={20} color="#0ea5e9" /> 1. Métriques Brutes de l'Audit
        </h4>
        <div style={{ padding: '24px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid rgba(14, 165, 233, 0.1)' }}>
          {auditData && typeof auditData === 'object' ? (
            Object.entries(auditData).map(([cat, content]) => renderMetricsCategory(cat, content))
          ) : (
            <div style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
              Aucune métrique brute structurée n'a été trouvée.
            </div>
          )}
        </div>
      </div>

      {/* PARTIE 2 - EXPERTISE IA */}
      <div>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc', marginBottom: '20px', fontSize: '1.1rem', fontWeight: 700 }}>
          <Bot size={20} color="#10b981" /> 2. Expertise Technique & Recommandations IA
        </h4>
        <div style={{ 
          padding: '28px', background: 'rgba(16, 185, 129, 0.03)', 
          borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.15)',
          color: '#cbd5e1', fontSize: '1rem', lineHeight: '1.8'
        }}>
          {aiResponse ? (
            <AiResponseViewer content={aiResponse} />
          ) : (
            <div style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
              L'expertise IA n'est pas disponible pour ce format de rapport.
            </div>
          )}
        </div>
      </div>

      {/* Footer du Rapport */}
      <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', color: '#475569', fontSize: '0.75rem' }}>
        © {new Date().getFullYear()} OracleGuard Hybrid AI — Document généré automatiquement pour audit de conformité et performance.
      </div>
    </div>
  );
}
