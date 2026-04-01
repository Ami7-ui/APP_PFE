import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import GlassCard from '../components/GlassCard';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Area, AreaChart,
  PieChart, Pie, Cell
} from 'recharts';
import { Activity, Server, Users, RefreshCw, PlugZap, Clock, Target, Database, Shield, Calendar } from 'lucide-react';

const KPI_OPTIONS = [
  { key: 'CPU',      label: 'Charge CPU',       unit: '%', color: '#0ea5e9', Icon: Activity },
  { key: 'RAM',      label: 'Mémoire RAM',      unit: '%', color: '#8b5cf6', Icon: Server },
  { key: 'Sessions', label: 'Sessions Actives', unit: '',  color: '#10b981', Icon: Users },
  { key: 'Transactions', label: 'Transactions', unit: '',  color: '#f59e0b', Icon: RefreshCw },
  { key: 'Blocked', label: 'Blocages', unit: '',  color: '#ef4444', Icon: Shield },
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

function GaugeChart({ value, label, unit, color, maxValue = 100, displayValue }) {
  const arcValue = Math.min(100, (value / (maxValue || 1)) * 100);
  const data = [
    { value: arcValue, fill: color },
    { value: Math.max(0, 100 - arcValue), fill: 'rgba(255,255,255,0.05)' }
  ];

  return (
    <div style={{ textAlign: 'center', position: 'relative', height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="85%"
            startAngle={180}
            endAngle={0}
            innerRadius={65}
            outerRadius={85}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
            animationDuration={1500}
            animationBegin={0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', width: '100%' }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', textShadow: `0 0 20px ${color}40` }}>
          {displayValue !== undefined ? displayValue : Number(value).toFixed(1)}{unit}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          {label}
        </div>
      </div>
    </div>
  );
}

const STORAGE_KEY = 'og_dashboard_history';

export default function DashboardPage() {
  const [bases, setBases]       = useState([]);
  const [selected, setSelected] = useState([]);
  const [kpi, setKpi]           = useState('CPU');
  const [status, setStatus]     = useState(null);
  const [nodes, setNodes]       = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState('');
  
  // NOUVEAU : Le state pour le filtre de temps
  const [timeFilter, setTimeFilter] = useState('24h');
  
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
          // MODIFICATION : Envoi du filtre de temps à l'API FastAPI
          const { data } = await api.get(`/api/metrics/${id}?range=${timeFilter}`);
          
          if (id === ids[0]) setNodes(data.nodes || []);
          const cpu  = data.cpu?.busy_pct ?? 0;
          const ram  = data.ram?.ram_pct  ?? 0;
          const sess = data.sessions?.ACTIVE ?? 0;
          const blocked = data.sessions?.BLOCKED ?? 0;
          const trans = data.sessions?.TOTAL_TRANSACTIONS ?? 0;

          historyRef.current = [{ 
            Heure: now.toISOString(), Nom_Base: base.Instance, 
            CPU: cpu, RAM: ram, Sessions: sess,
            Blocked: blocked, Transactions: trans 
          }];
        } catch { /* skip */ }
      }
      
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(historyRef.current)); } catch { /* ignore */ }
      setHistoryDisplay([...historyRef.current]);
    } catch { setError('Erreur réseau lors de la collecte.'); }
    finally { setRefreshing(false); }
  };

  // MODIFICATION : On relance la collecte si la base sélectionnée OU le filtre de temps change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (bases.length && selected.length) collect(selected); }, [bases, timeFilter]);

  const selectedNames = selected.map(id => bases.find(b => b.ID === id)?.Instance).filter(Boolean);
  const filteredHistory = historyDisplay.filter(h => selectedNames.includes(h.Nom_Base));

  const lastEntries = {};
  filteredHistory.forEach(h => { lastEntries[h.Nom_Base] = h; });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon"><Activity size={28} /></div>
        <div style={{ flex: 1 }}>
          <h1 className="page-title text-gradient">Centre Opérationnel</h1>
          <p className="page-subtitle">Supervision des performances SGBD (Oracle & MySQL) en temps réel</p>
        </div>
      </div>

      {error && <div className="alert alert-error"><Shield size={18} /> {error}</div>}
      <GlassCard style={{ marginBottom: 32, padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Database size={14} /> Cibler les instances</label>
            <select 
              multiple 
              value={selected.map(String)}
              size={Math.max(2, bases.length)}
              onChange={e => setSelected(Array.from(e.target.selectedOptions, o => parseInt(o.value)))}
              style={{ width: '100%', borderRadius: 12, padding: '4px', background: 'rgba(15, 23, 42, 0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}>
              {bases.map(b => (
                <option key={b.ID} value={b.ID} style={{ padding: '10px 15px', borderRadius: 8, margin: '2px 0', cursor: 'pointer' }}>
                  {b.Instance} — {b.IP} ({b.Type})
                </option>
              ))}
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
              style={{ padding: '20px', border: isActive ? `1px solid ${k.color}50` : undefined, cursor: 'pointer' }}>
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

      <div className="grid-2" style={{ marginBottom: 32 }}>
        <GlassCard accent="#0ea5e9" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Activity size={18} color="#0ea5e9" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Utilisation CPU</h3>
          </div>
          <GaugeChart 
            value={selectedNames.length === 1 && lastEntries[selectedNames[0]] ? lastEntries[selectedNames[0]].CPU : 0} 
            label="Charge Actuelle" 
            unit="%" 
            color="#0ea5e9" 
          />
        </GlassCard>

        <GlassCard accent="#8b5cf6" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Server size={18} color="#8b5cf6" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Utilisation RAM</h3>
          </div>
          <GaugeChart 
            value={selectedNames.length === 1 && lastEntries[selectedNames[0]] ? lastEntries[selectedNames[0]].RAM : 0} 
            label="Mémoire Occupée" 
            unit="%" 
            color="#8b5cf6" 
          />
        </GlassCard>
      </div>

      <div className="grid-3" style={{ marginBottom: 32 }}>
        <GlassCard accent="#f59e0b" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <RefreshCw size={18} color="#f59e0b" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Taux de Transaction</h3>
          </div>
          <GaugeChart 
            value={selectedNames.length === 1 && lastEntries[selectedNames[0]] ? lastEntries[selectedNames[0]].Transactions : 0} 
            displayValue={selectedNames.length === 1 && lastEntries[selectedNames[0]] ? lastEntries[selectedNames[0]].Transactions : 0}
            maxValue={1000}
            label="Débit (Commits)" 
            unit="" 
            color="#f59e0b" 
          />
        </GlassCard>

        <GlassCard accent="#10b981" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Users size={18} color="#10b981" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Connexions Actives</h3>
          </div>
          <GaugeChart 
            value={selectedNames.length === 1 && lastEntries[selectedNames[0]] ? lastEntries[selectedNames[0]].Sessions : 0} 
            displayValue={selectedNames.length === 1 && lastEntries[selectedNames[0]] ? lastEntries[selectedNames[0]].Sessions : 0}
            maxValue={200}
            label="Utilisateurs" 
            unit="" 
            color="#10b981" 
          />
        </GlassCard>

        <GlassCard 
          accent="#ef4444" 
          glow={selectedNames.length === 1 && lastEntries[selectedNames[0]]?.Blocked > 0}
          style={{ 
            padding: '24px', 
            background: (selectedNames.length === 1 && lastEntries[selectedNames[0]]?.Blocked > 0) ? 'rgba(239, 68, 68, 0.1)' : undefined,
            border: (selectedNames.length === 1 && lastEntries[selectedNames[0]]?.Blocked > 0) ? '1px solid #ef444450' : undefined
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Shield size={18} color="#ef4444" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sessions Bloquées</h3>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ 
              fontSize: '3.5rem', 
              fontWeight: 900, 
              color: (selectedNames.length === 1 && lastEntries[selectedNames[0]]?.Blocked > 0) ? '#ef4444' : '#f8fafc',
              textShadow: (selectedNames.length === 1 && lastEntries[selectedNames[0]]?.Blocked > 0) ? '0 0 30px #ef4444' : 'none',
              animation: (selectedNames.length === 1 && lastEntries[selectedNames[0]]?.Blocked > 0) ? 'pulseGlow 1.5s infinite' : 'none'
            }}>
              {selectedNames.length === 1 && lastEntries[selectedNames[0]] ? lastEntries[selectedNames[0]].Blocked : 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginTop: 10 }}>
              {selectedNames.length === 1 && lastEntries[selectedNames[0]]?.Blocked > 0 ? 'ALERTE : CONFLITS DÉTECTÉS' : 'AUCUN BLOCAGE'}
            </div>
          </div>
        </GlassCard>
      </div>

      {nodes.length > 0 && (
        <GlassCard style={{ padding: '32px 24px', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <Server size={20} color="#10b981" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>État des Nœuds</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr>
                  {Object.keys(nodes[0]).map(key => (
                    <th key={key} style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {key.replace('_', ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nodes.map((node, i) => (
                  <tr key={i} className="table-row-hover" style={{ background: 'rgba(255,255,255,0.03)', transition: 'transform 0.2s' }}>
                    {Object.values(node).map((val, j) => (
                      <td key={j} style={{ padding: '16px', fontSize: '0.85rem', color: val === 'OPEN' || val === 'ACTIVE' || val === 'READ WRITE' ? '#10b981' : '#e2e8f0', fontWeight: val === 'OPEN' || val === 'ACTIVE' ? 700 : 400, borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}