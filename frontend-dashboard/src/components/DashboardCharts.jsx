import React, { useState } from 'react';
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

// ── NOUVEAU: ESPACE GLOBAL DONUT ─────────────────────────────────────────────
export function EspaceGlobalDonut({ data }) {
  // Parse data assuming it could be a list of objects like [{ name: 'Espace Utilisé', value: 120 }, ...]
  // or a single row with multiple columns. We'll try to extract "utilisé" and "libre".
  let used = 0;
  let free = 0;

  if (Array.isArray(data)) {
    data.forEach(row => {
      const vals = Object.values(row);
      const keys = Object.keys(row).map(k => k.toLowerCase());
      
      // If row has a name/label column and a value column
      if (vals.length >= 2) {
        const label = String(vals[0]).toLowerCase();
        const value = Number(vals[1]) || 0;
        if (label.includes('utilis') || label.includes('used')) used += value;
        else if (label.includes('libr') || label.includes('free')) free += value;
      } else if (vals.length === 1 && keys.length === 1) {
        // Single column per row?
        const k = keys[0];
        const v = Number(vals[0]) || 0;
        if (k.includes('utilis') || k.includes('used')) used += v;
        else if (k.includes('libr') || k.includes('free')) free += v;
      }
    });
    
    // If the data was actually just columns in a single row
    if (used === 0 && free === 0 && data.length === 1) {
      const row = data[0];
      Object.entries(row).forEach(([k, v]) => {
        const keyLower = String(k).toLowerCase();
        const numV = Number(v) || 0;
        if (keyLower.includes('utilis') || keyLower.includes('used')) used += numV;
        else if (keyLower.includes('libr') || keyLower.includes('free')) free += numV;
      });
    }
  }

  // Fallback if parsing fails but we want to show something
  if (used === 0 && free === 0 && Array.isArray(data) && data.length > 0) {
     const row = data[0];
     const vals = Object.values(row);
     if (vals.length >= 2) {
         used = Number(vals[0]) || 0;
         free = Number(vals[1]) || 0;
     }
  }

  const chartData = [
    { name: 'Espace Utilisé', value: used, fill: '#f43f5e' }, // Rose/Rouge vif pour utilisé
    { name: 'Espace Libre', value: free, fill: '#10b981' }    // Vert émeraude pour libre
  ];
  const total = used + free;

  const customTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : 0;
    return (
      <div style={{
        background: 'rgba(15,23,42,0.95)',
        border: `1px solid ${THEME.border}`,
        borderRadius: 12,
        padding: '12px 16px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: THEME.text }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: p.payload.fill, boxShadow: `0 0 8px ${p.payload.fill}` }} />
          <span style={{ color: THEME.muted, fontWeight: 600 }}>{p.name} :</span>
          <span style={{ fontWeight: 800 }}>{p.value.toLocaleString()} GB</span>
          <span style={{ color: THEME.accent, fontWeight: 700, marginLeft: 4 }}>({pct}%)</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 280 }}>
      <div style={{ height: 220, width: '100%', position: 'relative' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              cornerRadius={6}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} style={{ filter: `drop-shadow(0 0 4px ${entry.fill}80)` }} />
              ))}
            </Pie>
            <Tooltip content={customTooltip} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: THEME.text, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            {total >= 1024 ? (total / 1024).toFixed(1) + ' TB' : total.toFixed(1) + ' GB'}
          </div>
          <div style={{ fontSize: '0.65rem', color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 2 }}>
            Total
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {chartData.map((item, i) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: `1px solid rgba(255,255,255,0.05)` }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.fill, boxShadow: `0 0 8px ${item.fill}` }} />
              <span style={{ color: THEME.muted, fontSize: '0.75rem', fontWeight: 600 }}>{item.name}</span>
              <span style={{ color: THEME.text, fontSize: '0.8rem', fontWeight: 800 }}>{pct}%</span>
            </div>
          );
        })}
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

export function SgaPgaChart({ data }) {
  // 1. Trier les données par ordre décroissant
  const parsed = data
    .map((r, i) => ({
      name: Object.values(r)[0],
      value: Number(Object.values(r)[1])
    }))
    .sort((a, b) => b.value - a.value)
    .map((item, i) => ({
      ...item,
      fill: COLORS[i % COLORS.length]
    }));

  const total = parsed.reduce((sum, item) => sum + item.value, 0);

  // Custom tooltip to show name, value and percentage
  const customTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    const val = Number(p.value);
    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
    return (
      <div style={{
        background: 'rgba(15,23,42,0.95)',
        border: `1px solid ${THEME.border}`,
        borderRadius: 12,
        padding: '12px 16px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: THEME.text }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.payload.fill || p.color, boxShadow: `0 0 6px ${p.payload.fill || p.color}` }} />
          <span style={{ color: THEME.muted }}>{p.name} :</span>
          <span style={{ fontWeight: 700 }}>{val.toLocaleString()} MB ({pct}%)</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
      <div style={{ height: 200, width: '100%' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={parsed}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {parsed.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={customTooltip} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div style={{
        marginTop: 16,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '8px 12px',
        width: '100%',
        padding: '0 10px',
        maxHeight: 100,
        overflowY: 'auto'
      }}>
        {parsed.map((item, index) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
          return (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem' }} title={`${item.name}: ${item.value} MB`}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.fill, flexShrink: 0 }} />
              <span style={{ color: THEME.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
                {item.name}
              </span>
              <span style={{ color: THEME.text, fontWeight: 600, marginLeft: 'auto' }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CUSTOM TOOLTIP POUR SEGMENTS ──────────────────────────────────────────────
export function SegmentCustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const owner = row.owner || row.table_schema || '—';
  const segmentName = row.segment_name || row.table_name || '—';
  const segmentType = row.segment_type || 'TABLE';
  const sizeMb = row.size_mb;
  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)',
      border: `1px solid ${THEME.border}`,
      borderRadius: 12,
      padding: '12px 16px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
    }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: THEME.text, marginBottom: 8 }}>
        {owner}.{segmentName}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem', color: THEME.muted }}>
        <div><span style={{ color: THEME.muted }}>Propriétaire : </span><span style={{ color: THEME.text, fontWeight: 600 }}>{owner}</span></div>
        <div><span style={{ color: THEME.muted }}>Segment : </span><span style={{ color: THEME.text, fontWeight: 600 }}>{segmentName}</span></div>
        <div><span style={{ color: THEME.muted }}>Type : </span><span style={{ color: THEME.text, fontWeight: 600 }}>{segmentType}</span></div>
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[0], boxShadow: `0 0 6px ${COLORS[0]}` }} />
          <span style={{ color: THEME.text, fontWeight: 700 }}>{sizeMb} Mo</span>
        </div>
      </div>
    </div>
  );
}

// ── CUSTOM: CHECK EVENT CHART ────────────────────────────────────────────────
export function CheckEventChart({ data }) {
  const [metric, setMetric] = useState('total_waits');

  // Résolution robuste des clés
  const hasTimeWaitedSec = data[0] && 'time_waited_sec' in data[0];
  const hasAverageWaitMs = data[0] && 'average_wait_ms' in data[0];

  let dataKey = 'total_waits';
  let label = 'Total Waits';
  let unit = '';

  if (metric === 'time_waited') {
    dataKey = hasTimeWaitedSec ? 'time_waited_sec' : 'time_waited';
    label = 'Time Waited';
    unit = hasTimeWaitedSec ? ' s' : ' cs';
  } else if (metric === 'average_wait') {
    dataKey = hasAverageWaitMs ? 'average_wait_ms' : 'average_wait';
    label = 'Average Wait';
    unit = ' ms';
  }

  const processedData = data.map(row => ({
    ...row,
    name: row.event || 'Inconnu',
    value: Number(row[dataKey] || 0)
  }));

  const selectStyle = {
    background: THEME.card,
    color: THEME.text,
    border: `1px solid ${THEME.border}`,
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: '0.8rem',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <select value={metric} onChange={e => setMetric(e.target.value)} style={selectStyle}>
          <option value="total_waits">Total Waits</option>
          <option value="time_waited">Time Waited ({unit.trim() || 'units'})</option>
          <option value="average_wait">Average Wait (ms)</option>
        </select>
      </div>
      <div style={{ height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={processedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} vertical={false} />
            <XAxis dataKey="name" {...axisProps} interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis {...axisProps} />
            <Tooltip content={<DarkTooltip unit={unit} />} />
            <Bar dataKey="value" name={label} radius={[4, 4, 0, 0]} maxBarSize={40}>
              {processedData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── CUSTOM: ESPACE LIBRE TABLESPACE CHART ──────────────────────────────────────
export function TablespaceSpaceChart({ data }) {
  const processedData = data.map(row => ({
    ...row,
    name: row.tablespace_name || row.database || 'Inconnu',
    value: Number(row.free_mb || 0)
  }));

  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={processedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="tablespaceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} vertical={false} />
          <XAxis dataKey="name" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<DarkTooltip unit=" Mo" />} />
          <Bar dataKey="value" name="Espace Libre" fill="url(#tablespaceGrad)" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── CUSTOM: TOP SEGMENTS CHART ────────────────────────────────────────────────
export function TopSegmentsChart({ data }) {
  const processedData = data.map(row => {
    const owner = row.owner || row.table_schema || '—';
    const segmentName = row.segment_name || row.table_name || '—';
    return {
      ...row,
      name: `${owner}.${segmentName}`,
      value: Number(row.size_mb || 0)
    };
  });

  return (
    <div style={{ height: 320 }}>
      <ResponsiveContainer>
        <BarChart data={processedData} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} vertical={false} />
          <XAxis dataKey="name" {...axisProps} interval={0} angle={-25} textAnchor="end" height={60} />
          <YAxis {...axisProps} />
          <Tooltip content={<SegmentCustomTooltip />} />
          <Bar dataKey="value" name="Taille" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {processedData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── CUSTOM: DB TIME + CPU RATIO CHART ──────────────────────────────────────────
export function DbTimeCpuRatioChart({ data }) {
  const processedData = data.map(row => {
    const cpuSec = row.db_cpu_sec !== undefined ? row.db_cpu_sec : (row.approx_cpu_sec !== undefined ? row.approx_cpu_sec : 0);
    const dbTimeSec = row.db_time_sec !== undefined ? row.db_time_sec : 0;
    const cpuRatio = row.cpu_ratio_percent !== undefined ? row.cpu_ratio_percent : 0;

    return {
      ...row,
      name: `${Number(dbTimeSec).toFixed(1)}s (DB Time)`,
      db_cpu_sec: Number(cpuSec),
      cpu_ratio_percent: Number(cpuRatio)
    };
  });

  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={processedData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }} barGap={6}>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} vertical={false} />
          <XAxis dataKey="name" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<DarkTooltip />} />
          <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
          <Bar dataKey="db_cpu_sec" name="CPU Sec" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar dataKey="cpu_ratio_percent" name="CPU Ratio %" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


// ── CUSTOM: SESSIONS DISTRIBUTION DONUT ──────────────────────────────────────
const SESSION_COLORS = {
  'ACTIVE': '#3B82F6',
  'INACTIVE': '#6B7280',
  'KILLED': '#ef4444',
  'SNIPED': '#f97316',
  'CACHED': '#a78bfa',
};

export function SessionsDistributionDonut({ data }) {
  const isGrouped = data && !Array.isArray(data) && data.data;
  
  let chartData = [];
  let totalSessions = 0;

  if (isGrouped) {
    chartData = data.data.map(item => ({
      name: item.name,
      value: item.value,
      fill: item.color || SESSION_COLORS[item.name] || COLORS[0]
    }));
    totalSessions = data.total_sessions;
  } else {
    const rawData = Array.isArray(data) ? data : [];
    const statusCounts = {};
    rawData.forEach(row => {
      const status = (row.status || 'UNKNOWN').toUpperCase();
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    totalSessions = rawData.length;
    chartData = Object.entries(statusCounts)
      .map(([name, value]) => ({
        name,
        value,
        fill: SESSION_COLORS[name] || COLORS[Object.keys(statusCounts).indexOf(name) % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  }

  // Custom tooltip
  const customTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    const pct = totalSessions > 0 ? ((p.value / totalSessions) * 100).toFixed(1) : 0;
    return (
      <div style={{
        background: 'rgba(15,23,42,0.95)',
        border: `1px solid ${THEME.border}`,
        borderRadius: 12,
        padding: '12px 16px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: THEME.text }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.payload.fill, boxShadow: `0 0 6px ${p.payload.fill}` }} />
          <span style={{ color: THEME.muted }}>{p.name} :</span>
          <span style={{ fontWeight: 700 }}>{p.value} ({pct}%)</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 280 }}>
      <div style={{ height: 220, width: '100%', position: 'relative' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={customTooltip} />
          </PieChart>
        </ResponsiveContainer>
        {/* Central label */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: THEME.text, lineHeight: 1 }}>
            {totalSessions}
          </div>
          <div style={{ fontSize: '0.65rem', color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
            Sessions
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {chartData.map((item, i) => {
          const pct = totalSessions > 0 ? ((item.value / totalSessions) * 100).toFixed(0) : 0;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.fill, flexShrink: 0 }} />
              <span style={{ color: THEME.muted }}>{item.name}</span>
              <span style={{ color: THEME.text, fontWeight: 700 }}>{item.value}</span>
              <span style={{ color: THEME.muted, fontSize: '0.7rem' }}>({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CUSTOM: ACTIVE SESSIONS DATA TABLE ───────────────────────────────────────
const COLUMN_CONFIG = [
  { key: 'serial#', label: 'Serial #', mono: true },
  { key: 'username', label: 'Utilisateur', badge: true },
  { key: 'osuser', label: 'OS User' },
  { key: 'machine', label: 'Machine' },
  { key: 'program', label: 'Programme', truncate: true },
  { key: 'logon_time', label: 'Heure de Connexion' },
];

export function ActiveSessionsTable({ data }) {
  const thStyle = {
    padding: '10px 14px',
    textAlign: 'left',
    color: THEME.muted,
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    borderBottom: `1px solid ${THEME.border}`,
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    background: THEME.card,
    zIndex: 1
  };

  const tdStyle = {
    padding: '10px 14px',
    fontSize: '0.82rem',
    color: '#e2e8f0',
    borderBottom: `1px solid ${THEME.grid}`,
    whiteSpace: 'nowrap'
  };

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 10px',
    borderRadius: 6,
    background: 'rgba(56,189,248,0.12)',
    border: '1px solid rgba(56,189,248,0.25)',
    color: '#38bdf8',
    fontSize: '0.78rem',
    fontWeight: 600
  };

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 360, borderRadius: 8 }}>
      {data.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', color: THEME.muted, fontSize: '0.85rem' }}>
          Aucune session active détectée.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              {COLUMN_CONFIG.map(col => (
                <th key={col.key} style={thStyle}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                style={{
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}
              >
                {COLUMN_CONFIG.map(col => {
                  const val = row[col.key] !== undefined ? String(row[col.key]) : '—';
                  return (
                    <td key={col.key} style={{
                      ...tdStyle,
                      ...(col.mono ? { fontFamily: 'monospace', fontSize: '0.78rem', color: THEME.muted } : {}),
                      ...(col.truncate ? { maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' } : {})
                    }}
                    title={col.truncate ? val : undefined}
                    >
                      {col.badge ? (
                        <span style={badgeStyle}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 6px #38bdf8' }} />
                          {val}
                        </span>
                      ) : val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
