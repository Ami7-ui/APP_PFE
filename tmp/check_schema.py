import oracledb
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Charger l'environnement
backend_dir = Path(__file__).resolve().parent
env_path = backend_dir / '.env'
load_dotenv(dotenv_path=env_path)

def check_schema():
    USER = os.getenv("DB_USER")
    PASSWORD = os.getenv("DB_PASSWORD")
    DSN = os.getenv("DB_DSN")

    if not USER or not PASSWORD or not DSN:
        print("Variables d environnement manquantes.")
        return

    try:
        conn = oracledb.connect(user=USER, password=PASSWORD, dsn=DSN)
        cursor = conn.cursor()
        print(f"--- Vérification de la table historiques_audits ---")
        
        # Récupérer les colonnes de la table
        cursor.execute("SELECT column_name, data_type FROM user_tab_columns WHERE table_name = 'HISTORIQUES_AUDITS'")
        columns = cursor.fetchall()
        
        if not columns:
            # Essayer en minuscule au cas où
            cursor.execute("SELECT column_name, data_type FROM user_tab_columns WHERE table_name = 'historiques_audits'")
            columns = cursor.fetchall()

        if columns:
            print("Colonnes trouvées :")
            for col in columns:
                print(f" - {col[0]} ({col[1]})")
        else:
            print("Table 'HISTORIQUES_AUDITS' introuvable.")
            
        conn.close()
    except Exception as e:
        print(f"Erreur : {e}")

if __name__ == "__main__":
    check_schema()
