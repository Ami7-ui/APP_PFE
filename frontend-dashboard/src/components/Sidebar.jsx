import React from 'react';
// NOUVEAU : Ajout de l'icône Bot pour l'IA
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, Settings, Database, Code, Users, LogOut, Shield, Bot, FileText, Activity } from 'lucide-react'; 

const ROLE_COLORS = {
  super_admin: '#ef4444', admin: '#f59e0b', consultant: '#0ea5e9', dba: '#10b981'
};
const ROLE_LABELS = {
  super_admin: 'SUP. ADMIN', admin: 'ADMIN', consultant: 'CONSULTANT', dba: 'DBA'
};

const NAV_ITEMS = [
  { key: '',              label: 'Tableau de Bord',      Icon: LayoutDashboard, roles: ['super_admin','admin','consultant','dba'] },
  { key: 'configuration', label: 'Diagnostics SQL',        Icon: Settings,        roles: ['super_admin','admin'] },
  { key: 'cibles',        label: 'Bases Cibles',           Icon: Database,        roles: ['super_admin','admin'] },
  { key: 'scripts',       label: 'Scripts Métriques',      Icon: Code,            roles: ['super_admin'] },
  { key: 'users',         label: 'Contrôle Accès',         Icon: Users,           roles: ['super_admin'] },
  { key: 'assistant-ia',  label: 'Assistant IA',           Icon: Bot,             roles: ['super_admin','admin','consultant','dba'] }, 
  { key: 'reports-history', label: 'Historique Rapports',  Icon: FileText,        roles: ['super_admin','admin','consultant','dba'] },
  { key: 'sql-phv',       label: 'Analyse PHV',            Icon: Activity,        roles: ['super_admin','admin','consultant','dba'] },
];

export default function Sidebar({ user, onLogout }) {
  const role = user?.role || 'consultant';
  const roleColor = ROLE_COLORS[role] || '#64748b';
  const roleLabel = ROLE_LABELS[role] || role.toUpperCase();
  const visibleNav = NAV_ITEMS.filter(n => n.roles.includes(role));

  return (
    <aside style={{
      width: 260, flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      background: 'rgba(5, 11, 25, 0.85)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
      borderRight: '1px solid rgba(255, 255, 255, 0.05)',
      display: 'flex', flexDirection: 'column', padding: '28px 20px', gap: 12, overflowY: 'auto'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 30, paddingLeft: 8 }}>
        <div style={{
          width: 48, height: 48, background: 'linear-gradient(135deg, #0284c7, #6d28d9)',
          borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 25px rgba(2, 132, 199, 0.5), inset 0 0 10px rgba(255,255,255,0.2)', flexShrink: 0
        }}>
          <Shield size={26} color="white" />
        </div>
        <div>
          <div className="title-font text-gradient" style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.05em' }}>
            OracleGuard
          </div>
          <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 2 }}>
            Secure Platform
          </div>
        </div>
      </div>

      {/* User Session Badge */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: 16, padding: '16px',
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          width: 40, height: 40, flexShrink: 0,
          background: `radial-gradient(circle at top left, ${roleColor}66, ${roleColor}11)`,
          border: `1px solid ${roleColor}44`, borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: roleColor,
          boxShadow: `inset 0 0 10px ${roleColor}22`
        }}>
          <Users size={20} />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {user?.nom_complet || 'Invité'}
          </div>
          <div style={{
            fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em',
            color: roleColor, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor, boxShadow: `0 0 8px ${roleColor}` }}></span>
            {roleLabel}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', padding: '12px 10px 4px' }}>
        Menu Principal
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visibleNav.map(n => (
          <NavLink 
            key={n.key} 
            to={`/${n.key}`}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
              borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
              fontSize: '0.88rem', fontWeight: isActive ? 700 : 500, textDecoration: 'none',
              background: isActive ? 'linear-gradient(90deg, rgba(14, 165, 233, 0.15) 0%, transparent 100%)' : 'transparent',
              color: isActive ? '#38bdf8' : '#94a3b8',
              borderLeft: isActive ? '4px solid #0ea5e9' : '4px solid transparent',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isActive ? 'inset 10px 0 20px -10px rgba(14, 165, 233, 0.3)' : 'none'
            })}
            onMouseEnter={e => { if(!e.currentTarget.classList.contains('active')) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#e2e8f0'; } }}
            onMouseLeave={e => { if(!e.currentTarget.classList.contains('active')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; } }}
          >
            {({ isActive }) => (
              <>
                <n.Icon size={20} color={isActive ? '#38bdf8' : '#64748b'} strokeWidth={isActive ? 2.5 : 2} style={{ transition: 'color 0.2s' }} />
                {n.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Footer / Logout */}
      <button onClick={onLogout} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        padding: '14px', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.2)',
        background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', fontWeight: 600, fontSize: '0.85rem',
        cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', marginTop: 20
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.2)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <LogOut size={18} /> Déconnexion
      </button>
      
      <div style={{ textAlign: 'center', fontSize: '0.65rem', color: '#334155', marginTop: 16, fontWeight: 600, letterSpacing: '0.05em' }}>
        © 2026 ORACLEGUARD PRO
      </div>
    </aside>
  );
}