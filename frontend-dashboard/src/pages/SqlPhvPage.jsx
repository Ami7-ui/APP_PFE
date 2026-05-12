import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import GlassCard from '../components/GlassCard';
import { Activity, Database, LayoutList, ChevronRight, ChevronDown, X, AlertCircle, Loader2, GitBranch, Code, Bot, Search, MessageSquare, History } from 'lucide-react';
import TableAutopsyDrawer from '../components/TableAutopsyDrawer';
import IndexAnalysisDrawer from '../components/IndexAnalysisDrawer';
import AiResponseViewer from '../components/AiResponseViewer';
import ChatWidget from '../components/ChatWidget';

export default function SqlPhvPage() {
  const [bases, setBases] = useState([]);
  const [selectedBase, setSelectedBase] = useState('');
  
  const [phvList, setPhvList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [selectedSqlId, setSelectedSqlId] = useState(null);
  const [phvPlans, setPhvPlans] = useState({}); // { phv: [steps], ... }
  const [loadingPlans, setLoadingPlans] = useState({}); // { phv: true/false }
  const [error, setError] = useState('');

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAutopsyOpen, setIsAutopsyOpen] = useState(false);
  const [autopsyTable, setAutopsyTable] = useState('');
  const [isIndexAutopsyOpen, setIsIndexAutopsyOpen] = useState(false);
  const [autopsyIndex, setAutopsyIndex] = useState('');

  const [aiAnalysisResult, setAiAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
    setSelectedSqlId(null);
    setPhvPlans({});
    setAiAnalysisResult('');
    
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

  // 3. Charger TOUS les plans pour un SQL_ID
  const selectSqlId = (row) => {
    const sqlId = row.SQL_ID || row.sql_id;
    setSelectedSqlId(sqlId);
    setAiAnalysisResult('');
    
    // Initialiser les conteneurs de plans pour afficher les colonnes immédiatement
    const phvString = row.PHV_LIST || row.phv_list || "";
    const phvs = phvString.split(',').map(s => s.trim()).filter(Boolean);
    
    const initialPlans = {};
    const initialLoading = {};
    phvs.forEach(p => {
      initialPlans[p] = null; 
      initialLoading[p] = true;
    });
    
    setPhvPlans(initialPlans);
    setLoadingPlans(initialLoading);
    
    phvs.forEach(phv => {
      loadPlan(sqlId, phv);
    });
  };

  const loadPlan = (sqlId, phv) => {
    setLoadingPlans(prev => ({ ...prev, [phv]: true }));
    api.get(`/api/sql-plan-details/${selectedBase}?sql_id=${sqlId}&phv=${phv}`)
      .then(r => {
        console.log(`Données reçues pour PHV ${phv}:`, r.data);
        const rawData = r.data.data || (Array.isArray(r.data) ? r.data : []);
        
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
        console.log(`Plan formaté pour PHV ${phv} (${rawData.length} lignes):`, rawData);
        setPhvPlans(prev => ({ ...prev, [phv]: rawData }));
      })
      .catch(err => {
        console.error(`Error loading PHV ${phv}:`, err);
      })
      .finally(() => {
        setLoadingPlans(prev => ({ ...prev, [phv]: false }));
      });
  };

  // 4. Analyser les plans avec l'IA (nvidia_senior) - Traitement Sécurisé
  const handleAnalyzePlans = async () => {
    if (!selectedSqlId) return;
    
    const row = phvList.find(r => (r.SQL_ID || r.sql_id) === selectedSqlId);
    const query = row ? (row.SCRIPT_SQL || row.script_sql) : "";

    setIsAnalyzing(true);
    setAiAnalysisResult('');
    
    try {
      const allPlans = Object.entries(phvPlans).map(([phv, steps]) => ({
        phv: phv,
        steps: (steps || []).map(s => ({
          OPERATION: s.OPERATION || s.operation,
          OPTIONS: s.OPTIONS || s.options,
          OBJECT_NAME: s.OBJECT_NAME || s.object_name,
          COST: s.COST || s.cost,
          CARDINALITY: s.CARDINALITY || s.cardinality,
          ID: s.ID || s.id,
          PARENT_ID: s.PARENT_ID !== undefined ? s.PARENT_ID : s.parent_id
        }))
      }));

      const response = await api.post('/api/ai/analyze-phv', {
        sql_id: selectedSqlId,
        query: query || "Requête non disponible",
        plans: allPlans
      });

      // SAFE PARSE : Gestion des retours CLOB/JSON complexes
      let result = response.data.analysis || "";
      if (typeof result !== 'string') {
        result = JSON.stringify(result);
      }
      
      // Nettoyage des guillemets parasites (fréquent sur les sorties JSON backend directes)
      if (result.startsWith('"') && result.endsWith('"') && result.length > 2) {
        try {
          result = JSON.parse(result);
        } catch(e) {
          result = result.substring(1, result.length - 1);
        }
      }

      console.log("Analyse IA reçue et nettoyée:", result.substring(0, 100) + "...");
      setAiAnalysisResult(result);
    } catch (err) {
      console.error("AI Analysis Error:", err);
      setAiAnalysisResult("Erreur lors de l'analyse : " + (err.response?.data?.detail || err.message));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Préparation du contexte pour le Chatbot
  const chatContext = {
    module_type: "PHV_ANALYSIS",
    sql_id: selectedSqlId,
    sql_query: phvList.find(r => (r.SQL_ID || r.sql_id) === selectedSqlId)?.SCRIPT_SQL || "",
    plans: Object.entries(phvPlans).map(([phv, steps]) => ({
      phv: phv,
      steps: (steps || []).map(s => ({
        operation: s.OPERATION || s.operation,
        options: s.OPTIONS || s.options,
        object: s.OBJECT_NAME || s.object_name,
        cost: s.COST || s.cost,
        cardinality: s.CARDINALITY || s.cardinality,
        depth: s.depth
      }))
    }))
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4px)', overflow: 'hidden', margin: '-20px' }}>
      
      {/* SECTION HAUTE : HEADER & SELECTEURS */}
      <div style={{ padding: '20px 24px', background: 'rgba(15, 23, 42, 0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="page-header-icon" style={{ width: 40, height: 40, borderColor: 'rgba(56, 189, 248, 0.3)', background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(14, 165, 233, 0.15))', color: '#38bdf8' }}>
              <Activity size={22} />
            </div>
            <div>
              <h1 className="page-title text-gradient" style={{ fontSize: '1.4rem', background: 'linear-gradient(135deg, #7dd3fc, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                Analyse des Plans d'Exécution (PHV)
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
             <div style={{ position: 'relative', width: '250px' }}>
               <select 
                 value={selectedBase} 
                 onChange={e => setSelectedBase(e.target.value)} 
                 style={{ 
                   paddingLeft: 40, height: 40, width: '100%', 
                   background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', 
                   borderRadius: '10px', color: '#e2e8f0', appearance: 'none', cursor: 'pointer'
                 }}>
                 <option value="" disabled>-- Base --</option>
                 {bases.map(b => <option key={b.ID} value={b.ID}>{b.Instance} — {b.IP}</option>)}
               </select>
               <Database size={16} color="#0ea5e9" style={{ position: 'absolute', left: 14, top: 12, pointerEvents: 'none' }} />
             </div>
             
             <div style={{ position: 'relative', width: '300px' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12, pointerEvents: 'none' }} />
                <input 
                  type="text"
                  placeholder="Rechercher SQL ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px 10px 38px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '10px', color: '#f8fafc', fontSize: '0.85rem' }}
                />
             </div>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><AlertCircle size={16} /> {error}</div>}

        {/* LISTE HORIZONTALE DES REQUÊTES */}
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'thin' }} className="custom-scrollbar">
          {loadingList ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', fontSize: '0.9rem' }}>
              <Loader2 size={16} className="spinner" /> Chargement des requêtes...
            </div>
          ) : phvList.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '0.9rem', padding: '10px' }}>Aucune requête instable détectée.</div>
          ) : phvList.filter(r => (r.SQL_ID || r.sql_id || "").toLowerCase().includes(searchTerm.toLowerCase())).map((row, idx) => {
            const sqlId = row.SQL_ID || row.sql_id;
            const isActive = selectedSqlId === sqlId;
            return (
              <button
                key={idx}
                onClick={() => selectSqlId(row)}
                style={{
                  flexShrink: 0,
                  padding: '10px 20px',
                  background: isActive ? 'rgba(139, 92, 246, 0.2)' : 'rgba(15, 23, 42, 0.4)',
                  border: isActive ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  color: isActive ? '#a78bfa' : '#cbd5e1',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  minWidth: '160px',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace' }}>
                  <History size={14} /> {sqlId}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>{row.PHV_COUNT || row.phv_count} plans</span>
                  <span style={{ color: '#10b981' }}>{row.MAX_ELAPSED || '0'}s max</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ZONE CENTRALE : COMPARAISON DES PLANS (SIDE-BY-SIDE) */}
      <div style={{ flex: 1, minHeight: '300px', display: 'flex', overflowX: 'auto', background: '#020617', padding: '10px' }} className="custom-scrollbar">
        {selectedSqlId ? (
          <div style={{ display: 'flex', gap: '10px', height: '100%', minWidth: '100%', flex: 1 }}>
            {Object.entries(phvPlans).length === 0 ? (
               <div style={{ margin: 'auto', color: '#64748b', textAlign: 'center' }}>
                 <p>Aucun plan d'exécution (PHV) trouvé pour cette requête.</p>
               </div>
            ) : (
              Object.entries(phvPlans).map(([phv, steps], idx) => (
                <div key={phv} style={{ flex: 1, minWidth: '500px', display: 'flex', flexDirection: 'column' }}>
                  <GlassCard style={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ padding: '12px 20px', background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <GitBranch size={16} color="#38bdf8" />
                        <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem', fontFamily: 'monospace' }}>PHV: {phv}</span>
                      </div>
                      {loadingPlans[phv] && <Loader2 size={14} className="spinner" color="#38bdf8" />}
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', position: 'relative' }}>
                      {!steps && loadingPlans[phv] ? (
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                          <Loader2 size={24} className="spinner" color="#38bdf8" />
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Chargement...</span>
                        </div>
                      ) : !steps ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                          Erreur ou plan introuvable
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                          <thead style={{ position: 'sticky', top: 0, background: 'rgba(15, 23, 42, 0.95)', zIndex: 10 }}>
                            <tr>
                              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Opération</th>
                              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Objet</th>
                              <th style={{ padding: '10px 14px', textAlign: 'right', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Cost</th>
                              <th style={{ padding: '10px 14px', textAlign: 'right', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Rows</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(steps || []).map((node, i) => {
                              const depth = node.depth || 0;
                              const operation = node.OPERATION || node.operation;
                              const options = node.OPTIONS || node.options;
                              const opLabel = options ? `${operation} (${options})` : operation;
                              const isFTS = opLabel.toUpperCase().includes('FULL');
                              return (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', background: isFTS ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                                  <td style={{ padding: '6px 14px', paddingLeft: `${14 + depth * 16}px`, color: isFTS ? '#ef4444' : '#e2e8f0', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                    {depth > 0 && <span style={{ color: 'rgba(255,255,255,0.1)' }}>└─</span>} {opLabel}
                                  </td>
                                  <td style={{ padding: '6px 14px', color: '#38bdf8', fontWeight: 600 }}>
                                    {node.OBJECT_NAME || node.object_name ? (
                                      <span 
                                        onClick={() => {
                                          const objName = node.OBJECT_NAME || node.object_name;
                                          const objType = node.OBJECT_TYPE || node.object_type || '';
                                          if (objType.toUpperCase().includes('INDEX')) { setAutopsyIndex(objName); setIsIndexAutopsyOpen(true); }
                                          else { setAutopsyTable(objName); setIsAutopsyOpen(true); }
                                        }}
                                        style={{ cursor: 'pointer', borderBottom: '1px dashed rgba(56, 189, 248, 0.3)' }}
                                      >
                                        {node.OBJECT_NAME || node.object_name}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td style={{ padding: '6px 14px', textAlign: 'right', color: '#94a3b8' }}>{node.COST || node.cost || '-'}</td>
                                  <td style={{ padding: '6px 14px', textAlign: 'right', color: '#94a3b8' }}>{node.CARDINALITY || node.cardinality || '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </GlassCard>
                </div>
              ))
            )}
          </div>
        ) : (
          <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
            <Activity size={80} color="#334155" />
            <h2 style={{ color: '#94a3b8', marginTop: 20 }}>Sélectionnez une requête pour comparer ses plans</h2>
            <p style={{ color: '#64748b' }}>Les plans d'exécution seront affichés côte à côte pour une analyse facilitée.</p>
          </div>
        )}
      </div>

      {/* RÉSULTAT DE L'ANALYSE IA (VERDICT DE L'EXPERT) */}
      {(aiAnalysisResult || isAnalyzing) && (
        <div style={{ 
          padding: '24px', 
          background: 'rgba(15, 23, 42, 0.8)', 
          borderTop: '2px solid #8b5cf6', 
          minHeight: '200px', 
          height: 'auto',
          overflowY: 'auto' 
        }} className="custom-scrollbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Bot size={24} color="#a78bfa" />
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#c4b5fd', fontWeight: 800 }}>Verdict de l'Expert DBA</h3>
          </div>
          
          {isAnalyzing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#a78bfa', marginBottom: '10px' }}>
                <Loader2 size={24} className="spinner" />
                <span style={{ fontWeight: 600 }}>Analyse en cours par l'IA (nvidia_senior)...</span>
              </div>
              <div style={{ height: '15px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
              <div style={{ height: '15px', width: '90%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
              <div style={{ height: '15px', width: '95%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
            </div>
          ) : (
            <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
              <AiResponseViewer content={aiAnalysisResult} />
            </div>
          )}
        </div>
      )}

      {/* FOOTER : BOUTON AI EXPERT */}
      <div style={{ padding: '16px 24px', background: 'rgba(15, 23, 42, 0.8)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <button 
          onClick={handleAnalyzePlans}
          disabled={!selectedSqlId || Object.keys(phvPlans).length === 0 || isAnalyzing}
          style={{ 
            background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', 
            border: 'none', 
            color: 'white', 
            padding: '12px 30px', 
            borderRadius: '12px', 
            cursor: (!selectedSqlId || Object.keys(phvPlans).length === 0 || isAnalyzing) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '1rem',
            fontWeight: 700,
            boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
            transition: 'all 0.3s',
            opacity: (!selectedSqlId || Object.keys(phvPlans).length === 0 || isAnalyzing) ? 0.5 : 1
          }}
        >
          {isAnalyzing ? <Loader2 size={22} className="spinner" /> : <Bot size={22} />}
          {isAnalyzing ? "Analyse en cours..." : "Lancer l'Analyse Comparative IA"}
        </button>
      </div>

      {/* DRAWERS D'AUTOPSIE */}
      <TableAutopsyDrawer isOpen={isAutopsyOpen} onClose={() => setIsAutopsyOpen(false)} tableName={autopsyTable} idBase={selectedBase} />
      <IndexAnalysisDrawer isOpen={isIndexAutopsyOpen} onClose={() => setIsIndexAutopsyOpen(false)} indexName={autopsyIndex} idBase={selectedBase} />
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.2); borderRadius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
        
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
