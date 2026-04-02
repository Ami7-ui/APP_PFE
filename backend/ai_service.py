import json
import ollama

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


def analyze_database_health(audit_data: dict) -> dict:
    """
    Envoie le rapport au modèle LLaMA 3 avec des consignes DBA strictes et
    retourne un dictionnaire (JSON) formaté.
    """
    
    # Sérialisation propre des données d'entrée
    context_data = serialize_audit_data(audit_data)

    # System Prompt très direct et impersonnel.
    system_prompt = """Tu es un Administrateur de Base de Données (DBA) Senior. 
Règles absolues :
1. N'utilise AUCUNE formule de politesse (pas de bonjour, pas de conclusion, pas de texte d'introduction).
2. Base-toi EXCLUSIVEMENT sur les composantes de l'audit système fournies (Version, Sessions, Requêtes SQL, CPU, RAM). Ne présume rien. N'invente rien.
3. Formule un diagnostic complet, approfondi et purement factuel, et apporte des solutions techniques concrètes et adaptées.
4. Tu DOIS répondre uniquement avec un objet JSON valide reprenant exactement la structure suivante :
{
  "diagnostic_approfondi": "Analyse détaillée et approfondie de l'état système (max 4 phrases).",
  "anomalies_critiques": ["liste détaillée des dysfonctionnements graves constatés"],
  "recommandations_techniques": [
    {
      "probleme": "Description du point à optimiser",
      "solution_technique": "Action correctrice détaillée (ex: Code SQL, modification de paramètre interne)",
      "impact_attendu": "Résultat technique espéré (ex: baisse de X% CPU)"
    }
  ]
}"""

    # User Prompt
    user_prompt = f"Voici les données systèmes issues du dernier audit :\n\n{context_data}\n\nGénère l'analyse JSON associée."

    try:
        # Appel à Ollama avec format forcé et température à 0.1
        response = ollama.chat(
            model='llama3',
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ],
            format='json',
            options={
                'temperature': 0.1
            }
        )
        
        raw_output = response['message']['content']
        
        # Désérialiser la réponse renvoyée par LLaMA pour s'assurer qu'elle est exploitable en Python
        try:
            parsed_json = json.loads(raw_output)
            return parsed_json
        except json.JSONDecodeError:
            # Sécurité au cas où le LLM ne respecte pas le JSON strict
            return {
                "diagnostic_approfondi": "Erreur lors du parsing JSON de la réponse de l'IA. Le LLM n'a pas renvoyé le bon format.",
                "anomalies_critiques": ["Contenu non-JSON retourné par Ollama."],
                "recommandations_techniques": []
            }
            
    except Exception as e:
        return {
            "diagnostic_approfondi": f"Erreur de communication avec l'agent local Ollama : {str(e)}",
            "anomalies_critiques": [],
            "recommandations_techniques": []
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
