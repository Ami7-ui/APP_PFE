import React from 'react';

export default function GlassCard({ children, accent = 'rgba(14, 165, 233)', glow = false, style = {}, className = '', onClick }) {
  const isStringAccent = typeof accent === 'string';
  const baseAccent = isStringAccent && accent.startsWith('#') ? accent : 'var(--accent-blue)';
  
  return (
    <div 
      className={`glass-card ${className}`}
      onClick={onClick}
      style={{
        background: 'linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(8,14,33,0.8) 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderTop: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 20,
        padding: '28px 32px',
        boxShadow: glow 
          ? `0 0 30px ${baseAccent}20, 0 10px 30px rgba(0,0,0,0.5)` 
          : '0 10px 30px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      onMouseEnter={(e) => {
        if(onClick) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = `0 15px 40px rgba(0,0,0,0.6), 0 0 40px ${baseAccent}30`;
          e.currentTarget.style.borderColor = `rgba(255,255,255,0.15)`;
        }
      }}
      onMouseLeave={(e) => {
        if(onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = glow 
            ? `0 0 30px ${baseAccent}20, 0 10px 30px rgba(0,0,0,0.5)` 
            : '0 10px 30px rgba(0,0,0,0.4)';
          e.currentTarget.style.borderColor = `rgba(255,255,255,0.06)`;
        }
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
