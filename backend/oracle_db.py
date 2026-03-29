import oracledb
import streamlit as st
import os
from dotenv import load_dotenv
from pathlib import Path

# 1. Charger les variables du fichier .env
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# 2. Récupérer les identifiants
USER = os.getenv("DB_USER")
PASSWORD = os.getenv("DB_PASSWORD")
DSN = os.getenv("DB_DSN")
@st.cache_resource
def get_oracle_connection():
    """Établit la connexion avec la base Oracle."""
    try:
        print(f"🔄 Tentative de connexion à {DSN} avec l'utilisateur {USER}...")
        connection = oracledb.connect(
            user=USER,
            password=PASSWORD,
            dsn=DSN
        )
        print("✅ Connexion à Oracle réussie avec succès !")
        return connection
    except oracledb.Error as e:
        print("❌ Échec de la connexion à Oracle.")
        error, = e.args
        print(f"Code erreur : {error.code}\nMessage : {error.message}")
        return None

# Test direct quand on lance ce fichier
if __name__ == "__main__":
    conn = get_oracle_connection()
    if conn:
        conn.close()
        print("🔌 Connexion fermée proprement.")