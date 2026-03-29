# backend/db_functions.py
import oracledb # type: ignore
import mysql.connector
import re
import pandas as pd # type: ignore
import requests # type: ignore
import datetime
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
        # On cherche l'ID du type par son nom (insensible à la casse)
        cursor.execute("SELECT ID_TYPE_BASE FROM TYPE_BASE_CIBLE WHERE UPPER(NOM_TYPE) = UPPER(:t)", t=type_sgbd)
        row = cursor.fetchone()
        id_type = row[0] if row else 1 # Défaut à 1 si non trouvé

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
        
        # Résolution de l'ID du type si fourni
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
    """
    Récupère les identifiants et le type de la base, 
    puis retourne la connexion correspondante (Oracle ou MySQL) et le type.
    """
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
        
        # --- AIGUILLAGE MULTI-BASES ---
        if 'ORACLE' in type_upper:
            dsn = f"{ip}:{port}/{instance}"
            conn_cible = oracledb.connect(user=user, password=mdp, dsn=dsn)
            return conn_cible, "ORACLE", None
            
        elif 'MYSQL' in type_upper:
            conn_cible = mysql.connector.connect(
                host=ip,
                port=port,
                user=user,
                password=mdp,
                database="mysql" 
            )
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
    conn, db_type, err = get_db_connection(id_base)
    if err or not conn: return None
    try:
        cursor = conn.cursor()
        if db_type == "ORACLE":
            cursor.execute("SELECT STATUS, COUNT(*) FROM v$session WHERE USERNAME IS NOT NULL GROUP BY STATUS")
            result = {row[0]: row[1] for row in cursor.fetchall()}
        else: # MYSQL
            cursor.execute("SELECT COMMAND, COUNT(*) FROM information_schema.processlist GROUP BY COMMAND")
            # Mapper MySQL Command -> Oracle Status pour le Frontend
            res_raw = {row[0]: row[1] for row in cursor.fetchall()}
            active = res_raw.get('Query', 0) + res_raw.get('Execute', 0)
            inactive = res_raw.get('Sleep', 0)
            result = {"ACTIVE": active, "INACTIVE": inactive}
        
        conn.close()
        return result
    except: return None

def executer_audit_basique(id_base):
    creds = get_target_credentials(id_base)
    if not creds: return False, "Impossible de récupérer les identifiants.", None
    u, p, ip, port, ins = creds
    try:
        conn = oracledb.connect(user=u, password=p, dsn=f"{ip}:{port}/{ins}")
        cursor = conn.cursor()
        cursor.execute("SELECT BANNER FROM v$version")
        version = [row[0] for row in cursor.fetchall()]
        cursor.execute("SELECT SID, SERIAL#, USERNAME, STATUS, MACHINE FROM v$session WHERE USERNAME IS NOT NULL")
        sessions = [{"SID": r[0], "SERIAL#": r[1], "USERNAME": r[2], "STATUS": r[3], "MACHINE": r[4]} for r in cursor.fetchall()]
        cursor.execute("""
            SELECT SQL_ID, SUBSTR(SQL_TEXT,1,100), EXECUTIONS, 
                   LAST_ACTIVE_TIME, ROUND(SHARABLE_MEM / 1024 / 1024, 2)
            FROM v$sql 
            WHERE ROWNUM <= 10 
            ORDER BY EXECUTIONS DESC
        """)
        sql_top = [{
            "SQL_ID": r[0], 
            "SQL_TEXT": r[1], 
            "EXECUTIONS": r[2], 
            "LAST_ACTIVE_TIME": r[3].isoformat() if r[3] else None, 
            "MEMORY_MB": r[4]
        } for r in cursor.fetchall()]
        conn.close()
        
        cpu_data = get_cpu_stats(id_base)
        ram_data = get_ram_stats(id_base)
        
        return True, "Audit terminé avec succès !", {
            "version": version, 
            "session": sessions, 
            "sql": sql_top,
            "cpu": cpu_data,
            "ram": ram_data
        }
    except Exception as e:
        return False, f"Erreur : {e}", None

def get_cpu_stats(id_base):
    conn, db_type, err = get_db_connection(id_base)
    if err or not conn: return None
    try:
        cursor = conn.cursor()
        if db_type == "ORACLE":
            cursor.execute("SELECT STAT_NAME, VALUE FROM V$OSSTAT WHERE STAT_NAME IN ('BUSY_TIME', 'IDLE_TIME')")
            s = {row[0]: row[1] for row in cursor.fetchall()}
            busy = float(s.get('BUSY_TIME', 0))
            total = busy + float(s.get('IDLE_TIME', 0))
            busy_pct = round((busy/total)*100.0, 2) if total > 0.0 else 0.0
            cursor.execute("SELECT s.USERNAME, ROUND(st.VALUE/100,2) FROM V$SESSTAT st JOIN V$SESSION s ON s.SID=st.SID JOIN V$STATNAME n ON n.STATISTIC#=st.STATISTIC# WHERE n.NAME='CPU used by this session' AND s.USERNAME IS NOT NULL ORDER BY st.VALUE DESC FETCH FIRST 5 ROWS ONLY")
            history = [{"User": r[0], "CPU": r[1]} for r in cursor.fetchall()]
            res = {"busy_pct": busy_pct, "idle_pct": round(100 - busy_pct, 2), "history": history}
        else: # MYSQL
            cursor.execute("SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_running', 'Max_used_connections')")
            s = {r[0]: r[1] for r in cursor.fetchall()}
            busy_pct = round((int(s.get('Threads_running', 0)) / max(int(s.get('Max_used_connections', 1)), 1)) * 100, 2)
            res = {"busy_pct": busy_pct, "idle_pct": 100-busy_pct, "history": []}
        
        conn.close()
        return res
    except: return None

def get_ram_stats(id_base):
    conn, db_type, err = get_db_connection(id_base)
    if err or not conn: return None
    try:
        cursor = conn.cursor()
        if db_type == "ORACLE":
            cursor.execute("SELECT NAME, ROUND(BYTES/1024/1024,2) FROM V$SGAINFO WHERE BYTES > 0 ORDER BY BYTES DESC")
            sga_rows = cursor.fetchall()
            sga_detail = [{"Composant": r[0], "Mo": r[1]} for r in sga_rows]
            sga_total = next((r["Mo"] for r in sga_detail if r["Composant"] == "Total SGA"), sga_detail[0]["Mo"] if sga_detail else 0)
            sga_max = next((r["Mo"] for r in sga_detail if r["Composant"] == "Maximum SGA Size"), sga_total)
            cursor.execute("SELECT ROUND(VALUE/1024/1024,2) FROM V$PGASTAT WHERE NAME='total PGA allocated'")
            pga_row = cursor.fetchone(); pga_total = pga_row[0] if pga_row else 0
            cursor.execute("SELECT ROUND(VALUE/1024/1024,2) FROM V$PGASTAT WHERE NAME='aggregate PGA target parameter'")
            pga_target_row = cursor.fetchone()
            pga_max = pga_target_row[0] if pga_target_row and pga_target_row[0] else max(pga_total, 1)
            used_mb, max_mb = sga_total + pga_total, sga_max + pga_max
            res = {"sga_total_mb": sga_total, "pga_total_mb": pga_total, "used_mb": used_mb, "max_mb": max_mb, "ram_pct": round((used_mb/max_mb)*100, 2) if max_mb > 0 else 0, "sga_detail": sga_detail}
        else: # MYSQL
            cursor.execute("SELECT SUM(data_length + index_length) / 1024 / 1024 FROM information_schema.TABLES")
            used = cursor.fetchone()[0] or 0
            res = {"used_mb": round(used, 2), "max_mb": 1024, "ram_pct": round((used/1024)*100, 2), "sga_detail": []}
            
        conn.close()
        return res
    except: return None

def get_instance_status(id_base):
    conn, db_type, err = get_db_connection(id_base)
    if err or not conn: return {"status": "DOWN", "uptime_str": "Inaccessible", "startup_time": None}
    try:
        cursor = conn.cursor()
        if db_type == "ORACLE":
            cursor.execute("SELECT STARTUP_TIME FROM V$INSTANCE")
            row = cursor.fetchone()
            if row and row[0]:
                startup_time = row[0]
                delta = datetime.datetime.now() - startup_time
                uptime_str = f"{delta.days}j {delta.seconds//3600}h {(delta.seconds%3600)//60}min"
                conn.close()
                return {"status": "UP", "uptime_str": uptime_str, "startup_time": startup_time.isoformat()}
        else: # MYSQL
            cursor.execute("SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME='UPTIME'")
            res = cursor.fetchone()
            uptime_sec = int(res[0]) if res else 0
            uptime_str = f"{uptime_sec//86400}j {(uptime_sec%86400)//3600}h {(uptime_sec%3600)//60}min"
            conn.close()
            return {"status": "UP", "uptime_str": uptime_str, "startup_time": None}
        
        conn.close()
        return {"status": "UP", "uptime_str": "Inconnue", "startup_time": None}
    except:
        return {"status": "DOWN", "uptime_str": "Inaccessible", "startup_time": None}

# ==========================================
# 4. SCRIPTS SQL & AUDIT
# ==========================================

def get_metriques_disponibles(id_type_base):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT ID_METRIQUE, NOM_METRIQUE, SCRIPT_SQL FROM METRIQUE WHERE ID_TYPE_BASE = :type_id", type_id=id_type_base)
        res: list[dict] = []
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
        cursor.execute("SELECT m.ID_METRIQUE, m.NOM_METRIQUE, m.SCRIPT_SQL, t.NOM_TYPE, m.ID_TYPE_BASE FROM METRIQUE m JOIN TYPE_BASE_CIBLE t ON m.ID_TYPE_BASE = t.ID_TYPE_BASE")
        res: list[dict] = []
        for r in cursor.fetchall():
            script = r[2].read() if hasattr(r[2], 'read') else str(r[2])
            res.append({
                "ID": r[0], 
                "Nom_Scripte": r[1], 
                "Contenu_Script": script, 
                "Type_Scripte": r[3], 
                "id_type_base": r[4]
            })
        return res
    finally:
        if 'cursor' in locals(): cursor.close()

def ajouter_metrique(nom, script_sql, type_scripte):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        # On essaie de trouver l'ID du type basé sur le nom
        cursor.execute("SELECT ID_TYPE_BASE FROM TYPE_BASE_CIBLE WHERE NOM_TYPE = :t", t=type_scripte)
        row = cursor.fetchone()
        id_type = row[0] if row else 1 # ID 1 par défaut si non trouvé
        
        cursor.execute("INSERT INTO METRIQUE (NOM_METRIQUE, SCRIPT_SQL, ID_TYPE_BASE) VALUES (:nom, :script, :type)", 
                       nom=nom, script=script_sql, type=id_type)
        conn.commit()
        return True, "Script ajouté avec succès"
    except Exception as e: return False, str(e)
    finally:
        if 'cursor' in locals(): cursor.close()

def modifier_metrique(id_metrique, nom, script_sql, type_scripte):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        # On essaie de trouver l'ID du type basé sur le nom
        cursor.execute("SELECT ID_TYPE_BASE FROM TYPE_BASE_CIBLE WHERE NOM_TYPE = :t", t=type_scripte)
        row = cursor.fetchone()
        id_type = row[0] if row else 1 # ID 1 par défaut si non trouvé
        
        cursor.execute("UPDATE METRIQUE SET NOM_METRIQUE=:nom, SCRIPT_SQL=:script, ID_TYPE_BASE=:type WHERE ID_METRIQUE=:id", 
                       nom=nom, script=script_sql, type=id_type, id=id_metrique)
        conn.commit()
        return True, "Script mis à jour avec succès"
    except Exception as e: return False, str(e)
    finally:
        if 'cursor' in locals(): cursor.close()

def supprimer_metrique(id_metrique):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM METRIQUE WHERE ID_METRIQUE = :id", id=id_metrique)
        conn.commit()
        return True, "Script supprimé avec succès"
    except Exception as e: return False, str(e)
    finally:
        if 'cursor' in locals(): cursor.close()

def executer_script_sur_cible(id_base, script_sql):
    # 1. On appelle notre nouvelle fonction intelligente
    conn_cible, erreur = get_db_connection(id_base)
    
    if erreur: 
        return None, erreur
        
    try:
        # 2. Pandas est magique : il accepte les connexions Oracle ET MySQL !
        df = pd.read_sql(script_sql, con=conn_cible)
        conn_cible.close()
        return df.to_dict(orient='records'), None
    except Exception as e: 
        return None, str(e)

def verifier_index_tables(id_base, sql_script):
    creds = get_target_credentials(id_base)
    if not creds: return {"error": "Inaccessible"}
    u, p, ip, port, ins = creds
    pattern = re.compile(r'(?:FROM|JOIN)\s+([a-zA-Z0-9_\$]+)', re.IGNORECASE)
    tables = list(set([m.upper() for m in pattern.findall(sql_script)]))
    results: dict = {}
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

# ==========================================
# 5. EXTERNAL (GRAFANA)
# ==========================================

def push_to_grafana(database_name, cpu, ram, sessions):
    url = "https://influx-prod-55-prod-gb-south-1.grafana.net/api/v1/push/influx/write"
    auth = ("2957774", "glc_eyJvIjoiMTY2MDYwOCIsIm4iOiJzdGFjay0xNTE2NzczLWhtLXdyaXRlLXB1c2hfb3JhY2xlMSIsImsiOiJVNjEyVkFjWDhwazRNSkU3OXRKZk85NDEiLCJtIjp7InIiOiJwcm9kLWdiLXNvdXRoLTEifX0=")
    data = f"oracle_metrics,db_name={database_name.replace(' ','_')} cpu={cpu},ram={ram},sessions={sessions}"
    try:
        requests.post(url, auth=auth, data=data, timeout=3)
        return True
    except: return False
    
def get_explain_plan(id_base, sql_query):
    # On nettoie la requête
    query_clean = sql_query.strip().rstrip(';')
    conn, db_type, err = get_db_connection(id_base)
    if err or not conn: return None, err or "Inaccessible"

    try:
        cursor = conn.cursor()
        if db_type == "ORACLE":
            # 1. Générer le plan (Doit être dans la MÊME session)
            cursor.execute(f"EXPLAIN PLAN FOR {query_clean}")
            # 2. Récupérer le plan
            cursor.execute("SELECT PLAN_TABLE_OUTPUT FROM TABLE(DBMS_XPLAN.DISPLAY())")
            plan_text = "\n".join([str(r[0]) for r in cursor.fetchall()])
            conn.close()
            return plan_text, None
        else: # MYSQL
            cursor.execute(f"EXPLAIN {query_clean}")
            res = cursor.fetchall()
            plan_text = "MYSQL EXPLAIN:\n" + "\n".join([str(r) for r in res])
            conn.close()
            return plan_text, None
    except Exception as e:
        if conn: conn.close()
        return None, str(e)

def get_sql_plan_by_id(id_base, sql_id):
    conn, db_type, err = get_db_connection(id_base)
    if err or not conn: return None, err or "Inaccessible"
    
    if db_type != "ORACLE":
        return "Le plan par SQL_ID est uniquement supporté pour Oracle.", None

    query = f"""
    WITH plan_v AS (
        SELECT 1 as source_rank, 
            id,
            LPAD(' ', NVL(depth, 0)*2, ' ') || operation || CASE WHEN options IS NOT NULL THEN ' ' || options ELSE '' END AS operation,
            NVL(object_name, ' ') AS name,
            NVL(cardinality, 0) AS rows_est,
            NVL(cost, 0) || ' (' || NVL(TRUNC(cpu_cost/1000000), 0) || ')' AS cost_cpu,
            NVL(time, 0) AS time_sec
        FROM v$sql_plan 
        WHERE sql_id = '{sql_id}' 
        AND child_number = (SELECT MIN(child_number) FROM v$sql_plan WHERE sql_id = '{sql_id}')
    ),
    plan_hist AS (
        SELECT 2 as source_rank, 
            id,
            LPAD(' ', NVL(depth, 0)*2, ' ') || operation || CASE WHEN options IS NOT NULL THEN ' ' || options ELSE '' END AS operation,
            NVL(object_name, ' ') AS name,
            NVL(cardinality, 0) AS rows_est,
            NVL(cost, 0) || ' (' || NVL(TRUNC(cpu_cost/1000000), 0) || ')' AS cost_cpu,
            NVL(time, 0) AS time_sec
        FROM dba_hist_sql_plan 
        WHERE sql_id = '{sql_id}'
        AND plan_hash_value = (SELECT MIN(plan_hash_value) FROM dba_hist_sql_plan WHERE sql_id = '{sql_id}')
    ),
    combined AS (
        SELECT * FROM plan_v
        UNION ALL
        SELECT * FROM plan_hist
    )
    SELECT id, operation, name, rows_est, cost_cpu, time_sec
    FROM combined
    WHERE source_rank = (SELECT MIN(source_rank) FROM combined)
    ORDER BY id
    """
    try:
        df = pd.read_sql(query, con=conn)
        conn.close()
        plan_data = df.to_dict(orient='records')
        
        resultat = []
        for row in plan_data:
            # On gère la casse car Pandas peut retourner MAJ ou min
            row_keys = {k.upper(): v for k, v in row.items()}
            time_sec = int(row_keys.get('TIME_SEC', 0))
            time_format = f"{time_sec//3600:02d}:{(time_sec%3600)//60:02d}:{time_sec%60:02d}"
            
            resultat.append({
                "id": row_keys.get('ID'),
                "operation": row_keys.get('OPERATION'),
                "name": str(row_keys.get('NAME', '')).strip(),
                "rows": row_keys.get('ROWS_EST'),
                "cost": row_keys.get('COST_CPU'),
                "time": time_format
            })
        return resultat, None
    except Exception as e:
        if conn: conn.close()
        return None, str(e)
