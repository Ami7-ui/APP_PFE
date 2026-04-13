import React, { useState, useEffect } from 'react';
import api from '../api';
import GlassCard from '../components/GlassCard';
import ScriptsMetriques from '../components/ScriptsMetriques';
import { FileCode2, Code2, Plus, Edit2, Trash2, Save, X, Terminal, Database, Filter, Archive } from 'lucide-react';

export default function ScriptsPage() {
  const [scripts, setScripts] = useState([]);
  const [typesBase, setTypesBase] = useState([]);
  const [filter, setFilter]       = useState('all');
  const [form, setForm]       = useState({ Nom_Scripte: '', id_type_base: '', Contenu_Script: '' });
  const [editId, setEditId]   = useState(null);
  const [error, setError]     = useState('');

  useEffect(() => { load(); }, []);

  const load = () => {
    api.get('/api/scripts').then(r => setScripts(r.data));
    api.get('/api/types_sgbd').then(r => setTypesBase(r.data));
  };

  const save = async (e) => {
    e.preventDefault(); setError('');
    const payload = {
      Nom_Scripte: form.Nom_Scripte,
      Contenu_Script: form.Contenu_Script,
      id_type_base: parseInt(form.id_type_base)
    };
    try {
      if(editId) await api.put(`/api/scripts/${editId}`, payload);
      else await api.post('/api/scripts', payload);
      setForm({ Nom_Scripte: '', id_type_base: '', Contenu_Script: '' });
      setEditId(null);
      load();
    } catch { setError('Erreur de sauvegarde. Vérifiez les champs.'); }
  };

  const rm = async (id) => {
    if(!window.confirm('Supprimer ce script définitivement ?')) return;
    try { await api.delete(`/api/scripts/${id}`); load(); }
    catch { setError('Erreur de suppression.'); }
  };

  const filteredScripts = filter === 'all' 
    ? scripts 
    : scripts.filter(s => String(s.id_type_base) === filter);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon" style={{ borderColor: 'rgba(236, 72, 153, 0.3)', background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(219, 39, 119, 0.15))', color: '#ec4899', boxShadow: 'inset 0 0 20px rgba(236, 72, 153, 0.15)' }}>
          <FileCode2 size={28} />
        </div>
        <div>
          <h1 className="page-title text-gradient" style={{ background: 'linear-gradient(135deg, #f472b6, #db2777)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Gestionnaire de Scripts
          </h1>
          <p className="page-subtitle">Création et maintenance du catalogue de requêtes SQL</p>
        </div>
      </div>

      <GlassCard style={{ marginBottom: 24, padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>
            <Filter size={18} /> FILTRER PAR SYSTÈME :
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`} 
              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
              onClick={() => setFilter('all')}>TOUS ({scripts.length})</button>
            {typesBase.map(t => (
              <button 
                key={t.id}
                className={`btn ${filter === String(t.id) ? 'btn-primary' : 'btn-ghost'}`} 
                style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                onClick={() => setFilter(String(t.id))}>
                {t.nom.toUpperCase()} ({scripts.filter(s => s.id_type_base === t.id).length})
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      <div style={{ marginBottom: 24 }}>
        <ScriptsMetriques />
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <GlassCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}>
            <Terminal size={20} color="#ec4899" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Bibliothèque SQL ({filteredScripts.length})</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredScripts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569', fontSize: '0.9rem' }}>
                Aucun script trouvé pour ce filtre.
              </div>
            ) : filteredScripts.map(s => (
              <div key={s.ID} className="expander" style={{ background: 'transparent' }}>
                <div className="expander-header">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc', marginBottom: 4 }}>{s.Nom_Scripte}</div>
                    <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>{s.Type_Scripte}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(s.ID); setForm(s); }}><Edit2 size={16} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => rm(s.ID)}><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="expander-body" style={{ padding: '12px 16px' }}>
                  <div className="code-block" style={{ fontSize: '0.75rem', maxHeight: 150, overflowY: 'auto', background: 'rgba(11, 17, 32, 0.9)' }}>
                    {s.Contenu_Script}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}>
            <Code2 size={20} color="#0ea5e9" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{editId ? 'Éditeur de Script' : 'Nouveau Script'}</h2>
          </div>
          {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}
          <form onSubmit={save}>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Nom du Script</label>
                <input type="text" value={form.Nom_Scripte} onChange={e=>setForm({...form,Nom_Scripte:e.target.value})} required/>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Database size={14}/> Système (SGBD)</label>
                <select value={form.id_type_base} onChange={e=>setForm({...form,id_type_base:e.target.value})} required>
                  <option value="">Sélectionner...</option>
                  {typesBase.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Terminal size={14}/> Requête SQL</label>
              <textarea 
                value={form.Contenu_Script} onChange={e=>setForm({...form,Contenu_Script:e.target.value})} 
                required rows={12} 
                style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.85rem', color: '#bae6fd' }}
                placeholder="SELECT * FROM v$session..."
              />
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>
                {editId ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Créer le script</>}
              </button>
              {editId && <button type="button" className="btn btn-ghost" onClick={() => { setEditId(null); setForm({ Nom_Scripte: '', id_type_base: '', Contenu_Script: '' }); }}><X size={16}/></button>}
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
