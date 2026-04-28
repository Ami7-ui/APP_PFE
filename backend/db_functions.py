# backend/db_functions.py
import oracledb # type: ignore
try:
    import mysql.connector
except ImportError:
    mysql = None
import re
import pandas as pd # type: ignore
import requests # type: ignore
import datetime
import os
import io
from fpdf import FPDF
from oracle_db import get_oracle_connection # type: ignore

# ==========================================
# 1. GESTION DES UTILISATEURS & LOGIN
# ==========================================

def verifier_login(identifiant, mot_de_passe):
    conn = get_oracle_connection()
    if not conn: return None
    try:
        cursor = conn.cursor()
        sql = """
            SELECT u.nom_complet, r.nom_role 
            FROM UTILISATEUR u
            JOIN APP_ROLE r ON u.id_role = r.id_role
            WHERE (u.email = :identifiant OR u.nom_complet = :identifiant) 
            AND u.mot_de_passe = :pwd
        """
        cursor.execute(sql, identifiant=identifiant, pwd=mot_de_passe)
        res = cursor.fetchone()
        return {"nom_complet": res[0], "role": res[1]} if res else None
    finally:
        if 'cursor' in locals(): cursor.close()

def get_roles():
    conn = get_oracle_connection()
    if not conn: return []
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id_role, nom_role FROM APP_ROLE")
        return [{"id": r[0], "nom": r[1]} for r in cursor.fetchall()]
    finally:
        if 'cursor' in locals(): cursor.close()

def get_all_utilisateurs():
    conn = get_oracle_connection()
    if not conn: return []
    try:
        cursor = conn.cursor()
        sql = """
            SELECT u.ID_USER, u.NOM_COMPLET, u.EMAIL, r.nom_role, u.ID_ROLE
            FROM UTILISATEUR u JOIN APP_ROLE r ON u.ID_ROLE = r.ID_ROLE
            ORDER BY u.NOM_COMPLET
        """
        cursor.execute(sql)
        return [{"ID": r[0], "Nom": r[1], "Email": r[2], "Rôle": r[3], "id_role": r[4]} for r in cursor.fetchall()]
    finally:
        if 'cursor' in locals(): cursor.close()

def ajouter_utilisateur(nom, email, mdp, id_role):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO UTILISATEUR (nom_complet, email, mot_de_passe, id_role) VALUES (:n, :e, :m, :r)",
                       n=nom, e=email, m=mdp, r=id_role)
        conn.commit()
        return True, "Utilisateur créé !"
    except Exception as e: return False, str(e)

def modifier_utilisateur(id_user, nom, email, id_role, mdp=None):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        if mdp:
            sql = "UPDATE UTILISATEUR SET nom_complet=:n, email=:e, id_role=:r, mot_de_passe=:m WHERE id_utilisateur=:id"
            cursor.execute(sql, n=nom, e=email, r=id_role, m=mdp, id=id_user)
        else:
            sql = "UPDATE UTILISATEUR SET nom_complet=:n, email=:e, id_role=:r WHERE id_utilisateur=:id"
            cursor.execute(sql, n=nom, e=email, r=id_role, id=id_user)
        conn.commit()
        return True, "Mis à jour avec succès"
    except Exception as e: return False, str(e)

def supprimer_utilisateur(id_user):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM UTILISATEUR WHERE id_utilisateur = :id", id=id_user)
        conn.commit()
        return True, "Supprimé"
    except Exception as e: return False, str(e)

# ==========================================
# 2. GESTION DES BASES CIBLES & TYPES
# ==========================================

def get_types_bd():
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT ID_TYPE_BASE, NOM_TYPE, EDITEUR FROM TYPE_BASE_CIBLE")
        return [{"id": t[0], "nom": f"{t[1]} ({t[2]})", "nom_type": t[1], "editeur": t[2]} for t in cursor.fetchall()]
    finally:
        if 'cursor' in locals(): cursor.close()

def ajouter_type_bd(nom_type, editeur):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO TYPE_BASE_CIBLE (NOM_TYPE, EDITEUR) VALUES (:nom, :editeur)", nom=nom_type, editeur=editeur)
        conn.commit()
        return True, f"Type '{nom_type}' ajouté avec succès !"
    except Exception as e: return False, str(e)
    finally:
        if 'cursor' in locals(): cursor.close()

def ajouter_base_cible(nom, ip, port, user, mdp, type_sgbd):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT ID_TYPE_BASE FROM TYPE_BASE_CIBLE WHERE UPPER(NOM_TYPE) = UPPER(:t)", t=type_sgbd)
        row = cursor.fetchone()
        id_type = row[0] if row else 1

        sql = "INSERT INTO BASE_CIBLE (NOM_INSTANCE, ADRESSE_IP, PORT, UTILISATEUR_CIBLE, MOT_DE_PASSE_CIBLE, ID_TYPE_BASE) VALUES (:n, :ip, :p, :u, :m, :t)"
        cursor.execute(sql, n=nom, ip=ip, p=port, u=user, m=mdp, t=id_type)
        conn.commit()
        return True, "Base ajoutée"
    except Exception as e: return False, str(e)
    finally:
        if 'cursor' in locals(): cursor.close()

def get_bases_cibles():
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        sql = "SELECT b.ID_BASE, b.NOM_INSTANCE, b.ADRESSE_IP, b.PORT, t.NOM_TYPE, b.ID_TYPE_BASE FROM BASE_CIBLE b JOIN TYPE_BASE_CIBLE t ON b.ID_TYPE_BASE = t.ID_TYPE_BASE"
        cursor.execute(sql)
        return [{"ID": b[0], "Instance": b[1], "IP": b[2], "Port": b[3], "Type": b[4], "id_type_base": b[5]} for b in cursor.fetchall()]
    finally:
        if 'cursor' in locals(): cursor.close()

def modifier_base_cible(id_base, nom, ip, port, user, type_sgbd=None, mdp=None):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        id_type = None
        if type_sgbd:
            cursor.execute("SELECT ID_TYPE_BASE FROM TYPE_BASE_CIBLE WHERE UPPER(NOM_TYPE) = UPPER(:t)", t=type_sgbd)
            row = cursor.fetchone()
            if row: id_type = row[0]

        if mdp:
            if id_type:
                sql = "UPDATE BASE_CIBLE SET NOM_INSTANCE=:n, ADRESSE_IP=:ip, PORT=:p, UTILISATEUR_CIBLE=:u, MOT_DE_PASSE_CIBLE=:m, ID_TYPE_BASE=:t WHERE ID_BASE=:id"
                cursor.execute(sql, n=nom, ip=ip, p=port, u=user, m=mdp, t=id_type, id=id_base)
            else:
                sql = "UPDATE BASE_CIBLE SET NOM_INSTANCE=:n, ADRESSE_IP=:ip, PORT=:p, UTILISATEUR_CIBLE=:u, MOT_DE_PASSE_CIBLE=:m WHERE ID_BASE=:id"
                cursor.execute(sql, n=nom, ip=ip, p=port, u=user, m=mdp, id=id_base)
        else:
            if id_type:
                sql = "UPDATE BASE_CIBLE SET NOM_INSTANCE=:n, ADRESSE_IP=:ip, PORT=:p, UTILISATEUR_CIBLE=:u, ID_TYPE_BASE=:t WHERE ID_BASE=:id"
                cursor.execute(sql, n=nom, ip=ip, p=port, u=user, t=id_type, id=id_base)
            else:
                sql = "UPDATE BASE_CIBLE SET NOM_INSTANCE=:n, ADRESSE_IP=:ip, PORT=:p, UTILISATEUR_CIBLE=:u WHERE ID_BASE=:id"
                cursor.execute(sql, n=nom, ip=ip, p=port, u=user, id=id_base)
        
        conn.commit()
        return True, "Base modifiée"
    except Exception as e: return False, str(e)
    finally:
        if 'cursor' in locals(): cursor.close()

def supprimer_base_cible(id_base):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM BASE_CIBLE WHERE ID_BASE = :id", id=id_base)
        conn.commit()
        return True, "Base supprimée"
    except Exception as e: return False, str(e)

# ==========================================
# 3. MÉTRIQUES & PERFORMANCE (V$ VIEWS)
# ==========================================

def get_db_connection(id_base):
    conn_ref = get_oracle_connection()
    try:
        cursor = conn_ref.cursor()
        sql = """
            SELECT b.UTILISATEUR_CIBLE, b.MOT_DE_PASSE_CIBLE, b.ADRESSE_IP, b.PORT, b.NOM_INSTANCE, t.NOM_TYPE 
            FROM BASE_CIBLE b
            JOIN TYPE_BASE_CIBLE t ON b.ID_TYPE_BASE = t.ID_TYPE_BASE
            WHERE b.ID_BASE = :id
        """
        cursor.execute(sql, id=id_base)
        row = cursor.fetchone()
        
        if not row:
            return None, None, "Base cible introuvable dans le référentiel."
            
        user, mdp, ip, port, instance, type_sgbd = row
        type_upper = type_sgbd.upper()
        
        if 'ORACLE' in type_upper:
            dsn = f"{ip}:{port}/{instance}"
            conn_cible = oracledb.connect(user=user, password=mdp, dsn=dsn)
            return conn_cible, "ORACLE", None
        elif 'MYSQL' in type_upper:
            if not mysql:
                return None, None, "Le module 'mysql-connector-python' n'est pas installé sur le serveur."
            conn_cible = mysql.connector.connect(host=ip, port=port, user=user, password=mdp, database="mysql")
            return conn_cible, "MYSQL", None
        else:
            return None, None, f"Type de SGBD non supporté : {type_sgbd}"
    except Exception as e:
        return None, None, f"Erreur de connexion : {str(e)}"
    finally:
        if 'cursor' in locals(): cursor.close()

def get_target_credentials(id_base):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT UTILISATEUR_CIBLE, MOT_DE_PASSE_CIBLE, ADRESSE_IP, PORT, NOM_INSTANCE FROM BASE_CIBLE WHERE ID_BASE = :id", id=id_base)
        return cursor.fetchone()
    finally:
        if 'cursor' in locals(): cursor.close()

def get_statistiques_sessions(id_base):
    return {"ACTIVE": 0, "INACTIVE": 0, "BLOCKED": 0, "TOTAL_TRANSACTIONS": 0}

def executer_audit_basique(id_base):
    return True, "L'audit de base codé en dur a été retiré. Utilisez l'Audit Granulaire.", {
        "version": [], "session": [], "sql": [],
        "cpu": {}, "ram": {}
    }

def get_cpu_stats(id_base):
    return {"busy_pct": 0, "idle_pct": 100, "history": []}

def get_ram_stats(id_base):
    return {"sga_total_mb": 0, "pga_total_mb": 0, "used_mb": 0, "max_mb": 1, "ram_pct": 0, "sga_detail": [], "pga_detail": []}

def get_instance_status(id_base):
    conn, db_type, err = get_db_connection(id_base)
    if err or not conn: return {"status": "DOWN", "uptime_str": "Inaccessible", "startup_time": None}
    try:
        cursor = conn.cursor()
        if db_type == "ORACLE":
            try:
                cursor.execute("SELECT STARTUP_TIME FROM V$INSTANCE")
                row = cursor.fetchone()
                if row and row[0]:
                    startup_time = row[0]
                    delta = datetime.datetime.now() - startup_time
                    uptime_str = f"{delta.days}j {delta.seconds//3600}h {(delta.seconds%3600)//60}min"
                    conn.close()
                    return {"status": "UP", "uptime_str": uptime_str, "startup_time": startup_time.isoformat()}
            except Exception as e:
                # Si erreur de droits (ORA-00942), la base est quand même en ligne vu qu'on s'y est connecté !
                conn.close()
                return {"status": "UP", "uptime_str": "Droits V$ limités", "startup_time": None}
        else: # MYSQL
            uptime_sec = 0
            try:
                cursor.execute("SHOW GLOBAL STATUS LIKE 'Uptime'")
                res = cursor.fetchone()
                uptime_sec = int(res[1]) if res else 0
            except:
                try:
                    cursor.execute("SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME='UPTIME'")
                    res = cursor.fetchone()
                    uptime_sec = int(res[0]) if res else 0
                except: pass
            
            if uptime_sec > 0:
                delta = datetime.timedelta(seconds=uptime_sec)
                uptime_str = f"{delta.days}j {delta.seconds//3600}h {(delta.seconds%3600)//60}min"
                startup_time = (datetime.datetime.now() - delta).isoformat()
                conn.close()
                return {"status": "UP", "uptime_str": uptime_str, "startup_time": startup_time}
        conn.close()
        return {"status": "UP", "uptime_str": "Inconnue", "startup_time": None}
    except:
        if conn: conn.close()
        return {"status": "DOWN", "uptime_str": "Inaccessible", "startup_time": None}

def get_nodes_status(id_base):
    conn, db_type, err = get_db_connection(id_base)
    if err or not conn: return []
    try:
        cursor = conn.cursor()
        if db_type == "ORACLE":
            sql = "SELECT INSTANCE_NUMBER, INSTANCE_NAME, HOST_NAME, STATUS, DATABASE_STATUS FROM GV$INSTANCE"
            df = pd.read_sql(sql, con=conn)
        else: # MYSQL
            sql = "SELECT @@hostname AS HOST_NAME, @@port AS INSTANCE_PORT, @@version AS VERSION, IF(@@read_only = 0, 'READ WRITE', 'READ ONLY') AS OPEN_MODE, 'ACTIVE' AS STATUS"
            df = pd.read_sql(sql, con=conn)
        conn.close()
        return df.to_dict(orient='records')
    except Exception as e:
        if conn: conn.close()
        return []

# ==========================================
# 4. SCRIPTS SQL & AUDIT
# ==========================================

def get_types_metriques():
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT ID_TYPE_METRIQUE, NOM_TYPE_METRIQUE, DESCRIPTION FROM TYPE_METRIQUE")
        return [{"id": r[0], "nom": r[1], "description": r[2]} for r in cursor.fetchall()]
    finally:
        if 'cursor' in locals(): cursor.close()

def get_metriques_disponibles(id_type_base):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT ID_METRIQUE, NOM_METRIQUE, SCRIPT_SQL FROM METRIQUE WHERE ID_TYPE_BASE = :type_id", type_id=id_type_base)
        res = []
        for row in cursor.fetchall():
            script = row[2].read() if hasattr(row[2], 'read') else str(row[2])
            res.append({"ID": row[0], "Nom_Scripte": row[1], "Contenu_Script": script})
        return res
    finally:
        if 'cursor' in locals(): cursor.close()

def get_all_metriques():
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        sql = """
            SELECT m.ID_METRIQUE, m.NOM_METRIQUE, m.SCRIPT_SQL, t.NOM_TYPE, m.ID_TYPE_BASE, 
                   tm.NOM_TYPE_METRIQUE, m.ID_TYPE_METRIQUE
            FROM METRIQUE m 
            LEFT JOIN TYPE_BASE_CIBLE t ON m.ID_TYPE_BASE = t.ID_TYPE_BASE
            LEFT JOIN TYPE_METRIQUE tm ON m.ID_TYPE_METRIQUE = tm.ID_TYPE_METRIQUE
        """
        cursor.execute(sql)
        res = []
        for r in cursor.fetchall():
            script = r[2].read() if hasattr(r[2], 'read') else str(r[2])
            res.append({
                "ID": r[0], "Nom_Scripte": r[1], "Contenu_Script": script, 
                "Type_Scripte": r[3] if r[3] else "Inconnu", "id_type_base": r[4],
                "Categorie": r[5] if r[5] else "Sans catégorie", "id_type_metrique": r[6]
            })
        return res
    finally:
        if 'cursor' in locals(): cursor.close()

def get_scripts_categorizes():
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        sql = """
            SELECT m.ID_METRIQUE, m.NOM_METRIQUE, m.SCRIPT_SQL, tm.NOM_TYPE_METRIQUE 
            FROM METRIQUE m 
            LEFT JOIN TYPE_METRIQUE tm ON m.ID_TYPE_METRIQUE = tm.ID_TYPE_METRIQUE
        """
        cursor.execute(sql)
        res = {}
        for r in cursor.fetchall():
            cat = r[3] if r[3] else "Autres"
            if cat not in res:
                res[cat] = []
            script = r[2].read() if hasattr(r[2], 'read') else str(r[2])
            res[cat].append({
                "id": r[0],
                "nom": r[1],
                "code": script
            })
        return res
    except Exception as e:
        print(f"Erreur get_scripts_categorizes : {e}")
        return {}
    finally:
        if 'cursor' in locals(): cursor.close()

def ajouter_metrique(nom, script_sql, id_type_base, id_type_metrique=2):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        mid = id_type_metrique if id_type_metrique else 2
        sql = "INSERT INTO METRIQUE (NOM_METRIQUE, SCRIPT_SQL, ID_TYPE_BASE, ID_TYPE_METRIQUE) VALUES (:nom, :script, :base, :met)"
        cursor.execute(sql, nom=nom, script=script_sql, base=id_type_base, met=mid)
        conn.commit()
        return True, "Script ajouté avec succès"
    except Exception as e: 
        print(f"Erreur ajouter_metrique: {e}")
        return False, str(e)
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

def modifier_metrique(id_metrique, nom, script_sql, id_type_base, id_type_metrique=2):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        mid = id_type_metrique if id_type_metrique else 2
        sql = "UPDATE METRIQUE SET NOM_METRIQUE=:nom, SCRIPT_SQL=:script, ID_TYPE_BASE=:base, ID_TYPE_METRIQUE=:met WHERE ID_METRIQUE=:id"
        cursor.execute(sql, nom=nom, script=script_sql, base=id_type_base, met=mid, id=id_metrique)
        if cursor.rowcount == 0:
            return False, f"Aucun script trouvé avec l'ID {id_metrique}"
        conn.commit()
        return True, "Script mis à jour avec succès"
    except Exception as e: 
        print(f"Erreur modifier_metrique: {e}")
        return False, str(e)
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

def supprimer_metrique(id_metrique):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM METRIQUE WHERE ID_METRIQUE = :id", id=id_metrique)
        if cursor.rowcount == 0:
            return False, f"Aucun script trouvé avec l'ID {id_metrique}"
        conn.commit()
        return True, "Script supprimé avec succès"
    except Exception as e: 
        err_msg = str(e)
        if "ORA-02292" in err_msg:
            friendly_msg = "Impossible de supprimer ce script : il est actuellement utilisé par un audit ou une autre ressource."
        else:
            friendly_msg = f"Erreur lors de la suppression : {err_msg}"
        print(f"DEBUG: {friendly_msg}")
        return False, friendly_msg
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

def executer_script_sur_cible(id_base, script_sql):
    conn_cible, type_db, erreur = get_db_connection(id_base)
    if erreur: return None, erreur
    try:
        df = pd.read_sql(script_sql, con=conn_cible)
        conn_cible.close()
        return df.to_dict(orient='records'), None
    except Exception as e: return None, str(e)

def executer_audit_granulaire(id_base, scripts_list):
    conn_cible, type_db, erreur = get_db_connection(id_base)
    if erreur: return False, erreur, None
    results = {}
    try:
        # Prevent "Unable to evaluate dynamically wrapped function" errors in some pandas versions
        # by manually configuring how long we might wait, but read_sql primarily relies on engine
        import pandas as pd
        for s in scripts_list:
            nom_script = s.get("nom", "Script Inconnu")
            code_sql = s.get("code", "")
            if not code_sql:
                continue
            try:
                df = pd.read_sql(code_sql, con=conn_cible)
                results[nom_script] = df.to_dict(orient='records')
            except Exception as e:
                # Keep going if a script fails
                results[nom_script] = [{"Erreur": str(e)}]
        return True, "Audit granulaire terminé avec succès.", results
    except Exception as e:
        return False, str(e), None
    finally:
        if conn_cible:
            conn_cible.close()

def verifier_index_tables(id_base, sql_script):
    creds = get_target_credentials(id_base)
    if not creds: return {"error": "Inaccessible"}
    u, p, ip, port, ins = creds
    pattern = re.compile(r'(?:FROM|JOIN)\s+([a-zA-Z0-9_\$]+)', re.IGNORECASE)
    tables = list(set([m.upper() for m in pattern.findall(sql_script)]))
    results = {}
    try:
        conn = oracledb.connect(user=u, password=p, dsn=f"{ip}:{port}/{ins}")
        cursor = conn.cursor()
        for t in tables:
            cursor.execute("SELECT INDEX_NAME FROM ALL_INDEXES WHERE TABLE_NAME = :tbl", tbl=t)
            idxs = [r[0] for r in cursor.fetchall()]
            results[t] = {"is_indexed": len(idxs) > 0, "indexes": idxs}
        conn.close()
        return results
    except Exception as e: return {"error": str(e)}

import pandas as pd    
# ==========================================
# 5. ANALYSE DES PLANS D'EXÉCUTION (PHV)
# ==========================================

def get_sql_phv_list(id_base):
    conn, db_type, err = get_db_connection(id_base)
    if err or not conn:
        return None, err or "Inaccessible"
    if db_type != "ORACLE":
        return None, "L'analyse des PHV multiples est réservée à Oracle."

    sql = """
        SELECT 
    s.sql_id,
    DBMS_LOB.SUBSTR(
        (SELECT sql_fulltext 
         FROM v$sql s2 
         WHERE s2.sql_id = s.sql_id 
           AND ROWNUM = 1),
        1000, 1
    ) AS script_sql,
    COUNT(DISTINCT s.plan_hash_value) AS phv_count,
    LISTAGG(DISTINCT s.plan_hash_value, ', ')
        WITHIN GROUP (ORDER BY s.plan_hash_value) AS phv_list
FROM v$sql s
WHERE s.sql_id IS NOT NULL
  AND s.plan_hash_value <> 0
GROUP BY s.sql_id
HAVING COUNT(DISTINCT s.plan_hash_value) > 1
ORDER BY phv_count DESC, s.sql_id
    """
    try:
        import pandas as pd
        df = pd.read_sql(sql, con=conn)
        conn.close()
        return df.to_dict(orient='records'), None
    except Exception as e:
        if conn: conn.close()
        return None, str(e)

def get_sql_phvs_for_id(id_base, sql_id):
    conn, db_type, err = get_db_connection(id_base)
    if err or not conn:
        return None, err or "Inaccessible"
    if db_type != "ORACLE":
        return [], None
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT plan_hash_value FROM v$sql_plan WHERE sql_id = :1 AND plan_hash_value <> 0", (sql_id,))
        phvs = [str(r[0]) for r in cursor.fetchall() if r[0]]
        if not phvs:
            try:
                cursor.execute("SELECT DISTINCT plan_hash_value FROM dba_hist_sql_plan WHERE sql_id = :1 AND plan_hash_value <> 0", (sql_id,))
                phvs = [str(r[0]) for r in cursor.fetchall() if r[0]]
            except Exception:
                pass
        conn.close()
        return phvs, None
    except Exception as e:
        if conn: conn.close()
        return None, str(e)

def get_sql_plan_details(id_base, sql_id, phv):
    conn, db_type, err = get_db_connection(id_base)
    if err or not conn:
        return None, err or "Inaccessible"
    if db_type != "ORACLE":
        return None, "Oracle uniquement."

    sql = """
        SELECT 
            id, parent_id, operation, options, object_owner, 
            object_name, object_type, optimizer, cost, cardinality, 
            bytes, cpu_cost, io_cost, access_predicates, 
            filter_predicates, projection, time
        FROM 
            v$sql_plan 
        WHERE 
            sql_id = :sql_id 
            AND plan_hash_value = :phv
            AND child_number = (
                SELECT MIN(child_number) 
                FROM v$sql_plan 
                WHERE sql_id = :sql_id AND plan_hash_value = :phv
            )
        ORDER BY id
    """
    try:
        cursor = conn.cursor()
        cursor.execute(sql, sql_id=sql_id, phv=phv)
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()
        
        if not rows:
            sql_awr = """
                SELECT 
                    id, parent_id, operation, options, object_owner, 
                    object_name, object_type, optimizer, cost, cardinality, 
                    bytes, cpu_cost, io_cost, access_predicates, 
                    filter_predicates, projection, time
                FROM 
                    dba_hist_sql_plan 
                WHERE 
                    sql_id = :sql_id 
                    AND plan_hash_value = :phv
                ORDER BY id
            """
            try:
                cursor.execute(sql_awr, sql_id=sql_id, phv=phv)
                rows = cursor.fetchall()
            except Exception:
                pass
                
        # Convert to dict
        result = [dict(zip(columns, row)) for row in rows]
        
        conn.close()
        return result, None
    except Exception as e:
        if conn: conn.close()
        return None, str(e)

# ==========================================
# 7. HISTORIQUE DES RAPPORTS PDF
# ==========================================

def get_reports_history(nom_base_cible):
    """
    Récupère la liste des métadonnées des rapports PDF pour une base cible donnée.
    Renvoie uniquement id_audit, date_generation et nom_base_cible.
    """
    conn = get_oracle_connection()
    if not conn: return []
    try:
        cursor = conn.cursor()
        sql = """
            SELECT id_audit, date_generation, nom_base_cible 
            FROM historiques_audits 
            WHERE UPPER(nom_base_cible) = UPPER(:1)
            ORDER BY date_generation DESC
        """
        cursor.execute(sql, (nom_base_cible,))
        reports = []
        for r in cursor.fetchall():
            try:
                date_val = r[1]
                date_str = date_val.isoformat() if hasattr(date_val, 'isoformat') else str(date_val)
            except Exception:
                date_str = "Date inconnue"
            reports.append({
                "id": r[0],
                "date": date_str,
                "base": r[2]
            })
        return reports
    except Exception as e:
        print(f"[DEBUG] Erreur historique rapports : {e}")
        return []
    finally:
        if 'conn' in locals() and conn: conn.close()

# ==========================================
# 8. GÉNÉRATION DE RAPPORTS PDF (BLOB)
# ==========================================

class AuditPDF(FPDF):
    def header(self):
        # En-tête stylisé — NOTE : ne pas appeler add_page() ici
        self.set_fill_color(15, 23, 42)
        self.rect(0, 0, 210, 40, 'F')
        self.set_font('helvetica', 'B', 24)
        self.set_text_color(56, 189, 248)
        self.cell(0, 20, 'ORACLEGUARD - RAPPORT D\'AUDIT', 0, 1, 'C')
        self.set_font('helvetica', 'I', 10)
        self.set_text_color(148, 163, 184)
        self.cell(0, 5, f'Généré le {datetime.datetime.now().strftime("%d/%m/%Y à %H:%M")}', 0, 1, 'C')
        # ln fixe à 10 : assez pour marquer la fin du header sans pousser une page supplémentaire
        self.set_y(45)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}} - OracleGuard Intelligent Monitoring', 0, 0, 'C')

    def chapter_title(self, title):
        self.set_font('helvetica', 'B', 16)
        self.set_text_color(30, 41, 59)
        self.set_fill_color(241, 245, 249)
        self.cell(0, 10, f"  {title}", 0, 1, 'L', True)
        self.ln(5)

    def format_data_recursive(self, data, indent=0):
        """
        Formate proprement un dictionnaire ou une liste en arborescence textuelle
        sans accolades, crochets ou guillemets.
        """
        result = ""
        prefix = "  " * indent
        
        if isinstance(data, dict):
            for k, v in data.items():
                if isinstance(v, (dict, list)):
                    result += f"{prefix}{k} :\n"
                    result += self.format_data_recursive(v, indent + 1)
                else:
                    result += f"{prefix}{k} : {v}\n"
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, (dict, list)):
                    result += f"{prefix}- \n"
                    result += self.format_data_recursive(item, indent + 1)
                else:
                    result += f"{prefix}- {item}\n"
        else:
            result += f"{prefix}{data}\n"
        return result

    def chapter_body(self, body):
        # 1. Nettoyage des emojis
        body = body.encode('latin-1', 'ignore').decode('latin-1')
        
        # 2. Parsing des blocs SQL
        parts = re.split(r'```(?:sql)?\s*([\s\S]*?)```', body)
        
        for i, part in enumerate(parts):
            if i % 2 == 1:
                # BLOC SQL
                self.set_font('Courier', '', 10)
                self.set_text_color(220, 38, 38)
                self.set_fill_color(248, 250, 252)
                self.multi_cell(0, 6, part.strip(), border=1, fill=True)
                self.ln(2)
            else:
                # TEXTE NORMAL & MARKDOWN
                lines = part.split('\n')
                for line in lines:
                    if not line.strip():
                        self.ln(2)
                        continue
                        
                    # 1. TITRES (###)
                    if line.strip().startswith('###'):
                        self.set_font('helvetica', 'B', 14)
                        self.set_text_color(30, 41, 59)
                        self.multi_cell(0, 10, line.replace('###', '').strip())
                        self.ln(1)
                        continue
                    
                    # 2. LISTES (* ou -)
                    is_list = False
                    if line.strip().startswith(('*', '-')):
                        is_list = True
                        self.set_x(self.get_x() + 5)
                        line = " " + line.strip()
                    
                    # 3. GRAS (**text**) INTERNE
                    self.set_font('helvetica', '', 11)
                    self.set_text_color(51, 65, 85)
                    
                    # On utilise write() pour gérer les changements de styles sur une ligne
                    fragments = re.split(r'(\*\*.*?\*\*)', line)
                    for frag in fragments:
                        if frag.startswith('**') and frag.endswith('**'):
                            self.set_font('helvetica', 'B', 11)
                            clean_frag = frag.replace('**', '')
                            self.write(7, clean_frag)
                        else:
                            self.set_font('helvetica', '', 11)
                            self.write(7, frag)
                    
                    self.ln(7) # Retour à la ligne après chaque ligne de texte
        self.ln(2)

def executer_audit_complet(id_base):
    """
    Simule l'ancien audit pour ne pas casser l'API, mais renvoie des données vides car les scripts sont gérés dynamiquement dorénavant.
    """
    return True, "Audit statique obsolète (Utilisez l'audit granulaire)", {
        "performance": {},
        "storage": {},
        "queries": {},
        "connections": {},
        "replication": {"status": "NOT_AVAILABLE"},
        "business": {}
    }

def flatten_dict(d, parent_key='', sep='.'):
    items = []
    if isinstance(d, dict):
        if not d:
            items.append((parent_key, '{}'))
        else:
            for k, v in d.items():
                new_key = f"{parent_key}{sep}{k}" if parent_key else k
                if isinstance(v, (dict, list)):
                    items.extend(flatten_dict(v, new_key, sep=sep).items())
                else:
                    items.append((new_key, v))
    elif isinstance(d, list):
        if not d:
            items.append((parent_key, '[]'))
        else:
            for i, item in enumerate(d):
                item_key = f"{parent_key}[{i}]" if parent_key else str(i)
                if isinstance(item, (dict, list)):
                    items.extend(flatten_dict(item, item_key, sep=sep).items())
                else:
                    items.append((item_key, item))
    else:
        items.append((parent_key, d))
    return dict(items)

def draw_pdf_table(pdf, category_name, flat_data_dict):
    """Dessine un tableau clé/valeur. Ignore silencieusement si pas de données."""
    if not flat_data_dict:
        return

    # Saut de page intelligent avant le titre (évite les pages vides inter-sections)
    if pdf.get_y() > 250:
        pdf.add_page()

    pdf.set_font('helvetica', 'B', 12)
    pdf.set_fill_color(15, 23, 42)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, f" METRIQUES : {str(category_name).upper()}", border=1, ln=1, align='L', fill=True)

    # En-tête de tableau
    pdf.set_font('helvetica', 'B', 10)
    pdf.set_fill_color(14, 165, 233)
    pdf.set_text_color(255, 255, 255)

    col_width1 = 80
    col_width2 = pdf.w - pdf.l_margin - pdf.r_margin - col_width1

    pdf.cell(col_width1, 8, "Paramètre", border=1, align='C', fill=True)
    pdf.cell(col_width2, 8, "Valeur", border=1, ln=1, align='C', fill=True)

    pdf.set_font('helvetica', '', 9)
    pdf.set_text_color(30, 41, 59)

    for key, value in flat_data_dict.items():
        val_str = str(value).replace('\n', ' ')

        start_x = pdf.get_x()
        start_y = pdf.get_y()

        # Saut de page si on arrive en bas (un seul saut par ligne)
        if start_y > 265:
            pdf.add_page()
            # Redessiner l'en-tête de colonne sur la nouvelle page
            pdf.set_font('helvetica', 'B', 10)
            pdf.set_fill_color(14, 165, 233)
            pdf.set_text_color(255, 255, 255)
            pdf.cell(col_width1, 8, "Paramètre", border=1, align='C', fill=True)
            pdf.cell(col_width2, 8, "Valeur", border=1, ln=1, align='C', fill=True)
            pdf.set_font('helvetica', '', 9)
            pdf.set_text_color(30, 41, 59)
            start_x = pdf.get_x()
            start_y = pdf.get_y()

        # Draw Key
        pdf.set_xy(start_x, start_y)
        pdf.multi_cell(col_width1, 6, str(key), border=0, align='L')
        end_y1 = pdf.get_y()

        # Draw Value
        pdf.set_xy(start_x + col_width1, start_y)
        pdf.multi_cell(col_width2, 6, val_str, border=0, align='L')
        end_y2 = pdf.get_y()

        max_y = max(end_y1, end_y2)
        row_height = max_y - start_y

        pdf.rect(start_x, start_y, col_width1, row_height)
        pdf.rect(start_x + col_width1, start_y, col_width2, row_height)

        pdf.set_y(max_y)

    pdf.ln(5)
 
def draw_pdf_data_table(pdf, script_name, rows):
    """
    Dessine un tableau pour les résultats d'un script (liste de dictionnaires).
    Avec gestion dynamique des largeurs et hauteurs pour éviter le chevauchement.
    Priorise la colonne SQL_TEXT pour lui donner un maximum d'espace (60%).
    Retourne immédiatement (sans rien écrire) si rows est vide.
    """
    # --- Garde-fou : on ne dessine RIEN si pas de données exploitables ---
    if not rows or not isinstance(rows, list) or len(rows) == 0:
        return
    # Ignorer les lignes qui ne contiennent qu'une clé "Erreur"
    if all(len(r) == 1 and 'Erreur' in r for r in rows if isinstance(r, dict)):
        return

    # Saut de page intelligent avant le titre de section
    if pdf.get_y() > 250:
        pdf.add_page()

    pdf.set_font('helvetica', 'B', 12)
    pdf.set_fill_color(15, 23, 42)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, f" RESULTATS SCRIPT : {str(script_name).upper()}", border=1, ln=1, align='L', fill=True)

    # En-tête de tableau (colonnes)
    headers = list(rows[0].keys())
    # On limite à 5 colonnes pour la lisibilité
    headers = headers[:5]
    
    total_width = pdf.w - pdf.l_margin - pdf.r_margin
    col_widths = []
    
    # 1. Redistribution dynamique des largeurs
    long_col_idx = -1
    # On cherche d'abord spécifiquement une colonne contenant "SQL_TEXT"
    for i, h in enumerate(headers):
        h_upper = str(h).upper()
        if "SQL_TEXT" in h_upper or "SQL_FULLTEXT" in h_upper:
            long_col_idx = i
            break
            
    # Fallback sur une colonne SQL générique ou TEXT si le terme précis n'est pas trouvé
    if long_col_idx == -1:
        for i, h in enumerate(headers):
            h_upper = str(h).upper()
            if "SQL" in h_upper or "TEXT" in h_upper:
                long_col_idx = i
                break
            
    if long_col_idx != -1 and len(headers) > 1:
        for i, h in enumerate(headers):
            if i == long_col_idx:
                col_widths.append(total_width * 0.6) # 60% pour le SQL
            else:
                col_widths.append((total_width * 0.4) / (len(headers) - 1)) # 40% pour le reste
    else:
        for i in range(len(headers)):
            col_widths.append(total_width / len(headers))
            
    pdf.set_font('helvetica', 'B', 9)
    pdf.set_fill_color(14, 165, 233)
    pdf.set_text_color(255, 255, 255)
    
    # Dessiner l'en-tête
    start_x = pdf.get_x()
    start_y = pdf.get_y()
    curr_x = start_x
    row_h_header = 8
    
    for i, h in enumerate(headers):
        pdf.set_xy(curr_x, start_y)
        pdf.rect(curr_x, start_y, col_widths[i], row_h_header, style='FD')
        pdf.multi_cell(col_widths[i], row_h_header, str(h)[:15], border=0, align='C')
        curr_x += col_widths[i]
    pdf.set_y(start_y + row_h_header)
    
    pdf.set_font('helvetica', '', 8)
    pdf.set_text_color(30, 41, 59)
    
    def get_nb_lines(w, txt):
        cw = w - 2 # Marge interne approximative
        if cw <= 0: cw = 1
        if not txt: return 1
        lines = 0
        for line in str(txt).split('\n'):
            lw = pdf.get_string_width(line)
            nl = int(lw / cw)
            if lw > 0 and (lw % cw) > 0:
                nl += 1
            lines += max(1, nl)
        return lines

    # On limite à 15 lignes
    for row in rows[:15]:
        start_x = pdf.get_x()
        start_y = pdf.get_y()
        
        # 2. Calcul de la hauteur dynamique de la ligne entière
        max_lines = 1
        for i, h in enumerate(headers):
            val = str(row.get(h, ""))
            nl = get_nb_lines(col_widths[i], val)
            if nl > max_lines:
                max_lines = nl
                
        line_height = 5
        row_h = max_lines * line_height
        
        # 3. Saut de page intelligent
        if start_y + row_h > 270:
            pdf.add_page()
            start_x = pdf.get_x()
            start_y = pdf.get_y()
            
            # Redessiner l'en-tête sur la nouvelle page
            pdf.set_font('helvetica', 'B', 9)
            pdf.set_fill_color(14, 165, 233)
            pdf.set_text_color(255, 255, 255)
            curr_x = start_x
            for i, h in enumerate(headers):
                pdf.set_xy(curr_x, start_y)
                pdf.rect(curr_x, start_y, col_widths[i], row_h_header, style='FD')
                pdf.multi_cell(col_widths[i], row_h_header, str(h)[:15], border=0, align='C')
                curr_x += col_widths[i]
            pdf.set_y(start_y + row_h_header)
            
            # Repasser à la police de données
            pdf.set_font('helvetica', '', 8)
            pdf.set_text_color(30, 41, 59)
            start_y = pdf.get_y()

        # 4. Dessin du tableau (Sauvegarde des coordonnées X/Y pour alignement)
        curr_x = start_x
        for i, h in enumerate(headers):
            val = str(row.get(h, ""))
            
            # Dessiner le rectangle extérieur de la cellule (grille propre)
            pdf.rect(curr_x, start_y, col_widths[i], row_h)
            
            # Positionner pour écrire le texte au sommet de la cellule
            pdf.set_xy(curr_x, start_y)
            
            # Écrire le texte (multi_cell gère les retours à la ligne sans chevaucher)
            pdf.multi_cell(col_widths[i], line_height, val, border=0, align='L')
            
            curr_x += col_widths[i]
            
        # Fin de la ligne : on place impérativement le curseur Y à la fin de la cellule la plus haute
        pdf.set_y(start_y + row_h)

    if len(rows) > 15:
        pdf.set_font('helvetica', 'I', 8)
        pdf.cell(0, 6, f"... (+ {len(rows) - 15} autres lignes non affichées dans le PDF)", 0, 1, 'C')
    
    pdf.ln(5)

def sanitize_for_fpdf(val):
    if isinstance(val, str):
        replacements = {
            'Œ': 'OE', 'œ': 'oe', '€': 'EUR', '’': "'",
            '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-',
            '…': '...'
        }
        for old, new in replacements.items():
            val = val.replace(old, new)
        return val.encode('latin-1', 'replace').decode('latin-1')
    elif isinstance(val, list):
        return [sanitize_for_fpdf(item) for item in val]
    elif isinstance(val, dict):
        return {sanitize_for_fpdf(k): sanitize_for_fpdf(v) for k, v in val.items()}
    return val

def save_audit_report(id_base, audit_data, ai_analysis_string):
    """
    Génère un PDF en mémoire (BytesIO) et l'insère dans la colonne BLOB 'fichier_pdf'.
    Utilise les données brutes (audit_data) et l'analyse IA (string).
    """    
    # 1. Nettoyage des données pour éviter les erreurs d'encodage latin-1 dans FPDF
    ai_analysis_pdf = sanitize_for_fpdf(ai_analysis_string)
    audit_data_pdf = sanitize_for_fpdf(audit_data)
    
    # Récupérer le nom humain de la base
    creds = get_target_credentials(id_base)
    nom_base = creds[4] if creds else f"Base_{id_base}"
    nom_base_pdf = sanitize_for_fpdf(nom_base)
    
    # Préparer la structure du PDF
    pdf = AuditPDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # Section 1 : Informations
    pdf.chapter_title("1. Général - Informations de l'Instance")
    pdf.chapter_body(f"Base de données cible : {nom_base_pdf}\nDate de génération : {datetime.datetime.now().strftime('%d/%m/%Y à %H:%M')}")
    
    # Section 2 : Métriques brutes (itération sur le JSON)
    # On affiche le titre de section SEULEMENT si au moins une catégorie a des données
    has_data = False
    for categorie, data in audit_data_pdf.items():
        if isinstance(data, list) and len(data) > 0:
            # Ignorer les listes qui ne contiennent que des entrées d'erreur
            if not all(len(r) == 1 and 'Erreur' in r for r in data if isinstance(r, dict)):
                has_data = True
                break
        elif isinstance(data, dict) and 'error' not in data and len(data) > 0:
            has_data = True
            break

    if has_data:
        pdf.chapter_title("2. Données Brutes de l'Audit")
        for categorie, data in audit_data_pdf.items():
            if isinstance(data, list):
                # Format granulaire (liste de lignes) — draw_pdf_data_table gère le cas vide
                draw_pdf_data_table(pdf, categorie, data)
            elif isinstance(data, dict) and 'error' not in data and len(data) > 0:
                # Format classique ou dictionnaire
                flat_data = flatten_dict(data)
                draw_pdf_table(pdf, categorie, flat_data)

    # Section 3 : Expertise IA — saut de page intelligent (pas systématique)
    if ai_analysis_pdf and ai_analysis_pdf.strip():
        # On ne saute de page que si on n'est pas déjà sur une page quasi-vide
        if pdf.get_y() > 60:
            pdf.add_page()
        pdf.chapter_title("3. Expertise IA Complète (LLaMA + Nvidia)")
        pdf.chapter_body(ai_analysis_pdf)

    # Génération binaire spécifique pour fpdf 1.7.2
    try:
        pdf_string = pdf.output(dest='S')
        pdf_bytes = pdf_string.encode('latin-1', 'replace') if isinstance(pdf_string, str) else pdf_string
    except Exception as e:
        # Fallback in case fpdf2 returns bytes directly
        pdf_bytes = pdf.output()

    # 4. Insertion Oracle BLOB et JSON
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        # Déclaration explicite du type BLOB et CLOB (pour le JSON) pour garantir le stockage
        cursor.setinputsizes(None, oracledb.DB_TYPE_BLOB, oracledb.DB_TYPE_CLOB)

        import json
        report_storage = {
            "audit_data": audit_data,
            "ai_analysis": ai_analysis_string
        }
        report_json_str = json.dumps(report_storage, ensure_ascii=False)
        
        try:
            # 4.1 Tentative avec le JSON
            sql_insert = "INSERT INTO historiques_audits (date_generation, nom_base_cible, fichier_pdf, donnees_json_brutes) VALUES (CURRENT_TIMESTAMP, :1, :2, :3)"
            cursor.execute(sql_insert, [nom_base, pdf_bytes, report_json_str])
        except oracledb.Error as e:
            if "ORA-00904" in str(e):
                print(f"[WARNING] Colonne 'donnees_json_brutes' manquante.")
                cursor.setinputsizes(None, oracledb.DB_TYPE_BLOB)
                sql_insert_fallback = "INSERT INTO historiques_audits (date_generation, nom_base_cible, fichier_pdf) VALUES (CURRENT_TIMESTAMP, :1, :2)"
                cursor.execute(sql_insert_fallback, [nom_base, pdf_bytes])
            else:
                raise e
        
        conn.commit()
        return True, "Rapport archivé avec succès (PDF + JSON)."
    except Exception as e:
        print(f"[ERROR] Échec insertion BLOB : {e}")
        return False, f"Erreur lors de l'archivage BLOB : {e}"
    finally:
        if 'conn' in locals() and conn: conn.close()

def get_report_blob(id_audit):
    """
    Récupère le contenu BLOB d'un rapport PDF spécifique.
    """
    conn = get_oracle_connection()
    if not conn: return None, "Connexion BD impossible"
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT fichier_pdf FROM historiques_audits WHERE id_audit = :1", (id_audit,))
        row = cursor.fetchone()
        if not row: return None, "Document introuvable"
        return row[0].read() if hasattr(row[0], 'read') else row[0], None
    except Exception as e:
        return None, f"Erreur lecture BLOB : {e}"
    finally:
        if 'conn' in locals() and conn: conn.close()

def get_report_data(id_audit):
    """
    Récupère le JSON consolidé d'un rapport.
    """
    conn = get_oracle_connection()
    if not conn: return None, "Connexion BD impossible"
    try:
        cursor = conn.cursor()
        sql = "SELECT donnees_json_brutes, date_generation, nom_base_cible FROM historiques_audits WHERE id_audit = :1"
        cursor.execute(sql, (id_audit,))
        row = cursor.fetchone()
        if not row: return None, "Document introuvable"
        
        import json
        json_data = row[0].read() if hasattr(row[0], 'read') else str(row[0])
        parsed = json.loads(json_data) if json_data else {}
        
        # Compatibilité avec l'ancienne structure si ai_analysis n'est pas à la racine
        return {
            "audit_data": parsed.get("audit_data", parsed),
            "ai_response": parsed.get("ai_analysis", ""),
            "date": row[1].isoformat() if hasattr(row[1], 'isoformat') else str(row[1]),
            "base": row[2]
        }, None
    except Exception as e:
        return None, f"Erreur lecture JSON : {e}"
    finally:
        if 'conn' in locals() and conn: conn.close()

def delete_audit_report(id_audit):
    """ Supprime un rapport archivé de la base de données. """
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM historiques_audits WHERE id_audit = :1", (id_audit,))
        conn.commit()
        return True, "Rapport supprimé avec succès."
    except Exception as e:
        return False, str(e)
    finally:
        if 'conn' in locals() and conn: conn.close()

def get_last_audit_data(id_base):
    """
    Récupère le JSON brut de l'audit précédent pour cette base, s'il existe.
    Gère le format consolidé (audit_data) ou l'ancien format (racine).
    """
    creds = get_target_credentials(id_base)
    if not creds: return None
    nom_base = creds[4]
    
    conn = get_oracle_connection()
    if not conn: return None
    try:
        cursor = conn.cursor()
        sql = """
            SELECT donnees_json_brutes 
            FROM historiques_audits 
            WHERE UPPER(nom_base_cible) = UPPER(:1)
            AND donnees_json_brutes IS NOT NULL
            ORDER BY date_generation DESC
            FETCH FIRST 1 ROWS ONLY
        """
        cursor.execute(sql, [nom_base])
        row = cursor.fetchone()
        if not row: return None
        
        import json
        json_str = row[0].read() if hasattr(row[0], 'read') else str(row[0])
        parsed = json.loads(json_str) if json_str else {}
        
        # Extraire uniquement les métriques (audit_data) si c'est le nouveau format
        return parsed.get("audit_data", parsed)
    except Exception as e:
        if "ORA-00904" in str(e):
            print(f"[DEBUG] Colonne 'donnees_json_brutes' absente.")
        else:
            print(f"[DEBUG] Erreur get_last_audit_data : {e}")
        return None
    finally:
        if 'conn' in locals() and conn: conn.close()