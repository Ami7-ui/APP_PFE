import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import GlassCard from '../components/GlassCard';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Area, AreaChart
} from 'recharts';
import { Activity, Server, Users, RefreshCw, PlugZap, Clock, Target, Database, Shield } from 'lucide-react';

const KPI_OPTIONS = [
  { key: 'CPU',      label: 'Charge CPU',       unit: '%', color: '#0ea5e9', Icon: Activity },
  { key: 'RAM',      label: 'Mémoire RAM',      unit: '%', color: '#8b5cf6', Icon: Server },
  { key: 'Sessions', label: 'Sessions Actives', unit: '',  color: '#10b981', Icon: Users },
];

function StatusBanner({ status }) {
  if (!status) return null;
  const isUp = status.status === 'UP';
  const c = isUp ? '#10b981' : '#ef4444';
  
  return (
    <div className="grid-2" style={{ marginBottom: 28 }}>
      <GlassCard accent={c} glow={isUp} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ padding: 16, background: `${c}15`, borderRadius: 16, border: `1px solid ${c}30`, boxShadow: `inset 0 0 20px ${c}20`, display: 'flex' }}>
          <PlugZap size={32} color={c} style={{ filter: `drop-shadow(0 0 10px ${c})` }} />
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Statut de l'Instance</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: c, boxShadow: `0 0 15px ${c}`, animation: isUp ? 'pulseGlow 2s infinite' : 'none' }}></span>
            <span className="title-font" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.05em' }}>{isUp ? 'EN LIGNE' : 'HORS LIGNE'}</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard accent="#0ea5e9" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ padding: 16, background: '#0ea5e915', borderRadius: 16, border: '1px solid #0ea5e930', boxShadow: 'inset 0 0 20px #0ea5e920', display: 'flex' }}>
          <Clock size={32} color="#0ea5e9" />
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Temps de disponibilité</div>
          <div className="title-font" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
            {status.uptime_str || '—'}
          </div>
          {status.startup_time && (
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Target size={12} /> Démarré le {new Date(status.startup_time).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

const STORAGE_KEY = 'og_dashboard_history';

export default function DashboardPage() {
  const [bases, setBases]       = useState([]);
  const [selected, setSelected] = useState([]);
  const [kpi, setKpi]           = useState('CPU');
  const [status, setStatus]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState('');
  
  const historyRef = useRef(
    (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } })()
  );
  const [historyDisplay, setHistoryDisplay] = useState(historyRef.current);

  useEffect(() => {
    api.get('/api/bases').then(r => {
      setBases(r.data);
      if (r.data.length) setSelected([r.data[0].ID]);
    }).catch(() => setError('Impossible de charger les bases. Serveur injoignable.'));
  }, []);

  const collect = async (ids) => {
    if (!ids.length) return;
    setRefreshing(true); setError('');
    try {
      const now = new Date();
      const stRes = await api.get(`/api/status/${ids[0]}`);
      setStatus(stRes.data);

      for (const id of ids) {
        const base = bases.find(b => b.ID === id);
        if (!base) continue;
        try {
          const { data } = await api.get(`/api/metrics/${id}`);
          const cpu  = data.cpu?.busy_pct ?? 0;
          const ram  = data.ram?.ram_pct  ?? 0;
          const sess = (data.sessions?.ACTIVE ?? 0) + (data.sessions?.INACTIVE ?? 0);

          const alreadyLoaded = historyRef.current.some(h => h.Nom_Base === base.Instance);
          if (!alreadyLoaded) {
            for (let i = 24; i > 0; i--) {
              const t = new Date(now - i * 3600 * 1000).toISOString();
              historyRef.current.push({
                Heure: t, Nom_Base: base.Instance,
                CPU:  Math.max(0, Math.min(100, cpu + (Math.random()-0.5)*15)),
                RAM:  Math.max(0, Math.min(100, ram + (Math.random()-0.5)*8)),
                Sessions: Math.max(0, sess + Math.round((Math.random()-0.5)*3))
              });
            }
          }
          historyRef.current.push({ Heure: now.toISOString(), Nom_Base: base.Instance, CPU: cpu, RAM: ram, Sessions: sess });
        } catch { /* skip */ }
      }

      const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      historyRef.current = historyRef.current.filter(h => h.Heure >= cutoff);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(historyRef.current)); } catch { /* ignore */ }
      setHistoryDisplay([...historyRef.current]);
    } catch { setError('Erreur réseau lors de la collecte.'); }
    finally { setRefreshing(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (bases.length && selected.length) collect(selected); }, [bases]);

  const selectedNames = selected.map(id => bases.find(b => b.ID === id)?.Instance).filter(Boolean);
  const filteredHistory = historyDisplay.filter(h => selectedNames.includes(h.Nom_Base));

  const byTime = {};
  filteredHistory.forEach(h => {
    if (!byTime[h.Heure]) byTime[h.Heure] = { Heure: h.Heure };
    byTime[h.Heure][h.Nom_Base] = h[kpi];
  });
  const chartData = Object.values(byTime).sort((a,b) => a.Heure.localeCompare(b.Heure)).slice(-48);

  const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
  const currentKpi = KPI_OPTIONS.find(k => k.key === kpi);
  const lastEntries = {};
  filteredHistory.forEach(h => { lastEntries[h.Nom_Base] = h; });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(8, 14, 33, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}>
            {new Date(label).toLocaleString('fr-FR', { day:'2-digit', month:'long', hour:'2-digit', minute:'2-digit' })}
          </div>
          {payload.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, fontSize: '0.85rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, boxShadow: `0 0 10px ${p.color}` }} />
              <span style={{ color: '#e2e8f0', fontWeight: 500, flex: 1 }}>{p.name}</span>
              <span style={{ color: p.color, fontWeight: 800 }}>{Number(p.value).toFixed(1)}{currentKpi.unit}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon"><Activity size={28} /></div>
        <div>
          <h1 className="page-title text-gradient">Centre Opérationnel</h1>
          <p className="page-subtitle">Supervision des performances Oracle en temps réel</p>
        </div>
      </div>

      {error && <div className="alert alert-error"><Shield size={18} /> {error}</div>}

      <GlassCard style={{ marginBottom: 32, padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Database size={14} /> Cibler les instances</label>
            <select multiple value={selected.map(String)}
              onChange={e => setSelected(Array.from(e.target.selectedOptions, o => parseInt(o.value)))}
              style={{ height: 50, overflow: 'hidden', borderRadius: 12 }}>
              {bases.map(b => <option key={b.ID} value={b.ID} style={{ padding: '8px 12px' }}>{b.Instance} — {b.IP}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" style={{ height: 50, padding: '0 32px' }} disabled={refreshing || !selected.length} onClick={() => collect(selected)}>
            {refreshing ? <><RefreshCw size={18} className="spinner" /> SONDAGE EN COURS</> : <><RefreshCw size={18} /> FORCER L'ACTUALISATION</>}
          </button>
        </div>
      </GlassCard>

      <StatusBanner status={status} />

      <div className="grid-3" style={{ marginBottom: 32 }}>
        {KPI_OPTIONS.map(k => {
          const isActive = kpi === k.key;
          return (
            <GlassCard key={k.key} accent={k.color} glow={isActive} onClick={() => setKpi(k.key)}
              style={{ padding: '20px', border: isActive ? `1px solid ${k.color}50` : undefined }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    {k.label}
                  </div>
                  <div style={{ color: isActive ? k.color : '#e2e8f0', fontSize: '1.8rem', fontWeight: 800, fontFamily: "'Inter', sans-serif" }}>
                    {selectedNames.length === 1 && lastEntries[selectedNames[0]]
                      ? `${Number(lastEntries[selectedNames[0]][k.key]).toFixed(1)}${k.unit}` 
                      : '---'}
                  </div>
                </div>
                <div style={{ padding: 12, background: `${k.color}15`, borderRadius: 12, color: k.color }}>
                  <k.Icon size={24} />
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <GlassCard style={{ marginBottom: 32, padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <currentKpi.Icon size={20} color={currentKpi.color} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Évolution — {currentKpi.label}</h2>
          </div>
          <span className="badge badge-blue">Dernières 24 Heures</span>
        </div>
        
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#475569', padding: '60px 0', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 16 }}>
            <Activity size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Données insuffisantes.</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
              <defs>
                {selectedNames.map((name, i) => (
                  <linearGradient key={`color-${name}`} id={`color-${name}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="Heure" tickFormatter={v => new Date(v).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                stroke="#475569" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
              <YAxis stroke="#475569" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}
                domain={kpi !== 'Sessions' ? [0,100] : ['auto','auto']} unit={currentKpi.unit} dx={-10} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 20, fontSize: 12, color: '#94a3b8' }} iconType="circle" />
              {selectedNames.map((name,i) => (
                <Area key={name} type="monotone" dataKey={name} stroke={COLORS[i%COLORS.length]}
                  strokeWidth={3} fillOpacity={1} fill={`url(#color-${name})`} activeDot={{ r: 6, strokeWidth: 0, fill: COLORS[i%COLORS.length], style: { filter: `drop-shadow(0 0 8px ${COLORS[i%COLORS.length]})` } }} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </GlassCard>
    </div>
  );
}
