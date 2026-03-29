import React, { useState, useEffect } from 'react';
import api from '../api';
import GlassCard from '../components/GlassCard';
import { Users, UserPlus, Fingerprint, Shield, Edit2, Trash2, Mail, Save, X, Plus } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers]   = useState([]);
  const [form, setForm]     = useState({ Nom_Domaine:'', Nom_utilisateur:'', identifiant:'', password:'', confirmation:'', role:'consultant', email:'' });
  const [editId, setEditId] = useState(null);
  const [error, setError]   = useState('');

  useEffect(() => { load(); }, []);
  const load = () => api.get('/api/users').then(r => setUsers(r.data));

  const save = async (e) => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirmation) return setError('Mots de passe non identiques.');
    try {
      if(editId) await api.put(`/api/users/${editId}`, form);
      else await api.post('/api/users', form);
      setForm({ Nom_Domaine:'', Nom_utilisateur:'', identifiant:'', password:'', confirmation:'', role:'consultant', email:'' });
      setEditId(null);
      load();
    } catch { setError("Erreur de sauvegarde."); }
  };

  const rm = async (id) => {
    if(!window.confirm('Supprimer cet utilisateur ?')) return;
    try { await api.delete(`/api/users/${id}`); load(); }
    catch { setError("Erreur suppression."); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon" style={{ borderColor: 'rgba(245, 158, 11, 0.3)', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15))', color: '#f59e0b', boxShadow: 'inset 0 0 20px rgba(245, 158, 11, 0.15)' }}>
          <Users size={28} />
        </div>
        <div>
          <h1 className="page-title text-gradient" style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Gestion des Accès
          </h1>
          <p className="page-subtitle">Administration du portail RBAC (Role-Based Access Control)</p>
        </div>
      </div>

      <div className="grid-2">
        <GlassCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}>
            <Shield size={20} color="#f59e0b" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Comptes Actifs ({users.length})</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {users.map(u => (
              <div key={u.ID} style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'box-shadow 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, background: '#f59e0b15', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', flexShrink: 0 }}>
                    <Fingerprint size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1rem', marginBottom: 4 }}>{u.Identifiant}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`badge ${u.Role === 'super_admin' ? 'badge-red' : u.Role === 'admin' ? 'badge-yellow' : u.Role === 'dba' ? 'badge-green' : 'badge-blue'}`}>
                        {u.Role}
                      </span>
                      {u.Email && <span style={{ fontSize: '0.75rem', color: '#64748b' }}><Mail size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{u.Email}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(u.ID); setForm({...u, identifiant: u.Identifiant, password:'', confirmation:'', role: u.Role}); }} style={{ padding: 8 }}><Edit2 size={16}/></button>
                  <button className="btn btn-danger btn-sm" onClick={() => rm(u.ID)} style={{ padding: 8 }}><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}>
            <UserPlus size={20} color="#0ea5e9" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{editId ? 'Modifier un Compte' : 'Créer un Compte'}</h2>
          </div>
          {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}
          <form onSubmit={save}>
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Identifiant Unique</label><input type="text" value={form.identifiant} onChange={e=>setForm({...form,identifiant:e.target.value})} required/></div>
              <div className="form-group"><label className="form-label">Nom Complet</label><input type="text" value={form.Nom_utilisateur} onChange={e=>setForm({...form,Nom_utilisateur:e.target.value})} /></div>
            </div>
            
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Rôle d'Accès</label>
                <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} required>
                  <option value="super_admin">Super Administrateur</option>
                  <option value="admin">Administrateur</option>
                  <option value="dba">DBA</option>
                  <option value="consultant">Consultant</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Email Professionnel</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
            </div>
            
            <div className="divider"></div>
            
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Mot de Passe {editId && '(Laisser vide pour ne pas changer)'}</label>
                <input type={editId ? 'password' : 'text'} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required={!editId} placeholder="••••••••"/>
              </div>
              <div className="form-group"><label className="form-label">Confirmation</label>
                <input type={editId ? 'password' : 'text'} value={form.confirmation} onChange={e=>setForm({...form,confirmation:e.target.value})} required={!editId} placeholder="••••••••"/>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                {editId ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Créer le compte</>}
              </button>
              {editId && <button type="button" className="btn btn-ghost" onClick={() => { setEditId(null); setForm({ Nom_Domaine:'', Nom_utilisateur:'', identifiant:'', password:'', confirmation:'', role:'consultant', email:'' }); }}><X size={16}/></button>}
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
