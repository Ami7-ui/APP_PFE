import React, { useState } from 'react';
import { Shield, Fingerprint, Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import api from '../api';

export default function LoginPage({ onLogin }) {
  const [form, setForm]     = useState({ identifiant: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/api/login', form);
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Serveur injoignable ou erreur interne.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#030816', overflow: 'hidden', position: 'relative'
    }}>
      {/* Background Animated Orbs */}
      <div style={{ position: 'absolute', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(14, 165, 233, 0.05), transparent 60%)', top: '-10%', left: '-10%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06), transparent 70%)', bottom: '-20%', right: '-10%', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 460, padding: '0 20px', zIndex: 1, animation: 'slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        {/* Header Title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 88, height: 88, margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #0284c7, #6d28d9)', borderRadius: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 20px 40px rgba(2, 132, 199, 0.4), inset 0 0 20px rgba(255,255,255,0.3)'
          }}>
            <Shield size={44} color="white" strokeWidth={1.5} />
          </div>
          <h1 className="title-font text-gradient" style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: 8, letterSpacing: '0.02em' }}>
            OracleGuard
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
            Plateforme d'Audit Sécurisée
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.7) 0%, rgba(8, 14, 33, 0.9) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 28, padding: '40px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.1)',
          backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>Accès Restreint</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Veuillez vous authentifier pour continuer</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: '12px 16px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeIn 0.3s' }}>
              <Shield size={18} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14}/> Identifiant ou Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text" placeholder="admin@entreprise.com"
                  value={form.identifiant} onChange={e => setForm(f => ({ ...f, identifiant: e.target.value }))}
                  required style={{ paddingLeft: 44, height: 50, fontSize: '0.95rem' }}
                />
                <Fingerprint size={18} color="#64748b" style={{ position: 'absolute', left: 16, top: 16, pointerEvents: 'none' }} />
              </div>
            </div>
            
            <div className="form-group" style={{ marginBottom: 32 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Lock size={14}/> Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password" placeholder="••••••••"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required style={{ paddingLeft: 44, height: 50, fontSize: '0.95rem' }}
                />
                <Lock size={18} color="#64748b" style={{ position: 'absolute', left: 16, top: 16, pointerEvents: 'none' }} />
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ height: 50, fontSize: '1rem', background: 'linear-gradient(135deg, #0284c7, #4f46e5)' }}>
              {loading ? <><Loader2 size={18} className="spinner" /> Authentification...</> : <>Connexion Sécurisée <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div style={{ textAlign: 'center', marginTop: 32, fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <span>🔒 Chiffrement de bout en bout</span>
          <span style={{ width: 4, height: 4, background: '#475569', borderRadius: '50%' }} />
          <span>✅ Accès RBAC Actif</span>
        </div>
      </div>
    </div>
  );
}
