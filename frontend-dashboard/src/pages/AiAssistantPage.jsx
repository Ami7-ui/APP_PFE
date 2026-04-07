import React, { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { Bot, Zap, Activity, Database, Sparkles, CheckCircle, Terminal, AlertTriangle, ShieldCheck, Lock, Cpu, Cloud, ArrowRight } from 'lucide-react';
import AiResponseViewer from '../components/AiResponseViewer';
import useAppStore from '../store/useAppStore';

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

// ── COMPOSANT : Indicateur de Chargement Multi-Étapes ──────────────────────
const PIPELINE_STEPS = [
  { id: 1, label: 'Collecte des métriques (Audit complet)', icon: Database, color: '#38bdf8' },
  { id: 2, label: 'Diagnostic local sécurisé (LLaMA 3)', icon: Cpu, color: '#8b5cf6' },
  { id: 3, label: 'Extraction & purge des données sensibles', icon: Lock, color: '#f59e0b' },
  { id: 4, label: 'Consultation Expert Cloud (Nvidia Nemotron)', icon: Cloud, color: '#10b981' },
];

function PipelineLoader({ currentStep }) {
  return (
    <div style={{ ...cardStyle, border: '1px solid rgba(139, 92, 246, 0.3)', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.7))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>
          <ShieldCheck size={22} color="white" />
        </div>
        <div>
          <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '1rem' }}>Pipeline Hybride Sécurisé en cours...</div>
          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Les données brutes restent sur le serveur local</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PIPELINE_STEPS.map((step) => {
          const StepIcon = step.icon;
          const isDone = currentStep > step.id;
          const isActive = currentStep === step.id;
          return (
            <div key={step.id} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
              borderRadius: 10,
              background: isActive ? 'rgba(139, 92, 246, 0.1)' : isDone ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
              border: isActive ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
              transition: 'all 0.4s ease',
              opacity: isDone || isActive ? 1 : 0.4
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: isDone ? 'rgba(16, 185, 129, 0.15)' : isActive ? `rgba(139, 92, 246, 0.15)` : 'rgba(255,255,255,0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}>
                {isDone ? <CheckCircle size={18} color="#10b981" /> : isActive ? <StepIcon size={18} color={step.color} className="animate-pulse" /> : <StepIcon size={18} color="#475569" />}
              </div>
              <span style={{ flex: 1, fontSize: '0.9rem', color: isDone ? '#10b981' : isActive ? '#f8fafc' : '#475569', fontWeight: isActive ? 700 : 400, transition: 'all 0.3s ease' }}>
                {step.label}
              </span>
              {isDone && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '3px 10px', borderRadius: 20 }}>TERMINÉ</span>}
              {isActive && <span style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 700, background: 'rgba(139,92,246,0.1)', padding: '3px 10px', borderRadius: 20, animation: 'pulse 1.5s infinite' }}>EN COURS</span>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 20, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(currentStep / PIPELINE_STEPS.length) * 100}%`, background: 'linear-gradient(90deg, #8b5cf6, #d946ef, #10b981)', borderRadius: 4, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

// ── COMPOSANT : Rendu des Résultats IA ─────────────────────────────────────
function AnalysisRenderer({ rapport_ia, analyse_ia, reponse, status, diagnostic_local, solutions_expertes }) {
  const content = rapport_ia || { status, diagnostic_local, solutions_expertes } || analyse_ia || reponse;

  // Pipeline Hybride Sécurisé
  if (content.status === 'success' || content.diagnostic_local) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', animation: 'fadeIn 0.5s ease', marginTop: 24 }}>

        {/* Bandeau Sécurité */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
          background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08), rgba(139, 92, 246, 0.08))',
          border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 12
        }}>
          <ShieldCheck size={20} color="#10b981" />
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            <strong style={{ color: '#10b981' }}>Pipeline Hybride Sécurisé</strong> — Les données brutes ont été traitées localement par LLaMA 3. Seules les anomalies textuelles ont transité vers le Cloud.
          </span>
        </div>

        {/* ─── NIVEAU 1 : Diagnostic Local (LLaMA 3) ─────────────────────── */}
        <div style={{
          ...cardStyle,
          borderLeft: '4px solid #8b5cf6',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.06), transparent)',
          position: 'relative', overflow: 'hidden'
        }}>
          {/* Accent glow */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.06)', filter: 'blur(40px)' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Cpu size={20} color="#a78bfa" />
              </div>
              <div>
                <h4 style={{ margin: 0, color: '#e2e8f0', fontSize: '1rem', fontWeight: 700 }}>Diagnostic Local — LLaMA 3</h4>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Évolution des 6 catégories & Anomalies détectées</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: '0.65rem', color: '#a78bfa', background: 'rgba(139, 92, 246, 0.1)', padding: '4px 12px', borderRadius: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Lock size={10} /> DONNÉES LOCALES
              </span>
              <span style={{ fontSize: '0.65rem', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
                ÉTAPE 1 & 2
              </span>
            </div>
          </div>
          <div style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: '1.75', position: 'relative', zIndex: 1 }}>
            <AiResponseViewer content={content.diagnostic_local} />
          </div>
        </div>

        {/* ─── Séparateur visuel ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px' }}>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), rgba(16,185,129,0.3), transparent)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
            <Lock size={12} color="#f59e0b" />
            EXTRACTION SÉCURISÉE
            <ArrowRight size={14} color="#64748b" />
          </div>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.3), rgba(139,92,246,0.3), transparent)' }} />
        </div>

        {/* ─── NIVEAU 2 : Solutions Cloud (Nvidia Nemotron) ───────────────── */}
        <div style={{
          ...cardStyle,
          borderLeft: '4px solid #10b981',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06), transparent)',
          position: 'relative', overflow: 'hidden'
        }}>
          {/* Accent glow */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.06)', filter: 'blur(40px)' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Cloud size={20} color="#34d399" />
              </div>
              <div>
                <h4 style={{ margin: 0, color: '#e2e8f0', fontSize: '1rem', fontWeight: 700 }}>Solutions Expertes — Nvidia Nemotron</h4>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Recommandations SQL/PLSQL & Prévention</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: '0.65rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 12px', borderRadius: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Cloud size={10} /> API CLOUD
              </span>
              <span style={{ fontSize: '0.65rem', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
                ÉTAPE 3 & 4
              </span>
            </div>
          </div>
          <div style={{
            fontSize: '0.95rem', color: '#f1f5f9', lineHeight: '1.8',
            background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px',
            border: '1px solid rgba(16, 185, 129, 0.1)',
            position: 'relative', zIndex: 1
          }}>
            <AiResponseViewer content={content.solutions_expertes} />
          </div>
          <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', fontSize: '0.8rem', position: 'relative', zIndex: 1 }}>
            <CheckCircle size={14} color="#10b981" />
            <span>Analyse propulsée par <strong style={{ color: '#34d399' }}>Nvidia Nemotron Nano 9B v2</strong> — Aucune donnée brute transmise</span>
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
  const { aiState, setAiState } = useAppStore();
  const { sqlToAnalyze, result, loading, pipelineStep, selectedBase } = aiState;

  // UI-only state (these reset when navigating away, which is fine)
  const [bases, setBases] = React.useState([]);
  const [saveLoading, setSaveLoading] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const pipelineTimerRef = useRef(null);

  // Helpers to update individual fields in the store
  const setSqlToAnalyze = (val) => setAiState({ sqlToAnalyze: val });
  const setResult = (val) => setAiState({ result: val });
  const setLoading = (val) => setAiState({ loading: val });
  const setPipelineStep = (val) => setAiState({ pipelineStep: val });
  const setSelectedBase = (val) => setAiState({ selectedBase: val });

  // Simule la progression visuelle du pipeline pendant l'appel API
  const startPipelineAnimation = () => {
    setAiState({ pipelineStep: 1 });
    let step = 1;
    pipelineTimerRef.current = setInterval(() => {
      step += 1;
      if (step <= 4) {
        setAiState({ pipelineStep: step });
      } else {
        clearInterval(pipelineTimerRef.current);
      }
    }, 8000); // ~8s par étape (le pipeline complet prend ~30-40s)
  };

  const stopPipelineAnimation = () => {
    if (pipelineTimerRef.current) clearInterval(pipelineTimerRef.current);
    setAiState({ pipelineStep: 5 }); // Toutes les étapes terminées
  };

  const runSecureAudit = async (id_base) => {
    setAiState({ loading: true, result: null });
    setSaveSuccess(false);
    startPipelineAnimation();
    try {
      const res = await api.post('/api/ai/analyze_audit', {
        id_base: parseInt(id_base)
      });
      setAiState({ result: res.data });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    } catch {
      alert("Erreur lors de l'analyse IA de l'audit.");
    } finally {
      stopPipelineAnimation();
      setAiState({ loading: false });
    }
  };

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

      // Cross-page trigger: AuditPage sets this in localStorage, we pick it up once
      const stored = localStorage.getItem('og_audit_analyze_request');
      if (stored) {
        localStorage.removeItem('og_audit_analyze_request');
        const { id_base } = JSON.parse(stored);
        setSelectedBase(String(id_base));
        await runSecureAudit(id_base);
      } else {
        // Only set default base if none is already selected in the store
        if (!selectedBase && initialBaseId) setSelectedBase(String(initialBaseId));
      }
    };
    fetchBasesAndCheckAudit();
    return () => { if (pipelineTimerRef.current) clearInterval(pipelineTimerRef.current); };
  }, []);

  const handleDeepAnalysis = async () => {
    if (!selectedBase || !sqlToAnalyze) return;
    setAiState({ loading: true, result: null });
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
      <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
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
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Pipeline Hybride Sécurisé — Diagnostic Local + Solutions Cloud</p>
          </div>
        </div>
        {/* Badge Sécurité */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
          background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08), rgba(139, 92, 246, 0.08))',
          border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 10
        }}>
          <ShieldCheck size={16} color="#10b981" />
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
            <span style={{ color: '#10b981' }}>SECURE</span> — Données brutes jamais envoyées au Cloud
          </span>
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
            ORACLEGUARD HYBRID AI V2.0
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

        {/* Boutons d'action */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
            {loading ? "Analyse en cours..." : "Analyser SQL (Local)"}
          </button>

          <button 
            onClick={() => runSecureAudit(selectedBase)}
            disabled={loading || !selectedBase}
            style={{ 
              background: loading ? '#334155' : 'linear-gradient(90deg, #10b981, #059669)', 
              color: 'white', padding: '14px 32px', border: 'none', 
              borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', 
              display: 'flex', alignItems: 'center', gap: '12px',
              fontWeight: 700, transition: 'all 0.3s ease',
              boxShadow: loading ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.3)'
            }}
          >
            <ShieldCheck size={20} />
            {loading ? "Pipeline sécurisé en cours..." : "Audit Complet Sécurisé"}
          </button>
        </div>

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

      {/* Pipeline Loader (visible pendant l'analyse) */}
      {loading && <PipelineLoader currentStep={pipelineStep} />}

      {/* Résultats */}
      {result && !loading && <AnalysisRenderer {...result} />}
    </div>
  );
}