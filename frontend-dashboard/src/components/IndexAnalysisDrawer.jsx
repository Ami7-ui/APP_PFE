import React, { useState, useEffect } from 'react';
import { X, Loader2, Database, AlertCircle, HardDrive, Cpu, Hash, FileText, Zap, Trash2, Activity, Clock, History, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api';


export default function IndexAnalysisDrawer({ isOpen, onClose, indexName, idBase }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('structure');

  useEffect(() => {
    if (isOpen && indexName && idBase) {
      fetchIndexData();
    }
  }, [isOpen, indexName, idBase]);

  const fetchIndexData = async () => {
    setLoading(true);
    setError('');
    setData(null);
    setActiveTab('structure');
    try {
      const res = await api.get(`/api/indexes/${idBase}/${indexName}/analysis`);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors du chargement de l'analyse de l'index.");
    } finally {
      setLoading(false);
    }
  };

  const handleValidateStructure = async () => {
    if (!data?.structure?.OWNER) return;
    setValidating(true);
    try {
      const res = await api.post(`/api/indexes/${idBase}/${data.structure.OWNER}/${indexName}/validate`);
      // Mettre à jour uniquement la partie fragmentation avec les nouvelles données session-scoped
      setData(prev => ({
        ...prev,
        fragmentation: res.data.data
      }));
      setActiveTab('fragmentation');
    } catch (err) {
      alert("Erreur lors de la validation : " + (err.response?.data?.detail || err.message));
    } finally {
      setValidating(false);
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
          right: isOpen ? 0 : '-850px',
          width: '850px',
          height: '100vh',
          backgroundColor: '#0f172a',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.7)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderLeft: '1px solid rgba(139, 92, 246, 0.3)'
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #0f172a, #1e1b4b)' }}>
          <div>
            <h2 style={{ color: '#f8fafc', fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
              <Hash color="#a78bfa" size={24} />
              Analyse de l'Index
            </h2>
            <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
              <span style={{ color: '#a78bfa', fontFamily: 'monospace', fontSize: '1.1rem', background: 'rgba(139, 92, 246, 0.1)', padding: '2px 10px', borderRadius: '4px', fontWeight: 600 }}>{indexName}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
              <Loader2 size={48} className="spinner" color="#a78bfa" />
              <span style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Analyse profonde de l'index en cours...</span>
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
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', overflowX: 'auto' }}>
                <TabButton active={activeTab === 'structure'} onClick={() => setActiveTab('structure')} icon={<FileText size={16} />} label="Structure" />
                <TabButton active={activeTab === 'ram'} onClick={() => setActiveTab('ram')} icon={<Cpu size={16} />} label="RAM (Cache)" />
                <TabButton active={activeTab === 'io'} onClick={() => setActiveTab('io')} icon={<Activity size={16} />} label="I/O & Contention" />
                <TabButton active={activeTab === 'usage'} onClick={() => setActiveTab('usage')} icon={<Trash2 size={16} />} label="Usage (Poids Mort)" />
                <TabButton active={activeTab === 'fragmentation'} onClick={() => setActiveTab('fragmentation')} icon={<Zap size={16} />} label="Fragmentation" />
                <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={16} />} label="Historique (AWR)" />
                <TabButton active={activeTab === 'stale_stats'} onClick={() => setActiveTab('stale_stats')} icon={<Clock size={16} />} label="Obsolescence Stats" />
              </div>


              {/* Tab Panels */}
              <div className="tab-content">
                {activeTab === 'structure' && <StructureTab data={data.structure} />}
                {activeTab === 'ram' && <RamTab data={data.ram} />}
                {activeTab === 'io' && <IoTab data={data.io} />}
                {activeTab === 'usage' && <UsageTab data={data.usage} />}
                {activeTab === 'fragmentation' && (
                  <FragmentationTab 
                    data={data.fragmentation} 
                    onValidate={handleValidateStructure} 
                    validating={validating}
                  />
                )}
                {activeTab === 'history' && <HistoryTab data={data.history} />}
                {activeTab === 'stale_stats' && <StaleStatsTab data={data.stale_stats} />}
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

// --- Sub-components ---

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
      border: active ? '1px solid rgba(167, 139, 250, 0.3)' : '1px solid transparent',
      color: active ? '#a78bfa' : '#94a3b8',
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
  >
    {icon} {label}
  </button>
);

const MetricCard = ({ label, value, highlight, warning }) => (
  <div style={{ 
    background: 'rgba(15, 23, 42, 0.4)', 
    padding: '16px', 
    borderRadius: '12px', 
    border: warning ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255,255,255,0.05)',
    boxShadow: warning ? '0 0 15px rgba(239, 68, 68, 0.1)' : 'none'
  }}>
    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
      {label}
      {warning && <AlertCircle size={14} color="#ef4444" title="Attention : Valeur critique" />}
    </div>
    <div style={{ color: warning ? '#ef4444' : (highlight || '#f8fafc'), fontSize: '1.2rem', fontWeight: 600, fontFamily: 'monospace' }}>
      {value ?? '-'}
    </div>
  </div>
);

const StructureTab = ({ data }) => {
  if (!data || Object.keys(data).length === 0) return <NoData />;
  const isHighBLevel = data.HAUTEUR_ARBRE >= 4;
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
      <MetricCard label="Propriétaire" value={data.OWNER} />
      <MetricCard label="Type d'Index" value={data.TYPE_INDEX} />
      <MetricCard label="Statut" value={data.STATUT} highlight={data.STATUT === 'VALID' ? '#4ade80' : '#ef4444'} />
      <MetricCard label="Unicité" value={data.UNIQUENESS} highlight={data.UNIQUENESS === 'UNIQUE' ? '#4ade80' : null} />
      <MetricCard 
        label="Hauteur (B-Level)" 
        value={data.HAUTEUR_ARBRE} 
        warning={isHighBLevel} 
        highlight={!isHighBLevel ? '#38bdf8' : null}
      />
      <MetricCard label="Blocs Feuilles" value={data.BLOCS_FEUILLES?.toLocaleString()} />
      <MetricCard label="Valeurs Distinctes" value={data.VALEURS_DISTINCTES?.toLocaleString()} highlight="#38bdf8" />
      <MetricCard label="Facteur Clustering" value={data.FACTEUR_CLUSTERING?.toLocaleString()} />
      <MetricCard label="Dernière Analyse" value={data.DERNIERE_ANALYSE} />
      
      <div style={{ gridColumn: '1 / -1', background: 'rgba(167, 139, 250, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(167, 139, 250, 0.2)', marginTop: '8px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#a78bfa', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Colonnes Indexées</h4>
        <div style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: '1rem', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
          {data.COLONNES_INDEXEES}
        </div>
      </div>
      
      {isHighBLevel && (
        <div style={{ gridColumn: '1 / -1', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          Attention : La hauteur de l'arbre ({data.HAUTEUR_ARBRE}) est élevée. Un REBUILD pourrait améliorer les performances.
        </div>
      )}
    </div>
  );
};

const RamTab = ({ data }) => {
  if (!data || Object.keys(data).length === 0) return <NoData message="Index non présent dans le Buffer Cache actuellement." />;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
      <MetricCard label="RAM Occupée" value={`${data.RAM_OCCUPEE_MB} MB`} highlight="#38bdf8" />
      <MetricCard label="Blocs Total en RAM" value={data.BLOCS_TOTAL_EN_RAM?.toLocaleString()} />
      
      <div style={{ gridColumn: '1 / -1', background: 'rgba(15, 23, 42, 0.4)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>État des Blocs</span>
          <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.9rem' }}>{data.PCT_MODIFIES}% Modifiés</span>
        </div>
        <div style={{ height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${data.PCT_MODIFIES}%`, background: '#fbbf24' }} />
          <div style={{ width: `${100 - data.PCT_MODIFIES}%`, background: '#38bdf8' }} />
        </div>
        <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', background: '#fbbf24', borderRadius: '3px' }} />
            <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>Modifiés (XCUR) : {data.BLOCS_MODIFIES_XCUR?.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', background: '#38bdf8', borderRadius: '3px' }} />
            <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>Lecture (CR) : {data.BLOCS_LECTURE_CR?.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const IoTab = ({ data }) => {
  if (!data || data.length === 0) return <NoData message="Aucune activité I/O segmentée détectée." />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {data.map((row, i) => {
        const isWait = row.TYPE_ACTIVITE.includes('wait') || row.TYPE_ACTIVITE.includes('lock');
        return (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ color: '#e2e8f0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isWait ? <AlertCircle size={16} color="#fbbf24" /> : <Activity size={16} color="#38bdf8" />}
              {row.TYPE_ACTIVITE}
            </div>
            <span style={{ color: isWait ? '#fbbf24' : '#38bdf8', fontWeight: 700, fontSize: '1.2rem', fontFamily: 'monospace' }}>
              {row.COMPTEUR?.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const UsageTab = ({ data }) => {
  if (!data || Object.keys(data).length === 0) return <NoData />;
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIF': return '#4ade80';
      case 'CRITIQUE (PK/UK)': return '#38bdf8';
      case 'FAIBLE UTILISATION': return '#fbbf24';
      case 'POINT MORT': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
        <div style={{ 
          background: `${getStatusColor(data.STATUT_USAGE)}15`, 
          color: getStatusColor(data.STATUT_USAGE),
          padding: '12px 30px',
          borderRadius: '16px',
          border: `1px solid ${getStatusColor(data.STATUT_USAGE)}40`,
          fontSize: '1.4rem',
          fontWeight: 800,
          textAlign: 'center',
          boxShadow: `0 0 20px ${getStatusColor(data.STATUT_USAGE)}10`
        }}>
          {data.STATUT_USAGE}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        <MetricCard label="Table Associée" value={data.TABLE_ASSOCIEE} />
        <MetricCard label="Taille MB" value={data.TAILLE_MB} highlight="#a78bfa" />
        <MetricCard label="Nb Utilisations" value={data.NB_UTILISATIONS?.toLocaleString()} highlight={data.NB_UTILISATIONS > 0 ? '#4ade80' : null} />
        <MetricCard label="Nb Exécutions" value={data.NB_EXECUTIONS?.toLocaleString()} />
        <MetricCard label="Utilisation SQL Plan" value={data.UTILISATION_SQL} highlight={data.UTILISATION_SQL > 0 ? '#4ade80' : null} />
        <MetricCard label="Dernière Utilisation" value={data.DERNIERE_UTILISATION} />
      </div>

      {data.STATUT_USAGE === 'POINT MORT' && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '16px', borderRadius: '12px', color: '#fca5a5' }}>
          <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Trash2 size={18} /> Recommandation</h4>
          Cet index ne semble jamais utilisé par l'optimiseur ni par les requêtes récentes. Envisagez de le passer en INVISIBLE avant suppression pour valider l'absence d'impact.
        </div>
      )}
    </div>
  );
};

const FragmentationTab = ({ data, onValidate, validating }) => {
  // st.lf_rows etc. peuvent être null si pas de stats structurelles récentes
  const hasStats = data && data.NB_LIGNES_FEUILLES !== null;
  const isHighFrag = data?.TAUX_FRAGMENTATION_PCT > 20 || data?.POURCENTAGE_GASPILLAGE_TOTAL > 25;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {!hasStats ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Zap size={48} color="#94a3b8" style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ color: '#f8fafc', marginBottom: '8px' }}>Données de fragmentation manquantes</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 24px auto' }}>
            Les détails de fragmentation (lignes supprimées, espace utile) nécessitent une analyse structurelle en temps réel de l'index.
          </p>
          <button 
            onClick={onValidate}
            disabled={validating}
            style={{ 
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '10px', 
              fontWeight: 600, 
              cursor: validating ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '0 auto',
              boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)',
              opacity: validating ? 0.7 : 1
            }}
          >
            {validating ? <Loader2 size={18} className="spinner" /> : <Zap size={18} />}
            {validating ? "Analyse en cours..." : "Lancer l'analyse de fragmentation"}
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <MetricCard label="Taille Allouée" value={`${data.TAILLE_ALLOUEE_MB} MB`} />
            <MetricCard label="Taille Utile Réelle" value={`${data.TAILLE_UTILE_REELLE_MB} MB`} highlight="#4ade80" />
            <MetricCard label="Nb Lignes Feuilles" value={data.NB_LIGNES_FEUILLES?.toLocaleString()} />
            <MetricCard label="Nb Lignes Supprimées" value={data.NB_LIGNES_SUPPR_MAIS_OCCUPEES?.toLocaleString()} warning={data.NB_LIGNES_SUPPR_MAIS_OCCUPEES > 0} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: isHighFrag ? 'rgba(239, 68, 68, 0.1)' : 'rgba(15, 23, 42, 0.4)', padding: '20px', borderRadius: '16px', border: isHighFrag ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>Taux de Fragmentation</div>
              <div style={{ color: isHighFrag ? '#ef4444' : '#4ade80', fontSize: '2rem', fontWeight: 800 }}>{data.TAUX_FRAGMENTATION_PCT}%</div>
            </div>
            <div style={{ background: isHighFrag ? 'rgba(239, 68, 68, 0.1)' : 'rgba(15, 23, 42, 0.4)', padding: '20px', borderRadius: '16px', border: isHighFrag ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>Espace Gaspillé</div>
              <div style={{ color: isHighFrag ? '#ef4444' : '#4ade80', fontSize: '2rem', fontWeight: 800 }}>{data.POURCENTAGE_GASPILLAGE_TOTAL}%</div>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '4px' }}>soit {data.ESPACE_GASPILLE_MB} MB</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button 
              onClick={onValidate}
              disabled={validating}
              style={{ background: 'transparent', border: '1px solid rgba(167, 139, 250, 0.4)', color: '#a78bfa', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {validating ? <Loader2 size={14} className="spinner" /> : <Zap size={14} />}
              Rafraîchir l'analyse structurelle
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const NoData = ({ message = "Données non disponibles." }) => (
  <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>{message}</div>
);

const HistoryTab = ({ data }) => {
  if (!data || data.length === 0) return <NoData message="Aucun historique de charge disponible sur les 7 derniers jours." />;

  return (
    <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <h4 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Activity size={18} color="#a78bfa" /> Charge Segmentée (7 jours)
      </h4>
      <div style={{ height: '350px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="DATE_SNAP" 
              stroke="#64748b" 
              fontSize={12} 
              tick={{ fill: '#64748b' }} 
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={12} 
              tick={{ fill: '#64748b' }} 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#f8fafc' }}
              itemStyle={{ fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line 
              type="monotone" 
              dataKey="LECTURES_RAM" 
              name="Lectures RAM (Logical)" 
              stroke="#a78bfa" 
              strokeWidth={3}
              dot={{ r: 4, fill: '#a78bfa' }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="LECTURES_DISQUE" 
              name="Lectures Disque (Physical)" 
              stroke="#38bdf8" 
              strokeWidth={3}
              dot={{ r: 4, fill: '#38bdf8' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const StaleStatsTab = ({ data }) => {
  if (!data || Object.keys(data).length === 0) return <NoData />;
  
  const isStale = data.PCT_OBSOLESCENCE > 10;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {isStale && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.15)', 
          border: '1px solid rgba(239, 68, 68, 0.4)', 
          padding: '16px', 
          borderRadius: '12px', 
          color: '#fca5a5',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 0 15px rgba(239, 68, 68, 0.1)'
        }}>
          <AlertTriangle size={24} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Statistiques obsolètes !</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              Le plan d'exécution est probablement faussé. Une mise à jour des statistiques est recommandée.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        <MetricCard label="Table Cible" value={data.TABLE_NAME} />
        <MetricCard 
          label="Taux d'Obsolescence" 
          value={`${data.PCT_OBSOLESCENCE}%`} 
          warning={isStale} 
          highlight={!isStale ? '#4ade80' : null} 
        />
        <MetricCard label="Lignes (Optimiseur)" value={data.LIGNES_CONNUES_OPTIMISEUR?.toLocaleString()} />
        <MetricCard label="Modifications (DML)" value={data.TOTAL_MODIFICATIONS_RECENTES?.toLocaleString()} highlight="#fbbf24" />
        <MetricCard label="Dernière Analyse" value={data.DATE_DERNIERE_ANALYSE} />
      </div>

      <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase' }}>Seuils de Tolérance</h4>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ height: '8px', flex: 1, background: '#4ade80', borderRadius: '4px' }} title="Sain (0-10%)" />
          <div style={{ height: '8px', flex: 3, background: 'rgba(239, 68, 68, 0.3)', borderRadius: '4px' }} title="Critique (>10%)" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: '#64748b', fontSize: '0.75rem' }}>
          <span>SAIN</span>
          <span>STALE</span>
        </div>
      </div>
    </div>
  );
};

