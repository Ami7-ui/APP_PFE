import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, Zap, Search, Activity, Database, Sparkles, AlertCircle } from 'lucide-react';

export default function AiAssistantPage() {
  const [sqlToAnalyze, setSqlToAnalyze] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bases, setBases] = useState([]);
  const [selectedBase, setSelectedBase] = useState("");

  // Style commun pour les cartes
  const cardStyle = {
    background: 'rgba(30, 41, 59, 0.4)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
  };

  useEffect(() => {
    const fetchBasesAndCheckAudit = async () => {
      let initialBaseId = "";
      try {
        const res = await axios.get('http://localhost:8000/api/bases');
        setBases(res.data);
        if (res.data.length > 0) {
          const firstBase = res.data[0];
          initialBaseId = firstBase.id !== undefined ? firstBase.id : firstBase[0];
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
          const res = await axios.post('http://localhost:8000/api/ai/analyze_audit', {
            id_base: parseInt(id_base)
          });
          setResult(res.data);
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
      const res = await axios.post('http://localhost:8000/api/ai/analyze_sql', {
        id_base: parseInt(selectedBase),
        sql_query: sqlToAnalyze
      });
      setResult(res.data);
    } catch {
      alert("Erreur lors de l'analyse : vérifiez que la route /api/ai/analyze_sql existe dans le backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ color: '#f1f5f9', maxWidth: '1200px', margin: '0 auto' }}>
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
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Assistant DBA Intelligent</h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Analyse de performance et optimisation de plans d'exécution</p>
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
                color: 'white', cursor: 'pointer', outline: 'none', width: '250px'
              }}
            >
              {bases.map((b, idx) => {
                const id = b.id !== undefined ? b.id : b[0];
                const nom = b.nom || b[1];
                return <option key={idx} value={id}>{nom}</option>;
              })}
            </select>
          </div>
          <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
            ORACLEGUARD AI ENGINE V1
          </div>
        </div>

        {/* Zone de texte */}
        <div style={{ position: 'relative' }}>
          <textarea 
            value={sqlToAnalyze}
            onChange={(e) => setSqlToAnalyze(e.target.value)}
            placeholder="Collez ici votre requête SQL Oracle à optimiser..."
            style={{ 
              width: '100%', height: '180px', padding: '20px', 
              borderRadius: '12px', marginBottom: '20px', 
              fontFamily: "'Fira Code', monospace", fontSize: '0.9rem',
              background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155',
              color: '#38bdf8', outline: 'none', resize: 'vertical'
            }}
          />
          <div style={{ position: 'absolute', bottom: '35px', right: '15px', color: '#334155' }}>
            <Activity size={40} opacity={0.2} />
          </div>
        </div>

        {/* Bouton d'action */}
        <button 
          onClick={handleDeepAnalysis}
          disabled={loading || !sqlToAnalyze}
          style={{ 
            background: loading ? '#334155' : 'linear-gradient(90deg, #8b5cf6, #6366f1)', 
            color: 'white', padding: '14px 28px', border: 'none', 
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
          {loading ? "L'IA analyse le plan d'exécution..." : "Lancer l'Expertise IA"}
        </button>
      </div>

      {/* Résultats */}
      {result && (
        <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', animation: 'fadeIn 0.5s ease' }}>
          {/* Plan d'exécution ou Contexte */}
          <div style={{ ...cardStyle, background: '#020617' }}>
            <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981' }}>
              <Search size={18} /> {result.context_brut ? "Contexte d'Audit Envoyé" : "Plan d'Exécution Réel"}
            </h4>
            <pre style={{ 
              fontSize: '11px', color: '#10b981', overflowX: 'auto', 
              whiteSpace: 'pre-wrap', fontFamily: 'monospace', opacity: 0.9 
            }}>
              {result.context_brut || result.plan_brut || "Aucun contexte/plan généré."}
            </pre>
          </div>

          {/* Analyse IA */}
          <div style={{ ...cardStyle, borderLeft: '4px solid #8b5cf6' }}>
            <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#a78bfa' }}>
              <Sparkles size={18} /> Recommandations IA
            </h4>
            <div style={{ 
              fontSize: '0.95rem', lineHeight: '1.7', color: '#cbd5e1', 
              whiteSpace: 'pre-wrap' 
            }}>
              {result.rapport_ia || result.analyse_ia || result.reponse}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}