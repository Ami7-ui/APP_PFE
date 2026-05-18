import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import GlassCard from '../components/GlassCard';
import { Activity, Database, AlertCircle, Loader2, GitBranch, Bot, Search, Play, FileText, Code2, Terminal } from 'lucide-react';
import TableAutopsyDrawer from '../components/TableAutopsyDrawer';
import IndexAnalysisDrawer from '../components/IndexAnalysisDrawer';
import AiResponseViewer from '../components/AiResponseViewer';

export default function AnalysePlanMysqlPage() {
  const [bases, setBases] = useState([]);
  const [selectedBase, setSelectedBase] = useState('');
  
  const [queriesList, setQueriesList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [selectedDigest, setSelectedDigest] = useState(null);
  
  // États de l'éditeur SQL et de l'analyse
  const [customSql, setCustomSql] = useState('');
  const [activeTab, setActiveTab] = useState('digest'); // 'digest' ou 'custom'
  
  const [explainRows, setExplainRows] = useState([]);
  const [explainTree, setExplainTree] = useState('');
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [explainError, setExplainError] = useState('');
  const [error, setError] = useState('');

  // Tiroirs d'autopsie
  const [isAutopsyOpen, setIsAutopsyOpen] = useState(false);
  const [autopsyTable, setAutopsyTable] = useState('');
  const [isIndexAutopsyOpen, setIsIndexAutopsyOpen] = useState(false);
  const [autopsyIndex, setAutopsyIndex] = useState('');

  // États de l'Expert IA
  const [aiAnalysisResult, setAiAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoExpandAi, setAutoExpandAi] = useState(false);
  const [hoveredOperation, setHoveredOperation] = useState(null);

  // Splitter resizable
  const [panelSplitRatio, setPanelSplitRatio] = useState(() => {
    const saved = localStorage.getItem('mysqlPlanPanelSplit');
    return saved ? parseFloat(saved) : 55;
  });
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsDraggingSplitter(false);
  }, []);

  const onResize = useCallback((e) => {
    if (!isDraggingSplitter) return;
    
    const container = document.getElementById('workstation-container-mysql');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const newRatio = (relativeY / rect.height) * 100;
    
    if (newRatio >= 10 && newRatio <= 90) {
      setPanelSplitRatio(newRatio);
      localStorage.setItem('mysqlPlanPanelSplit', newRatio.toString());
    }
  }, [isDraggingSplitter]);

  const toggleFocusMode = useCallback(() => {
    const nextRatio = panelSplitRatio > 50 ? 20 : 80;
    setPanelSplitRatio(nextRatio);
    localStorage.setItem('mysqlPlanPanelSplit', nextRatio.toString());
  }, [panelSplitRatio]);

  useEffect(() => {
    if (isDraggingSplitter) {
      window.addEventListener('mousemove', onResize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', onResize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isDraggingSplitter, onResize, stopResizing]);

  // 1. Charger les bases cibles au montage et filtrer par MySQL (type 21)
  useEffect(() => {
    api.get('/api/bases').then(r => {
      const mysqlBases = r.data.filter(b => 
        String(b.Type || '').toUpperCase().includes('MYSQL') ||
        String(b.id_type_base || '') === '21'
      );
      setBases(mysqlBases);
      if (mysqlBases.length > 0) {
        setSelectedBase(String(mysqlBases[0].ID));
      } else {
        setError("Aucune base cible MySQL n'est configurée dans l'application.");
      }
    }).catch(() => setError("Erreur de chargement des bases cibles."));
  }, []);

  // 2. Charger la liste des requêtes problématiques (Digest)
  useEffect(() => {
    if (!selectedBase) return;
    loadExpensiveQueries();
  }, [selectedBase]);

  const loadExpensiveQueries = () => {
    setLoadingList(true);
    setQueriesList([]);
    setExplainRows([]);
    setExplainTree('');
    setAiAnalysisResult('');
    setSelectedDigest(null);
    setExplainError('');

    api.get(`/api/mysql/queries/${selectedBase}`)
      .then(r => {
        const data = r.data.data || [];
        setQueriesList(data);
      })
      .catch(err => {
        console.error("Erreur de chargement des digests MySQL :", err);
        setExplainError("Impossible de charger les digests MySQL.");
      })
      .finally(() => {
        setLoadingList(false);
      });
  };

  // 3. Charger l'EXPLAIN et l'EXPLAIN FORMAT=TREE pour une requête
  const handleSelectQuery = (row) => {
    setSelectedDigest(row.digest);
    setCustomSql(row.sql_text);
    setActiveTab('digest');
    setAiAnalysisResult('');
    setExplainError('');
    runExplain(row.sql_text);
  };

  const runCustomExplain = () => {
    if (!customSql.trim()) {
      setExplainError("Veuillez saisir une requête SQL valide.");
      return;
    }
    setSelectedDigest(null);
    setAiAnalysisResult('');
    setExplainError('');
    runExplain(customSql);
  };

  const runExplain = async (sqlText) => {
    setLoadingExplain(true);
    setExplainRows([]);
    setExplainTree('');
    
    let cleanSql = sqlText.trim();
    if (cleanSql.endsWith(';')) {
      cleanSql = cleanSql.slice(0, -1);
    }

    try {
      const res = await api.post(`/api/mysql/explain/${selectedBase}`, {
        sql_query: cleanSql
      });
      
      const tabularData = res.data.tabular || [];
      // Normaliser les clés en minuscules
      const formattedTabular = tabularData.map(row => {
        const normalized = {};
        Object.entries(row).forEach(([k, v]) => {
          normalized[k.toLowerCase()] = v;
        });
        return normalized;
      });
      setExplainRows(formattedTabular);
      setExplainTree(res.data.tree || '-> Impossible de charger l\'arbre.');

    } catch (err) {
      console.error("Explain error:", err);
      setExplainError(err.response?.data?.detail || "Erreur lors de la génération de l'EXPLAIN. Assurez-vous que la syntaxe SQL est valide pour MySQL.");
    } finally {
      setLoadingExplain(false);
    }
  };

  // 4. Lancer l'Analyse Comparative IA
  const handleAnalyzePlans = async () => {
    if (!customSql.trim()) return;

    setIsAnalyzing(true);
    setAiAnalysisResult('');

    try {
      const response = await api.post('/api/ai/analyze-plan-mysql', {
        query: customSql,
        explain_tabular: explainRows,
        explain_tree: explainTree || 'Non disponible'
      });

      let result = response.data.analysis || "";
      if (typeof result !== 'string') {
        result = JSON.stringify(result);
      }
      setAiAnalysisResult(result);
    } catch (err) {
      console.error("AI Error:", err);
      setAiAnalysisResult("Erreur lors de l'analyse IA : " + (err.response?.data?.detail || err.message));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Style des types de jointures/accès
  const getTypeBadgeStyle = (typeVal) => {
    const val = String(typeVal || '').toUpperCase();
    if (val === 'ALL') {
      return { background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' };
    }
    if (val === 'INDEX') {
      return { background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)' };
    }
    if (['RANGE', 'REF', 'EQ_REF', 'CONST', 'SYSTEM'].includes(val)) {
      return { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)' };
    }
    return { background: 'rgba(148, 163, 184, 0.1)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.2)' };
  };

  // Style des alertes extra
  const renderExtraBadges = (extraVal) => {
    const val = String(extraVal || '');
    const badges = [];

    if (val.includes('Using filesort')) {
      badges.push(
        <span key="filesort" style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 600, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', marginRight: 4 }}>
          Filesort (Tri)
        </span>
      );
    }
    if (val.includes('Using temporary')) {
      badges.push(
        <span key="temporary" style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', marginRight: 4 }}>
          Table Temp. (Disque)
        </span>
      );
    }
    if (val.includes('Using index')) {
      badges.push(
        <span key="covering" style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', marginRight: 4 }}>
          Covering Index
        </span>
      );
    }

    if (badges.length === 0) {
      return <span style={{ color: '#64748b' }}>{val || '-'}</span>;
    }

    return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{badges}</div>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4px)', overflow: 'hidden', margin: '-20px' }}>
      
      {/* SECTION HAUTE : HEADER & SÉLECTEUR DE BASES */}
      <div style={{ padding: '20px 24px', background: 'rgba(15, 23, 42, 0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="page-header-icon" style={{ width: 40, height: 40, borderColor: 'rgba(139, 92, 246, 0.3)', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(167, 139, 250, 0.15))', color: '#a78bfa' }}>
              <Activity size={22} />
            </div>
            <div>
              <h1 className="page-title text-gradient" style={{ fontSize: '1.4rem', background: 'linear-gradient(135deg, #c4b5fd, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                Analyse & Comparaison des Plans MySQL
              </h1>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Optimisation chirurgicale par Digest de requêtes et EXPLAIN interactif</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
             <div style={{ position: 'relative', width: '280px' }}>
               <select 
                 value={selectedBase} 
                 onChange={e => setSelectedBase(e.target.value)} 
                 style={{ 
                   paddingLeft: 40, height: 40, width: '100%', 
                   background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', 
                   borderRadius: '10px', color: '#e2e8f0', appearance: 'none', cursor: 'pointer'
                 }}>
                 <option value="" disabled style={{ background: '#1e293b', color: '#94a3b8' }}>-- Base MySQL --</option>
                 {bases.map(b => (
                   <option key={b.ID} value={b.ID} style={{ background: '#1e293b', color: '#f1f5f9' }}>
                     {b.Instance} — {b.IP}
                   </option>
                 ))}
               </select>
               <Database size={16} color="#a78bfa" style={{ position: 'absolute', left: 14, top: 12, pointerEvents: 'none' }} />
             </div>
             
             <div style={{ position: 'relative', width: '250px' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12, pointerEvents: 'none' }} />
                <input 
                  type="text"
                  placeholder="Filtrer par Digest..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px 10px 38px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '10px', color: '#f8fafc', fontSize: '0.85rem' }}
                />
             </div>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}><AlertCircle size={16} /> {error}</div>}

        {/* PANNEAU HORIZONTAL DE REQUÊTES EN HAUT (Mise à jour suite au feedback utilisateur) */}
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'thin' }} className="custom-scrollbar">
          {loadingList ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#a78bfa', fontSize: '0.85rem', padding: '8px' }}>
              <Loader2 size={16} className="spinner" /> Chargement des digests d'exécution...
            </div>
          ) : queriesList.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '8px' }}>Aucun digest détecté dans performance_schema.</div>
          ) : queriesList.filter(r => (r.digest || "").toLowerCase().includes(searchTerm.toLowerCase()) || (r.sql_text || "").toLowerCase().includes(searchTerm.toLowerCase())).map((row, idx) => {
            const isActive = selectedDigest === row.digest;
            return (
              <button
                key={idx}
                onClick={() => handleSelectQuery(row)}
                style={{
                  flexShrink: 0,
                  padding: '10px 16px',
                  background: isActive ? 'rgba(139, 92, 246, 0.2)' : 'rgba(15, 23, 42, 0.4)',
                  border: isActive ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  color: isActive ? '#a78bfa' : '#cbd5e1',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  width: '280px',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', width: '100%', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><GitBranch size={12} /> {row.digest ? row.digest.substring(0, 16) : `SQL_ID_${idx}`}</span>
                  <span style={{ color: '#f59e0b' }}>{row.avg_latency_ms}ms</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                  {row.sql_text}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.65rem', color: '#64748b', marginTop: 2 }}>
                  <span>Exécutions: {row.executions}</span>
                  <span>Tables temp disq: {row.tmp_disk_tables}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ZONE PRINCIPALE WORKSTATION DBA AVEC RESIZE SPLIT */}
      <div 
        id="workstation-container-mysql"
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden', 
          background: '#020617',
          position: 'relative'
        }}
      >
        {/* ONGLET CONTEXTUEL : DIGEST OU SQL SUR MESURE */}
        <div style={{ display: 'flex', gap: 4, padding: '10px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.2)', flexShrink: 0 }}>
          <button 
            onClick={() => setActiveTab('digest')}
            style={{ padding: '8px 16px', background: activeTab === 'digest' ? 'rgba(139, 92, 246, 0.15)' : 'transparent', border: 'none', borderBottom: activeTab === 'digest' ? '2px solid #a78bfa' : '2px solid transparent', color: activeTab === 'digest' ? '#a78bfa' : '#94a3b8', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <GitBranch size={14} /> Digest Actuel
          </button>
          <button 
            onClick={() => setActiveTab('custom')}
            style={{ padding: '8px 16px', background: activeTab === 'custom' ? 'rgba(139, 92, 246, 0.15)' : 'transparent', border: 'none', borderBottom: activeTab === 'custom' ? '2px solid #a78bfa' : '2px solid transparent', color: activeTab === 'custom' ? '#a78bfa' : '#94a3b8', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Code2 size={14} /> SQL Sur Mesure (Éditeur)
          </button>
        </div>

        {/* CONTENU DE L'ÉDITEUR SQL PERSO */}
        {activeTab === 'custom' && (
          <div style={{ padding: '16px 24px', background: 'rgba(15, 23, 42, 0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', gap: 12 }}>
            <textarea
              placeholder="Saisissez ou collez votre requête SQL MySQL ici... (ex: SELECT * FROM users WHERE status = 'active')"
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              style={{ flex: 1, height: '70px', padding: '10px 12px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', color: '#f8fafc', fontSize: '0.8rem', fontFamily: 'monospace', resize: 'none' }}
            />
            <button
              onClick={runCustomExplain}
              disabled={loadingExplain || !selectedBase}
              style={{
                width: '130px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none', color: 'white', borderRadius: '8px', cursor: (loadingExplain || !selectedBase) ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s'
              }}
            >
              {loadingExplain ? <Loader2 size={18} className="spinner" /> : <Play size={18} />}
              Générer EXPLAIN
            </button>
          </div>
        )}

        {/* PANNEAU HAUT : EXPLAIN PLAN TABULAIRE & ARBRE */}
        <div style={{ 
          height: `${panelSplitRatio}%`, 
          minHeight: '120px',
          display: 'flex', 
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '16px 24px',
          transition: isDraggingSplitter ? 'none' : 'height 0.3s ease',
        }} className="custom-scrollbar">
          {explainError && <div className="alert alert-error" style={{ marginBottom: 12 }}><AlertCircle size={16} /> {explainError}</div>}
          
          {loadingExplain ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, flex: 1 }}>
              <Loader2 size={32} className="spinner" color="#a78bfa" />
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Génération de l'EXPLAIN MySQL en cours...</span>
            </div>
          ) : explainRows.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, flex: 1, opacity: 0.5, padding: '40px 0' }}>
              <Terminal size={48} color="#475569" />
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Sélectionnez une requête ci-dessus ou écrivez du SQL sur-mesure pour voir son explain plan.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 1. TABLEAU EXPLAIN PLAN */}
              <GlassCard style={{ padding: 0, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '8px 16px', background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={14} color="#a78bfa" />
                  <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.78rem' }}>Rendu Tabulaire : EXPLAIN PLAN classique</span>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', color: '#94a3b8' }}>Table</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', color: '#94a3b8' }}>Type Accès</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', color: '#94a3b8' }}>Index Possibles</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', color: '#94a3b8' }}>Index Choisi</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', color: '#94a3b8' }}>Lignes</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', color: '#94a3b8' }}>Filtré (%)</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', color: '#94a3b8' }}>Opérations Extra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {explainRows.map((row, i) => (
                        <tr 
                          key={i} 
                          onMouseEnter={() => setHoveredOperation(row.extra)}
                          onMouseLeave={() => setHoveredOperation(null)}
                          style={{ 
                            borderBottom: '1px solid rgba(255,255,255,0.02)', 
                            background: String(row.type).toUpperCase() === 'ALL' ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                            transition: 'background 0.2s'
                          }}
                        >
                          <td style={{ padding: '8px 14px', color: '#38bdf8', fontWeight: 600 }}>
                            {row.table ? (
                              <span 
                                onClick={() => {
                                  setAutopsyTable(row.table);
                                  setIsAutopsyOpen(true);
                                }}
                                style={{ cursor: 'pointer', borderBottom: '1px dashed rgba(56, 189, 248, 0.3)' }}
                              >
                                {row.table}
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700, ...getTypeBadgeStyle(row.type) }}>
                              {row.type || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 14px', color: '#cbd5e1', fontFamily: 'monospace' }}>{row.possible_keys || '-'}</td>
                          <td style={{ padding: '8px 14px', color: '#a78bfa', fontWeight: 600, fontFamily: 'monospace' }}>
                            {row.key ? (
                              <span 
                                onClick={() => {
                                  setAutopsyIndex(row.key);
                                  setIsIndexAutopsyOpen(true);
                                }}
                                style={{ cursor: 'pointer', borderBottom: '1px dashed rgba(167, 139, 250, 0.3)' }}
                              >
                                {row.key}
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '8px 14px', textAlign: 'right', color: '#cbd5e1', fontWeight: 600 }}>{row.rows || '0'}</td>
                          <td style={{ padding: '8px 14px', textAlign: 'right', color: '#94a3b8' }}>{row.filtered || '-'}</td>
                          <td style={{ padding: '8px 14px' }}>{renderExtraBadges(row.extra)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>

              {/* 2. EXPLAIN FORMAT=TREE ARBRE GRAPHOPHONE */}
              {explainTree && (
                <GlassCard style={{ padding: 0, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 16px', background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Terminal size={14} color="#a78bfa" />
                    <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.78rem' }}>Rendu Graphique : EXPLAIN FORMAT=TREE (Optimiseur MySQL)</span>
                  </div>
                  <pre style={{
                    margin: 0,
                    padding: '16px',
                    background: 'rgba(9, 15, 30, 0.95)',
                    color: '#10b981',
                    fontSize: '0.76rem',
                    fontFamily: '"Fira Code", "Roboto Mono", monospace',
                    lineHeight: '1.5',
                    overflowX: 'auto',
                    border: 'none',
                    borderRadius: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {explainTree}
                  </pre>
                </GlassCard>
              )}
            </div>
          )}
        </div>

        {/* SPLITTER INTERACTIF REDIMENSIONNABLE */}
        <div 
          onMouseDown={startResizing}
          onDoubleClick={toggleFocusMode}
          style={{ 
            height: '8px', 
            cursor: 'ns-resize', 
            background: isDraggingSplitter ? 'rgba(139, 92, 246, 0.4)' : 'rgba(15, 23, 42, 0.8)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
            zIndex: 10
          }}
        >
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }}></div>
        </div>

        {/* PANNEAU BAS : RÉSULTAT DE L'ANALYSE IA */}
        {(aiAnalysisResult || isAnalyzing) && (
          <div 
            style={{ 
              flex: 1,
              padding: '20px 24px', 
              background: 'rgba(15, 23, 42, 0.6)', 
              overflowY: autoExpandAi ? 'visible' : 'auto',
              height: autoExpandAi ? 'auto' : '100%',
              transition: isDraggingSplitter ? 'none' : 'height 0.3s ease'
            }} 
            className="custom-scrollbar"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bot size={20} color="#a78bfa" />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#c4b5fd', fontWeight: 800 }}>Expertise IA du Plan MySQL</h3>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setAutoExpandAi(!autoExpandAi)}
                  style={{ 
                    background: autoExpandAi ? 'rgba(167, 139, 250, 0.2)' : 'transparent', 
                    border: '1px solid rgba(167, 139, 250, 0.3)', 
                    color: '#a78bfa', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer'
                  }}
                >
                  {autoExpandAi ? 'Réduire Scroll' : 'Expansion Totale'}
                </button>
              </div>
            </div>
            
            {isAnalyzing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#a78bfa', marginBottom: '10px' }}>
                  <Loader2 size={24} className="spinner" />
                  <span style={{ fontWeight: 600 }}>Analyse de l'explain MySQL par l'IA...</span>
                </div>
                <div style={{ height: '15px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
                <div style={{ height: '15px', width: '90%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
              </div>
            ) : (
              <div style={{ 
                animation: 'fadeIn 0.5s ease-out', 
                fontFamily: "'Roboto Mono', 'JetBrains Mono', monospace",
                fontSize: '0.85rem',
                letterSpacing: '-0.01em'
              }}>
                <AiResponseViewer content={aiAnalysisResult} highlightTerm={hoveredOperation} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER : BOUTON AI EXPERT */}
      <div style={{ padding: '16px 24px', background: 'rgba(15, 23, 42, 0.8)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <button 
          onClick={handleAnalyzePlans}
          disabled={explainRows.length === 0 || isAnalyzing}
          style={{ 
            background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', 
            border: 'none', 
            color: 'white', 
            padding: '12px 36px', 
            borderRadius: '12px', 
            cursor: (explainRows.length === 0 || isAnalyzing) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '1rem',
            fontWeight: 700,
            boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
            transition: 'all 0.3s',
            opacity: (explainRows.length === 0 || isAnalyzing) ? 0.5 : 1
          }}
        >
          {isAnalyzing ? <Loader2 size={22} className="spinner" /> : <Bot size={22} />}
          {isAnalyzing ? "Analyse en cours..." : "Lancer l'Analyse Comparative IA"}
        </button>
      </div>

      {/* DRAWERS D'AUTOPSIE INTERACTIFS */}
      <TableAutopsyDrawer isOpen={isAutopsyOpen} onClose={() => setIsAutopsyOpen(false)} tableName={autopsyTable} idBase={selectedBase} />
      <IndexAnalysisDrawer isOpen={isIndexAutopsyOpen} onClose={() => setIsIndexAutopsyOpen(false)} indexName={autopsyIndex} idBase={selectedBase} />
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.2); borderRadius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(139, 92, 246, 0.4); }
        
        @keyframes pulse {
          0% { opacity: 0.3; }
          50% { opacity: 0.6; }
          100% { opacity: 0.3; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
