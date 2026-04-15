import React, { useState, useRef } from 'react';
import useSqlStore from '../store/useSqlStore';

const ScriptsMetriques = () => {
    const [file, setFile] = useState(null);
    const [selectedType, setSelectedType] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const addScripts = useSqlStore((state) => state.addScripts);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
            setError("");
            setSuccess(false);
        }
    };

    const handleBrowseClick = () => {
        fileInputRef.current.click();
    };

    const handleUpload = async () => {
        if (!file || !selectedType) {
            setError("Veuillez sélectionner un fichier .zip ET un type de base de données");
            return;
        }

        setLoading(true);
        setError("");
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('db_type', selectedType);

        try {
            const response = await fetch('http://localhost:8000/api/scripts/upload-zip', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                addScripts(result.scripts);
                setSuccess(true);
            } else {
                setError(result.detail || "Une erreur est survenue lors de l'importation.");
            }
        } catch (err) {
            setError("Impossible de contacter le serveur.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="scripts-upload-card" style={styles.card}>
            <h3 style={styles.title}>Importation en masse</h3>
            <p style={styles.subtitle}>Sélectionnez une archive .zip contenant vos scripts SQL (.sql)</p>
            
            <div style={styles.inputGroup}>
                <select 
                    value={selectedType} 
                    onChange={(e) => setSelectedType(e.target.value)}
                    style={styles.selectType}
                >
                    <option value="">-- Type DB --</option>
                    <option value="Oracle">Oracle</option>
                    <option value="MySQL">MySQL</option>
                    <option value="PostgreSQL">PostgreSQL</option>
                </select>

                <input 
                    type="file" 
                    accept=".zip" 
                    onChange={handleFileChange}
                    style={styles.fileInput}
                    ref={fileInputRef}
                    id="zip-upload"
                />
                
                <button 
                    onClick={handleBrowseClick}
                    style={styles.browseButton}
                >
                    📁 ZIP
                </button>

                <div style={styles.fileNameDisplay}>
                    {file ? file.name : "Fichier.zip"}
                </div>
                
                <button 
                    onClick={handleUpload} 
                    disabled={loading || !file || !selectedType}
                    style={{
                        ...styles.uploadButton,
                        ...(loading || !file || !selectedType ? styles.buttonDisabled : {})
                    }}
                >
                    {loading ? "..." : "✈️ Importer"}
                </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}
            
            {success && (
                <div style={styles.success}>
                    <p>✅ Importation réussie !</p>
                    <p style={styles.successNote}>Rendez-vous sur la page <strong>Diagnostics SQL</strong> pour voir les scripts.</p>
                </div>
            )}
        </div>
    );
};

const styles = {
    card: {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        margin: '20px 0',
        color: '#fff',
    },
    title: {
        margin: '0 0 8px 0',
        fontSize: '1.25rem',
        background: 'linear-gradient(45deg, #ee48b9 0%, #f90bc5 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    subtitle: {
        color: '#aaa',
        fontSize: '0.9rem',
        marginBottom: '20px',
    },
    inputGroup: {
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
    },
    selectType: {
        width: '130px',
        padding: '10px',
        background: 'rgba(255, 255, 255, 0.08)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        outline: 'none',
    },
    fileInput: {
        display: 'none',
    },
    fileNameDisplay: {
        flex: 2,
        minWidth: '120px',
        padding: '10px 12px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        border: '1px dashed rgba(255, 255, 255, 0.2)',
        color: '#aaa',
        fontSize: '0.85rem',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    browseButton: {
        padding: '10px 16px',
        background: 'rgba(255, 255, 255, 0.1)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        transition: 'background 0.2s',
    },
    uploadButton: {
        padding: '10px 24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 4px 15px rgba(118, 75, 162, 0.4)',
    },
    buttonDisabled: {
        background: '#444',
        cursor: 'not-allowed',
        boxShadow: 'none',
    },
    error: {
        marginTop: '15px',
        color: '#ff4d4d',
        fontSize: '0.9rem',
        padding: '10px',
        background: 'rgba(255, 77, 77, 0.1)',
        borderRadius: '6px',
    },
    success: {
        marginTop: '15px',
        color: '#4dff88',
        fontSize: '0.9rem',
        padding: '15px',
        background: 'rgba(77, 255, 136, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(77, 255, 136, 0.2)',
    },
    successNote: {
        marginTop: '5px',
        color: '#fff',
        opacity: 0.8,
    }
};

export default ScriptsMetriques;
