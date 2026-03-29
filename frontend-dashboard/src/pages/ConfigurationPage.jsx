import React, { useState, useEffect } from 'react';
import api from '../api';
import GlassCard from '../components/GlassCard';
import { Settings2, Database, Play, CheckCircle, Star, Terminal, AlertCircle, Loader2, Search } from 'lucide-react';

export default function ConfigurationPage() {
  const [bases, setBases]       = useState([]);
  const [selected, setSelected] = useState('');
  const [scripts, setScripts]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [favs, setFavs]         = useState(() => { try { return JSON.parse(localStorage.getItem('og_favs')) || []; } catch { return []; } });

  useEffect(() => {
    api.get('/api/bases').then(r => { setBases(r.data); if (r.data.length) setSelected(String(r.data[0].ID)); });
    api.get('/api/scripts').then(r => setScripts(r.data));
  }, []);

  const toggleFav = (key) => {
    const next = favs.includes(key) ? favs.filter(k => k !== key) : [...favs, key];
    setFavs(next); localStorage.setItem('og_favs', JSON.stringify(next));
  };

  const exec = async (scr) => {
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await api.post(`/api/execute_script/${selected}`, { script: scr.Contenu_Script });
      setResult({ script: scr, data: data.data || [] });
    } catch (err) { setError(err.response?.data?.detail || "Erreur d'exécution."); }
    finally { setLoading(false); }
  };

  const sorted = [...scripts].sort((a,b) => {
    const fA = favs.includes(a.ID.toString()) ? 1 : 0;
    const fB = favs.includes(b.ID.toString()) ? 1 : 0;
    return fB - fA || a.Nom_Scripte.localeCompare(b.Nom_Scripte);
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon"><Settings2 size={28} /></div>
        <div>
          <h1 className="page-title text-gradient">Diagnostics SQL Personnalisés</h1>
          <p className="page-subtitle">Exécutez vos requêtes d'administration et scripts favoris</p>
        </div>
      </div>

      <GlassCard style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Database size={14} /> Instance Cible</label>
            <div style={{ position: 'relative' }}>
              <select value={selected} onChange={e => setSelected(e.target.value)} style={{ paddingLeft: 44, height: 50 }}>
                {bases.map(b => <option key={b.ID} value={b.ID}>{b.Instance} — {b.IP}</option>)}
              </select>
              <Database size={18} color="#64748b" style={{ position: 'absolute', left: 16, top: 16, pointerEvents: 'none' }} />
            </div>
          </div>
          <div style={{ padding: '0 16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Scripts Disponibles</div>
            <div className="title-font" style={{ fontSize: '1.4rem', color: '#0ea5e9', fontWeight: 800 }}>{scripts.length}</div>
          </div>
        </div>
      </GlassCard>

      {error && <div className="alert alert-error" style={{ animation: 'slideUp 0.3s' }}><AlertCircle size={18} /> {error}</div>}
      
      {result && (
        <GlassCard style={{ marginBottom: 32, border: '1px solid rgba(16, 185, 129, 0.3)', animation: 'slideDown 0.4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={22} color="#10b981" /> Résultats : {result.script.Nom_Scripte}
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setResult(null)}>Fermer</button>
          </div>
          {result.data.length ? (
            <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border-light)' }}>
              <table className="og-table">
                <thead style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                  <tr>{Object.keys(result.data[0]).map(k => <th key={k}>{k}</th>)}</tr>
                </thead>
                <tbody>{result.data.map((r,i) => (
                  <tr key={i}>{Object.values(r).map((v,j) => <td key={j} style={{ fontFamily: typeof v === 'number' ? "'Fira Code', monospace" : 'inherit' }}>{v !== null ? String(v) : 'NULL'}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          ) : <div className="alert alert-info"><Search size={18} /> Aucun résultat retourné par la base.</div>}
        </GlassCard>
      )}

      <div className="section-label" style={{ marginTop: 40, marginBottom: 24 }}>Catalogue de Requêtes</div>

      <div className="grid-2">
        {sorted.map(s => {
          const isFav = favs.includes(s.ID.toString());
          return (
            <GlassCard key={s.ID} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Terminal size={18} color="#0ea5e9" /> {s.Nom_Scripte}
                    {isFav && <Star size={14} color="#f59e0b" fill="#f59e0b" />}
                  </h4>
                  <div className="badge badge-blue">{s.Type_Scripte}</div>
                </div>
                <button 
                  onClick={() => toggleFav(s.ID.toString())}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8, transition: 'transform 0.2s', transform: isFav ? 'scale(1.1)' : 'scale(1)' }}
                >
                  <Star size={22} color={isFav ? '#f59e0b' : '#64748b'} fill={isFav ? '#f59e0b' : 'transparent'} />
                </button>
              </div>

              <div className="code-block" style={{ fontSize: '0.75rem', maxHeight: 110, overflow: 'hidden', padding: 12, marginBottom: 20, opacity: 0.8 }}>
                {s.Contenu_Script}
              </div>

              <button className="btn btn-primary btn-full" onClick={() => exec(s)} disabled={loading || !selected}>
                {loading ? <><Loader2 size={16} className="spinner" /> Exécution...</> : <><Play size={16} /> Lancer la requête</>}
              </button>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
