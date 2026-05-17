# backend/main.py
from fastapi import FastAPI, HTTPException, Query, Request, Response, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import zipfile
import io
import db_functions
import ai_service
import ollama
import threading
import time
from chat_router import router as chat_router

app = FastAPI(title="OracleGuard API")

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)

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
    audit_data: dict
    ai_analysis: str

class GranularAuditRequest(BaseModel):
    id_base: int
    scripts: List[dict]

class GranularAIRequest(BaseModel):
    id_base: int
    results: dict

class PHVAnalysisRequest(BaseModel):
    sql_id: str
    query: str
    plans: List[dict] # Liste des plans d'exécution (chaque plan est une liste d'étapes)

class AuditRunRequest(BaseModel):
    id_base: int
    scripts_ids: Optional[List[int]] = None

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

@app.post("/api/audit/run")
def start_audit_workflow(req: AuditRunRequest):
    """
    Workflow d'audit complet : Exécution sur cible -> Stockage Oracle -> Retour ID_AUDIT.
    Supporte la sélection granulaire via scripts_ids.
    """
    id_audit, error = db_functions.run_audit_workflow(req.id_base, req.scripts_ids)
    if error:
        raise HTTPException(status_code=500, detail=error)
    return {"id_audit": id_audit}

@app.get("/api/audit/results/{id_audit}")
def get_audit_workflow_results(id_audit: int):
    """
    Récupère les résultats formatés d'un audit via son identifiant unique numérique.
    """
    results, error = db_functions.get_audit_workflow_results(id_audit)
    if error:
        raise HTTPException(status_code=404, detail=error)
    return {"id_audit": id_audit, "results": results}

@app.get("/api/audit-results")
def get_latest_audit_results(id_base: int = Query(...)):
    """
    Récupère les derniers résultats d'audit disponibles pour une base spécifique.
    """
    results, error = db_functions.get_latest_audit_results(id_base)
    if error:
        raise HTTPException(status_code=404, detail=error)
    return {"results": results}

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

@app.get("/api/sql-phv-list/{id_base}")
async def sql_phv_list(id_base: int):
    data, err = db_functions.get_sql_phv_list(id_base)
    if err: raise HTTPException(status_code=400, detail=f"Erreur DB: {err}")
    return {"data": data}

@app.get("/api/sql-phvs/{id_base}/{sql_id}")
async def sql_phvs(id_base: int, sql_id: str):
    phvs, err = db_functions.get_sql_phvs_for_id(id_base, sql_id)
    if err: raise HTTPException(status_code=400, detail=f"Erreur DB: {err}")
    return {"phvs": phvs}

@app.get("/api/sql-plan-details/{id_base}")
async def sql_plan_details(id_base: int, sql_id: str, phv: str):
    data, err = db_functions.get_sql_plan_details(id_base, sql_id, phv)
    if err: raise HTTPException(status_code=400, detail=f"Erreur DB: {err}")
    return {"data": data}

@app.get("/api/tables/{id_base}/{table_name}/stats")
async def get_table_stats(id_base: int, table_name: str):
    """ Récupère l'autopsie complète d'une table Oracle """
    data, err = db_functions.get_table_autopsy(id_base, table_name)
    if err: raise HTTPException(status_code=400, detail=f"Erreur DB: {err}")
    return {"data": data}


@app.get("/api/indexes/{id_base}/{index_name}/analysis")
async def get_index_analysis(id_base: int, index_name: str):
    """ Récupère l'analyse complète d'un index Oracle (5 scripts) """
    data, err = db_functions.get_index_analysis(id_base, index_name)
    if err: raise HTTPException(status_code=400, detail=f"Erreur DB: {err}")
    return {"data": data}

@app.post("/api/indexes/{id_base}/{owner}/{index_name}/validate")
async def validate_index(id_base: int, owner: str, index_name: str):
    """ Déclenche ANALYZE INDEX ... VALIDATE STRUCTURE et retourne les stats de fragmentation """
    data, err = db_functions.validate_index_structure(id_base, owner, index_name)
    if err: raise HTTPException(status_code=400, detail=err)
    return {"data": data}



@app.get("/api/diagnostics/scripts")
def get_diagnostics_scripts():
    return db_functions.get_scripts_categorizes()

@app.post("/api/audit/granular")
def run_granular_audit(req: GranularAuditRequest):
    ok, msg, data = db_functions.executer_audit_granulaire(req.id_base, req.scripts)
    if not ok: raise HTTPException(status_code=400, detail=msg)
    return {"message": msg, "data": data}

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
@app.put("/api/scripts/{script_id}")
def update_script(script_id: int, req: ScriptRequest):
    ok, msg = db_functions.modifier_metrique(script_id, req.Nom_Scripte, req.Contenu_Script, req.id_type_base, req.id_type_metrique)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

@app.delete("/api/scripts/{script_id}")
def delete_script(script_id: int):
    ok, msg = db_functions.supprimer_metrique(script_id)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}
@app.post("/api/scripts/upload-zip")
async def upload_scripts_zip(file: UploadFile = File(...), db_type: str = Form(...)):
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Seuls les fichiers .zip sont acceptés")
    
    scripts = []
    try:
        # Lecture du contenu du fichier en RAM
        contents = await file.read()
        zip_buffer = io.BytesIO(contents)
        
        with zipfile.ZipFile(zip_buffer, 'r') as z:
            for filename in z.namelist():
                # Ignorer les dossiers et les fichiers non-SQL
                if filename.endswith('.sql') and not filename.startswith('__MACOSX'):
                    with z.open(filename) as f:
                        sql_content = f.read().decode('utf-8')
                        # Utiliser le nom du fichier sans le chemin complet si nécessaire
                        clean_name = filename.split('/')[-1]
                        scripts.append({
                            "nom": clean_name,
                            "sql": sql_content,
                            "type": db_type
                        })
        
        return {"message": "succès", "scripts": scripts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'extraction : {str(e)}")

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

@app.post("/api/ai/analyze_granular")
async def analyze_granular(req: GranularAIRequest):
    try:
        analysis_result = ai_service.analyze_granular_results(req.results)
        return {"rapport_ia": analysis_result}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/ai/analyze-phv")
async def analyze_phv(req: PHVAnalysisRequest):
    try:
        analysis = ai_service.analyze_phv_plans(req.query, req.plans)
        return {"analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/analyze_audit")
async def analyze_audit(req: AuditAnalysisRequest):
    ok, msg, audit_data = db_functions.executer_audit_complet(req.id_base)
    if not ok: raise HTTPException(status_code=503, detail=msg)

    # SECURE STAGE 1: Get latest data + previous audit data for local comparison
    last_audit_data = db_functions.get_last_audit_data(req.id_base)

    try:
        # SECURE PIPELINE ORCHESTRATION: 
        # Local JSON diagnosis -> anomaly extraction -> Cloud remedies
        analysis_result = ai_service.analyze_database_health(audit_data, last_audit_data)
        
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
    """ Génère et enregistre un rapport PDF consolé (Métriques + IA) """
    ok, msg = db_functions.save_audit_report(req.id_base, req.audit_data, req.ai_analysis)
    if not ok: raise HTTPException(status_code=500, detail=msg)
    return {"message": msg}

@app.delete("/api/reports/{id_audit}")
async def delete_report(id_audit: int):
    """ Supprime un rapport de l'historique """
    ok, msg = db_functions.delete_audit_report(id_audit)
    if not ok: raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

@app.get("/api/reports/{id_audit}/data")
async def get_report_data(id_audit: int):
    """ Récupère les données brutes et l'analyse IA d'un rapport historique """
    data, error = db_functions.get_report_data(id_audit)
    if error: raise HTTPException(status_code=404, detail=error)
    return data

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