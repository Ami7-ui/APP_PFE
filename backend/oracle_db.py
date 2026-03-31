# backend/oracle_db.py
import oracledb
import os
from dotenv import load_dotenv
from pathlib import Path

# 1. Charger les variables du fichier .env
# Ce chemin suppose que ton .env est à la racine du projet (au-dessus du dossier backend)
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# 2. Récupérer les identifiants depuis l'environnement
USER = os.getenv("DB_USER")
PASSWORD = os.getenv("DB_PASSWORD")
DSN = os.getenv("DB_DSN")

def get_oracle_connection():
    """Établit une connexion propre avec la base Oracle de gestion."""
    
    # Vérification de sécurité pour éviter de tenter une connexion vide
    if not USER or not PASSWORD or not DSN:
        print("❌ ERREUR : Les variables DB_USER, DB_PASSWORD ou DB_DSN sont absentes du fichier .env")
        return None

    try:
        # Connexion standard (mode thin par défaut avec oracledb 2.x+)
        connection = oracledb.connect(
            user=USER,
            password=PASSWORD,
            dsn=DSN
        )
        # print("✅ Connexion au référentiel établie.") # Optionnel : à décommenter pour debug
        return connection
        
    except oracledb.Error as e:
        print("❌ Échec de la connexion au référentiel Oracle.")
        error, = e.args
        print(f"Code erreur : {error.code} | Message : {error.message}")
        return None

# --- TEST DE CONNEXION ---
# Permet de tester ce fichier seul en tapant : python oracle_db.py
if __name__ == "__main__":
    print(f"--- Test de connexion ---")
    print(f"Utilisateur : {USER}")
    print(f"DSN : {DSN}")
    
    conn = get_oracle_connection()
    if conn:
        print("✅ Test réussi ! La connexion est fonctionnelle.")
        conn.close()
        print("🔌 Connexion fermée proprement.")
    else:
        print("❌ Test échoué. Vérifie ton fichier .env et l'état de ta base de données.")