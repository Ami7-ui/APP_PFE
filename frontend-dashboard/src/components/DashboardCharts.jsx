import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, ComposedChart, ScatterChart, Scatter
} from 'recharts';

// ── THEME ────────────────────────────────────────────────────────────────────
export const THEME = {
  bg: '#0f172a', card: '#1e293b', accent: '#38bdf8',
  text: '#f8fafc', muted: '#94a3b8', grid: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',
};
export const COLORS = ['#38bdf8','#a78bfa','#34d399','#fbbf24','#f87171','#f472b6','#2dd4bf','#60a5fa'];

// ── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
export function DarkTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(15,23,42,0.95)', border: `1px solid ${THEME.border}`, borderRadius: 12, padding: '12px 16px', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <div style={{ fontSize: '0.75rem', color: THEME.muted, marginBottom: 8, fontWeight: 700 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: THEME.text, marginBottom: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
          <span style={{ color: THEME.muted }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

// ── CARD WRAPPER ─────────────────────────────────────────────────────────────
export function DarkCard({ children, title, icon, span = false, style = {} }) {
  return (
    <div style={{
      background: THEME.card, borderRadius: 16, padding: '24px 28px', position: 'relative', overflow: 'hidden',
      border: `1px solid ${THEME.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      gridColumn: span ? '1 / -1' : undefined,
      transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', ...style
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.4), 0 0 20px ${THEME.accent}15`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${THEME.accent}, transparent)`, opacity: 0.6 }} />
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          {icon && <span style={{ color: THEME.accent, display: 'flex' }}>{icon}</span>}
          <h3 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: THEME.muted, margin: 0 }}>{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

// ── AXIS DEFAULTS ────────────────────────────────────────────────────────────
const axisProps = { stroke: THEME.muted, fontSize: 11, tickLine: false, axisLine: { stroke: THEME.grid } };

// ── 1. CPU / MÉMOIRE : LineChart ─────────────────────────────────────────────
export function CpuMemLineChart({ data, keys, xKey }) {
  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<DarkTooltip unit="%" />} />
          <Legend wrapperStyle={{ fontSize: '0.78rem', color: THEME.muted }} />
          {keys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: THEME.card }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 2. TRANSACTIONS / REQUÊTES : BarChart ────────────────────────────────────
export function TxBarChart({ data, keys, xKey }) {
  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<DarkTooltip />} />
          <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
          {keys.map((k, i) => (
            <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={40} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 3. LATENCE : AreaChart empilé ────────────────────────────────────────────
export function LatencyAreaChart({ data, keys, xKey }) {
  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <defs>
            {keys.map((k, i) => (
              <linearGradient key={k} id={`lat-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.6} />
                <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<DarkTooltip unit=" ms" />} />
          <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
          {keys.map((k, i) => (
            <Area key={k} type="monotone" dataKey={k} stackId="1" stroke={COLORS[i % COLORS.length]} fill={`url(#lat-${k})`} strokeWidth={2} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 4. DISTRIBUTION (Histogramme) ────────────────────────────────────────────
export function HistogramChart({ data, xKey, yKey }) {
  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<DarkTooltip />} />
          <Bar dataKey={yKey} fill={THEME.accent} radius={[3, 3, 0, 0]} maxBarSize={50}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 5. PARETO (Top SQL / Utilisateurs) ───────────────────────────────────────
export function ParetoChart({ data, nameKey, valueKey }) {
  const sorted = [...data].sort((a, b) => Number(b[valueKey]) - Number(a[valueKey]));
  const total = sorted.reduce((s, r) => s + Number(r[valueKey]), 0);
  let cum = 0;
  const enriched = sorted.map(r => { cum += Number(r[valueKey]); return { ...r, cumPct: total ? Math.round((cum / total) * 100) : 0 }; });

  return (
    <div style={{ height: 320 }}>
      <ResponsiveContainer>
        <ComposedChart data={enriched} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} vertical={false} />
          <XAxis dataKey={nameKey} {...axisProps} interval={0} angle={-25} textAnchor="end" height={60} />
          <YAxis yAxisId="left" {...axisProps} />
          <YAxis yAxisId="right" orientation="right" {...axisProps} domain={[0, 100]} unit="%" />
          <Tooltip content={<DarkTooltip />} />
          <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
          <Bar yAxisId="left" dataKey={valueKey} name="Valeur" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {enriched.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="cumPct" name="Cumulé %" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 4, fill: '#fbbf24', stroke: THEME.card, strokeWidth: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 6. DISPONIBILITÉ : Gauge (demi-cercle) ───────────────────────────────────
export function GaugeChart({ value, label, unit = '%', color = THEME.accent, maxValue = 100 }) {
  const pct = Math.min(100, (value / (maxValue || 1)) * 100);
  const data = [{ value: pct, fill: color }, { value: Math.max(0, 100 - pct), fill: 'rgba(255,255,255,0.06)' }];
  // Needle angle: 180 (left) to 0 (right)
  const angle = 180 - (pct / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const needleLen = 58;

  return (
    <div style={{ textAlign: 'center', position: 'relative', height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="80%" startAngle={180} endAngle={0} innerRadius={62} outerRadius={82} paddingAngle={0} dataKey="value" stroke="none">
            {data.map((e, i) => <Cell key={i} fill={e.fill} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* Needle */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 300 200">
        <line x1="150" y1="160" x2={150 + needleLen * Math.cos(rad)} y2={160 - needleLen * Math.sin(rad)} stroke={color} strokeWidth="3" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        <circle cx="150" cy="160" r="5" fill={color} />
      </svg>
      <div style={{ position: 'absolute', bottom: '8%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
        <div style={{ fontSize: '1.7rem', fontWeight: 800, color: THEME.text, textShadow: `0 0 16px ${color}40` }}>{Number(value).toFixed(1)}{unit}</div>
        <div style={{ fontSize: '0.7rem', color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</div>
      </div>
    </div>
  );
}

// ── 7. DISQUE : Donut ────────────────────────────────────────────────────────
export function DonutChart({ data, nameKey, valueKey }) {
  const parsed = data.map((r, i) => ({ name: r[nameKey] || Object.values(r)[0], value: Number(r[valueKey] || Object.values(r)[1]), fill: COLORS[i % COLORS.length] }));
  const total = parsed.reduce((s, r) => s + r.value, 0);

  return (
    <div style={{ height: 260, position: 'relative' }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={parsed} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
            {parsed.map((e, i) => <Cell key={i} fill={e.fill} />)}
          </Pie>
          <Tooltip content={<DarkTooltip />} />
          <Legend wrapperStyle={{ fontSize: '0.75rem', color: THEME.muted }} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: THEME.text }}>{total >= 1024 ? (total / 1024).toFixed(1) + ' GB' : total.toFixed(0) + ' MB'}</div>
        <div style={{ fontSize: '0.65rem', color: THEME.muted, textTransform: 'uppercase' }}>Total</div>
      </div>
    </div>
  );
}

// ── 8. HEATMAP (Connexions actives) ──────────────────────────────────────────
export function HeatmapGrid({ data, labelKey, valueKey }) {
  if (!data.length) return null;
  const values = data.map(r => Number(r[valueKey] || Object.values(r)[1] || 0));
  const max = Math.max(...values, 1);

  const getColor = (v) => {
    const t = v / max;
    if (t < 0.25) return 'rgba(52,211,153,0.3)';
    if (t < 0.5) return 'rgba(251,191,36,0.5)';
    if (t < 0.75) return 'rgba(249,115,22,0.7)';
    return 'rgba(239,68,68,0.85)';
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(data.length, 6)}, 1fr)`, gap: 8 }}>
      {data.map((r, i) => {
        const lbl = r[labelKey] || Object.values(r)[0];
        const val = values[i];
        return (
          <div key={i} title={`${lbl}: ${val}`} style={{
            background: getColor(val), borderRadius: 10, padding: '14px 10px', textAlign: 'center',
            border: `1px solid ${THEME.border}`, transition: 'transform 0.2s', cursor: 'default',
            minWidth: 70
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform = ''}
          >
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: THEME.text }}>{val}</div>
            <div style={{ fontSize: '0.65rem', color: THEME.text, opacity: 0.8, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(lbl).substring(0, 14)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── SGA / PGA (Preserved, restyled) ──────────────────────────────────────────
export function SgaPgaChart({ data }) {
  const parsed = data.map((r, i) => ({ name: Object.values(r)[0], value: Number(Object.values(r)[1]), fill: COLORS[i % COLORS.length] }));
  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={parsed} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={4} dataKey="value" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
            {parsed.map((e, i) => <Cell key={i} fill={e.fill} />)}
          </Pie>
          <Tooltip content={<DarkTooltip unit=" MB" />} />
          <Legend wrapperStyle={{ fontSize: '0.75rem', color: THEME.muted }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
