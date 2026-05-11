import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import GlassCard from '../components/GlassCard';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Area, AreaChart,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Activity, Server, Users, RefreshCw, PlugZap, Clock, Target, Database, Shield, Loader2, AlertCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const CHART_COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

const safeParse = (rawData) => {
  try {
    if (Array.isArray(rawData)) return rawData;
    if (rawData && typeof rawData === 'object') return [rawData];
    if (typeof rawData === 'string') {
      const parsed = JSON.parse(rawData);
      return Array.isArray(parsed) ? parsed : [parsed];
    }
    return [];
  } catch (error) {
    console.error("safeParse: Erreur de parsing Dashboard:", error);
    return [];
  }
};

function StatusBanner({ status }) {
  if (!status) return null;
  const isUp = status.status === 'UP';
  const c = isUp ? '#10b981' : '#ef4444';
  
  return (
    <div className="grid-2" style={{ marginBottom: 28 }}>
      <GlassCard accent={c} glow={isUp} className="hover-lift" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
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

      <GlassCard accent="var(--accent-cyan)" className="hover-lift" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
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
            data={data} cx="50%" cy="85%" startAngle={180} endAngle={0}
            innerRadius={65} outerRadius={85} paddingAngle={0} dataKey="value" stroke="none"
          >
            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
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

function DynamicMetricCard({ scriptName, dataArray: rawData }) {
  const dataArray = safeParse(rawData);
  if (!dataArray || dataArray.length === 0 || dataArray[0]?.Erreur || dataArray[0]?.erreur) {
    return (
      <GlassCard className="hover-lift">
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{scriptName}</h3>
        <div style={{ padding: 20, textAlign: 'center', color: '#ef4444', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}>
          {dataArray?.[0]?.Erreur || "Aucune donnée"}
        </div>
      </GlassCard>
    );
  }

  const nameLower = scriptName.toLowerCase();
  
  // 1. Charge globale (DB Time / CPU) -> Area/Line Chart
  if (nameLower.includes('charge globale') || nameLower.includes('db time') || nameLower.includes('cpu')) {
    return (
      <GlassCard className="hover-lift" style={{ gridColumn: '1 / -1' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>{scriptName}</h3>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dataArray}>
              <defs>
                <linearGradient id={`colorDbTime-${scriptName}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey={Object.keys(dataArray[0])[0]} stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip />
              <Legend />
              {Object.keys(dataArray[0]).slice(1).map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={1} fill={`url(#colorDbTime-${scriptName})`} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    );
  }

  // 2. IOPS Temps Réel -> Line Chart
  if (nameLower.includes('iops') || nameLower.includes('io') || nameLower.includes('temps réel')) {
    return (
      <GlassCard className="hover-lift" style={{ gridColumn: '1 / -1' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>{scriptName}</h3>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataArray}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey={Object.keys(dataArray[0])[0]} stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip />
              <Legend />
              {Object.keys(dataArray[0]).slice(1).map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    );
  }

  // 3. Temps CPU Actif/Inactif -> Doughnut Chart
  if (nameLower.includes('cpu actif') || nameLower.includes('inactif') || nameLower.includes('ratio')) {
    const data = dataArray.map(r => ({ name: Object.values(r)[0], value: Number(Object.values(r)[1]) }));
    return (
      <GlassCard className="hover-lift">
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>{scriptName}</h3>
        <div style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    );
  }

  // 4. Composants SGA & PGA -> Pie Chart
  if (nameLower.includes('sga') || nameLower.includes('pga') || nameLower.includes('mémoire') || nameLower.includes('memory')) {
    const data = dataArray.map(r => ({ name: Object.values(r)[0], value: Number(Object.values(r)[1]) }));
    return (
      <GlassCard className="hover-lift">
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>{scriptName}</h3>
        <div style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={false}>
                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    );
  }

  // 5. Nombre Utilisateurs Actifs -> Gauge Chart ou Big Number
  if (nameLower.includes('utilisateurs') || nameLower.includes('sessions')) {
    const value = dataArray[0] ? Number(Object.values(dataArray[0])[0]) : 0;
    return (
      <GlassCard className="hover-lift">
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>{scriptName}</h3>
        <GaugeChart value={value} label="Valeur Actuelle" unit="" color="#10b981" maxValue={500} displayValue={value} />
      </GlassCard>
    );
  }

  // 7. FIXED SCRIPT (Top SQL) -> Horizontal Bar Chart
  if (nameLower.includes('top sql') || nameLower.includes('fixed script') || nameLower.includes('sql')) {
    return (
      <GlassCard className="hover-lift" style={{ gridColumn: '1 / -1' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>{scriptName}</h3>
        <div style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataArray} layout="vertical" margin={{ left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} />
              <YAxis dataKey={Object.keys(dataArray[0])[0]} type="category" stroke="#94a3b8" fontSize={12} width={100} />
              <Tooltip />
              <Bar dataKey={Object.keys(dataArray[0])[1]} fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    );
  }

  // 6. État des nœuds ou default fallback -> Table
  return (
    <GlassCard className="hover-lift" style={{ gridColumn: '1 / -1', overflowX: 'auto' }}>
      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>{scriptName}</h3>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
        <thead>
          <tr>
            {Object.keys(dataArray[0]).map(key => (
              <th key={key} style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataArray.map((row, i) => (
            <tr key={i} style={{ background: 'rgba(255,255,255,0.03)' }}>
              {Object.values(row).map((val, j) => {
                const isGood = val === 'OPEN' || val === 'ACTIVE';
                const isBad = val === 'DOWN' || val === 'BLOCKED';
                return (
                  <td key={j} style={{ padding: '12px 16px', fontSize: '0.85rem', color: isGood ? '#10b981' : isBad ? '#ef4444' : '#e2e8f0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {String(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </GlassCard>
  );
}

export default function DashboardPage() {
  const [selectedBase, setSelectedBase] = useState(() => localStorage.getItem('og_dashboard_base') || '');
  const [selectedScripts, setSelectedScripts] = useState(() => {
    const saved = localStorage.getItem('og_dashboard_metrics');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch status
  const { data: statusData } = useQuery({
    queryKey: ['status', selectedBase],
    queryFn: async () => {
      if (!selectedBase) return null;
      const res = await api.get(`/api/status/${selectedBase}`);
      return res.data;
    },
    enabled: !!selectedBase,
    refetchInterval: 30000 // Refresh every 30s
  });

  // Fetch granular audit data based on selected scripts
  const { 
    data: granularData, 
    isFetching: isRefreshing, 
    isLoading: isFirstLoading,
    refetch: collect 
  } = useQuery({
    queryKey: ['dashboard_granular', selectedBase, selectedScripts],
    queryFn: async () => {
      if (!selectedBase || selectedScripts.length === 0) return null;
      const payload = {
        id_base: parseInt(selectedBase),
        scripts: selectedScripts
      };
      const response = await api.post('/api/audit/granular', payload);
      return response.data.data;
    },
    enabled: !!selectedBase && selectedScripts.length > 0,
    refetchInterval: 60000 // Metrics refresh every 60s
  });

  const hasMetrics = selectedScripts.length > 0;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="page-header-icon"><Activity size={28} /></div>
          <div>
            <h1 className="page-title text-gradient">Centre Opérationnel</h1>
            <p className="page-subtitle">Supervision des performances en temps réel</p>
          </div>
        </div>
        
        {hasMetrics && (
          <button className="btn btn-primary" style={{ padding: '0 24px', height: '46px' }} disabled={isRefreshing} onClick={() => collect()}>
            {isRefreshing ? <><Loader2 size={18} className="spinner" /> Actualisation...</> : <><RefreshCw size={18} /> Actualiser</>}
          </button>
        )}
      </div>

      {!hasMetrics ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <GlassCard style={{ maxWidth: '500px', textAlign: 'center', padding: '40px' }}>
            <Settings size={48} color="#0ea5e9" style={{ margin: '0 auto 20px', opacity: 0.8 }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc', marginBottom: '16px' }}>Dashboard non configuré</h2>
            <p style={{ color: '#94a3b8', marginBottom: '30px', lineHeight: 1.6 }}>
              Votre dashboard dynamique est vide. Veuillez vous rendre sur la page "Diagnostic SQL" pour sélectionner les métriques que vous souhaitez surveiller en temps réel.
            </p>
            <Link to="/configuration" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', display: 'inline-flex', padding: '12px 24px' }}>
              <Settings size={18} /> Configurer le Dashboard
            </Link>
          </GlassCard>
        </div>
      ) : (
        <>
          {statusData && <StatusBanner status={statusData} />}
          
          {isFirstLoading ? (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '30vh', gap: 20 }}>
               <Loader2 size={48} color="#0ea5e9" className="spinner" />
               <div style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.1em' }}>CHARGEMENT DES MÉTRIQUES...</div>
             </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
              {granularData && Object.entries(granularData).map(([scriptName, dataArray]) => (
                <DynamicMetricCard key={scriptName} scriptName={scriptName} dataArray={dataArray} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}