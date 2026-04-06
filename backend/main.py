# backend/main.py
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import db_functions
import ai_service
import ollama
import threading
import time

app = FastAPI(title="OracleGuard API")

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── MODÈLES PYDANTIC (Regroupés) ─────────────────────────────────────────────

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
    id_type_base: int
    id_type_metrique: Optional[int] = 2

class AIRequest(BaseModel):
    prompt: str
    context: str = ""

class AnalysisRequest(BaseModel):
    id_base: int
    sql_query: str

class AuditAnalysisRequest(BaseModel):
    id_base: int

class ReportSaveRequest(BaseModel):
    id_base: int
    ai_result: dict

# ── COLLECTEUR AUTOMATIQUE (BACKGROUND TASK) ──────────────────────────────────
# ── ROUTES AUTHENTIFICATION ───────────────────────────────────────────────────

@app.post("/api/login")
def login(req: LoginRequest):
    user = db_functions.verifier_login(req.identifiant, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    return {"status": "success", "user": user}

# ── ROUTES UTILISATEURS ───────────────────────────────────────────────────────

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

# ── ROUTES CONFIGURATION (TYPES & BASES) ──────────────────────────────────────

@app.get("/api/types_sgbd")
def list_types():
    return db_functions.get_types_bd()

@app.post("/api/types_sgbd")
def add_type(req: TypeRequest):
    ok, msg = db_functions.ajouter_type_bd(req.nom_type, req.editeur)
    if not ok: raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

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

# ── ROUTES MONITORING & HISTORIQUE ───────────────────────────────────────────

@app.get("/api/status/{id_base}")
def get_status(id_base: int):
    return db_functions.get_instance_status(id_base)

@app.get("/api/metrics/{id_base}")
def get_metrics(id_base: int):
    status = db_functions.get_instance_status(id_base)
    if status["status"] == "DOWN":
        return {"status": status, "cpu": None, "ram": None, "sessions": None, "nodes": []}
    
    return {
        "status": status, 
        "cpu": db_functions.get_cpu_stats(id_base), 
        "ram": db_functions.get_ram_stats(id_base), 
        "sessions": db_functions.get_statistiques_sessions(id_base), 
        "nodes": db_functions.get_nodes_status(id_base)
    }

@app.get("/api/metrics/history/{id_base}")
def get_metrics_history(id_base: int, time_range: str = Query("24h", alias="range")):
    """ Récupère les points stockés par le worker pour les graphiques """
    history = db_functions.get_history_from_oracle(id_base, time_range)
    return history

# ── ROUTES AUDIT & SQL ────────────────────────────────────────────────────────

@app.get("/api/audit/{id_base}")
def run_audit(id_base: int):
    ok, msg, data = db_functions.executer_audit_basique(id_base)
    if not ok: raise HTTPException(status_code=503, detail=msg)
    return {"message": msg, "data": data}

@app.get("/api/audit/full/{id_base}")
def run_full_audit(id_base: int):
    """
    Route pour l'audit complet (6 catégories) avec métriques détaillées.
    """
    ok, msg, data = db_functions.executer_audit_complet(id_base)
    if not ok: raise HTTPException(status_code=503, detail=msg)
    return {"message": msg, "data": data}

@app.post("/api/execute_script/{id_base}")
def execute_sql(id_base: int, req: SqlRequest):
    data, error = db_functions.executer_script_sur_cible(id_base, req.script)
    if error: raise HTTPException(status_code=400, detail=error)
    return {"data": data}

@app.get("/api/diagnostics/plan/{id_base}/{sql_id}")
async def get_execution_plan(id_base: int, sql_id: str):
    plan_data, error = db_functions.get_sql_plan_by_id(id_base, sql_id)
    if error: raise HTTPException(status_code=400, detail=f"Erreur Oracle: {error}")
    return {"plan": plan_data}

# ── GESTION DES SCRIPTS (BIBLIOTHÈQUE) ────────────────────────────────────────

@app.get("/api/scripts")
def list_scripts():
    return db_functions.get_all_metriques()

@app.get("/api/types_metriques")
def list_types_metriques():
    return db_functions.get_types_metriques()

@app.post("/api/scripts")
def add_script(req: ScriptRequest):
    ok, msg = db_functions.ajouter_metrique(req.Nom_Scripte, req.Contenu_Script, req.id_type_base, req.id_type_metrique)
    if not ok: raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

# ── ASSISTANT IA & ANALYSE AVANCÉE ────────────────────────────────────────────

@app.post("/api/ai/ask")
async def ask_ai(request: AIRequest):
    try:
        # Utilisation du service DBA expert
        full_prompt = f"Contexte : {request.context}\n\nRequête : {request.prompt}"
        response = ai_service.ask_dba_expert(full_prompt)
        return {"reponse": response}
    except Exception as e:
        return {"error": f"Erreur Service IA : {str(e)}"}

@app.post("/api/ai/analyze_sql")
async def analyze_sql(req: AnalysisRequest):
    plan, error = db_functions.get_explain_plan(req.id_base, req.sql_query)
    if error: raise HTTPException(status_code=400, detail=f"Erreur Oracle: {error}")

    try:
        # Analyse de performance SQL structurée
        analysis_result = ai_service.analyze_sql_performance(req.sql_query, plan)
        return {"plan_brut": plan, "analyse_ia": analysis_result}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/ai/analyze_audit")
async def analyze_audit(req: AuditAnalysisRequest):
    ok, msg, audit_data = db_functions.executer_audit_complet(req.id_base)
    if not ok: raise HTTPException(status_code=503, detail=msg)

    try:
        # Utilisation du service IA dédié pour les 6 catégories
        analysis_result = ai_service.analyze_database_health(audit_data)
        
        # On retourne directement l'objet JSON formaté
        return {"rapport_ia": analysis_result}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/reports")
def get_reports(nom_base: str = Query(..., alias="nom_base_cible")):
    """ Route pour récupérer l'historique des PDFs par base cible """
    return db_functions.get_reports_history(nom_base)

@app.post("/api/reports/save")
async def save_report(req: ReportSaveRequest):
    """ Génère et enregistre un rapport PDF """
    ok, msg = db_functions.save_audit_report(req.id_base, req.ai_result)
    if not ok: raise HTTPException(status_code=500, detail=msg)
    return {"message": msg}

@app.delete("/api/reports/{id_audit}")
async def delete_report(id_audit: int):
    """ Supprime un rapport de l'historique """
    ok, msg = db_functions.delete_audit_report(id_audit)
    if not ok: raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

@app.get("/api/reports/{id_audit}/download")
async def download_report(id_audit: int):
    """ Récupère le PDF depuis le BLOB Oracle et le renvoie au navigateur """
    blob_data, err = db_functions.get_report_blob(id_audit)
    if err: raise HTTPException(status_code=404, detail=err)
    
    return Response(
        content=blob_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=rapport_audit_{id_audit}.pdf"
        }
    )

# Suppression du service de fichiers statiques local (on utilise la BD maintenant)

# ── DÉMARRAGE ──────────────────────────────────────────────────────────────────


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)