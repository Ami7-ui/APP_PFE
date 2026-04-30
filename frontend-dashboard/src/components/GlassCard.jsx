import React from 'react';

export default function GlassCard({ children, accent = 'rgba(14, 165, 233)', glow = false, style = {}, className = '', onClick }) {
  const isStringAccent = typeof accent === 'string';
  const baseAccent = isStringAccent && accent.startsWith('#') ? accent : 'var(--accent-blue)';
  
  return (
    <div 
      className={`glass-panel ${onClick ? 'hover-lift' : ''} ${className}`}
      onClick={onClick}
      style={{
        padding: '28px 32px',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: glow 
          ? `0 0 30px ${baseAccent}20, 0 10px 30px rgba(0,0,0,0.3)` 
          : '0 8px 32px rgba(0,0,0,0.3)',
        ...style
      }}
    >
      {/* Top shimmer accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${baseAccent}, transparent)`,
        opacity: 0.8
      }} />
      {/* Subtle radial light in top right */}
      <div style={{
        position: 'absolute', top: '-50px', right: '-50px', width: 150, height: 150,
        background: `radial-gradient(circle, ${baseAccent}15, transparent 70%)`,
        pointerEvents: 'none',
        borderRadius: '50%'
      }} />
      {/* Content wrapper to keep it above background elements */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
