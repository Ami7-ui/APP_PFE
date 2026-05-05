import React, { useState, useEffect } from 'react';
import api from '../api';
import GlassCard from '../components/GlassCard';
import { Activity, Database, LayoutList, ChevronRight, ChevronDown, X, AlertCircle, Loader2, GitBranch, Code, Bot, Search } from 'lucide-react';
import AiResponseViewer from '../components/AiResponseViewer';
import TableAutopsyDrawer from '../components/TableAutopsyDrawer';

export default function SqlPhvPage() {
  const [bases, setBases] = useState([]);
  const [selectedBase, setSelectedBase] = useState('');
  
  const [phvList, setPhvList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  
  const [planDetails, setPlanDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedSqlId, setSelectedSqlId] = useState(null);
  const [selectedPhv, setSelectedPhv] = useState(null);
  const [expandedSqlId, setExpandedSqlId] = useState(null);

  const [aiAnalysisResult, setAiAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [isAutopsyOpen, setIsAutopsyOpen] = useState(false);
  const [autopsyTable, setAutopsyTable] = useState('');

  const [error, setError] = useState('');

  // 1. Charger les bases cibles au montage
  useEffect(() => {
    api.get('/api/bases').then(r => {
      setBases(r.data);
      if (r.data.length > 0) setSelectedBase(String(r.data[0].ID));
    }).catch(() => setError("Erreur de chargement des bases cibles."));
  }, []);

  // 2. Charger la liste des PHV quand la base est sélectionnée
  useEffect(() => {
    if (!selectedBase) return;
    setLoadingList(true);
    setPhvList([]);
    setError('');
    
    api.get(`/api/sql-phv-list/${selectedBase}`)
      .then(r => {
        setPhvList(r.data.data || []);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Erreur de chargement des requêtes.");
      })
      .finally(() => {
        setLoadingList(false);
      });
  }, [selectedBase]);

  // 3. Demander les détails d'un plan
  const fetchPlanDetails = (sqlId, phv) => {
    if (!selectedBase) return;
    
    setSelectedSqlId(sqlId);
    setSelectedPhv(phv);
    setLoadingDetails(true);
    setPlanDetails(null);
    setError('');
    
    api.get(`/api/sql-plan-details/${selectedBase}?sql_id=${sqlId}&phv=${phv}`)
      .then(r => {
        // Calcul de la profondeur pour l'indentation (si depth n'est pas fourni)
        const rawData = r.data.data || [];
        const nodeMap = {};
        
        // Initialiser la profondeur
        rawData.forEach(node => {
          node.depth = 0;
          nodeMap[node.ID || node.id] = node;
        });

        // Calculer selon le parent_id
        rawData.forEach(node => {
          const pId = node.PARENT_ID !== undefined ? node.PARENT_ID : node.parent_id;
          if (pId !== null && pId !== undefined && nodeMap[pId]) {
            node.depth = nodeMap[pId].depth + 1;
          }
        });
        
        setPlanDetails(rawData);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Erreur de chargement des détails du plan.");
      })
      .finally(() => {
        setLoadingDetails(false);
      });
  };

  // 4. Analyser le plan avec l'IA
  const handleAnalyzePlans = async () => {
    if (!selectedSqlId) return;
    
    // Trouver la requête SQL originale et la liste des PHVs
    const row = phvList.find(r => (r.SQL_ID || r.sql_id) === selectedSqlId);
    const query = row ? (row.SCRIPT_SQL || row.script_sql) : "";
    const phvString = row ? (row.PHV_LIST || row.phv_list || "") : "";
    const phvs = phvString.split(',').map(s => s.trim()).filter(Boolean);

    setIsAnalyzing(true);
    setAiAnalysisResult('');
    
    try {
      // 1. Récupérer les détails de TOUS les plans en parallèle
      const allPlans = await Promise.all(phvs.map(async (p) => {
        try {
          const r = await api.get(`/api/sql-plan-details/${selectedBase}?sql_id=${selectedSqlId}&phv=${p}`);
          return {
            phv: p,
            steps: r.data.data || []
          };
        } catch (e) {
          console.error(`Erreur chargement PHV ${p}`, e);
          return { phv: p, steps: [] };
        }
      }));

      // 2. Envoyer la collection complète au backend
      const response = await api.post('/api/ai/analyze-phv', {
        sql_id: selectedSqlId,
        query: query || "Requête non disponible",
        plans: allPlans
      });
      setAiAnalysisResult(response.data.analysis);
    } catch (err) {
      setAiAnalysisResult("Erreur lors de l'analyse comparative : " + (err.response?.data?.detail || err.message));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      <div className="page-header">
        <div className="page-header-icon" style={{ borderColor: 'rgba(56, 189, 248, 0.3)', background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(14, 165, 233, 0.15))', color: '#38bdf8', boxShadow: 'inset 0 0 20px rgba(56, 189, 248, 0.15)' }}>
          <Activity size={28} />
        </div>
        <div>
          <h1 className="page-title text-gradient" style={{ background: 'linear-gradient(135deg, #7dd3fc, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Analyse des Plans d'Exécution (PHV)
          </h1>
          <p className="page-subtitle">Pistez et analysez les instabilités des requêtes Oracle avec de multiples plans</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ animation: 'slideUp 0.3s', marginBottom: 24 }}><AlertCircle size={18} /> {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* COLONNE GAUCHE : SÉLECTEUR ET VUE MAÎTRE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <GlassCard style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database size={18} color="#0ea5e9" /> Instance Oracle
            </h2>
            
            <div style={{ position: 'relative' }}>
              <select 
                value={selectedBase} 
                onChange={e => setSelectedBase(e.target.value)} 
                style={{ 
                  paddingLeft: 40, height: 46, width: '100%', 
                  background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '10px', color: '#e2e8f0', appearance: 'none', cursor: 'pointer'
                }}>
                <option value="" disabled>-- Choisir une base --</option>
                {bases.map(b => <option key={b.ID} value={b.ID}>{b.Instance} — {b.IP}</option>)}
              </select>
              <Database size={16} color="#0ea5e9" style={{ position: 'absolute', left: 14, top: 15, pointerEvents: 'none' }} />
            </div>
          </GlassCard>

          <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <LayoutList size={18} color="#8b5cf6" /> Liste des Requêtes Instables
              </h2>
              {phvList.length > 0 && <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>{phvList.length} requêtes</span>}
            </div>

            <div style={{ padding: '0 20px 15px 20px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input 
                  type="text"
                  placeholder="Rechercher un SQL ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.2)'}
                />
              </div>
            </div>

            {loadingList ? (
              <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                <Loader2 size={30} className="spinner" color="#0ea5e9" />
                <span style={{ color: '#94a3b8' }}>Analyse en cours...</span>
              </div>
            ) : phvList.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                Aucune requête avec de multiples plans trouvée sur cette instance.
              </div>
            ) : phvList.filter(row => (row.SQL_ID || row.sql_id || "").toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>
                Aucun SQL ID trouvé pour "{searchTerm}".
              </div>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
                <table className="og-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'rgba(15, 23, 42, 0.95)', zIndex: 10, backdropFilter: 'blur(5px)' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>SQL_ID</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Nb PHV</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Plans Disponibles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phvList
                      .filter(row => (row.SQL_ID || row.sql_id || "").toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((row, idx) => {
                        const sqlId = row.SQL_ID || row.sql_id;
                      const phvs = (row.PHV_LIST || row.phv_list || "").split(',').map(s => s.trim());
                      const scriptSql = row.SCRIPT_SQL || row.script_sql;
                      const isActive = selectedSqlId === sqlId;
                      const isExpanded = expandedSqlId === sqlId;
                      
                      return (
                        <React.Fragment key={idx}>
                          <tr style={{ 
                            borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.02)',
                            background: isActive ? 'rgba(139, 92, 246, 0.05)' : 'transparent',
                            transition: 'background 0.2s'
                          }}>
                            <td style={{ padding: '12px 16px', color: isActive ? '#a78bfa' : '#cbd5e1', fontWeight: isActive ? 600 : 400, fontFamily: "monospace" }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setExpandedSqlId(isExpanded ? null : sqlId); }}
                                  style={{ 
                                    background: isExpanded ? 'rgba(56, 189, 248, 0.2)' : 'rgba(56, 189, 248, 0.1)', 
                                    border: '1px solid rgba(56, 189, 248, 0.2)', 
                                    color: '#38bdf8', 
                                    cursor: 'pointer', 
                                    padding: '4px', 
                                    borderRadius: '6px', 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    transition: 'all 0.2s'
                                  }}
                                  title="Voir le script SQL"
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.3)'}
                                  onMouseLeave={e => e.currentTarget.style.background = isExpanded ? 'rgba(56, 189, 248, 0.2)' : 'rgba(56, 189, 248, 0.1)'}
                                >
                                  {isExpanded ? <ChevronDown size={14} /> : <Code size={14} />}
                                </button>
                                {sqlId}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', color: '#e2e8f0' }}>
                              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                                {row.PHV_COUNT || row.phv_count}
                              </span>
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {phvs.map((p, i) => (
                                  <button
                                    key={i}
                                    onClick={() => fetchPlanDetails(sqlId, p)}
                                    style={{
                                      border: (selectedSqlId === sqlId && selectedPhv === p) ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                                      background: (selectedSqlId === sqlId && selectedPhv === p) ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                                      color: (selectedSqlId === sqlId && selectedPhv === p) ? '#38bdf8' : '#94a3b8',
                                      padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontFamily: "monospace",
                                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!(selectedSqlId === sqlId && selectedPhv === p)) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                        e.currentTarget.style.color = '#e2e8f0';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!(selectedSqlId === sqlId && selectedPhv === p)) {
                                        e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
                                        e.currentTarget.style.color = '#94a3b8';
                                      }
                                    }}
                                  >
                                    <GitBranch size={12} /> {p}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr style={{ background: isActive ? 'rgba(139, 92, 246, 0.05)' : 'transparent' }}>
                              <td colSpan={3} style={{ padding: '0 16px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <div style={{ 
                                  background: 'rgba(15, 23, 42, 0.8)', 
                                  padding: '16px', 
                                  borderRadius: '8px', 
                                  border: '1px solid rgba(56, 189, 248, 0.2)', 
                                  fontSize: '0.8rem', 
                                  color: '#e2e8f0', 
                                  fontFamily: 'monospace', 
                                  whiteSpace: 'pre-wrap', 
                                  maxHeight: '200px', 
                                  overflowY: 'auto',
                                  boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
                                }}>
                                  {scriptSql ? scriptSql : <span style={{ color: '#64748b', fontStyle: 'italic' }}>Script SQL non disponible</span>}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>

        {/* COLONNE DROITE : VUE DÉTAIL (ARBRE EXPLAIN PLAN) */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <GlassCard style={{ padding: 0, overflow: 'hidden', height: '100%', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  Aperçu du Plan d'Exécution
                </h2>
                {selectedSqlId && selectedPhv && (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#e2e8f0', fontFamily: 'monospace', padding: '2px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }}>SQL_ID : {selectedSqlId}</span>
                    <ChevronRight size={14} />
                    <span style={{ color: '#38bdf8', fontFamily: 'monospace', padding: '2px 6px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '4px' }}>PHV : {selectedPhv}</span>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                {selectedSqlId && (
                  <button 
                    onClick={handleAnalyzePlans} 
                    disabled={isAnalyzing}
                    style={{ 
                      background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', 
                      border: 'none', 
                      color: 'white', 
                      padding: '8px 16px', 
                      borderRadius: '8px', 
                      cursor: isAnalyzing ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      opacity: isAnalyzing ? 0.7 : 1,
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    {isAnalyzing ? <Loader2 size={16} className="spinner" /> : <Bot size={16} />}
                    {isAnalyzing ? "Comparaison en cours par nvidia_senior..." : "Comparer tous les PHVs avec l'IA"}
                  </button>
                )}
                {planDetails && (
                  <button onClick={() => {setPlanDetails(null); setAiAnalysisResult('');}} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ flex: 1, padding: planDetails ? 0 : '40px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              
              {loadingDetails ? (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Loader2 size={36} className="spinner" color="#38bdf8" />
                  </div>
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>Récupération de l'arbre...</span>
                </div>
              ) : planDetails ? (
                planDetails.length === 0 ? (
                   <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b' }}>
                     Le plan demandé est introuvable (probablement expiré de la `v$sql_plan`).
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
                              <td style={{ padding: '8px 16px', color: '#38bdf8', fontWeight: 600 }}>
                                {objName ? (
                                  <span 
                                    onClick={() => { 
                                      setAutopsyTable(objName); 
                                      setIsAutopsyOpen(true); 
                                    }}
                                    style={{ cursor: 'pointer', borderBottom: '1px dashed rgba(56, 189, 248, 0.5)', transition: 'all 0.2s' }}
                                    title="Cliquez pour autopsier cet objet"
                                    onMouseEnter={e => { e.currentTarget.style.color = '#7dd3fc'; e.currentTarget.style.borderBottomColor = '#7dd3fc'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.borderBottomColor = 'rgba(56, 189, 248, 0.5)'; }}
                                  >
                                    {objName}
                                  </span>
                                ) : '-'}
                              </td>
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
                    Cliquez sur un tag PHV dans la liste de gauche pour visualiser son arbre détaillé ici.
                  </p>
                </div>
              )}
            </div>

            {/* ZONE IA EN DESSOUS DES PLANS */}
            {(aiAnalysisResult || isAnalyzing) && (
              <div style={{ 
                borderTop: '1px solid rgba(139, 92, 246, 0.3)', 
                background: 'rgba(15, 23, 42, 0.8)', 
                padding: '24px',
                flexShrink: 0,
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                <h3 style={{ 
                  color: '#c4b5fd', 
                  fontSize: '1.1rem', 
                  marginBottom: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  fontWeight: 700
                }}>
                  <Bot size={20} /> Analyse Experte (nvidia_senior)
                </h3>
                {isAnalyzing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#a78bfa' }}>
                    <Loader2 size={20} className="spinner" />
                    <span>L'architecte analyse la structure du plan, veuillez patienter...</span>
                  </div>
                ) : (
                  <AiResponseViewer content={aiAnalysisResult} />
                )}
              </div>
            )}
          </GlassCard>
        </div>

      </div>

      {/* Drawer pour l'autopsie de table */}
      <TableAutopsyDrawer 
        isOpen={isAutopsyOpen} 
        onClose={() => setIsAutopsyOpen(false)} 
        tableName={autopsyTable} 
        idBase={selectedBase} 
      />

    </div>
  );
}
