import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Terminal, Copy, Check } from 'lucide-react';

/**
 * Composant de rendu Markdown avec gestion spéciale des blocs de code SQL
 * Inclut une interface de type terminal et un bouton de copie.
 */
const AiResponseViewer = ({ content }) => {
  if (!content) return null;

  return (
    <div className="markdown-container">
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
              <code className={className} {...props} style={{ background: 'rgba(51, 65, 85, 0.5)', padding: '2px 6px', borderRadius: '4px', color: '#38bdf8' }}>
                {children}
              </code>
            );
          },
          // On peut aussi surcharger d'autres éléments pour le style
          p: ({ children }) => <p style={{ marginBottom: '16px', color: '#cbd5e1' }}>{children}</p>,
          ul: ({ children }) => <ul style={{ marginBottom: '16px', paddingLeft: '20px', listStyleType: 'disc' }}>{children}</ul>,
          li: ({ children }) => <li style={{ marginBottom: '8px', color: '#cbd5e1' }}>{children}</li>,
          h1: ({ children }) => <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, margin: '20px 0 12px 0' }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, margin: '18px 0 10px 0' }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: '16px 0 8px 0' }}>{children}</h3>,
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
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ 
      margin: '20px 0', 
      borderRadius: '12px', 
      overflow: 'hidden', 
      border: '1px solid rgba(255, 255, 255, 0.1)',
      backgroundColor: '#020617',
      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
    }}>
      {/* Header du terminal */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '10px 16px', 
        background: 'rgba(30, 41, 59, 0.8)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }}></div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }}></div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }}></div>
          </div>
          <span style={{ 
            fontSize: '0.75rem', 
            textTransform: 'uppercase', 
            fontWeight: 700, 
            color: '#64748b', 
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Terminal size={14} />
            {language || 'code'}
          </span>
        </div>
        <button 
          onClick={handleCopy}
          style={{ 
            background: copied ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)', 
            border: 'none', 
            borderRadius: '6px', 
            padding: '5px 12px', 
            color: copied ? '#10b981' : '#cbd5e1',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>

      {/* Zone de code */}
      <div style={{ padding: '20px', overflowX: 'auto' }}>
        <pre style={{ margin: 0, padding: 0 }}>
          <code style={{ 
            fontFamily: "'Fira Code', 'Courier New', monospace", 
            fontSize: '0.9rem', 
            lineHeight: 1.6,
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
