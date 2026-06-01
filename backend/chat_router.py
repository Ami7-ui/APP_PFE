# backend/chat_router.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
import json
import datetime
from openai import OpenAI
import os
import asyncio
from oracle_db import get_oracle_connection

router = APIRouter(prefix="/api/chat", tags=["AI Chatbot"])

# ── MODÈLES PYDANTIC ─────────────────────────────────────────────────────────

class ChatContext(BaseModel):
    module_type: str = "AUDIT"
    contextId: Optional[str] = None
    rawData: Optional[List[Dict]] = None
    errors: Optional[List[str]] = None

class ChatMessage(BaseModel):
    role: str # 'user' ou 'assistant'
    content: str
    created_at: Optional[str] = None

class ChatRequest(BaseModel):
    user_id: str
    conversation_id: str
    message: str
    context: ChatContext
    model: str = "auto" # "auto", "llama3", "nemotron"

# ── GESTIONNAIRE WEBSOCKET ───────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

manager = ConnectionManager()

# ── LOGIQUE PERSISTANCE ORACLE ──────────────────────────────────────────────

def save_message_to_db(conversation_id: str, role: str, content: str, user_id: str = None):
    """Sauvegarde un message dans la base Oracle avec protection CLOB."""
    conn = get_oracle_connection()
    if not conn:
        return False
    try:
        cursor = conn.cursor()

        # 1. Vérifier/Créer la conversation
        # CORRECTION : On utilise 'ID' (et on aligne le nombre de colonnes/valeurs)
        cursor.execute("SELECT COUNT(*) FROM CHAT_CONVERSATIONS WHERE ID = :id", id=conversation_id)
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                "INSERT INTO CHAT_CONVERSATIONS (ID, USER_ID, MODULE_TYPE) VALUES (:id, :uid, :mod)",
                id=conversation_id, uid=user_id, mod="AUDIT"
            )

        # 2. Insérer le message
        # Séquence de sérialisation du contenu textuel/JSON
        serialized_content = json.dumps(content, default=str, ensure_ascii=False)

        # CORRECTION : On s'assure que :cid est bien présent ici pour éviter DPY-4008
        sql = """
        INSERT INTO CHAT_MESSAGES (CONVERSATION_ID, ROLE, CONTENT, CREATED_AT)
        VALUES (:cid, :role, :content, CURRENT_TIMESTAMP)
        """

        import oracledb
        # Configuration des types pour le champ CLOB
        cursor.setinputsizes(None, None, oracledb.DB_TYPE_CLOB)
        cursor.execute(sql, cid=conversation_id, role=role, content=serialized_content)

        conn.commit()
        return True
    except Exception as e:
        print(f"❌ Erreur Oracle Chat : {e}")
        return False
    finally:
        conn.close()

# ── LOGIQUE IA STREAMING ─────────────────────────────────────────────────────

NVIDIA_CLIENT = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY", "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")
)

def get_system_prompt(context: ChatContext):
    """Génère le prompt système en fonction du contexte d'audit."""
    data_str = json.dumps(context.rawData[:10], indent=2) if context.rawData else "Aucune donnée disponible."
    errors_str = ", ".join(context.errors) if context.errors else "Aucune erreur signalée."
    
    return f"""Tu es un Expert DBA Oracle senior. Ton rôle est d'assister l'utilisateur dans l'analyse de ses audits.
CONTEXTE ACTUEL :
- Données d'audit (aperçu) : {data_str}
- Erreurs Oracle détectées : {errors_str}

CONSIGNES :
1. Analyse spécifiquement les lignes de 'resultat_metrique' fournies.
2. Si des codes ORA-XXXXX sont présents, explique-les précisément et propose des solutions.
3. Si un audit affiche '0 LIGNES' ou des valeurs anormales, suggère des causes probables (ex: stats non à jour, manque de droits).
4. Réponds de manière technique mais concise. Utilise le Markdown pour le code SQL et les tableaux.
5. Sois factuel et base tes réponses sur les données fournies."""

async def stream_nemotron(prompt: str, system_prompt: str, websocket: WebSocket):
    """Stream Nvidia Nemotron Cloud."""
    try:
        completion = NVIDIA_CLIENT.chat.completions.create(
            model="nvidia/nvidia-nemotron-nano-9b-v2",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            top_p=0.7,
            max_tokens=2048,
            stream=True
        )
        full_response = ""
        for chunk in completion:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response += content
                await websocket.send_json({"type": "chunk", "content": content})
        return full_response
    except Exception as e:
        await websocket.send_json({"type": "error", "content": f"Nvidia API Error: {str(e)}"})
        return None

# ── ROUTES ───────────────────────────────────────────────────────────────────

@router.websocket("/ws/{user_id}/{conversation_id}")
async def websocket_chat(websocket: WebSocket, user_id: str, conversation_id: str):
    await manager.connect(websocket, conversation_id)
    try:
        while True:
            data = await websocket.receive_text()
            req_data = json.loads(data)
            
            user_message = req_data.get("message")
            context_raw = req_data.get("context", {})
            context = ChatContext(**context_raw)
            model_choice = req_data.get("model", "auto")
            
            # Sauvegarder message utilisateur
            save_message_to_db(conversation_id, "user", user_message, user_id)
            
            # Routage : Utilisation exclusive de Nemotron (NVIDIA)
            selected_model = "nemotron"
            
            await websocket.send_json({"type": "status", "content": f"Assistant utilise {selected_model}..."})
            
            system_prompt = get_system_prompt(context)
            
            ai_response = await stream_nemotron(user_message, system_prompt, websocket)
                
            if ai_response:
                save_message_to_db(conversation_id, "assistant", ai_response, user_id)
                await websocket.send_json({"type": "done"})
                
    except WebSocketDisconnect:
        manager.disconnect(conversation_id)
    except Exception as e:
        print(f"WebSocket Error: {e}")
        manager.disconnect(conversation_id)

@router.get("/history/{conversation_id}")
async def get_chat_history(conversation_id: str):
    """Récupère l'historique d'une conversation avec safeParse côté serveur (optionnel)."""
    conn = get_oracle_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="DB Connection failed")
    try:
        cursor = conn.cursor()
        sql = """
            SELECT ROLE, CONTENT, TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') 
            FROM CHAT_MESSAGES 
            WHERE CONVERSATION_ID = :id 
            ORDER BY CREATED_AT ASC
        """
        cursor.execute(sql, id=conversation_id)
        history = []
        for r in cursor.fetchall():
            raw_content = r[1].read() if hasattr(r[1], 'read') else str(r[1])
            # On tente de désérialiser le JSON stocké via json.dumps
            try:
                content = json.loads(raw_content)
            except:
                content = raw_content # Fallback si pas de JSON
                
            history.append({
                "role": r[0],
                "content": content,
                "created_at": r[2]
            })
        return history
    finally:
        conn.close()
