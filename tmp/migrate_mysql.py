import sys
import os
sys.path.append('backend')
from oracle_db import get_oracle_connection

def migrate():
    try:
        conn = get_oracle_connection()
        if not conn:
            print("Erreur: Impossible de se connecter à Oracle.")
            return
        cur = conn.cursor()
        
        # 1. Vérifier si le type MySQL existe déjà
        cur.execute("SELECT ID_TYPE_BASE FROM TYPE_BASE_CIBLE WHERE UPPER(NOM_TYPE) = 'MYSQL'")
        row = cur.fetchone()
        
        if not row:
            print("Ajout du type MySQL dans TYPE_BASE_CIBLE...")
            cur.execute("INSERT INTO TYPE_BASE_CIBLE (NOM_TYPE, EDITEUR) VALUES ('MySQL', 'Oracle/MySQL')")
            conn.commit()
            cur.execute("SELECT ID_TYPE_BASE FROM TYPE_BASE_CIBLE WHERE UPPER(NOM_TYPE) = 'MYSQL'")
            row = cur.fetchone()
        
        id_mysql = row[0]
        print(f"ID Type MySQL: {id_mysql}")
        
        # 2. Mettre à jour la base MySQL (on suppose ID=21 d'après ma recherche précédente)
        cur.execute("UPDATE BASE_CIBLE SET ID_TYPE_BASE = :id WHERE ID_BASE = 21", id=id_mysql)
        conn.commit()
        print("Mise à jour de la base cible ID=21 réussie !")
        
        # 3. Vérifier le résultat
        cur.execute("SELECT b.ID_BASE, b.NOM_INSTANCE, t.NOM_TYPE FROM BASE_CIBLE b JOIN TYPE_BASE_CIBLE t ON b.ID_TYPE_BASE = t.ID_TYPE_BASE")
        print("État actuel des bases:", cur.fetchall())
        
        conn.close()
    except Exception as e:
        print(f"Erreur lors de la migration: {e}")

if __name__ == "__main__":
    migrate()
