import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { Link } from 'react-router-dom';
import { Activity, RefreshCw, PlugZap, Clock, Target, Settings, Loader2, Cpu, HardDrive, BarChart3, Gauge, Timer, Users, Database, Zap, Grid3X3, AlertCircle } from 'lucide-react';
import {
  DarkCard, THEME, COLORS,
  CpuMemLineChart, TxBarChart, LatencyAreaChart, HistogramChart,
  ParetoChart, GaugeChart, DonutChart, HeatmapGrid, SgaPgaChart
} from '../components/DashboardCharts';

// ── SAFE PARSE (Oracle CLOB) ─────────────────────────────────────────────────
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

// ── STATUS BANNER ────────────────────────────────────────────────────────────
function StatusBanner({ status }) {
  if (!status) return null;
  const isUp = status.status === 'UP';
  const c = isUp ? '#10b981' : '#ef4444';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 28 }}>
      <DarkCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ padding: 14, background: `${c}12`, borderRadius: 14, border: `1px solid ${c}25`, display: 'flex' }}>
            <PlugZap size={28} color={c} style={{ filter: `drop-shadow(0 0 8px ${c})` }} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 4 }}>Statut de l'Instance</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: c, boxShadow: `0 0 12px ${c}`, animation: isUp ? 'pulseGlow 2s infinite' : 'none' }} />
              <span className="title-font" style={{ fontSize: '1.5rem', fontWeight: 800, color: THEME.text, letterSpacing: '0.04em' }}>{isUp ? 'EN LIGNE' : 'HORS LIGNE'}</span>
            </div>
          </div>
        </div>
      </DarkCard>

      <DarkCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ padding: 14, background: `${THEME.accent}12`, borderRadius: 14, border: `1px solid ${THEME.accent}25`, display: 'flex' }}>
            <Clock size={28} color={THEME.accent} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 4 }}>Temps de disponibilité</div>
            <div className="title-font" style={{ fontSize: '1.3rem', fontWeight: 800, color: THEME.text }}>
              {status.uptime_str || '—'}
            </div>
            {status.startup_time && (
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Target size={11} /> Démarré le {new Date(status.startup_time).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
      </DarkCard>
    </div>
  );
}

// ── DYNAMIC METRIC CARD (Route vers le bon chart) ────────────────────────────
function DynamicMetricCard({ scriptName, dataArray: rawData }) {
  const dataArray = safeParse(rawData);

  if (!dataArray?.length || dataArray[0]?.Erreur || dataArray[0]?.erreur) {
    return (
      <DarkCard title={scriptName}>
        <div style={{ padding: 20, textAlign: 'center', color: '#ef4444', fontSize: '0.85rem', background: 'rgba(239,68,68,0.08)', borderRadius: 10 }}>
          {dataArray?.[0]?.Erreur || dataArray?.[0]?.erreur || "Aucune donnée"}
        </div>
      </DarkCard>
    );
  }

  const n = scriptName.toLowerCase();
  const allKeys = Object.keys(dataArray[0]);
  const xKey = allKeys[0];
  const valKeys = allKeys.slice(1);

  // ── 1. CPU / Mémoire → LineChart fluide
  if (n.includes('cpu') || n.includes('mémoire') || n.includes('memory') || n.includes('charge globale') || n.includes('db time')) {
    return (
      <DarkCard title={scriptName} icon={<Cpu size={16} />} span>
        <CpuMemLineChart data={dataArray} keys={valKeys} xKey={xKey} />
      </DarkCard>
    );
  }

  // ── 2. Transactions / Requêtes → BarChart
  if (n.includes('transaction') || n.includes('requête') || n.includes('request') || n.includes('throughput')) {
    return (
      <DarkCard title={scriptName} icon={<BarChart3 size={16} />} span>
        <TxBarChart data={dataArray} keys={valKeys} xKey={xKey} />
      </DarkCard>
    );
  }

  // ── 3. Latence → AreaChart empilé
  if (n.includes('latence') || n.includes('latency') || n.includes('temps de réponse') || n.includes('wait') || n.includes('iops') || n.includes('io') || n.includes('temps réel')) {
    return (
      <DarkCard title={scriptName} icon={<Timer size={16} />} span>
        <LatencyAreaChart data={dataArray} keys={valKeys} xKey={xKey} />
      </DarkCard>
    );
  }

  // ── 4. Distribution → Histogramme
  if (n.includes('distribution') || n.includes('histogram') || n.includes('répartition')) {
    return (
      <DarkCard title={scriptName} icon={<BarChart3 size={16} />}>
        <HistogramChart data={dataArray} xKey={xKey} yKey={valKeys[0]} />
      </DarkCard>
    );
  }

  // ── 5. Top SQL / Utilisateurs → Pareto
  if (n.includes('top sql') || n.includes('top user') || n.includes('top utilisateur') || n.includes('fixed script') || n.includes('pareto')) {
    return (
      <DarkCard title={scriptName} icon={<Zap size={16} />} span>
        <ParetoChart data={dataArray} nameKey={xKey} valueKey={valKeys[0]} />
      </DarkCard>
    );
  }

  // ── 6. Disponibilité → Gauge
  if (n.includes('disponibilité') || n.includes('availability') || n.includes('uptime') || n.includes('ratio') || n.includes('cpu actif') || n.includes('inactif')) {
    const val = dataArray[0] ? Number(Object.values(dataArray[0])[1] || Object.values(dataArray[0])[0]) : 0;
    return (
      <DarkCard title={scriptName} icon={<Gauge size={16} />}>
        <GaugeChart value={val} label={scriptName.split(' ').slice(0, 3).join(' ')} color={THEME.accent} />
      </DarkCard>
    );
  }

  // ── 7. Disque → Donut
  if (n.includes('disque') || n.includes('disk') || n.includes('tablespace') || n.includes('storage') || n.includes('occupation')) {
    return (
      <DarkCard title={scriptName} icon={<HardDrive size={16} />}>
        <DonutChart data={dataArray} nameKey={xKey} valueKey={valKeys[0]} />
      </DarkCard>
    );
  }

  // ── 8. Connexions / Sessions → Heatmap
  if (n.includes('connexion') || n.includes('session') || n.includes('utilisateur') || n.includes('connection') || n.includes('actif')) {
    return (
      <DarkCard title={scriptName} icon={<Grid3X3 size={16} />} span>
        <HeatmapGrid data={dataArray} labelKey={xKey} valueKey={valKeys[0]} />
      </DarkCard>
    );
  }

  // ── SGA / PGA → Preserved Donut (restyled)
  if (n.includes('sga') || n.includes('pga')) {
    return (
      <DarkCard title={scriptName} icon={<Database size={16} />}>
        <SgaPgaChart data={dataArray} />
      </DarkCard>
    );
  }

  // ── FALLBACK → Table
  return (
    <DarkCard title={scriptName} span>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
          <thead>
            <tr>
              {allKeys.map(key => (
                <th key={key} style={{ padding: '10px 14px', textAlign: 'left', color: THEME.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${THEME.border}` }}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataArray.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                {Object.values(row).map((val, j) => {
                  const isGood = val === 'OPEN' || val === 'ACTIVE';
                  const isBad = val === 'DOWN' || val === 'BLOCKED';
                  return (
                    <td key={j} style={{ padding: '10px 14px', fontSize: '0.83rem', color: isGood ? '#34d399' : isBad ? '#f87171' : '#e2e8f0', borderBottom: `1px solid ${THEME.grid}` }}>
                      {isGood || isBad ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: isGood ? '#34d399' : '#f87171', boxShadow: `0 0 8px ${isGood ? '#34d399' : '#f87171'}` }} />
                          {String(val)}
                        </span>
                      ) : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DarkCard>
  );
}

// ── MAIN DASHBOARD PAGE ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const [selectedBase, setSelectedBase] = useState(() => localStorage.getItem('og_dashboard_base') || '');

  const { data: statusData } = useQuery({
    queryKey: ['status', selectedBase],
    queryFn: async () => {
      if (!selectedBase) return null;
      const res = await api.get(`/api/status/${selectedBase}`);
      return res.data;
    },
    enabled: !!selectedBase,
    refetchInterval: 30000
  });

  // Fetch audit results from the latest audit
  const {
    data: auditResults,
    isFetching: isRefreshing,
    isLoading: isFirstLoading,
    refetch: collect
  } = useQuery({
    queryKey: ['dashboard_results', selectedBase],
    queryFn: async () => {
      if (!selectedBase) return null;
      const response = await api.get(`/api/audit-results?id_base=${selectedBase}`);
      return response.data.results;
    },
    enabled: !!selectedBase,
    refetchInterval: 60000 // Refresh every minute
  });

  // Pour le Dashboard, on considère qu'on a des métriques si l'API renvoie des données
  const hasData = auditResults && Object.keys(auditResults).length > 0;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div className="page-header-icon"><Activity size={28} /></div>
          <div>
            <h1 className="page-title text-gradient">Centre Opérationnel</h1>
            <p className="page-subtitle">Supervision des performances via Audit Results</p>
          </div>
        </div>

        {selectedBase && (
          <button className="btn btn-primary" style={{ padding: '0 24px', height: 46 }} disabled={isRefreshing} onClick={() => collect()}>
            {isRefreshing
              ? <><Loader2 size={18} className="spinner" /> Actualisation...</>
              : <><RefreshCw size={18} /> Actualiser</>}
          </button>
        )}
      </div>

      {/* Empty state */}
      {!selectedBase ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <DarkCard style={{ maxWidth: 500, textAlign: 'center', padding: 40 }}>
            <Database size={48} color={THEME.accent} style={{ margin: '0 auto 20px', opacity: 0.8, display: 'block' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: THEME.text, marginBottom: 16 }}>Aucune base sélectionnée</h2>
            <p style={{ color: THEME.muted, marginBottom: 30, lineHeight: 1.7 }}>
              Veuillez sélectionner une base de données pour visualiser ses indicateurs de performance.
            </p>
            <Link to="/cibles" className="btn btn-primary" style={{ background: `linear-gradient(135deg, ${THEME.accent}, #0284c7)`, display: 'inline-flex', padding: '12px 24px' }}>
              <Zap size={18} /> Gérer les cibles
            </Link>
          </DarkCard>
        </div>
      ) : (
        <>
          {statusData && <StatusBanner status={statusData} />}

          {isFirstLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '30vh', gap: 20 }}>
              <Loader2 size={48} color={THEME.accent} className="spinner" />
              <div style={{ fontSize: '1rem', color: THEME.muted, fontWeight: 600, letterSpacing: '0.1em' }}>CHARGEMENT DES RÉSULTATS D'AUDIT...</div>
            </div>
          ) : !hasData ? (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '30vh', gap: 20 }}>
                <AlertCircle size={40} color={THEME.muted} />
                <div style={{ color: THEME.muted, textAlign: 'center' }}>
                   Aucun résultat d'audit trouvé pour cette base.<br/>
                   <Link to="/configuration" style={{ color: THEME.accent, textDecoration: 'none', marginTop: 10, display: 'inline-block' }}>Lancez un audit complet pour commencer.</Link>
                </div>
             </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 22 }}>
              {auditResults && Object.entries(auditResults).map(([scriptName, dataArray]) => (
                <DynamicMetricCard key={scriptName} scriptName={scriptName} dataArray={dataArray} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}