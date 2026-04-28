import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { Settings2, Database, Play, CheckCircle, Terminal, AlertCircle, Loader2, ChevronDown, ChevronUp, CheckSquare, Square, Search, X, ChevronRight, GitBranch, Bot } from 'lucide-react';

export default function ConfigurationPage() {
  const navigate = useNavigate();
  const [bases, setBases] = useState([]);
  const [selectedBase, setSelectedBase] = useState(() => localStorage.getItem('og_dashboard_base') || '');
  const [categories, setCategories] = useState({});
  const [selectedScripts, setSelectedScripts] = useState(() => {
    const saved = localStorage.getItem('og_dashboard_metrics');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // Ref pour fermer le dropdown si on clique en dehors
  const dropdownRef = useRef(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSqlId, setModalSqlId] = useState('');
  const [phvs, setPhvs] = useState([]);
  const [loadingPhvs, setLoadingPhvs] = useState(false);
  const [selectedPhv, setSelectedPhv] = useState(null);
  const [planDetails, setPlanDetails] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    // Charger les bases
    api.get('/api/bases').then(r => { 
      setBases(r.data); 
      if (r.data.length > 0 && !localStorage.getItem('og_dashboard_base')) setSelectedBase(String(r.data[0].ID)); 
    }).catch(() => setError("Erreur de chargement des bases cibles."));

    // Charger les scripts catégorisés
    api.get('/api/diagnostics/scripts').then(r => {
      setCategories(r.data);
    }).catch(err => {
      console.error(err);
      setError("Erreur de chargement des métriques.");
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('og_dashboard_metrics', JSON.stringify(selectedScripts));
  }, [selectedScripts]);

  useEffect(() => {
    if (selectedBase) {
      localStorage.setItem('og_dashboard_base', selectedBase);
    }
  }, [selectedBase]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleScript = (script) => {
    setSelectedScripts(prev => {
      const exists = prev.find(s => s.id === script.id);
      if (exists) return prev.filter(s => s.id !== script.id);
      return [...prev, script];
    });
  };

  const toggleCategory = (categoryName) => {
    if (openDropdown === categoryName) {
      setOpenDropdown(null);
    } else {
      setOpenDropdown(categoryName);
    }
  };

  const launchAudit = async () => {
    if (!selectedBase) return setError("Veuillez sélectionner une base cible.");
    if (selectedScripts.length === 0) return setError("Veuillez sélectionner au moins un script à exécuter.");
    
    setLoading(true); 
    setError(''); 
    setResults(null);
    
    try {
      const payload = {
        id_base: parseInt(selectedBase),
        scripts: selectedScripts
      };
      const response = await api.post('/api/audit/granular', payload);
      setResults(response.data.data); // data.data is the dict {"Script Name": [results]}
      setOpenDropdown(null);
    } catch (err) { 
      setError(err.response?.data?.detail || "Erreur lors de l'exécution de l'audit."); 
    } finally { 
      setLoading(false); 
    }
  };

  const launchAiAnalysis = () => {
    if (!selectedBase || !results) return;
    localStorage.setItem('og_granular_analyze_request', JSON.stringify({ 
      id_base: selectedBase,
      results: results
    }));
    navigate('/assistant-ia');
  };

  const openPlanModal = (sqlId) => {
    setModalSqlId(sqlId);
    setModalOpen(true);
    setPhvs([]);
    setSelectedPhv(null);
    setPlanDetails(null);
    setModalError('');
    setLoadingPhvs(true);

    api.get(`/api/sql-phvs/${selectedBase}/${sqlId}`)
      .then(r => {
        setPhvs(r.data.phvs || []);
      })
      .catch(err => {
        setModalError("Erreur lors de la récupération des PHVs.");
      })
      .finally(() => setLoadingPhvs(false));
  };

  const fetchPlanDetails = (phv) => {
    setSelectedPhv(phv);
    setLoadingPlan(true);
    setPlanDetails(null);
    setModalError('');

    api.get(`/api/sql-plan-details/${selectedBase}?sql_id=${modalSqlId}&phv=${phv}`)
      .then(r => {
        const rawData = r.data.data || [];
        const nodeMap = {};
        rawData.forEach(node => {
          node.depth = 0;
          nodeMap[node.ID || node.id] = node;
        });
        rawData.forEach(node => {
          const pId = node.PARENT_ID !== undefined ? node.PARENT_ID : node.parent_id;
          if (pId !== null && pId !== undefined && nodeMap[pId]) {
            node.depth = nodeMap[pId].depth + 1;
          }
        });
        setPlanDetails(rawData);
      })
      .catch(err => {
        setModalError("Erreur lors du chargement du plan.");
      })
      .finally(() => setLoadingPlan(false));
  };

  const totalScripts = Object.values(categories).reduce((acc, cat) => acc + cat.length, 0);

  return (
    <div style={{ paddingBottom: '60px' }}>
      <div className="page-header">
        <div className="page-header-icon" style={{ borderColor: 'rgba(56, 189, 248, 0.3)', background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(14, 165, 233, 0.15))', color: '#38bdf8', boxShadow: 'inset 0 0 20px rgba(56, 189, 248, 0.15)' }}>
          <Settings2 size={28} />
        </div>
        <div>
          <h1 className="page-title text-gradient" style={{ background: 'linear-gradient(135deg, #7dd3fc, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Diagnostic SQL "À la Carte"
          </h1>
          <p className="page-subtitle">Configurez et lancez un audit ciblé en sélectionnant vos métriques</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ animation: 'slideUp 0.3s', marginBottom: 24 }}><AlertCircle size={18} /> {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* COLONNE GAUCHE : FORMULAIRE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} ref={dropdownRef}>
          <GlassCard style={{ padding: '24px', position: 'relative', overflow: 'visible' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database size={20} color="#0ea5e9" /> Configuration
            </h2>
            
            {/* SELECTEUR BASE */}
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
                <Database size={14} /> 1. Sélectionner l'Instance Cible
              </label>
              <div style={{ position: 'relative' }}>
                <select 
                  value={selectedBase} 
                  onChange={e => setSelectedBase(e.target.value)} 
                  style={{ 
                    paddingLeft: 44, 
                    height: 50, 
                    width: '100%', 
                    background: 'rgba(15, 23, 42, 0.6)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '12px',
                    color: '#e2e8f0',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}>
                  <option value="" disabled>-- Choisir une base --</option>
                  {bases.map(b => <option key={b.ID} value={b.ID}>{b.Instance} — {b.IP}</option>)}
                </select>
                <Database size={18} color="#0ea5e9" style={{ position: 'absolute', left: 16, top: 16, pointerEvents: 'none' }} />
                <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: 16, top: 18, pointerEvents: 'none' }} />
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '20px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', margin: 0 }}>
                <Terminal size={14} /> 2. Sélectionner les scripts ({selectedScripts.length} choisis)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button"
                  onClick={() => {
                    const allScripts = Object.values(categories).flat();
                    setSelectedScripts(allScripts);
                  }}
                  className="btn btn-ghost"
                  style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}
                >
                  Tout sélectionner
                </button>
                {selectedScripts.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedScripts([]);
                      localStorage.removeItem('og_dashboard_metrics');
                    }}
                    className="btn btn-ghost"
                    style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                  >
                    Réinitialiser le Dashboard
                  </button>
                )}
              </div>
            </div>

            {/* LISTES DÉROULANTES MULTIPLES */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(categories).map(([catName, scripts]) => {
                const isOpen = openDropdown === catName;
                const selectedInCat = scripts.filter(s => selectedScripts.some(ss => ss.id === s.id)).length;
                
                return (
                  <div key={catName} style={{ position: 'relative' }}>
                    <button 
                      onClick={() => toggleCategory(catName)}
                      style={{ 
                        width: '100%',
                        padding: '14px 16px',
                        background: isOpen ? 'rgba(14, 165, 233, 0.1)' : 'rgba(15, 23, 42, 0.4)',
                        border: isOpen ? '1px solid rgba(14, 165, 233, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        color: isOpen ? '#38bdf8' : '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontWeight: isOpen ? 600 : 500
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>{catName}</span>
                        {selectedInCat > 0 && <span style={{ background: '#0ea5e9', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>{selectedInCat}</span>}
                      </div>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    
                    {/* LE CONTENU DU DROPDOWN */}
                    {isOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '8px',
                        background: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '12px',
                        padding: '10px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        zIndex: 50,
                        maxHeight: '250px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        animation: 'fadeIn 0.2s'
                      }}>
                        {scripts.map(script => {
                          const isSelected = selectedScripts.some(s => s.id === script.id);
                          return (
                            <div 
                              key={script.id} 
                              onClick={() => toggleScript(script)}
                              style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                background: isSelected ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                            >
                              {isSelected ? <CheckSquare size={18} color="#0ea5e9" /> : <Square size={18} color="#64748b" />}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.85rem', color: isSelected ? '#38bdf8' : '#e2e8f0', fontWeight: isSelected ? 600 : 400 }}>{script.nom}</div>
                              </div>
                            </div>
                          );
                        })}
                        {scripts.length === 0 && <div style={{ padding: '10px', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>Aucun script</div>}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {Object.keys(categories).length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', color: '#64748b', fontSize: '0.85rem' }}>
                  Aucune catégorie chargée. Ajoutez des scripts via la page dédiée.
                </div>
              )}
            </div>

            <div style={{ marginTop: '30px' }}>
              <button 
                className="btn btn-primary btn-full" 
                onClick={launchAudit} 
                disabled={loading || !selectedBase || selectedScripts.length === 0}
                style={{ height: '54px', fontSize: '1.05rem', boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
              >
                {loading ? <><Loader2 size={20} className="spinner" /> Exécution en cours...</> : <><Play size={20} /> Lancer l'Audit</>}
              </button>
            </div>
          </GlassCard>
        </div>

        {/* COLONNE DROITE : RESULTATS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {results && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button 
                className="btn btn-primary" 
                onClick={launchAiAnalysis} 
                style={{ background: 'linear-gradient(90deg, #8b5cf6, #d946ef)', border: 'none', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Bot size={18} /> Analyse IA des Résultats
              </button>
            </div>
          )}
          {results ? (
            Object.entries(results).map(([scriptName, dataArray], index) => {
              const isError = dataArray.length > 0 && !!dataArray[0].Erreur;
              return (
                <GlassCard key={index} style={{ border: isError ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)', animation: `slideUp 0.4s ease ${index * 0.1}s` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                     <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
                        {isError ? <AlertCircle size={20} color="#ef4444" /> : <CheckCircle size={20} color="#10b981" />} 
                        {scriptName}
                     </h3>
                     <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                       {dataArray.length} lignes
                     </span>
                  </div>

                  {isError ? (
                    <div className="alert alert-error" style={{ margin: 0 }}>{dataArray[0].Erreur}</div>
                  ) : dataArray.length > 0 ? (
                    <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', maxHeight: '400px' }}>
                      <table className="og-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                         <thead style={{ position: 'sticky', top: 0, background: 'rgba(15, 23, 42, 0.95)', zIndex: 10, backdropFilter: 'blur(5px)' }}>
                           <tr>{Object.keys(dataArray[0]).map(k => <th key={k} style={{ padding: '10px 14px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{k}</th>)}</tr>
                         </thead>
                         <tbody>{dataArray.map((r,i) => (
                           <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                             {Object.keys(dataArray[0]).map((k, j) => {
                               const v = r[k];
                               return (
                                 <td key={j} style={{ padding: '8px 14px', color: '#cbd5e1', whiteSpace: 'nowrap', fontFamily: typeof v === 'number' ? "'Fira Code', monospace" : 'inherit' }}>
                                   {v != null ? (
                                     k.toUpperCase() === 'SQL_ID' ? (
                                       <button 
                                         onClick={() => openPlanModal(String(v))}
                                         style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontWeight: 600 }}
                                       >
                                         {String(v)}
                                       </button>
                                     ) : String(v)
                                   ) : <span style={{ color: '#64748b' }}>NULL</span>}
                                 </td>
                               );
                             })}
                           </tr>
                         ))}</tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                      <Search size={24} style={{ opacity: 0.5, marginBottom: '8px' }} /><br />
                      Aucune donnée retournée par la base pour ce script.
                    </div>
                  )}
                </GlassCard>
              );
            })
          ) : (
            <div style={{ 
              height: '100%', 
              minHeight: '400px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: '16px',
              background: 'rgba(15, 23, 42, 0.2)'
            }}>
              <Terminal size={48} color="#334155" style={{ marginBottom: '16px' }} />
              <div style={{ fontSize: '1.1rem', color: '#94a3b8', fontWeight: 600 }}>En attente d'exécution</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '8px', maxWidth: '300px', textAlign: 'center' }}>
                Sélectionnez une base et vos scripts dans le panneau de gauche pour commencer.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SQL PLAN MODAL */}
      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <GlassCard style={{ width: '100%', maxWidth: '1000px', height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    Détails de la requête : {modalSqlId}
                  </h2>
               </div>
               <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                  <X size={20} />
               </button>
            </div>
            
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.3)' }}>
               {modalError && <div className="alert alert-error" style={{ marginBottom: 16 }}><AlertCircle size={16} /> {modalError}</div>}
               <div style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>PHVs disponibles :</div>
               {loadingPhvs ? (
                 <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', fontSize: '0.85rem' }}><Loader2 size={16} className="spinner" /> Recherche des PHVs...</div>
               ) : phvs.length > 0 ? (
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                   {phvs.map(p => (
                     <button
                       key={p}
                       onClick={() => fetchPlanDetails(p)}
                       style={{
                         border: selectedPhv === p ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                         background: selectedPhv === p ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                         color: selectedPhv === p ? '#38bdf8' : '#94a3b8',
                         padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', fontFamily: "monospace",
                         transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
                       }}
                     >
                       <GitBranch size={14} /> {p}
                     </button>
                   ))}
                 </div>
               ) : (
                 <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Aucun plan disponible en mémoire / historique.</div>
               )}
            </div>

            <div style={{ flex: 1, padding: 0, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
               {loadingPlan ? (
                 <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                   <div style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
                     <Loader2 size={36} className="spinner" color="#38bdf8" />
                   </div>
                   <span style={{ color: '#94a3b8', fontWeight: 600 }}>Récupération de l'arbre...</span>
                 </div>
               ) : planDetails ? (
                 planDetails.length === 0 ? (
                    <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b' }}>
                      Le plan demandé est introuvable.
                    </div>
                 ) : (
                   <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, height: '100%', background: '#020617' }}>
                     <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '800px' }}>
                       <thead style={{ position: 'sticky', top: 0, background: 'rgba(15, 23, 42, 0.95)', zIndex: 10, backdropFilter: 'blur(5px)' }}>
                         <tr>
                           <th style={{ padding: '10px 16px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Operation (Options)</th>
                           <th style={{ padding: '10px 16px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Object Name</th>
                           <th style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Cost</th>
                           <th style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Rows</th>
                           <th style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Bytes</th>
                         </tr>
                       </thead>
                       <tbody>
                         {planDetails.map((node, i) => {
                           const depth = node.depth || 0;
                           const operation = node.OPERATION || node.operation;
                           const options = node.OPTIONS || node.options;
                           const opLabel = options ? `${operation} (${options})` : operation;
                           
                           const objName = node.OBJECT_NAME || node.object_name;
                           const cost = node.COST || node.cost;
                           const card = node.CARDINALITY || node.cardinality;
                           const bytes = node.BYTES || node.bytes;
                           
                           // Ligne accentuée si c'est un Full Table Scan
                           const isFTS = opLabel.toUpperCase().includes('FULL');
                           
                           return (
                             <tr key={i} style={{ 
                                 borderBottom: '1px solid rgba(255,255,255,0.02)',
                                 background: isFTS ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                             }}>
                               <td style={{ 
                                 padding: '8px 16px', 
                                 paddingLeft: `${16 + depth * 24}px`, 
                                 color: isFTS ? '#ef4444' : '#e2e8f0',
                                 fontFamily: 'monospace',
                                 display: 'flex',
                                 alignItems: 'center',
                                 gap: '8px'
                               }}>
                                 {/* Lignes d'arborescence structurelles */}
                                 {depth > 0 && <span style={{ color: 'rgba(255,255,255,0.15)' }}>└─</span>}
                                 {opLabel}
                               </td>
                               <td style={{ padding: '8px 16px', color: '#38bdf8', fontWeight: 600 }}>{objName || '-'}</td>
                               <td style={{ padding: '8px 16px', textAlign: 'right', color: '#cbd5e1' }}>{cost || '-'}</td>
                               <td style={{ padding: '8px 16px', textAlign: 'right', color: '#cbd5e1' }}>{card || '-'}</td>
                               <td style={{ padding: '8px 16px', textAlign: 'right', color: '#cbd5e1' }}>{bytes || '-'}</td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   </div>
                 )
               ) : (
                 <div style={{ m: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                   <p style={{ color: '#94a3b8', fontSize: '1.2rem', fontWeight: 600 }}>Aucun plan sélectionné</p>
                   <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '300px', textAlign: 'center', marginTop: '10px' }}>
                     Cliquez sur un tag PHV en haut pour visualiser son arbre détaillé ici.
                   </p>
                 </div>
               )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
