import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Terminal, Copy, Check, Hash, Info, List } from 'lucide-react';

/**
 * AiResponseViewer: Premium Markdown Renderer
 * Designed for the OracleGuard Hybrid AI pipeline.
 */
const AiResponseViewer = ({ content }) => {
  if (!content) return null;

  return (
    <div className="markdown-container" style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const isMultiline = String(children).includes('\n');

            if (!inline && isMultiline) {
              return (
                <CodeBlock language={language} value={String(children).replace(/\n$/, '')} {...props} />
              );
            }

            return (
              <code 
                className={className} 
                {...props} 
                style={{ 
                  background: 'rgba(51, 65, 85, 0.4)', 
                  padding: '3px 7px', 
                  borderRadius: '6px', 
                  color: '#38bdf8',
                  fontFamily: "'Fira Code', monospace",
                  fontSize: '0.85em',
                  border: '1px solid rgba(56, 189, 248, 0.2)'
                }}
              >
                {children}
              </code>
            );
          },
          // Surcharge des éléments pour un look Premium
          p: ({ children }) => <p style={{ marginBottom: '18px', lineHeight: '1.7' }}>{children}</p>,
          ul: ({ children }) => <ul style={{ marginBottom: '18px', paddingLeft: '22px', listStyleType: 'none' }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ marginBottom: '18px', paddingLeft: '22px', listStyleType: 'decimal' }}>{children}</ol>,
          li: ({ node, children, ...props }) => {
            // Détection si c'est une liste à puces (unordered)
            const isUnordered = node.parent?.tagName === 'ul';
            return (
              <li style={{ marginBottom: '10px', position: 'relative' }}>
                {isUnordered && <span style={{ position: 'absolute', left: '-18px', color: '#8b5cf6' }}>•</span>}
                {children}
              </li>
            );
          },
          h1: ({ children }) => <h1 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800, margin: '28px 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><Hash size={20} color="#8b5cf6" /> {children}</h1>,
          h2: ({ children }) => <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, margin: '24px 0 14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, margin: '20px 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Info size={16} color="#38bdf8" /> {children}</h3>,
          blockquote: ({ children }) => (
            <blockquote style={{ borderLeft: '4px solid #8b5cf6', background: 'rgba(139, 92, 246, 0.05)', padding: '16px 20px', borderRadius: '0 12px 12px 0', margin: '20px 0', fontStyle: 'italic' }}>
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '20px 0', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>{children}</table>
            </div>
          ),
          th: ({ children }) => <th style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#f8fafc', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>{children}</th>,
          td: ({ children }) => <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => {
        console.error("Erreur de copie:", err);
      });
    } else {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = value;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Fallback de copie échoué", err);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div style={{ 
      margin: '24px 0', 
      borderRadius: '14px', 
      overflow: 'hidden', 
      border: '1px solid rgba(255, 255, 255, 0.12)',
      backgroundColor: '#020617',
      boxShadow: '0 20px 50px -12px rgba(0,0,0,0.7)'
    }}>
      {/* Header du terminal noir */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '12px 20px', 
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ff5f56', boxShadow: '0 0 8px rgba(255,95,86,0.4)' }}></div>
            <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ffbd2e', boxShadow: '0 0 8px rgba(255,189,46,0.4)' }}></div>
            <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#27c93f', boxShadow: '0 0 8px rgba(39,201,63,0.4)' }}></div>
          </div>
          <span style={{ 
            fontSize: '0.7rem', 
            textTransform: 'uppercase', 
            fontWeight: 800, 
            color: '#94a3b8', 
            letterSpacing: '0.1em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: "'Orbitron', sans-serif"
          }}>
            <Terminal size={12} color="#38bdf8" />
            {language || 'oracle-sql'}
          </span>
        </div>
        
        {/* Bouton Copier en haut à droite */}
        <button 
          onClick={handleCopy}
          title="Copier dans le presse-papier"
          style={{ 
            background: copied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)', 
            border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`, 
            borderRadius: '8px', 
            padding: '6px 14px', 
            color: copied ? '#10b981' : '#f8fafc',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(4px)'
          }}
        >
          {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>

      {/* Zone de code Style Terminal */}
      <div style={{ 
        padding: '24px', 
        overflowX: 'auto',
        background: 'radial-gradient(circle at top left, rgba(30, 41, 59, 0.2), transparent)'
      }}>
        <pre style={{ margin: 0, padding: 0 }}>
          <code style={{ 
            fontFamily: "'Fira Code', 'Courier New', monospace", 
            fontSize: '0.9rem', 
            lineHeight: 1.7,
            color: '#38bdf8' 
          }}>
            {value}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default AiResponseViewer;
