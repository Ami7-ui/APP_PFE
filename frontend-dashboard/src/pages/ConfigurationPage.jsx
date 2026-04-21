import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import GlassCard from '../components/GlassCard';
import { Settings2, Database, Play, CheckCircle, Terminal, AlertCircle, Loader2, ChevronDown, ChevronUp, CheckSquare, Square, Search } from 'lucide-react';

export default function ConfigurationPage() {
  const [bases, setBases] = useState([]);
  const [selectedBase, setSelectedBase] = useState('');
  const [categories, setCategories] = useState({});
  const [selectedScripts, setSelectedScripts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // Ref pour fermer le dropdown si on clique en dehors
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Charger les bases
    api.get('/api/bases').then(r => { 
      setBases(r.data); 
      if (r.data.length > 0) setSelectedBase(String(r.data[0].ID)); 
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
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', marginBottom: '16px' }}>
              <Terminal size={14} /> 2. Sélectionner les scripts ({selectedScripts.length} choisis)
            </label>

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
                             {Object.values(r).map((v,j) => (
                               <td key={j} style={{ padding: '8px 14px', color: '#cbd5e1', whiteSpace: 'nowrap', fontFamily: typeof v === 'number' ? "'Fira Code', monospace" : 'inherit' }}>
                                 {v !== null ? String(v) : <span style={{ color: '#64748b' }}>NULL</span>}
                               </td>
                             ))}
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
    </div>
  );
}
