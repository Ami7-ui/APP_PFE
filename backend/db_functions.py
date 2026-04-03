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
    conn, db_type, err = get_db_connection(id_base)
    if err or not conn: return None
    try:
        cursor = conn.cursor()
        if db_type == "ORACLE":
            cursor.execute("SELECT STATUS, COUNT(*) FROM v$session WHERE USERNAME IS NOT NULL GROUP BY STATUS")
            result = {row[0]: row[1] for row in cursor.fetchall()}
            
            # Sessions bloquées
            try:
                cursor.execute("SELECT COUNT(*) FROM v$session WHERE blocking_session IS NOT NULL")
                row = cursor.fetchone()
                result['BLOCKED'] = row[0] if row else 0
            except:
                result['BLOCKED'] = 0
                
            # Transactions
            try:
                cursor.execute("SELECT VALUE FROM v$sysmetric WHERE METRIC_NAME = 'User Commits Per Sec' AND ROWNUM = 1")
                row = cursor.fetchone()
                if row:
                    result['TOTAL_TRANSACTIONS'] = round(float(row[0]), 2)
                else:
                    cursor.execute("SELECT COUNT(*) FROM v$transaction")
                    row_tx = cursor.fetchone()
                    result['TOTAL_TRANSACTIONS'] = row_tx[0] if row_tx else 0
            except:
                result['TOTAL_TRANSACTIONS'] = 0
                
        else: # MYSQL
            cursor.execute("SELECT COMMAND, COUNT(*) FROM information_schema.processlist GROUP BY COMMAND")
            res_raw = {row[0]: row[1] for row in cursor.fetchall()}
            active = res_raw.get('Query', 0) + res_raw.get('Execute', 0)
            inactive = res_raw.get('Sleep', 0)
            result = {"ACTIVE": active, "INACTIVE": inactive}
            
            # Sessions bloquées
            try:
                cursor.execute("SELECT COUNT(*) FROM information_schema.innodb_trx WHERE trx_state = 'LOCK WAIT'")
                row = cursor.fetchone()
                result['BLOCKED'] = row[0] if row else 0
            except:
                result['BLOCKED'] = 0
                
            # Transactions actives
            try:
                cursor.execute("SELECT COUNT(*) FROM information_schema.innodb_trx")
                row = cursor.fetchone()
                result['TOTAL_TRANSACTIONS'] = row[0] if row else 0
            except:
                result['TOTAL_TRANSACTIONS'] = 0
                
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
                   LAST_ACTIVE_TIME, 
                   ROUND(SHARABLE_MEM / 1024 / 1024, 2) AS SHARABLE_MB,
                   ROUND(PERSISTENT_MEM / 1024 / 1024, 2) AS PERSISTENT_MB,
                   ROUND(RUNTIME_MEM / 1024 / 1024, 2) AS RUNTIME_MB
            FROM v$sql 
            WHERE ROWNUM <= 10 
            ORDER BY EXECUTIONS DESC
        """)
        sql_top = [{
            "SQL_ID": r[0], "SQL_TEXT": r[1], "EXECUTIONS": r[2], 
            "LAST_ACTIVE_TIME": r[3].isoformat() if r[3] else None, 
            "SHARABLE_MB": r[4] or 0,
            "PERSISTENT_MB": r[5] or 0,
            "RUNTIME_MB": r[6] or 0,
            "TOTAL_MEM_MB": round((r[4] or 0) + (r[5] or 0) + (r[6] or 0), 2)
        } for r in cursor.fetchall()]
        conn.close()
        
        cpu_data = get_cpu_stats(id_base)
        ram_data = get_ram_stats(id_base)
        
        return True, "Audit terminé avec succès !", {
            "version": version, "session": sessions, "sql": sql_top,
            "cpu": cpu_data, "ram": ram_data
        }
    except Exception as e: return False, f"Erreur : {e}", None

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
            threads = int(s.get('Threads_running', 0))
            max_conn = max(int(s.get('Max_used_connections', 1)), 1)
            busy_pct = round((threads / max_conn) * 100, 2)
            history = [{"User": "Active Threads", "CPU": threads}]
            res = {"busy_pct": busy_pct, "idle_pct": 100-busy_pct, "history": history}
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
            cursor.execute("SHOW VARIABLES LIKE 'innodb_buffer_pool_size'")
            row_pool = cursor.fetchone()
            max_mb = (int(row_pool[1]) / 1024 / 1024) if row_pool else 1024
            res = {
                "used_mb": round(used, 2), "max_mb": round(max_mb, 2), 
                "ram_pct": round((used/max_mb)*100, 2) if max_mb > 0 else 0, 
                "sga_detail": [{"Composant": "Table Data", "Mo": round(used, 2)}, {"Composant": "InnoDB Buffer Pool", "Mo": round(max_mb, 2)}]
            }
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

def ajouter_metrique(nom, script_sql, id_type_base, id_type_metrique=2):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        mid = id_type_metrique if id_type_metrique else 2
        sql = "INSERT INTO METRIQUE (NOM_METRIQUE, SCRIPT_SQL, ID_TYPE_BASE, ID_TYPE_METRIQUE) VALUES (:nom, :script, :base, :met)"
        cursor.execute(sql, nom=nom, script=script_sql, base=id_type_base, met=mid)
        conn.commit()
        return True, "Script ajouté avec succès"
    except Exception as e: return False, str(e)
    finally:
        if 'cursor' in locals(): cursor.close()

def modifier_metrique(id_metrique, nom, script_sql, id_type_base, id_type_metrique=2):
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        mid = id_type_metrique if id_type_metrique else 2
        sql = "UPDATE METRIQUE SET NOM_METRIQUE=:nom, SCRIPT_SQL=:script, ID_TYPE_BASE=:base, ID_TYPE_METRIQUE=:met WHERE ID_METRIQUE=:id"
        cursor.execute(sql, nom=nom, script=script_sql, base=id_type_base, met=mid, id=id_metrique)
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
    conn_cible, type_db, erreur = get_db_connection(id_base)
    if erreur: return None, erreur
    try:
        df = pd.read_sql(script_sql, con=conn_cible)
        conn_cible.close()
        return df.to_dict(orient='records'), None
    except Exception as e: return None, str(e)

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

def get_explain_plan(id_base, sql_query):
    query_clean = sql_query.strip().rstrip(';')
    conn, db_type, err = get_db_connection(id_base)
    if err or not conn: return None, err or "Inaccessible"
    try:
        cursor = conn.cursor()
        if db_type == "ORACLE":
            cursor.execute(f"EXPLAIN PLAN FOR {query_clean}")
            cursor.execute("SELECT PLAN_TABLE_OUTPUT FROM TABLE(DBMS_XPLAN.DISPLAY())")
            plan_text = "\n".join([str(r[0]) for r in cursor.fetchall()])
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
    if db_type != "ORACLE": return "Oracle uniquement.", None
    query = f"""
        SELECT id, LPAD(' ', NVL(depth, 0)*2, ' ') || operation AS operation, object_name AS name, 
               cardinality AS rows_est, cost AS cost_cpu, time AS time_sec 
        FROM v$sql_plan WHERE sql_id = '{sql_id}' ORDER BY id
    """
    try:
        df = pd.read_sql(query, con=conn)
        conn.close()
        res = []
        for row in df.to_dict(orient='records'):
            t = int(row.get('TIME_SEC') or 0)
            res.append({
                "id": row.get('ID'), "operation": row.get('OPERATION'), "name": str(row.get('NAME', '')),
                "rows": row.get('ROWS_EST'), "cost": row.get('COST_CPU'),
                "time": f"{t//3600:02d}:{(t%3600)//60:02d}:{t%60:02d}"
            })
        return res, None
    except Exception as e: return None, str(e)

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

# ==========================================
# 6. HISTORISATION DES MÉTRIQUES (NEW)
# ==========================================

def save_metrics_to_history(id_base, cpu, ram, sessions):
    """ Sauvegarde un point de mesure dans la table locale METRICS_HISTORY """
    conn = get_oracle_connection()
    if not conn: return
    try:
        cursor = conn.cursor()
        sql = "INSERT INTO METRICS_HISTORY (ID_BASE, CPU_USAGE, RAM_USAGE, SESSIONS_COUNT) VALUES (:1, :2, :3, :4)"
        cursor.execute(sql, (id_base, cpu, ram, sessions))
        conn.commit()
    except Exception as e: print(f"Erreur historique : {e}")
    finally:
        if 'conn' in locals(): conn.close()

def get_history_from_oracle(id_base, time_range="24h"):
    """ Récupère l'historique formaté pour les graphiques React """
    conn = get_oracle_connection()
    if not conn: return []
    days = 1
    if time_range == "7d": days = 7
    elif time_range == "30d": days = 30
    try:
        cursor = conn.cursor()
        sql = """
            SELECT TO_CHAR(TIMESTAMP, 'DD/MM HH24:MI'), CPU_USAGE, RAM_USAGE, SESSIONS_COUNT
            FROM METRICS_HISTORY
            WHERE ID_BASE = :id AND TIMESTAMP >= SYSDATE - :d
            ORDER BY TIMESTAMP ASC
        """
        cursor.execute(sql, id=id_base, d=days)
        return [{"time": r[0], "cpu": r[1], "ram": r[2], "sessions": r[3]} for r in cursor.fetchall()]
    except Exception as e:
        print(f"Erreur lecture historique : {e}")
        return []
    finally:
        if 'conn' in locals(): conn.close()

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
        # En-tête stylisé
        self.set_fill_color(15, 23, 42)
        self.rect(0, 0, 210, 40, 'F')
        self.set_font('helvetica', 'B', 24)
        self.set_text_color(56, 189, 248)
        self.cell(0, 20, 'ORACLEGUARD - RAPPORT D\'AUDIT', 0, 1, 'C')
        self.set_font('helvetica', 'I', 10)
        self.set_text_color(148, 163, 184)
        self.cell(0, 5, f'Généré le {datetime.datetime.now().strftime("%d/%m/%Y à %H:%M")}', 0, 1, 'C')
        self.ln(15)

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

    def chapter_body(self, body):
        self.set_font('helvetica', '', 11)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 7, body)
        self.ln(5)

def save_audit_report(id_base, ai_analysis_result):
    """
    Génère un PDF en mémoire (BytesIO) et l'insère dans la colonne BLOB 'fichier_pdf'.
    """
    # 1. Récupérer les données fraîches de l'audit
    ok, msg, audit_data = executer_audit_basique(id_base)
    if not ok: return False, f"Échec extraction données : {msg}"
    
    # Récupérer le nom humain de la base
    creds = get_target_credentials(id_base)
    nom_base = creds[4] if creds else f"Base_{id_base}"
    if not nom_base: nom_base = f"Base_{id_base}"
    
    # 2. Préparer la structure du PDF
    pdf = AuditPDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # Section : Infos Instance
    pdf.chapter_title("1. Informations de l'Instance")
    version_txt = "\n".join(audit_data.get('version', []))
    pdf.chapter_body(f"Base de données : {nom_base}\n\nVersion et Patchs :\n{version_txt}")
    
    # Section : Performance
    pdf.chapter_title("2. Performance Système")
    cpu = audit_data.get('cpu', {})
    ram = audit_data.get('ram', {})
    perf_txt = f"Utilisation CPU : {cpu.get('busy_pct', 0)}%\n"
    perf_txt += f"Utilisation RAM : {ram.get('ram_pct', 0)}% (SGA: {ram.get('sga_total_mb', 0)}Mo / PGA: {ram.get('pga_total_mb', 0)}Mo)\n"
    pdf.chapter_body(perf_txt)
    
    # Section : SQL Top
    pdf.chapter_title("3. Diagnostic SQL (Top 10)")
    sql_list = audit_data.get('sql', [])
    if sql_list:
        pdf.set_font('helvetica', 'B', 10)
        pdf.cell(40, 7, 'SQL_ID', 1); pdf.cell(100, 7, 'Extrait', 1); pdf.cell(40, 7, 'Exécutions', 1); pdf.ln()
        pdf.set_font('helvetica', '', 9)
        for s in sql_list:
            pdf.cell(40, 7, str(s['SQL_ID']), 1)
            pdf.cell(100, 7, s['SQL_TEXT'][:50] + "...", 1)
            pdf.cell(40, 7, str(s['EXECUTIONS']), 1)
            pdf.ln()
    else:
        pdf.chapter_body("Aucune donnée SQL disponible.")

    # Section : Audit IA
    pdf.add_page()
    pdf.chapter_title("4. Expertise IA (Llama 3 & Nvidia SDK)")
    ai_content = ai_analysis_result.get('rapport_ia', ai_analysis_result)
    
    if isinstance(ai_content, dict):
        diag = ai_content.get('diagnostic_local', "N/A")
        sol = ai_content.get('solutions_expertes', "N/A")
        pdf.set_font('helvetica', 'B', 12)
        pdf.set_text_color(59, 130, 246); pdf.cell(0, 10, "Constat Junior (LLaMA) :", 0, 1)
        pdf.chapter_body(diag)
        pdf.ln(2)
        pdf.set_font('helvetica', 'B', 12)
        pdf.set_text_color(16, 185, 129); pdf.cell(0, 10, "Optimisation Senior (Nvidia) :", 0, 1)
        pdf.chapter_body(sol)
    else:
        pdf.chapter_body(str(ai_content))

    # Génération binaire spécifique pour fpdf 1.7.2
    pdf_string = pdf.output(dest='S')
    pdf_bytes = pdf_string.encode('latin-1')

    # 4. Insertion Oracle BLOB
    conn = get_oracle_connection()
    try:
        cursor = conn.cursor()
        # Déclaration explicite du type BLOB pour garantir le stockage
        cursor.setinputsizes(None, oracledb.DB_TYPE_BLOB)
        sql_insert = "INSERT INTO historiques_audits (date_generation, nom_base_cible, fichier_pdf) VALUES (CURRENT_TIMESTAMP, :1, :2)"
        cursor.execute(sql_insert, [nom_base, pdf_bytes])
        print(f"[DEBUG] Taille du PDF généré : {len(pdf_bytes)} octets")
        conn.commit()
        return True, "Rapport archivé avec succès en base de données (BLOB)."
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