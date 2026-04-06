import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { Bot, Zap, Search, Activity, Database, Sparkles, AlertCircle, CheckCircle, Terminal, AlertTriangle } from 'lucide-react';
import AiResponseViewer from '../components/AiResponseViewer';

const cardStyle = {
  background: 'rgba(30, 41, 59, 0.4)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
};

const SectionTitle = ({ icon: Icon, title, color }) => (
  <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px', color: color, fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
    <Icon size={20} /> {title}
  </h4>
);

function AnalysisRenderer({ rapport_ia, analyse_ia, reponse, status, diagnostic_local, solutions_expertes }) {
  const content = rapport_ia || { status, diagnostic_local, solutions_expertes } || analyse_ia || reponse;

  // Si c'est le nouveau format Hybride
  if (content.status === 'success' || content.diagnostic_local) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.5s ease' }}>
        {/* Niveau 1 : Junior (Llama 3 Local) */}
        <div style={{ ...cardStyle, borderLeft: '4px solid #3b82f6', background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.1), transparent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <SectionTitle icon={Bot} title="Audit Local (LLaMA 3 Junior)" color="#60a5fa" />
            <span style={{ fontSize: '0.7rem', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>NIVEAU 1 : CONSTAT</span>
          </div>
          <div style={{ fontSize: '1rem', color: '#cbd5e1', lineHeight: '1.7' }}>
            <AiResponseViewer content={content.diagnostic_local} />
          </div>
        </div>

        {/* Niveau 2 : Senior (Nvidia Expert) */}
        <div style={{ ...cardStyle, borderLeft: '4px solid #10b981', background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.1), transparent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <SectionTitle icon={Zap} title="Solutions Expertes (Nvidia Senior)" color="#34d399" />
            <span style={{ fontSize: '0.7rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>NIVEAU 2 : OPTIMISATION</span>
          </div>
          <div style={{ fontSize: '1.05rem', color: '#f1f5f9', lineHeight: '1.8', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
            <AiResponseViewer content={content.solutions_expertes} />
          </div>
          <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', fontSize: '0.8rem' }}>
            <CheckCircle size={14} />
            <span>Recommandations basées sur le moteur Nvidia Nemotron v2</span>
          </div>
        </div>
      </div>
    );
  }

  // Fallback pour les anciens formats ou SQL local
  if (typeof content === 'object' && content !== null) {
    if (content.analyse_plan) {
      const { points_critiques, analyse_plan, script_optimise, impact_performance } = content;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ ...cardStyle, borderLeft: '4px solid #10b981' }}>
            <SectionTitle icon={Activity} title="Analyse de Performance SQL" color="#10b981" />
            <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>{analyse_plan}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={cardStyle}>
              <SectionTitle icon={AlertTriangle} title="Goulots d'étranglement" color="#f59e0b" />
              <ul style={{ paddingLeft: '20px', color: '#d1d5db' }}>
                {points_critiques?.map((p, i) => <li key={i} style={{ marginBottom: '8px' }}>{p}</li>)}
              </ul>
            </div>
            <div style={cardStyle}>
              <SectionTitle icon={Zap} title="Impact Optimisation" color="#0ea5e9" />
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', background: 'rgba(14, 165, 233, 0.1)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                {impact_performance}
              </div>
            </div>
          </div>
          <div style={cardStyle}>
            <SectionTitle icon={Terminal} title="Script SQL Optimisé / Suggestions" color="#38bdf8" />
            <pre style={{ padding: '20px', background: '#020617', borderRadius: '12px', color: '#38bdf8', fontSize: '0.9rem', overflowX: 'auto', border: '1px solid #1e293b' }}>
              {script_optimise}
            </pre>
          </div>
        </div>
      );
    }
  }

  return (
    <div style={{ ...cardStyle, borderLeft: '4px solid #8b5cf6' }}>
      <SectionTitle icon={Sparkles} title="Expertise Technique" color="#a78bfa" />
      <div style={{ fontSize: '0.95rem', lineHeight: '1.7', color: '#cbd5e1' }}>
        <AiResponseViewer content={typeof content === 'string' ? content : JSON.stringify(content, null, 2)} />
      </div>
    </div>
  );
}

export default function AiAssistantPage() {
  const queryClient = useQueryClient();
  const [sqlToAnalyze, setSqlToAnalyze] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bases, setBases] = useState([]);
  const [selectedBase, setSelectedBase] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchBasesAndCheckAudit = async () => {
      let initialBaseId = "";
      try {
        const res = await api.get('/api/bases');
        setBases(res.data);
        if (res.data.length > 0) {
          const firstBase = res.data[0];
          initialBaseId = firstBase.ID !== undefined ? firstBase.ID : firstBase[0];
        }
      } catch (err) {
        console.error("Erreur chargement bases:", err);
      }

      const stored = localStorage.getItem('og_audit_analyze_request');
      if (stored) {
        localStorage.removeItem('og_audit_analyze_request');
        const { id_base } = JSON.parse(stored);
        setSelectedBase(String(id_base));
        
        setLoading(true);
        setResult(null);
        try {
          const res = await api.post('/api/ai/analyze_audit', {
            id_base: parseInt(id_base)
          });
          setResult(res.data);
          // Invalidation de l'historique des rapports pour forcer la mise à jour
          queryClient.invalidateQueries({ queryKey: ['reports'] });
        } catch {
          alert("Erreur lors de l'analyse IA de l'audit.");
        } finally {
          setLoading(false);
        }
      } else {
        if (initialBaseId) setSelectedBase(initialBaseId);
      }
    };
    fetchBasesAndCheckAudit();
  }, []);

  const handleDeepAnalysis = async () => {
    if (!selectedBase || !sqlToAnalyze) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/api/ai/analyze_sql', {
        id_base: parseInt(selectedBase),
        sql_query: sqlToAnalyze
      });
      setResult(res.data);
    } catch {
      alert("Erreur lors de l'analyse : vérifiez que la route /api/ai/analyze_sql existe dans le backend.");
    } finally {
      setLoading(false);
      setSaveSuccess(false);
    }
  };

  const handleSaveReport = async () => {
    if (!selectedBase || !result) return;
    setSaveLoading(true);
    try {
      await api.post('/api/reports/save', {
        id_base: parseInt(selectedBase),
        ai_result: result
      });
      setSaveSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    } catch {
      alert("Erreur lors de la sauvegarde du rapport.");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div style={{ color: '#f1f5f9', maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ 
          width: '50px', height: '50px', borderRadius: '12px', 
          background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)'
        }}>
          <Bot size={30} color="white" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Assistant DBA Intelligent</h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Analyse de performance et optimisation de plans d'exécution par IA (LLaMA 3)</p>
        </div>
      </div>

      <div style={cardStyle}>
        {/* Barre d'outils */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <Database size={18} color="#0ea5e9" />
            <select 
              value={selectedBase} 
              onChange={(e) => setSelectedBase(e.target.value)}
              style={{ 
                padding: '10px 15px', borderRadius: '10px', 
                background: '#0f172a', border: '1px solid #334155', 
                color: 'white', cursor: 'pointer', outline: 'none', width: '300px'
              }}
            >
              {bases.map((b, idx) => {
                const id = b.ID !== undefined ? b.ID : (b.id !== undefined ? b.id : b[0]);
                const nom = b.Instance || b.nom || b[1];
                return <option key={idx} value={id}>{nom}</option>;
              })}
            </select>
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em' }}>
            ORACLEGUARD AI ENGINE V1.2.5
          </div>
        </div>

        {/* Zone de texte */}
        <div style={{ position: 'relative' }}>
          <textarea 
            value={sqlToAnalyze}
            onChange={(e) => setSqlToAnalyze(e.target.value)}
            placeholder="Collez ici votre requête SQL Oracle à optimiser..."
            style={{ 
              width: '100%', height: '140px', padding: '20px', 
              borderRadius: '12px', marginBottom: '20px', 
              fontFamily: "'Fira Code', monospace", fontSize: '0.9rem',
              background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155',
              color: '#38bdf8', outline: 'none', resize: 'vertical'
            }}
          />
          <div style={{ position: 'absolute', bottom: '35px', right: '15px', color: '#334155' }}>
            <Activity size={40} opacity={0.1} />
          </div>
        </div>

        {/* Bouton d'action */}
        <button 
          onClick={handleDeepAnalysis}
          disabled={loading || !sqlToAnalyze}
          style={{ 
            background: loading ? '#334155' : 'linear-gradient(90deg, #8b5cf6, #6366f1)', 
            color: 'white', padding: '14px 32px', border: 'none', 
            borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', 
            display: 'flex', alignItems: 'center', gap: '12px',
            fontWeight: 700, transition: 'all 0.3s ease',
            boxShadow: loading ? 'none' : '0 4px 15px rgba(139, 92, 246, 0.3)'
          }}
        >
          {loading ? (
            <Sparkles size={20} className="animate-spin" />
          ) : (
            <Zap size={20} fill="white" />
          )}
          {loading ? "L'IA analyse le plan d'exécution..." : "Lancer l'Expertise IA Tactique"}
        </button>

        {/* Bouton de sauvegarde (affiché après analyse) */}
        {result && !loading && (
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '15px', animation: 'slideUp 0.3s' }}>
            <button 
              onClick={handleSaveReport}
              disabled={saveLoading}
              style={{ 
                background: saveSuccess ? '#059669' : 'rgba(16, 185, 129, 0.1)', 
                color: saveSuccess ? 'white' : '#10b981', 
                padding: '12px 24px', border: saveSuccess ? 'none' : '1px solid #10b981', 
                borderRadius: '10px', cursor: 'pointer', 
                display: 'flex', alignItems: 'center', gap: '10px',
                fontWeight: 700, transition: 'all 0.3s ease'
              }}
            >
              {saveLoading ? <Activity className="animate-spin" size={18} /> : <CheckCircle size={18} />}
              {saveSuccess ? "Rapport Archivé avec Succès" : "Générer & Sauvegarder le Rapport PDF"}
            </button>
            {saveSuccess && (
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Retrouvez ce document dans l'onglet <strong>Historique</strong>.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Résultats */}
      {result && <AnalysisRenderer {...result} />}
    </div>
  );
}