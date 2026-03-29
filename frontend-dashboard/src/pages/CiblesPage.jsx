import React, { useState, useEffect } from 'react';
import api from '../api';
import GlassCard from '../components/GlassCard';
import { Database, Plus, Edit2, Trash2, ShieldAlert, Server, Box, Fingerprint } from 'lucide-react';

export default function CiblesPage() {
  const [cibles, setCibles] = useState([]);
  const [types, setTypes]   = useState([]);
  const [form, setForm]     = useState({ IP:'', Port:'', Nom_Instance:'', Instance:'', Type_SGBD:'', Nom_utilisateur:'', Mot_passe:'' });
  const [editId, setEditId] = useState(null);
  const [error, setError]   = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const load = () => {
    api.get('/api/bases').then(r => setCibles(r.data));
    api.get('/api/types_sgbd').then(r => setTypes(r.data));
  };

  const save = async (e) => {
    e.preventDefault(); setError('');
    const payload = {
      nom: form.Nom_Instance,
      ip: form.IP,
      port: parseInt(form.Port) || 0,
      user: form.Nom_utilisateur,
      password: form.Mot_passe,
      type_sgbd: form.Type_SGBD
    };
    try {
      if (editId) await api.put(`/api/bases/${editId}`, payload);
      else await api.post('/api/bases', payload);
      setForm({ IP:'', Port:'', Nom_Instance:'', Instance:'', Type_SGBD:'', Nom_utilisateur:'', Mot_passe:'' });
      setEditId(null);
      load();
    } catch { setError("Erreur lors de l'enregistrement."); }
  };

  const rm = async (id) => {
    if (!window.confirm("Supprimer cette base ?")) return;
    try { await api.delete(`/api/bases/${id}`); load(); }
    catch { setError("Erreur suppression."); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15))', color: '#10b981', boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.15)' }}>
          <Database size={28} />
        </div>
        <div>
          <h1 className="page-title text-gradient" style={{ background: 'linear-gradient(135deg, #34d399, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Gestion des Bases Cibles
          </h1>
          <p className="page-subtitle">Inventaire et configuration des instances surveillées</p>
        </div>
      </div>

      {error && <div className="alert alert-error"><ShieldAlert size={18} /> {error}</div>}

      <div className="grid-2">
        <GlassCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}>
            <Server size={20} color="#10b981" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Inventaire ({cibles.length})</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cibles.map(c => (
              <div key={c.ID} style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'box-shadow 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 40, height: 40, background: '#10b98115', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <Database size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>{c.Instance}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: "'Fira Code', monospace" }}>{c.IP}:{c.Port}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { 
                    setEditId(c.ID); 
                    setForm({
                      IP: c.IP,
                      Port: String(c.Port),
                      Nom_Instance: c.Instance, 
                      Instance: c.Instance,
                      Type_SGBD: c.Type,
                      Nom_utilisateur: '', 
                      Mot_passe: ''
                    }); 
                  }} style={{ padding: 8 }}><Edit2 size={16} /></button>
                  <button className="btn btn-danger btn-sm" onClick={() => rm(c.ID)} style={{ padding: 8 }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {cibles.length === 0 && <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>Aucune base enregistrée.</div>}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}>
            <Box size={20} color="#0ea5e9" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{editId ? 'Modifier Instance' : 'Ajouter une Instance'}</h2>
          </div>
          <form onSubmit={save}>
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Nom Instance (Affichage)</label><input type="text" value={form.Instance} onChange={e=>setForm({...form,Instance:e.target.value})} required/></div>
              <div className="form-group"><label className="form-label">SID / Service Name</label><input type="text" value={form.Nom_Instance} onChange={e=>setForm({...form,Nom_Instance:e.target.value})} required/></div>
            </div>
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Adresse IP / Hôte</label><input type="text" value={form.IP} onChange={e=>setForm({...form,IP:e.target.value})} required/></div>
              <div className="form-group"><label className="form-label">Port</label><input type="text" value={form.Port} onChange={e=>setForm({...form,Port:e.target.value})} required/></div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Type SGBD</label>
                <input 
                  type="text" 
                  value={form.Type_SGBD} 
                  onChange={e=>setForm({...form,Type_SGBD:e.target.value})} 
                  placeholder="Oracle, PostgreSQL, etc."
                  required
                />
              </div>
            </div>
            <div className="divider"></div>
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Fingerprint size={12}/> DB User</label><input type="text" value={form.Nom_utilisateur} onChange={e=>setForm({...form,Nom_utilisateur:e.target.value})} required/></div>
              <div className="form-group"><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Fingerprint size={12}/> DB Password</label><input type="password" value={form.Mot_passe} onChange={e=>setForm({...form,Mot_passe:e.target.value})} required/></div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #10b981, #059669)' }}><Plus size={16}/> Enregistrer</button>
              {editId && <button type="button" className="btn btn-ghost" onClick={() => { setEditId(null); setForm({ IP:'', Port:'', Nom_Instance:'', Instance:'', Type_SGBD:'', Nom_utilisateur:'', Mot_passe:'' }); }}>Annuler</button>}
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
