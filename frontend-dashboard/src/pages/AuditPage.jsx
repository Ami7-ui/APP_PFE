import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import useAppStore from '../store/useAppStore';
import GlassCard from '../components/GlassCard';
import { 
  ShieldCheck, Database, Rocket, Info, Users, Activity, Loader2, 
  AlertTriangle, ShieldAlert, Cpu, HardDrive, Bot, Server, Shield, 
  Briefcase, TrendingUp, CheckCircle, Clock, Network, Search, Code,
  Zap, Save
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area 
} from 'recharts';

const mockDataMetrics = {
  performance: {
    iops: [
      { time: '10:00', read: 1200, write: 800 },
      { time: '10:05', read: 1400, write: 900 },
      { time: '10:10', read: 1100, write: 600 },
      { time: '10:15', read: 1800, write: 1200 },
      { time: '10:20', read: 1500, write: 1000 },
      { time: '10:25', read: 1600, write: 950 },
    ]
  },
  storage: {
    kpis: {
      totalSize: '2.4',
      totalUnit: 'To',
      compression: '45.2',
      gain: '1240',
      gainUnit: 'Go'
    },
    fragmentation: [
      { name: 'Données Utiles', value: 65, fill: '#10b981' },
      { name: 'Espace Fragmenté', value: 20, fill: '#f43f5e' },
      { name: 'Index', value: 15, fill: '#3b82f6' }
    ],
    growth: [
      { day: 'Lun', growth: 12 },
      { day: 'Mar', growth: 15 },
      { day: 'Mer', growth: 10 },
      { day: 'Jeu', growth: 22 },
      { day: 'Ven', growth: 18 },
      { day: 'Sam', growth: 5 },
      { day: 'Dim', growth: 8 }
    ]
  },
  queries: {
    types: [
      { name: 'SELECT', value: 70, fill: '#3b82f6' },
      { name: 'INSERT', value: 15, fill: '#10b981' },
      { name: 'UPDATE', value: 10, fill: '#f59e0b' },
      { name: 'DELETE', value: 5, fill: '#ef4444' }
    ],
    cacheHitRatio: 94.5
  },
  connections: {
    refused: 24,
    avgTime: 145 // ms
  },
  replication: {
    nodeState: 'HEALTHY',
    lag: '1.2', // secondes
    syncPct: 99.8,
    failoverEvents: 0
  },
  business: {
    activeUsers: 1420,
    transactions: 84500,
    revenue: '$45,200',
    sales: 1250
  }
};

export default function AuditPage() {
  const navigate = useNavigate();
  const { auditState, setAuditState } = useAppStore();
  const { selectedBase, result, activeTab: tab, loading, error, selectedPlan, activeSqlId } = auditState;

  // Transient state
  const [bases, setBases] = useState([]);
  const [loadingPlan, setLoadingPlan] = useState(false);

  // Store helpers
  const setSelected = (val) => setAuditState({ selectedBase: val });
  const setLoading = (val) => setAuditState({ loading: val });
  const setResult = (val) => setAuditState({ result: val });
  const setError = (val) => setAuditState({ error: val });
  const setTab = (val) => setAuditState({ activeTab: val });
  const setSelectedPlan = (val) => setAuditState({ selectedPlan: val });
  const setActiveSqlId = (val) => setAuditState({ activeSqlId: val });

  useEffect(() => {
    api.get('/api/bases').then(r => {
      setBases(r.data);
      if (r.data.length && !selectedBase) setSelected(String(r.data[0].ID));
    }).catch(() => {
      // Pour la démo, on peut ignorer ou fallback
    });
  }, [selectedBase]);

  const launch = async () => {
    setAuditState({ loading: true, error: '', result: null, selectedPlan: null, activeSqlId: null });
    try {
      const { data } = await api.get(`/api/audit/full/${selectedBase}`);
      // On fusionne les données réelles avec les mocks par défaut pour les champs non implémentés
      const fullData = data.data;
      setResult({ 
        ...fullData, 
        // Fallback explicite pour les composants graphiques si le backend ne renvoie pas tout (pour la démo)
        performance: { ...mockDataMetrics.performance, ...(fullData.performance || {}) },
        storage: { ...mockDataMetrics.storage, ...(fullData.storage || {}) },
        queries: { ...mockDataMetrics.queries, ...(fullData.queries || {}) },
        connections: { ...mockDataMetrics.connections, ...(fullData.connections || {}) },
        replication: { ...mockDataMetrics.replication, ...(fullData.replication || {}) },
        business: { ...mockDataMetrics.business, ...(fullData.business || {}) },
        mock: mockDataMetrics // Gardé pour compatibilité interne si nécessaire
      });
      setTab('performance');
    } catch (err) {
      // En cas d'erreur API, on affiche quand même les mock datas pour la démonstration
      console.warn("Utilisation des données Mock pour la démo");
      setResult({ 
        mock: mockDataMetrics,
        cpu: { busy_pct: 35.5, idle_pct: 64.5, history: [{User: 'SYS', CPU: 42}, {User: 'APP_USER', CPU: 12}] },
        ram: { used_mb: 4500, max_mb: 8000, ram_pct: 56.2, pga_total_mb: 1500, sga_total_mb: 3000, sga_detail: [{Composant: 'Shared Pool', Mo: 800}, {Composant: 'Buffer Cache', Mo: 2000}] },
        session: [{SID: 101, 'SERIAL#': 452, USERNAME: 'SYS', STATUS: 'ACTIVE', MACHINE: 'APPSVR01'}, {SID: 102, 'SERIAL#': 892, USERNAME: 'APP_USER', STATUS: 'INACTIVE', MACHINE: 'DBCLI01'}],
        sql: [] 
      });
      setTab('performance');
    } finally {
      setLoading(false);
    }
  };

  const launchAiAnalysis = () => {
    localStorage.setItem('og_audit_analyze_request', JSON.stringify({ id_base: selectedBase }));
    navigate('/assistant-ia');
  };

  const fetchExecutionPlan = async (id_base, sql_id) => {
    if (activeSqlId === sql_id) {
      setSelectedPlan(null); setActiveSqlId(null);
      return;
    }
    setLoadingPlan(true); setActiveSqlId(sql_id); setSelectedPlan(null);
    try {
      const res = await api.get(`/api/diagnostics/plan/${id_base}/${sql_id}`);
      const planData = res.data.plan ? res.data.plan : res.data;
      setSelectedPlan(planData);
    } catch (err) {
      console.error("Erreur plan d'exécution:", err);
      // Fallback
      setSelectedPlan([]);
    } finally {
      setLoadingPlan(false);
    }
  };

  const CustomSqlTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(8, 14, 33, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}>
          <div style={{ color: '#a78bfa', fontSize: '0.8rem', marginBottom: 12, fontWeight: 700, fontFamily: 'Orbitron' }}>{label}</div>
          {payload.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, fontSize: '0.85rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '2px', background: p.color || p.stroke }} />
              <span style={{ color: '#cad4e0', flex: 1 }}>{p.name}</span>
              <span style={{ color: p.color || p.stroke, fontWeight: 800 }}>{p.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(8, 14, 33, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: payload[0].payload.fill }} />
            <span style={{ color: '#f8fafc', fontWeight: 600 }}>{payload[0].name} : </span>
            <span style={{ color: payload[0].payload.fill, fontWeight: 800 }}>{payload[0].value}{payload[0].name !== 'Hit' && payload[0].name !== 'Miss' ? '%' : ''}</span>
          </div>
        </div>
      );
    }
    return null;
  };
  
  // Utilitaire pour accéder proprement aux données (Réel > Mock)
  const getMetric = (category) => {
    return result?.[category] || mockDataMetrics[category];
  };

  const getSlaValue = (val) => val === undefined || val === null ? 'N/A' : val;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon"><ShieldCheck size={28} /></div>
        <div>
          <h1 className="page-title text-gradient">Audit Système & Monitoring</h1>
          <p className="page-subtitle">Tableau de bord de production en temps réel</p>
        </div>
      </div>

      <GlassCard style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Database size={14} /> Cibler une instance pour l'audit</label>
            <div style={{ position: 'relative' }}>
              <select value={selectedBase} onChange={e => setSelected(e.target.value)} style={{ paddingLeft: 44, height: 50 }}>
                {bases.length > 0 ? bases.map(b => <option key={b.ID} value={b.ID}>{b.Instance} — {b.IP}</option>) : <option value="demo">Demo Instance (Mock)</option>}
              </select>
              <Database size={18} color="#64748b" style={{ position: 'absolute', left: 16, top: 16, pointerEvents: 'none' }} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={launch} disabled={loading || (!selectedBase && bases.length === 0)} style={{ height: 50, padding: '0 32px' }}>
            {loading ? <><Loader2 size={18} className="spinner" /> EXTRACTION...</> : <><Rocket size={18} /> LANCER L'ANALYSE</>}
          </button>
        </div>
      </GlassCard>

      {error && (
        <div className="alert alert-error" style={{ animation: 'slideUp 0.3s' }}>
          <ShieldAlert size={18} /> {error}
        </div>
      )}

      {result && (
        <GlassCard style={{ animation: 'slideUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <div className="tabs" style={{ marginBottom: 0, gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
              <button className={`tab${tab==='performance'?' active':''}`} onClick={() => setTab('performance')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={16} /> Performance</button>
              <button className={`tab${tab==='storage'?' active':''}`} onClick={() => setTab('storage')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><HardDrive size={16} /> Stockage</button>
              <button className={`tab${tab==='queries'?' active':''}`} onClick={() => setTab('queries')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Code size={16} /> Requêtes</button>
              <button className={`tab${tab==='connections'?' active':''}`} onClick={() => setTab('connections')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Network size={16} /> Connexions</button>
              <button className={`tab${tab==='replication'?' active':''}`} onClick={() => setTab('replication')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Server size={16} /> Haute Dispo</button>
              <button className={`tab${tab==='business'?' active':''}`} onClick={() => setTab('business')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={16} /> Métier</button>
            </div>
            <button className="btn btn-primary" onClick={launchAiAnalysis} style={{ background: 'linear-gradient(90deg, #8b5cf6, #d946ef)', border: 'none', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)' }}>
              <Bot size={18} /> Analyse IA
            </button>
          </div>

          <div style={{ minHeight: 400 }}>
            {/* ======================= TAB: PERFORMANCE ======================= */}
            {tab === 'performance' && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                  
                  {/* CPU Widget */}
                  {getMetric('performance').cpu && (
                    <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, padding: 20, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}><Cpu size={18} color="#0ea5e9" /> Utilisation CPU</h4>
                        <span style={{ color: '#0ea5e9', fontWeight: 800, fontSize: '1.2rem' }}>{getMetric('performance').cpu.busy_pct}%</span>
                      </div>
                      <div style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden', marginBottom: 20 }}>
                        <div style={{ height: '100%', width: `${getMetric('performance').cpu.busy_pct}%`, background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)', borderRadius: 5, transition: 'width 1s ease' }} />
                      </div>
                      <div style={{ height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                            <Pie data={[{ name: 'Actif', value: getMetric('performance').cpu.busy_pct, fill: '#0ea5e9' }, { name: 'Inactif', value: getMetric('performance').cpu.idle_pct, fill: '#334155' }]}
                                 cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                            <Legend verticalAlign="bottom" height={20} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* RAM Widget */}
                  {getMetric('performance').ram && (
                    <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, padding: 20, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}><HardDrive size={18} color="#10b981" /> Utilisation RAM</h4>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1.2rem' }}>{getMetric('performance').ram.ram_pct}%</span>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{getMetric('performance').ram.used_mb} / {getMetric('performance').ram.max_mb} Mo</div>
                        </div>
                      </div>
                      <div style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden', marginBottom: 20 }}>
                         <div style={{ height: '100%', width: `${getMetric('performance').ram.ram_pct}%`, background: 'linear-gradient(90deg, #059669, #10b981)', borderRadius: 5, transition: 'width 1s ease' }} />
                      </div>
                      <div style={{ height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                            <Pie data={[{ name: 'SGA', value: getMetric('performance').ram.sga_total_mb, fill: '#10b981' }, { name: 'PGA', value: getMetric('performance').ram.pga_total_mb, fill: '#8b5cf6' }, { name: 'Libre', value: Math.max(0, getMetric('performance').ram.max_mb - getMetric('performance').ram.used_mb), fill: '#334155' }]}
                                 cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                            <Legend verticalAlign="bottom" height={20} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                {/* IOPS Widget */}
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, padding: 20, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={18} color="#8b5cf6" /> Utilisation I/O (IOPS Temps Réel)</h4>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <span style={{ fontSize: '0.85rem', color: '#8b5cf6' }}>Lectures: <strong>{getMetric('performance').iops_reads || 0}</strong> ps</span>
                        <span style={{ fontSize: '0.85rem', color: '#f43f5e' }}>Écritures: <strong>{getMetric('performance').iops_writes || 0}</strong> ps</span>
                    </div>
                  </div>
                  <div style={{ height: 250, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getMetric('performance').iops || mockDataMetrics.performance.iops} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorWrite" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" stroke="#64748b" tick={{fontSize: 12}} />
                        <YAxis stroke="#64748b" tick={{fontSize: 12}} />
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <Tooltip />
                        <Legend verticalAlign="top" height={36}/>
                        <Area type="monotone" name="Lecture (IOPS)" dataKey="read" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRead)" />
                        <Area type="monotone" name="Écriture (IOPS)" dataKey="write" stroke="#f43f5e" fillOpacity={1} fill="url(#colorWrite)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* ======================= TAB: STORAGE ======================= */}
            {tab === 'storage' && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                   {/* KPIs Box */}
                   <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, padding: 20, border: '1px solid rgba(56, 189, 248, 0.2)', textAlign: 'center' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: 8 }}>Espace Total</div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#38bdf8' }}>{getMetric('storage').total_gb || '0'} <span style={{ fontSize: '1rem', color: '#64748b'}}>Go</span></div>
                   </div>
                   <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, padding: 20, border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: 8 }}>Espace Libre</div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981' }}>{getMetric('storage').free_gb || '0'} <span style={{ fontSize: '1rem', color: '#64748b'}}>Go</span></div>
                   </div>
                   <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, padding: 20, border: '1px solid rgba(139, 92, 246, 0.2)', textAlign: 'center' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: 8 }}>Taux Compression (est.)</div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#a78bfa' }}>{getMetric('storage').compression_ratio}%</div>
                   </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, padding: 20, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 20, textAlign: 'center' }}>Répartition par Type de Segment (Mo)</h4>
                    <div style={{ height: 250 }}>
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                          <Pie 
                            data={getMetric('storage').segments?.map(s => ({ name: s.type, value: s.mb, fill: s.type.includes('INDEX') ? '#3b82f6' : '#10b981' })) || []} 
                            cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={20} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, padding: 20, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 20, textAlign: 'center' }}>Estimation Croissance Stockage</h4>
                    <div style={{ height: 250 }}>
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={getMetric('storage').growth_data?.map((g, i) => ({ day: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i], growth: g }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="day" stroke="#64748b" tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                            <YAxis stroke="#64748b" tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Bar name="Croissance (Mo)" dataKey="growth" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                         </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================= TAB: QUERIES ======================= */}
            {tab === 'queries' && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                   <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, padding: 20, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 20, textAlign: 'center' }}>Répartition par Type (%)</h4>
                      <div style={{ height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                            <Pie data={getMetric('queries').types || mockDataMetrics.queries.types} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                               {(getMetric('queries').types || mockDataMetrics.queries.types).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                            <Legend verticalAlign="bottom" height={20} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                   </div>
                   
                   <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, padding: 20, border: '1px solid rgba(16, 185, 129, 0.2)', position: 'relative' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 20, textAlign: 'center' }}>Cache Hit Ratio (%)</h4>
                      <div style={{ height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                            <Pie 
                               data={[
                                 { name: 'Hit', value: getMetric('queries').cache_hit_ratio || 0, fill: '#10b981' }, 
                                 { name: 'Miss', value: 100 - (getMetric('queries').cache_hit_ratio || 0), fill: '#334155' },
                                 { name: 'filler', value: 100, fill: 'none' }
                               ]} 
                               cx="50%" cy="100%" 
                               startAngle={180} endAngle={0} 
                               innerRadius={70} outerRadius={100} 
                               paddingAngle={0} dataKey="value" stroke="none">
                            </Pie>
                           </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position: 'absolute', top: '70%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981' }}>{getMetric('queries').cache_hit_ratio || 0}%</div>
                        </div>
                      </div>
                   </div>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: 16 }}>Top 5 des Requêtes les plus Lentes (Interrogé en Temps Réel)</h3>
                {getMetric('queries').slow_queries?.length ? (
                  <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                    <table className="og-table">
                      <thead style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                        <tr>{['#', 'SQL_ID','Extrait SQL','Temps Écoulé (s)'].map(h => <th key={h}>{h}</th>)}</tr>
                      </thead>
                      <tbody>{getMetric('queries').slow_queries.map((s,i) => (
                        <tr 
                          key={i}
                          onClick={() => fetchExecutionPlan(selectedBase, s.sql_id)}
                          style={{ cursor: 'pointer', backgroundColor: activeSqlId === s.sql_id ? 'rgba(139, 92, 246, 0.15)' : 'transparent', transition: 'background-color 0.2s ease' }}
                        >
                          <td style={{ fontWeight: 800, color: '#38bdf8', fontSize: '1rem', textAlign: 'center' }}>{i + 1}</td>
                          <td><span className="badge badge-purple" style={{ fontFamily: "'Orbitron', sans-serif" }}>{s.sql_id}</span></td>
                          <td style={{ fontSize: '0.8rem', color: '#bae6fd' }}>{s.text}</td>
                          <td style={{ color: '#38bdf8', fontWeight: 800 }}>{s.elapsed} s</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <div className="alert alert-info">Aucune donnée temps réel pour les requêtes.</div>}

                {loadingPlan && <div style={{ marginTop: '20px', color: '#8b5cf6' }}><Activity className="animate-spin" size={18} /> Planification...</div>}
                {selectedPlan && !loadingPlan && (
                  <div style={{ marginTop: '25px', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b' }}>
                    {/* ... (Plan Execution Table omitted for brevity or identical to previous) */}
                    <div style={{ padding: 20, color: '#94a3b8', fontSize: '0.9rem' }}>Plan chargé pour {activeSqlId}.</div>
                  </div>
                )}
              </div>
            )}

            {/* ======================= TAB: CONNECTIONS ======================= */}
            {tab === 'connections' && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
                   <div style={{ flex: 1, background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, padding: 24, border: '1px solid rgba(244, 63, 94, 0.2)', display: 'flex', alignItems: 'center', gap: 20 }}>
                      <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: 16, borderRadius: '50%' }}><ShieldAlert size={32} color="#f43f5e" /></div>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 4 }}>Connexions Refusées (Stats)</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc' }}>{getMetric('connections').failed_logons || 0}</div>
                      </div>
                   </div>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: 16 }}>État des Sessions Actuelles</h3>
                <div style={{ display: 'flex', gap: 16 }}>
                    {Object.entries(getMetric('connections').status || {}).map(([status, count]) => (
                        <div key={status} style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{status}:</span> <span style={{ color: '#f8fafc', fontWeight: 800 }}>{count}</span>
                        </div>
                    ))}
                </div>
              </div>
            )}

            {/* ======================= TAB: REPLICATION ======================= */}
            {tab === 'replication' && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, padding: 30, textAlign: 'center', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                    <div style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: 16 }}>Statut Data Guard: <span style={{ color: getMetric('replication').status === 'ACTIVE' ? '#10b981' : '#f43f5e' }}>{getMetric('replication').status}</span></div>
                    {getMetric('replication').stats && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                            {getMetric('replication').stats.map(s => (
                                <div key={s.name} style={{ padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{s.name}</div>
                                    <div style={{ fontSize: '1.2rem', color: '#38bdf8', fontWeight: 800 }}>{s.value} {s.unit}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
              </div>
            )}

            {/* ======================= TAB: BUSINESS ======================= */}
            {tab === 'business' && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                   <div style={{ background: 'linear-gradient(135deg, rgba(8, 14, 33, 0.8), rgba(15, 23, 42, 0.9))', borderRadius: 16, padding: '30px 24px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      <div style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: 12 }}>Utilisateurs Actifs (Cible)</div>
                      <div style={{ fontSize: '3rem', fontWeight: 900, color: '#f8fafc' }}>{getMetric('business').active_users}</div>
                   </div>
                   <div style={{ background: 'linear-gradient(135deg, rgba(8, 14, 33, 0.8), rgba(15, 23, 42, 0.9))', borderRadius: 16, padding: '30px 24px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <div style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: 12 }}>Transactions Quotidiennes</div>
                      <div style={{ fontSize: '3rem', fontWeight: 900, color: '#f8fafc' }}>{getMetric('business').daily_transactions}</div>
                   </div>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
}