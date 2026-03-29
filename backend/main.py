# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import db_functions
import ollama

app = FastAPI(title="OracleGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── MODÈLES ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    identifiant: str
    password: str

class UserRequest(BaseModel):
    nom: str
    email: str
    password: Optional[str] = None
    id_role: int

class BaseCibleRequest(BaseModel):
    nom: str
    ip: str
    port: int
    user: str
    password: str
    type_sgbd: str

class BaseCibleUpdateRequest(BaseModel):
    nom: str
    ip: str
    port: int
    user: str
    password: Optional[str] = None
    type_sgbd: Optional[str] = None

class TypeRequest(BaseModel):
    nom_type: str
    editeur: Optional[str] = ""

class SqlRequest(BaseModel):
    script: str

class ScriptRequest(BaseModel):
    Nom_Scripte: str
    Contenu_Script: str
    Type_Scripte: str
    
class AIRequest(BaseModel):
    prompt: str
    context: str = ""
    
# ── AUTH ───────────────────────────────────────────────────────────────────────

@app.post("/api/login")
def login(req: LoginRequest):
    user = db_functions.verifier_login(req.identifiant, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    return {"status": "success", "user": user}

# ── UTILISATEURS ───────────────────────────────────────────────────────────────

@app.get("/api/roles")
def list_roles():
    return db_functions.get_roles()

@app.get("/api/users")
def list_users():
    return db_functions.get_all_utilisateurs()

@app.post("/api/users")
def add_user(req: UserRequest):
    if not req.password:
        raise HTTPException(status_code=400, detail="Mot de passe obligatoire")
    ok, msg = db_functions.ajouter_utilisateur(req.nom, req.email, req.password, req.id_role)
    if not ok: raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

@app.put("/api/users/{user_id}")
def update_user(user_id: int, req: UserRequest):
    ok, msg = db_functions.modifier_utilisateur(user_id, req.nom, req.email, req.id_role, req.password or None)
    if not ok: raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int):
    ok, msg = db_functions.supprimer_utilisateur(user_id)
    if not ok: raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

# ── TYPES DE SGBD ──────────────────────────────────────────────────────────────

# CORRECTION 1 : Renommer la route de /api/types à /api/types_sgbd
@app.get("/api/types_sgbd")
def list_types():
    return db_functions.get_types_bd()

@app.post("/api/types_sgbd")
def add_type(req: TypeRequest):
    ok, msg = db_functions.ajouter_type_bd(req.nom_type, req.editeur)
    if not ok: raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

# ── BASES CIBLES ───────────────────────────────────────────────────────────────

@app.get("/api/bases")
def list_bases():
    return db_functions.get_bases_cibles()

@app.post("/api/bases")
def add_base(req: BaseCibleRequest):
    ok, msg = db_functions.ajouter_base_cible(req.nom, req.ip, req.port, req.user, req.password, req.type_sgbd)
    if not ok: raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

@app.put("/api/bases/{id_base}")
def update_base(id_base: int, req: BaseCibleUpdateRequest):
    ok, msg = db_functions.modifier_base_cible(id_base, req.nom, req.ip, req.port, req.user, req.type_sgbd, req.password or None)
    if not ok: raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

@app.delete("/api/bases/{id_base}")
def delete_base(id_base: int):
    ok, msg = db_functions.supprimer_base_cible(id_base)
    if not ok: raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

# ── MÉTRIQUES / DASHBOARD ──────────────────────────────────────────────────────

@app.get("/api/status/{id_base}")
def get_status(id_base: int):
    return db_functions.get_instance_status(id_base)

@app.get("/api/metrics/{id_base}")
def get_metrics(id_base: int):
    status = db_functions.get_instance_status(id_base)
    if status["status"] == "DOWN":
        return {"status": status, "cpu": None, "ram": None, "sessions": None}
    cpu  = db_functions.get_cpu_stats(id_base)
    ram  = db_functions.get_ram_stats(id_base)
    sess = db_functions.get_statistiques_sessions(id_base)
    return {"status": status, "cpu": cpu, "ram": ram, "sessions": sess}

# ── AUDIT ──────────────────────────────────────────────────────────────────────

@app.get("/api/audit/{id_base}")
def run_audit(id_base: int):
    ok, msg, data = db_functions.executer_audit_basique(id_base)
    if not ok:
        raise HTTPException(status_code=503, detail=msg)
    return {"message": msg, "data": data}

@app.post("/api/execute_script/{id_base}")
def execute_sql(id_base: int, req: SqlRequest):
    data, error = db_functions.executer_script_sur_cible(id_base, req.script)
    if error:
        raise HTTPException(status_code=400, detail=error)
    # On renvoie "data" pour correspondre à ConfigurationPage.jsx line 29
    return {"data": data}
# À coller dans main.py, avec tes autres routes @app.get

@app.get("/api/diagnostics/plan/{id_base}/{sql_id}")
async def get_execution_plan(id_base: int, sql_id: str):
    """
    API pour envoyer le plan d'exécution au frontend.
    """
    plan_data, error = db_functions.get_sql_plan_by_id(id_base, sql_id)
    
    if error:
        raise HTTPException(status_code=400, detail=f"Erreur Oracle: {error}")
        
    return {"plan": plan_data}

# ── SCRIPTS SQL (MÉTRIQUES DYNAMIQUES) ────────────────────────────────────────

@app.get("/api/scripts")
def list_scripts():
    return db_functions.get_all_metriques()

@app.get("/api/scripts/type/{id_type_base}")
def list_scripts_by_type(id_type_base: int):
    return db_functions.get_metriques_disponibles(id_type_base)

@app.post("/api/scripts")
def add_script(req: ScriptRequest):
    ok, msg = db_functions.ajouter_metrique(req.Nom_Scripte, req.Contenu_Script, req.Type_Scripte)
    if not ok: raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

@app.put("/api/scripts/{id_script}")
def update_script(id_script: int, req: ScriptRequest):
    ok, msg = db_functions.modifier_metrique(id_script, req.Nom_Scripte, req.Contenu_Script, req.Type_Scripte)
    if not ok: raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

@app.delete("/api/scripts/{id_script}")
def delete_script(id_script: int):
    ok, msg = db_functions.supprimer_metrique(id_script)
    if not ok: raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

# ── ASSISTANT IA ───────────────────────────────────────────────────────────────

# CORRECTION 2 : Déplacer la route IA avant le bloc de démarrage
@app.post("/api/ai/ask")
async def ask_ai(request: AIRequest):
    try:
        # 1. On définit le rôle de l'IA (Le Prompt Système)
        system_message = "Tu es un expert en base de données Oracle (DBA Senior). Tu réponds en français de manière claire, technique et concise. Si on te donne du code SQL ou un plan d'exécution , analyse-le comme un professionnel."

        # 2. On appelle Ollama en local
        response = ollama.chat(model='llama3', messages=[
            {'role': 'system', 'content': system_message},
            {'role': 'user', 'content': f"Contexte : {request.context}\n\nRequête : {request.prompt}"}
        ])

        # 3. On renvoie la réponse au Frontend
        return {"reponse": response['message']['content']}

    except Exception as e:
        return {"error": f"Erreur de communication avec Ollama : {str(e)}"}

# ── DÉMARRAGE ──────────────────────────────────────────────────────────────────
class AnalysisRequest(BaseModel):
    id_base: int
    sql_query: str

@app.post("/api/ai/analyze_sql")
async def analyze_sql(req: AnalysisRequest):
    # 1. On récupère le plan d'exécution réel depuis Oracle
    plan, error = db_functions.get_explain_plan(req.id_base, req.sql_query)
    
    if error:
        raise HTTPException(status_code=400, detail=f"Erreur Oracle: {error}")

    try:
        # 2. On prépare le prompt pour l'IA avec le plan d'exécution
        prompt_expertise = f"""
        En tant qu'expert DBA Oracle, analyse ce PLAN D'EXÉCUTION et la REQUÊTE SQL associée.
        
        REQUÊTE : 
        {req.sql_query}
        
        PLAN D'EXÉCUTION :
        {plan}
        
        Instructions :
        1. Explique si le plan est efficace (recherche d'INDEX vs TABLE ACCESS FULL).
        2. Identifie les goulots d'étranglement potentiels (Coût élevé, Cardialité erronée).
        3. Donne 3 recommandations concrètes (Ajout d'index, réécriture de SQL, ou statistiques).
        """

        response = ollama.chat(model='llama3', messages=[
            {'role': 'system', 'content': 'Tu es un expert en performance Oracle.'},
            {'role': 'user', 'content': prompt_expertise}
        ])

        return {
            "plan_brut": plan,
            "analyse_ia": response['message']['content']
        }
    except Exception as e:
        return {"error": str(e)}

class AuditAnalysisRequest(BaseModel):
    id_base: int

@app.post("/api/ai/analyze_audit")
async def analyze_audit(req: AuditAnalysisRequest):
    id_base = req.id_base
    ok, msg, audit_data = db_functions.executer_audit_basique(id_base)
    if not ok:
        raise HTTPException(status_code=503, detail=f"Erreur d'audit: {msg}")

    try:
        cpu_info = audit_data.get("cpu") or {}
        ram_info = audit_data.get("ram") or {}
        sql_list = audit_data.get("sql") or []
        top_sql = sql_list[:3] # Analyze only the top 3 queries to keep token counts reasonable
        
        context = f"--- CPU ---\nUtilisé: {cpu_info.get('busy_pct', 'N/A')}% | Inactif: {cpu_info.get('idle_pct', 'N/A')}%\n\n"
        context += f"--- RAM ---\nUtilisée: {ram_info.get('ram_pct', 'N/A')}% ({ram_info.get('used_mb', 'N/A')} / {ram_info.get('max_mb', 'N/A')} Mo)\n\n"
        
        context += "--- TOP REQUÊTES SQL ---\n"
        if not top_sql:
            context += "Aucune requête problématique détectée.\n"
        for i, query in enumerate(top_sql, 1):
            sql_text = query.get('SQL_TEXT', '')
            context += f"Requête {i} (Exécutions: {query.get('EXECUTIONS', 0)}):\n{sql_text}\n"
            plan, err = db_functions.get_explain_plan(id_base, sql_text)
            context += f"Plan d'exécution:\n{plan if not err else 'Indisponible'}\n\n"
            
        prompt = "En tant qu'expert DBA Oracle, analyse cet audit complet (CPU, RAM, et Top Requêtes avec leurs plans d'exécution).\nInstructions :\n1. Évalue la santé globale (CPU et RAM).\n2. Pour chaque requête SQL fournie, analyse le plan d'exécution et propose des recommandations précises d'optimisation (création d'index, hints, réécriture, etc.).\n3. Format ta réponse proprement en Markdown structuré."

        response = ollama.chat(model='llama3', messages=[
            {'role': 'system', 'content': 'Tu es un expert DBA Oracle et un assistant AI.'},
            {'role': 'user', 'content': f"{prompt}\n\n--- DONNÉES DE L'AUDIT ---\n{context}"}
        ])

        return {"rapport_ia": response['message']['content'], "context_brut": context}
    except Exception as e:
        return {"error": f"Erreur de communication avec l'IA: {str(e)}"}

    
# ── AUTH ───────────────────────────────────────────────────────────────────────

@app.post("/api/login")
def login(req: LoginRequest):
    user = db_functions.verifier_login(req.identifiant, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    return {"status": "success", "user": user}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)