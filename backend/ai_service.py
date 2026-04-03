import json
import ollama
from openai import OpenAI

def serialize_audit_data(audit_data: dict) -> str:
    """
    Sérialise le dictionnaire d'audit en une chaîne d'informations structurée (Markdown/Texte)
    optimisée pour l'analyse par le LLM.
    """
    if not audit_data:
        return "Aucune donnée d'audit fournie."

    lines = ["### RAPPORT D'AUDIT SYSTÈME ###\n"]

    # 1. Analyse Versioning
    version = audit_data.get('version', [])
    if version:
        version_str = version[0] if isinstance(version, list) and len(version) > 0 else version
        lines.append(f"-> INFOS VERSION: {version_str}\n")

    # 2. Analyse CPU
    cpu = audit_data.get('cpu', {})
    if cpu:
        lines.append(f"-> CPU: {cpu.get('busy_pct', 0)}% Actif, {cpu.get('idle_pct', 0)}% Inactif")
        history = cpu.get('history', [])
        if history:
            lines.append("   [Top Consommateurs CPU]:")
            for h in history:
                lines.append(f"     - Utilisateur: {h.get('User')}, Temps CPU: {h.get('CPU')}s")
    
    # 2. Analyse RAM
    ram = audit_data.get('ram', {})
    if ram:
        lines.append(f"\n-> RAM: {ram.get('ram_pct', 0)}% utilisée ({ram.get('used_mb', 0)} Mo / {ram.get('max_mb', 0)} Mo)")
        lines.append(f"   [PGA]: {ram.get('pga_total_mb', 0)} Mo | [SGA Totale]: {ram.get('sga_total_mb', 0)} Mo")
        sga_detail = ram.get('sga_detail', [])
        if sga_detail:
            lines.append("   [Détail SGA]:")
            for d in sga_detail:
                if d.get("Composant") not in ["Total SGA", "Maximum SGA Size"]:
                    lines.append(f"     - {d.get('Composant')}: {d.get('Mo')} Mo")

    # 3. Exécution SQL
    sql_top = audit_data.get('sql', [])
    if sql_top:
        lines.append("\n-> REQUÊTES SQL LES PLUS COÛTEUSES (Top):")
        for s in sql_top:
            lines.append(f"   [SQL_ID: {s.get('SQL_ID')}] | Exécutions: {s.get('EXECUTIONS')}")
            lines.append(f"   Mémoire totale allouée: {s.get('TOTAL_MEM_MB', 'N/A')} Mo")
            lines.append(f"   Extrait: {s.get('SQL_TEXT', '')}...")

    # 4. Sessions Actives / Bloquées
    sessions = audit_data.get('session', [])
    if sessions:
        active_count = sum(1 for s in sessions if s.get('STATUS') == 'ACTIVE')
        lines.append(f"\n-> SESSIONS: {len(sessions)} totales, {active_count} actives.")

    return "\n".join(lines)


def get_llama3_junior(context_data: str) -> str:
    """
    Rôle 'Junior' : Analyse les métriques et identifie les anomalies sans donner de solutions.
    """
    system_prompt = "Tu es un assistant DBA. Analyse ces métriques de base de données (Mémoire Partageable, Persistante, d'Exécution) et identifie de manière approfondie les anomalies et requêtes gourmandes. Ne donne pas de solutions, fais juste le constat."
    
    try:
        response = ollama.chat(
            model='llama3',
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': context_data}
            ],
            options={'temperature': 0.1}
        )
        return response['message']['content']
    except Exception as e:
        raise Exception(f"Erreur Llama 3 (Junior) : {str(e)}")

def get_nvidia_senior(diagnostic_text: str) -> str:
    """
    Rôle 'Senior' : Prend le diagnostic Junior et propose 3 solutions expertes.
    """
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key="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"
    )
    
    try:
        completion = client.chat.completions.create(
            model="nvidia/nvidia-nemotron-nano-9b-v2",
            messages=[
                {"role": "system", "content": "Tu es un Administrateur de Base de Données Oracle Expert. Lis le diagnostic d'anomalies suivant et propose 3 solutions techniques précises, claires et concises sous forme de liste pour résoudre ces problèmes."},
                {"role": "user", "content": diagnostic_text}
            ],
            temperature=0.2,
            top_p=0.7,
            max_tokens=1024,
        )
        return completion.choices[0].message.content
    except Exception as e:
        raise Exception(f"Erreur Nvidia API (Senior) : {str(e)}")

def analyze_database_health(audit_data: dict) -> dict:
    """
    Orchestration Hybride Junior/Senior.
    """
    context_data = serialize_audit_data(audit_data)
    
    try:
        # Étape 1 : Junior (Llama 3 Local)
        diagnostic_local = get_llama3_junior(context_data)
        
        # Étape 2 : Senior (Nvidia Cloud)
        solutions_expertes = get_nvidia_senior(diagnostic_local)
        
        return {
            "status": "success",
            "diagnostic_local": diagnostic_local,
            "solutions_expertes": solutions_expertes
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "diagnostic_local": "Échec de l'analyse.",
            "solutions_expertes": "Indisponible."
        }

def analyze_sql_performance(sql_query: str, explain_plan: str) -> dict:
    """
    Analyse spécifiquement une requête SQL et son plan d'exécution.
    """
    system_prompt = """Tu es un Expert en Performance Oracle/MySQL. 
Règles :
1. Pas de politesse.
2. Réponds uniquement avec un objet JSON. 
Structure attendue :
{
  "points_critiques": ["liste des goulots d'étranglement (Full Table Scan, Sorts, etc.)"],
  "analyse_plan": "Explication technique du plan d'exécution.",
  "script_optimise": "La requête SQL réécrite ou les DDL d'indexation recommandés.",
  "impact_performance": "Gain de performance estimé."
}"""

    user_prompt = f"SQL:\n{sql_query}\n\nPLAN D'EXÉCUTION:\n{explain_plan}"

    try:
        response = ollama.chat(
            model='llama3',
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ],
            format='json',
            options={'temperature': 0.1}
        )
        return json.loads(response['message']['content'])
    except Exception as e:
        return {"error": str(e), "points_critiques": ["Erreur d'analyse IA"]}

def ask_dba_expert(prompt: str) -> dict:
    """
    Répond à une question technique générale sur les bases de données.
    """
    system_prompt = """Tu es un DBA Senior. 
Règles : 
1. Pas de politesse. 
2. Factuel. 
3. Formats JSON uniquement.
Structure :
{
  "reponse": "La réponse technique directe.",
  "details_techniques": "Détails approfondis sur le fonctionnement interne.",
  "actions_suggerees": ["liste d'actions concrètes"]
}"""

    try:
        response = ollama.chat(
            model='llama3',
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': prompt}
            ],
            format='json',
            options={'temperature': 0.1}
        )
        return json.loads(response['message']['content'])
    except Exception as e:
        return {"reponse": f"Erreur : {str(e)}", "details_techniques": "", "actions_suggerees": []}
