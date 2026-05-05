import React, { useState, useEffect } from 'react';
import { X, Loader2, Database, AlertCircle, HardDrive, Cpu, Hash, FileText, BarChart2 } from 'lucide-react';
import api from '../api';

export default function TableAutopsyDrawer({ isOpen, onClose, tableName, idBase }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (isOpen && tableName && idBase) {
      fetchAutopsyData();
    }
  }, [isOpen, tableName, idBase]);

  const fetchAutopsyData = async () => {
    setLoading(true);
    setError('');
    setData(null);
    setActiveTab('general');
    try {
      const res = await api.get(`/api/tables/${idBase}/${tableName}/stats`);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors du chargement de l'autopsie de la table.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="drawer-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(2, 6, 23, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
        onClick={onClose}
      />
      <div 
        className="drawer-panel"
        style={{
          position: 'fixed',
          top: 0,
          right: isOpen ? 0 : '-800px',
          width: '800px',
          height: '100vh',
          backgroundColor: '#0f172a',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.7)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderLeft: '1px solid rgba(56, 189, 248, 0.2)'
        }}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, rgba(15, 23, 42, 1), rgba(30, 41, 59, 0.8))' }}>
          <div>
            <h2 style={{ color: '#f8fafc', fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
              <Database color="#38bdf8" size={24} />
              Autopsie de la Table
            </h2>
            <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
              <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '1rem', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>{tableName}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X size={24} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', position: 'relative' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
              <Loader2 size={48} className="spinner" color="#38bdf8" />
              <span style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Analyse profonde en cours...</span>
            </div>
          ) : error ? (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '20px', borderRadius: '12px', color: '#fca5a5', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <AlertCircle size={24} style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>Erreur d'analyse</h4>
                <p style={{ margin: 0 }}>{error}</p>
              </div>
            </div>
          ) : data ? (
            <>
              {/* Onglets */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', overflowX: 'auto' }}>
                <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={<FileText size={16} />} label="Général" />
                <TabButton active={activeTab === 'ram'} onClick={() => setActiveTab('ram')} icon={<Cpu size={16} />} label="Mémoire (RAM)" />
                <TabButton active={activeTab === 'indexes'} onClick={() => setActiveTab('indexes')} icon={<Hash size={16} />} label="Index" />
                <TabButton active={activeTab === 'hwm'} onClick={() => setActiveTab('hwm')} icon={<HardDrive size={16} />} label="Fragmentation (HWM)" />
                <TabButton active={activeTab === 'histograms'} onClick={() => setActiveTab('histograms')} icon={<BarChart2 size={16} />} label="Histogrammes" />
                <TabButton active={activeTab === 'io'} onClick={() => setActiveTab('io')} icon={<Database size={16} />} label="I/O & Contention" />
              </div>

              {/* Contenu des onglets */}
              <div className="tab-content">
                {activeTab === 'general' && <GeneralTab data={data.general} />}
                {activeTab === 'ram' && <RamTab data={data.ram} />}
                {activeTab === 'indexes' && <IndexesTab data={data.indexes} />}
                {activeTab === 'hwm' && <HwmTab data={data.hwm} />}
                {activeTab === 'histograms' && <HistogramsTab data={data.histograms} />}
                {activeTab === 'io' && <IoTab data={data.io} />}
              </div>
            </>
          ) : (
             <div style={{ color: '#64748b', textAlign: 'center', marginTop: '40px' }}>Aucune donnée disponible.</div>
          )}
        </div>
      </div>
    </>
  );
}

// --- Composants d'Onglets ---

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
      border: active ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
      color: active ? '#38bdf8' : '#94a3b8',
      padding: '8px 16px',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '0.9rem',
      fontWeight: active ? 600 : 400,
      transition: 'all 0.2s',
      whiteSpace: 'nowrap'
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
  >
    {icon} {label}
  </button>
);

const GeneralTab = ({ data }) => {
  if (!data || Object.keys(data).length === 0) return <NoData />;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
      <MetricCard label="Nom de la Table" value={data.NOM_TABLE} />
      <MetricCard label="Tablespace" value={data.TABLESPACE} />
      <MetricCard label="Partitionnée" value={data.EST_PARTITIONNEE} highlight={data.EST_PARTITIONNEE === 'YES' ? '#38bdf8' : null} />
      <MetricCard label="Compression" value={data.COMPRESSION} />
      <MetricCard label="Nombre de Lignes" value={data.NB_LIGNES?.toLocaleString()} />
      <MetricCard label="Taille Moyenne Ligne" value={`${data.TAILLE_MOY_LIGNE_OCTETS} octets`} />
      <MetricCard label="Taille Totale" value={`${data.TAILLE_MB} MB`} highlight="#a78bfa" />
      <MetricCard label="Dernière Analyse" value={data.DERNIERE_ANALYSE} />
      <MetricCard label="Nombre de Colonnes" value={data.NB_COLONNES} />
      <MetricCard label="Hit Ratio (Buffer Cache)" value={data.HIT_RATIO_POURCENT ? `${data.HIT_RATIO_POURCENT}%` : 'N/A'} highlight={data.HIT_RATIO_POURCENT < 90 ? '#fbbf24' : '#4ade80'} />
      
      <div style={{ gridColumn: '1 / -1', background: 'rgba(15, 23, 42, 0.4)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '8px' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#e2e8f0', fontSize: '1rem' }}>Volatilité depuis la dernière analyse</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block' }}>Inserts</span>
            <span style={{ color: '#4ade80', fontSize: '1.2rem', fontWeight: 600 }}>{data.INSERTS_DEPUIS_ANALYSE?.toLocaleString() || 0}</span>
          </div>
          <div>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block' }}>Updates</span>
            <span style={{ color: '#fbbf24', fontSize: '1.2rem', fontWeight: 600 }}>{data.UPDATES_DEPUIS_ANALYSE?.toLocaleString() || 0}</span>
          </div>
          <div>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block' }}>Deletes</span>
            <span style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: 600 }}>{data.DELETES_DEPUIS_ANALYSE?.toLocaleString() || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const RamTab = ({ data }) => {
  if (!data || Object.keys(data).length === 0) return <NoData />;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <span style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid rgba(56, 189, 248, 0.2)' }}>Propriétaire : {data.OWNER}</span>
        <span style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid rgba(167, 139, 250, 0.2)' }}>Type : {data.OBJECT_TYPE}</span>
      </div>
      
      <MetricCard label="RAM Occupée" value={`${data.RAM_OCCUPEE_MB} MB`} highlight="#38bdf8" />
      <MetricCard label="Blocs Total en RAM" value={data.BLOCS_TOTAL_EN_RAM?.toLocaleString()} />
      
      <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '12px' }}>Distribution de l'état des blocs</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <ProgressBar label="Lecture (CR)" value={data.PCT_LECTURE} color="#38bdf8" count={data.BLOCS_LECTURE_CR} />
          <ProgressBar label="Modifiés (XCUR)" value={data.PCT_MODIFIES} color="#fbbf24" count={data.BLOCS_MODIFIES_XCUR} />
        </div>
      </div>

      <MetricCard label="Blocs Libres" value={data.BLOCS_LIBRES?.toLocaleString()} />
    </div>
  );
};

const ProgressBar = ({ label, value, color, count }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
      <span style={{ color: '#e2e8f0' }}>{label}</span>
      <span style={{ color: color, fontWeight: 600 }}>{value}% ({count?.toLocaleString()})</span>
    </div>
    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '3px', transition: 'width 0.5s ease-out' }} />
    </div>
  </div>
);

const IndexesTab = ({ data }) => {
  if (!data || data.length === 0) return <NoData message="Aucun index trouvé pour cette table." />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {data.map((idx, i) => (
        <div key={i} style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '1.1rem', fontFamily: 'monospace' }}>{idx.NOM_INDEX}</span>
            <span style={{ 
              background: idx.STATUT_INDEX === 'VALID' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
              color: idx.STATUT_INDEX === 'VALID' ? '#4ade80' : '#ef4444', 
              padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' 
            }}>
              {idx.STATUT_INDEX}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>
            <div>Type : <span style={{ color: '#cbd5e1' }}>{idx.TYPE_INDEX}</span></div>
            <div>Unicité : <span style={{ color: idx.UNIQUENESS === 'UNIQUE' ? '#4ade80' : '#cbd5e1' }}>{idx.UNIQUENESS}</span></div>
            <div>B-Level : <span style={{ color: idx.BLEVEL > 3 ? '#ef4444' : '#cbd5e1' }}>{idx.BLEVEL}</span></div>
            <div>Leaf Blocks : <span style={{ color: '#cbd5e1' }}>{idx.LEAF_BLOCKS?.toLocaleString()}</span></div>
            <div>Distinct Keys : <span style={{ color: '#38bdf8' }}>{idx.DISTINCT_KEYS?.toLocaleString()}</span></div>
          </div>
          <div style={{ color: '#38bdf8', fontSize: '0.9rem', fontFamily: 'monospace', background: 'rgba(56, 189, 248, 0.05)', padding: '8px', borderRadius: '6px' }}>
            {idx.COLONNES_INDEXEES}
          </div>
        </div>
      ))}
    </div>
  );
};

const HwmTab = ({ data }) => {
  if (!data || Object.keys(data).length === 0) return <NoData />;
  const isHighWaste = data.POURCENTAGE_GASPILLAGE > 20;
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
      <MetricCard label="Taille Allouée" value={`${data.TAILLE_ALLOUEE_MB} MB`} />
      <MetricCard label="Taille Réelle" value={`${data.TAILLE_REELLE_MB} MB`} />
      <MetricCard label="Blocs Alloués" value={data.BLOCS_ALLOUES?.toLocaleString()} />
      <MetricCard label="Blocs Utilisés (HWM)" value={data.BLOCS_UTILISES_HWM?.toLocaleString()} />
      
      <div style={{ gridColumn: '1 / -1', background: isHighWaste ? 'rgba(239, 68, 68, 0.1)' : 'rgba(15, 23, 42, 0.4)', padding: '20px', borderRadius: '12px', border: isHighWaste ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h4 style={{ margin: '0 0 8px 0', color: isHighWaste ? '#fca5a5' : '#e2e8f0', fontSize: '1.1rem' }}>Fragmentation</h4>
          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Espace gaspillé sous la High Water Mark</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: isHighWaste ? '#ef4444' : '#4ade80', fontSize: '1.8rem', fontWeight: 700 }}>{data.POURCENTAGE_GASPILLAGE}%</div>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>soit {data.BLOCS_GASPILLES?.toLocaleString()} blocs</div>
        </div>
      </div>
    </div>
  );
};

const HistogramsTab = ({ data }) => {
  if (!data || data.length === 0) return <NoData message="Aucune statistique de colonne trouvée." />;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="og-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
          <tr>
            <th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Colonne</th>
            <th style={{ padding: '12px', textAlign: 'right', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Valeurs Distinctes</th>
            <th style={{ padding: '12px', textAlign: 'right', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Valeurs Nulles</th>
            <th style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Histogramme</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
              <td style={{ padding: '10px 12px', color: '#e2e8f0', fontFamily: 'monospace' }}>{row.COLONNE}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#38bdf8' }}>{row.VALEURS_DISTINCTES?.toLocaleString()}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#cbd5e1' }}>{row.VALEURS_NULLES?.toLocaleString()}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#cbd5e1' }}>{row.TYPE_HISTOGRAMME}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const IoTab = ({ data }) => {
  if (!data || data.length === 0) return <NoData message="Aucune activité I/O enregistrée pour cette table dans v$segment_statistics." />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {data.map((row, i) => {
        let color = '#38bdf8'; // Bleu par défaut
        if (row.TYPE_ACTIVITE.includes('wait') || row.TYPE_ACTIVITE.includes('write')) color = '#fbbf24'; // Jaune/Orange pour attentes et écritures
        if (row.COMPTEUR > 10000 && row.TYPE_ACTIVITE.includes('wait')) color = '#ef4444'; // Rouge si beaucoup d'attentes

        return (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <div style={{ color: '#e2e8f0', fontSize: '1rem' }}>{row.TYPE_ACTIVITE}</div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>Owner : {row.OWNER}</div>
            </div>
            <span style={{ color: color, fontWeight: 700, fontSize: '1.2rem', fontFamily: 'monospace' }}>{row.COMPTEUR?.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
};

// --- Composants Utilitaires ---

const MetricCard = ({ label, value, highlight }) => (
  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>{label}</div>
    <div style={{ color: highlight || '#f8fafc', fontSize: '1.2rem', fontWeight: 600 }}>{value ?? '-'}</div>
  </div>
);

const NoData = ({ message = "Données non disponibles." }) => (
  <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>{message}</div>
);
