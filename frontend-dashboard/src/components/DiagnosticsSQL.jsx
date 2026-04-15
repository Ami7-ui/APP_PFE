import React, { useState } from 'react';
import useSqlStore from '../store/useSqlStore';

const DiagnosticsSQL = () => {
    const extractedScripts = useSqlStore((state) => state.extractedScripts);
    const [filterType, setFilterType] = useState('Tous');

    if (extractedScripts.length === 0) {
        return (
            <div style={styles.emptyContainer}>
                <div style={styles.emptyIcon}>📂</div>
                <h3 style={styles.emptyTitle}>Aucun script extrait</h3>
                <p style={styles.emptyText}>
                    Veuillez d'abord importer un archive ZIP depuis l'onglet 
                    <span style={styles.highlight}> "Scripts Metriques"</span>.
                </p>
            </div>
        );
    }

    const filteredScripts = filterType === 'Tous' 
        ? extractedScripts 
        : extractedScripts.filter(script => script.type === filterType);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3 style={styles.title}>Scripts SQL Extraits ({extractedScripts.length})</h3>
                <p style={styles.subtitle}>Aperçu des scripts prêts pour l'analyse</p>
            </div>

            <div style={styles.filterBar}>
                {['Tous', 'Oracle', 'MySQL', 'PostgreSQL'].map(type => (
                    <button 
                        key={type}
                        onClick={() => setFilterType(type)}
                        style={{
                            ...styles.filterButton,
                            ...(filterType === type ? styles.filterButtonActive : {})
                        }}
                    >
                        {type} {type !== 'Tous' && `(${extractedScripts.filter(s => s.type === type).length})`}
                    </button>
                ))}
            </div>

            <div style={styles.grid}>
                {filteredScripts.map((script, index) => (
                    <div key={index} style={styles.scriptCard}>
                        <div style={styles.cardHeader}>
                            <h4 style={styles.cardTitle}>{script.nom}</h4>
                        </div>
                        <div style={styles.codeContainer}>
                            <pre style={styles.preCode}>
                                <code style={styles.code}>
                                    {script.sql.length > 150 
                                        ? script.sql.substring(0, 150) + "..." 
                                        : script.sql}
                                </code>
                            </pre>
                        </div>
                        <div style={styles.cardFooter}>
                            <span style={styles.badge}>{script.type ? script.type.toUpperCase() : 'SQL'}</span>
                            <span style={styles.charCount}>{script.sql.length} caractères</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const styles = {
    container: {
        padding: '20px 0',
    },
    header: {
        marginBottom: '24px',
    },
    title: {
        margin: '0 0 4px 0',
        fontSize: '1.5rem',
        color: '#fff',
    },
    subtitle: {
        color: '#aaa',
        fontSize: '0.9rem',
        margin: 0,
    },
    filterBar: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
    },
    filterButton: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#aaa',
        padding: '6px 16px',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        transition: 'all 0.2s',
    },
    filterButtonActive: {
        background: 'rgba(79, 172, 254, 0.2)',
        borderColor: '#4facfe',
        color: '#fff',
    },
    emptyContainer: {
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '16px',
        padding: '60px 20px',
        textAlign: 'center',
        border: '1px dashed rgba(255, 255, 255, 0.1)',
        marginTop: '20px',
    },
    emptyIcon: {
        fontSize: '3rem',
        marginBottom: '20px',
        opacity: 0.5,
    },
    emptyTitle: {
        color: '#fff',
        margin: '0 0 10px 0',
    },
    emptyText: {
        color: '#aaa',
        maxWidth: '400px',
        margin: '0 auto',
        lineHeight: '1.6',
    },
    highlight: {
        color: '#4facfe',
        fontWeight: 'bold',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
    },
    scriptCard: {
        background: 'rgba(30, 30, 35, 0.8)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        transition: 'transform 0.2s',
        display: 'flex',
        flexDirection: 'column',
    },
    cardHeader: {
        padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    },
    cardTitle: {
        margin: 0,
        fontSize: '0.95rem',
        color: '#e0e0e0',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    codeContainer: {
        padding: '16px',
        background: '#1a1a1e',
        flex: 1,
    },
    preCode: {
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
    },
    code: {
        fontFamily: "'Fira Code', 'Courier New', monospace",
        fontSize: '0.85rem',
        color: '#9cdcfe', // VS Code style light blue for SQL
    },
    cardFooter: {
        padding: '10px 16px',
        background: 'rgba(0, 0, 0, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    badge: {
        background: 'rgba(79, 172, 254, 0.2)',
        color: '#4facfe',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    charCount: {
        color: '#666',
        fontSize: '0.75rem',
    }
};

export default DiagnosticsSQL;
