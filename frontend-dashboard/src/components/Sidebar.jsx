import React from 'react';
// NOUVEAU : Ajout de l'icône Bot pour l'IA
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, Database, Code, Users, LogOut, Shield, Bot, FileText, Activity, PanelLeftClose, PanelLeftOpen, ChevronLeft, ChevronRight } from 'lucide-react'; 
import useAppStore from '../store/useAppStore';

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
  const { isSidebarOpen, toggleSidebar } = useAppStore();
  const role = user?.role || 'consultant';
  const roleColor = ROLE_COLORS[role] || '#64748b';
  const roleLabel = ROLE_LABELS[role] || role.toUpperCase();
  const visibleNav = NAV_ITEMS.filter(n => n.roles.includes(role));

  return (
    <aside style={{
      width: isSidebarOpen ? 260 : 80, flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      background: 'var(--glass-bg)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
      borderRight: '1px solid var(--glass-border)',
      display: 'flex', flexDirection: 'column', padding: isSidebarOpen ? '28px 20px' : '28px 12px', gap: 12, overflowY: 'auto',
      boxShadow: '10px 0 30px rgba(0,0,0,0.2)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 100,
      overflowX: 'hidden'
    }}>
      {/* Toggle Button */}
      <button 
        onClick={toggleSidebar}
        style={{
          position: 'absolute',
          top: 20,
          right: isSidebarOpen ? 10 : '50%',
          transform: isSidebarOpen ? 'none' : 'translateX(50%)',
          width: 32,
          height: 32,
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'all 0.3s',
          zIndex: 10
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'; e.currentTarget.style.color = 'var(--accent-cyan)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 30, paddingLeft: isSidebarOpen ? 8 : 4 }}>
        <div style={{
          width: 48, height: 48, background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
          borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 25px var(--glow-purple), inset 0 0 10px rgba(255,255,255,0.4)', flexShrink: 0,
          position: 'relative'
        }}>
          <Shield size={26} color="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
        </div>
        {isSidebarOpen && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <div className="title-font text-gradient" style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.05em' }}>
              OracleGuard
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--accent-emerald)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 2, textShadow: '0 0 10px var(--glow-emerald)' }}>
              Secure Platform
            </div>
          </div>
        )}
      </div>

      {/* User Session Badge */}
      <div className="glass-panel" style={{
        padding: isSidebarOpen ? '16px' : '8px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
        boxShadow: 'inset 0 0 15px rgba(255,255,255,0.02)',
        justifyContent: isSidebarOpen ? 'flex-start' : 'center'
      }}>
        <div style={{
          width: 40, height: 40, flexShrink: 0,
          background: `radial-gradient(circle at top left, ${roleColor}44, ${roleColor}11)`,
          border: `1px solid ${roleColor}55`, borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: roleColor,
          boxShadow: `inset 0 0 15px ${roleColor}33, 0 0 10px ${roleColor}22`
        }}>
          <Users size={20} />
        </div>
        {isSidebarOpen && (
          <div style={{ overflow: 'hidden', animation: 'fadeIn 0.3s' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.nom_complet || 'Invité'}
            </div>
            <div style={{
              fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em',
              color: roleColor, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
              textShadow: `0 0 8px ${roleColor}55`
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor, boxShadow: `0 0 8px ${roleColor}` }}></span>
              {roleLabel}
            </div>
          </div>
        )}
      </div>

      {isSidebarOpen && (
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', padding: '12px 10px 4px', animation: 'fadeIn 0.3s' }}>
          Menu Principal
        </div>
      )}

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visibleNav.map(n => (
          <NavLink 
            key={n.key} 
            to={`/${n.key}`}
            title={!isSidebarOpen ? n.label : ""}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
              borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
              fontSize: '0.88rem', fontWeight: isActive ? 700 : 500, textDecoration: 'none',
              background: isActive ? 'linear-gradient(90deg, rgba(34, 211, 238, 0.15) 0%, transparent 100%)' : 'transparent',
              color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
              borderLeft: isActive ? '4px solid var(--accent-cyan)' : '4px solid transparent',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isActive ? 'inset 10px 0 20px -10px var(--glow-cyan)' : 'none',
              justifyContent: isSidebarOpen ? 'flex-start' : 'center'
            })}
            onMouseEnter={e => { if(!e.currentTarget.classList.contains('active')) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255,255,255,0.05)'; } }}
            onMouseLeave={e => { if(!e.currentTarget.classList.contains('active')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.boxShadow = 'none'; } }}
          >
            {({ isActive }) => (
              <>
                <n.Icon size={20} color={isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'} strokeWidth={isActive ? 2.5 : 2} style={{ transition: 'color 0.2s', filter: isActive ? 'drop-shadow(0 0 8px var(--glow-cyan))' : 'none', flexShrink: 0 }} />
                {isSidebarOpen && <span style={{ animation: 'fadeIn 0.3s' }}>{n.label}</span>}
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
        cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', marginTop: 20
      }}
      title={!isSidebarOpen ? "Déconnexion" : ""}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <LogOut size={18} /> {isSidebarOpen && "Déconnexion"}
      </button>
      
      <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 16, fontWeight: 600, letterSpacing: '0.05em' }}>
        © 2026 ORACLEGUARD PRO
      </div>
    </aside>
  );
}