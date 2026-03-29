import React, { useState, useEffect } from 'react';
import api from '../api';
import GlassCard from '../components/GlassCard';
import { ShieldCheck, Database, Rocket, Info, Users, Activity, Loader2, AlertTriangle, ShieldAlert, Cpu, HardDrive, Bot } from 'lucide-react';

export default function AuditPage({ onNavigate }) {
  const [bases, setBases]     = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState('version');
  
  // States pour le plan d'exécution SQL
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [activeSqlId, setActiveSqlId] = useState(null);

  useEffect(() => {
    api.get('/api/bases').then(r => {
      setBases(r.data);
      if (r.data.length) setSelected(String(r.data[0].ID));
    });
  }, []);

  const launch = async () => {
    setLoading(true); setError(''); setResult(null);
    // On réinitialise aussi le plan d'exécution si on lance un nouvel audit
    setSelectedPlan(null); setActiveSqlId(null);
    try {
      const { data } = await api.get(`/api/audit/${selected}`);
      setResult(data.data);
      setTab('version');
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur d'audit système.");
    } finally {
      setLoading(false);
    }
  };

  const launchAiAnalysis = () => {
    localStorage.setItem('og_audit_analyze_request', JSON.stringify({ id_base: selected }));
    if (onNavigate) onNavigate('assistant_ia');
  };

  // --- FONCTION POUR RÉCUPÉRER LE PLAN ---
  const fetchExecutionPlan = async (id_base, sql_id) => {
    if (activeSqlId === sql_id) {
      setSelectedPlan(null);
      setActiveSqlId(null);
      return;
    }

    setLoadingPlan(true);
    setActiveSqlId(sql_id);
    setSelectedPlan(null);

    try {
      const res = await api.get(`/api/diagnostics/plan/${id_base}/${sql_id}`);
      
      console.log("Données brutes reçues :", res.data); 
      
      const planData = res.data.plan ? res.data.plan : res.data;
      
      setSelectedPlan(planData);
    } catch (err) {
      console.error("Erreur lors du chargement du plan d'exécution:", err);
    } finally {
      setLoadingPlan(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon"><ShieldCheck size={28} /></div>
        <div>
          <h1 className="page-title text-gradient">Audit Système Détaillé</h1>
          <p className="page-subtitle">Rapport d'intégrité et analyse d'instances en temps réel</p>
        </div>
      </div>

      <GlassCard style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Database size={14} /> Cibler une instance pour l'audit</label>
            <div style={{ position: 'relative' }}>
              <select value={selected} onChange={e => setSelected(e.target.value)} style={{ paddingLeft: 44, height: 50 }}>
                {bases.map(b => <option key={b.ID} value={b.ID}>{b.Instance} — {b.IP}</option>)}
              </select>
              <Database size={18} color="#64748b" style={{ position: 'absolute', left: 16, top: 16, pointerEvents: 'none' }} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={launch} disabled={loading || !selected} style={{ height: 50, padding: '0 32px' }}>
            {loading ? <><Loader2 size={18} className="spinner" /> EXTRACTION...</> : <><Rocket size={18} /> LANCER L'ANALYSE</>}
          </button>
        </div>
      </GlassCard>

      {error && (
        <div className="alert alert-error" style={{ animation: 'slideUp 0.3s' }}>
          <ShieldAlert size={18} /> {error}
        </div>
      )}

      {result && (
        <GlassCard style={{ animation: 'slideUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 16 }}>
            <div className="tabs" style={{ marginBottom: 0 }}>
              <button className={`tab${tab==='version'?' active':''}`} onClick={() => setTab('version')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Info size={16} /> Rapport Versioning</button>
              <button className={`tab${tab==='session'?' active':''}`} onClick={() => setTab('session')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={16} /> Sessions Actives</button>
              <button className={`tab${tab==='sql'?' active':''}`} onClick={() => setTab('sql')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={16} /> Diagnostic SQL</button>
              <button className={`tab${tab==='cpu'?' active':''}`} onClick={() => setTab('cpu')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Cpu size={16} /> Processeur (CPU)</button>
              <button className={`tab${tab==='ram'?' active':''}`} onClick={() => setTab('ram')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><HardDrive size={16} /> Mémoire (RAM)</button>
            </div>
            <button className="btn btn-primary" onClick={launchAiAnalysis} style={{ background: 'linear-gradient(90deg, #8b5cf6, #d946ef)', border: 'none', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)' }}>
              <Bot size={18} /> Demander l'Expertise IA
            </button>
          </div>

          <div style={{ minHeight: 300 }}>
            {tab === 'version' && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: 16 }}>Environnement d'Exécution & Correctifs</h3>
                {result.version?.length ? result.version.map((v,i) => (
                  <div key={i} className="code-block" style={{ marginBottom: 16, boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                    <span style={{ color: '#0ea5e9', marginRight: 10 }}>❯</span> {v}
                  </div>
                )) : <div className="alert alert-info" style={{ background: 'rgba(14, 165, 233, 0.05)' }}><Info size={18} /> Aucun rapport version disponible.</div>}
              </div>
            )}

            {tab === 'session' && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: 16 }}>Sessions Utilisateurs Oracle</h3>
                {result.session?.length ? (
                  <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                    <table className="og-table">
                      <thead style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                        <tr>{['SID','SERIAL#','UTILISATEUR','STATUT','HÔTE CONNECTÉ'].map(h => <th key={h}>{h}</th>)}</tr>
                      </thead>
                      <tbody>{result.session.map((s,i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: '#94a3b8' }}>{s.SID}</td>
                          <td className="title-font" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{s['SERIAL#']}</td>
                          <td style={{ color: '#38bdf8', fontWeight: 500 }}>{s.USERNAME}</td>
                          <td>
                            <span className={`badge ${s.STATUS==='ACTIVE'?'badge-green':'badge-yellow'}`}>
                              <span style={{ width:6, height:6, borderRadius:'50%', background:'currentColor', display:'inline-block', marginRight:6 }}></span>
                              {s.STATUS}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{s.MACHINE}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <div className="alert alert-info"><Info size={18} /> Aucune session utilisateur active détectée sur cette base.</div>}
              </div>
            )}

            {tab === 'sql' && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: 16 }}>Top 10 — Requêtes intensives en mémoire</h3>
                {result.sql?.length ? (
                  <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                    <table className="og-table">
                      <thead style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                        <tr>{['SQL_ID','Extrait SQL','Fréquence Exécution','Dernière Exécution','Mémoire (Mo)'].map(h => <th key={h}>{h}</th>)}</tr>
                      </thead>
                      <tbody>{result.sql.map((s,i) => (
                        <tr 
                          key={i}
                          onClick={() => fetchExecutionPlan(selected, s.SQL_ID)}
                          style={{ 
                            cursor: 'pointer', 
                            backgroundColor: activeSqlId === s.SQL_ID ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                            transition: 'background-color 0.2s ease'
                          }}
                        >
                          <td><span className="badge badge-purple" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem' }}>{s.SQL_ID}</span></td>
                          <td style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.8rem', maxWidth: 450, color: '#bae6fd', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.SQL_TEXT}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className="title-font" style={{ fontWeight: 700, color: '#f8fafc' }}>{s.EXECUTIONS}</span>
                              {s.EXECUTIONS > 500 && <AlertTriangle size={14} color="#f59e0b" />}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                            {s.LAST_ACTIVE_TIME ? new Date(s.LAST_ACTIVE_TIME).toLocaleString() : 'N/A'}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>
                            {s.MEMORY_MB !== null ? `${s.MEMORY_MB} Mo` : 'N/A'}
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <div className="alert alert-info"><Info size={18} /> Aucune information de requête coûteuse remontée par l'instance.</div>}

                {/* --- AFFICHAGE DU PLAN D'EXÉCUTION MODIFIÉ --- */}
                {loadingPlan && (
                  <div style={{ marginTop: '20px', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity className="animate-spin" size={18} /> Extraction du plan depuis Oracle...
                  </div>
                )}

                {selectedPlan && !loadingPlan && (
                  <div style={{ 
                    marginTop: '25px', 
                    background: '#0f172a', 
                    borderRadius: '12px', 
                    border: '1px solid #1e293b',
                    overflow: 'hidden',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    animation: 'fadeIn 0.3s ease-in-out'
                  }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', display: 'flex', gap: '8px' }}>
                        Plan d'Exécution : <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>{activeSqlId}</span>
                      </h3>
                    </div>
                    
                    {/* VÉRIFICATION SI LE TABLEAU EST VIDE */}
                    {selectedPlan.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#f8fafc', fontSize: '0.85rem', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #1e293b', background: 'rgba(15, 23, 42, 0.6)' }}>
                              <th style={{ padding: '12px 20px', fontWeight: 600, color: '#94a3b8' }}>Id</th>
                              <th style={{ padding: '12px 20px', fontWeight: 600, color: '#94a3b8' }}>Operation</th>
                              <th style={{ padding: '12px 20px', fontWeight: 600, color: '#94a3b8' }}>Name</th>
                              <th style={{ padding: '12px 20px', fontWeight: 600, color: '#94a3b8' }}>Rows</th>
                              <th style={{ padding: '12px 20px', fontWeight: 600, color: '#94a3b8' }}>Cost (%CPU)</th>
                              <th style={{ padding: '12px 20px', fontWeight: 600, color: '#94a3b8' }}>Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPlan.map((row, index) => (
                              <tr key={index} style={{ borderBottom: '1px solid #1e293b' }}>
                                <td style={{ padding: '10px 20px', color: '#64748b' }}>{row.id}</td>
                                <td style={{ padding: '10px 20px', whiteSpace: 'pre', fontFamily: "'Fira Code', monospace", color: '#e2e8f0' }}>
                                  {row.operation}
                                </td>
                                <td style={{ padding: '10px 20px', color: '#38bdf8', fontWeight: 500 }}>{row.name}</td>
                                <td style={{ padding: '10px 20px' }}>{row.rows}</td>
                                <td style={{ padding: '10px 20px' }}>{row.cost}</td>
                                <td style={{ padding: '10px 20px', color: '#10b981' }}>{row.time}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                        <Info size={32} style={{ margin: '0 auto 10px auto', color: '#64748b', display: 'block' }} />
                        <p style={{ margin: 0, fontSize: '0.95rem' }}>Ce plan d'exécution n'est plus disponible dans la mémoire d'Oracle.</p>
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Il a probablement été purgé du Shared Pool car la requête est trop ancienne.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === 'cpu' && result.cpu && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: 16 }}>Analyse CPU en Temps Réel</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24, padding: 20, background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>CPU Utilisé</span>
                      <span style={{ fontSize: '0.9rem', color: '#38bdf8', fontWeight: 700 }}>{result.cpu.busy_pct}%</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${result.cpu.busy_pct}%`, background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)', borderRadius: 4, transition: 'width 1s ease-in-out' }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Inactif</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>{result.cpu.idle_pct}%</div>
                  </div>
                </div>

                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>Top 5 Utilisateurs CPU</h4>
                {result.cpu.history?.length ? (
                  <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                    <table className="og-table">
                      <thead style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                        <tr>
                          <th>Utilisateur</th>
                          <th>Temps CPU (s)</th>
                        </tr>
                      </thead>
                      <tbody>{result.cpu.history.map((h, i) => (
                        <tr key={i}>
                          <td style={{ color: '#38bdf8', fontWeight: 600 }}>{h.User}</td>
                          <td className="title-font" style={{ fontWeight: 700, color: '#e2e8f0' }}>{h.CPU} s</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <div className="alert alert-info"><Info size={18} /> Aucun historique CPU disponible.</div>}
              </div>
            )}

            {tab === 'ram' && result.ram && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: 16 }}>Analyse Mémoire (SGA & PGA)</h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24, padding: 20, background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>RAM Utilisée ({result.ram.used_mb} Mo / {result.ram.max_mb} Mo)</span>
                      <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 700 }}>{result.ram.ram_pct}%</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${result.ram.ram_pct}%`, background: 'linear-gradient(90deg, #059669, #10b981)', borderRadius: 4, transition: 'width 1s ease-in-out' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Total SGA</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>{result.ram.sga_total_mb} Mo</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Total PGA</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>{result.ram.pga_total_mb} Mo</div>
                    </div>
                  </div>
                </div>

                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>Classification Allocation SGA</h4>
                {result.ram.sga_detail?.length ? (
                  <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                    <table className="og-table">
                      <thead style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                        <tr>
                          <th>Composant SGA</th>
                          <th>Mémoire Allouée (Mo)</th>
                        </tr>
                      </thead>
                      <tbody>{result.ram.sga_detail.map((c, i) => (
                        <tr key={i}>
                          <td style={{ color: '#10b981', fontWeight: 500 }}>{c.Composant}</td>
                          <td className="title-font" style={{ fontWeight: 700, color: '#e2e8f0' }}>{c.Mo} Mo</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <div className="alert alert-info"><Info size={18} /> Aucun détail SGA disponible.</div>}
              </div>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
}