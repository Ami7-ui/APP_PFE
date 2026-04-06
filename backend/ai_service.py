import json
import ollama
from openai import OpenAI

def serialize_audit_data(audit_data: dict) -> str:
    """
    Sérialise le dictionnaire d'audit complet (les 6 catégories) en une chaîne JSON.
    """
    if not audit_data:
        return "{}"
    
    return json.dumps(audit_data, ensure_ascii=False)


def get_llama3_junior(context_data: str) -> str:
    """
    Rôle 'Junior' : Analyse les métriques et identifie les anomalies sans donner de solutions.
    ÉTAPE 1 : Le Diagnosticien (Llama 3 Local)
    Fait un constat sans proposer de solutions.
    """
    system_prompt = """Tu es un Analyste de Base de Données Oracle. Je te fournis les métriques brutes de 6 catégories. 
Ta tâche est UNIQUEMENT de faire un constat. Ne donne PAS de solutions.
Structure ta réponse exactement ainsi :
### 1. 📊 ANALYSE DES 6 CATÉGORIES
[Fais une interprétation claire pour chaque catégorie une par une : Performance, Stockage, Requêtes, Connexions, Réplication/HA, Métier].
### 2. ⚠️ ANOMALIES DÉTECTÉES
[Fais une liste à puces très précise des problèmes critiques ou valeurs anormales que tu as trouvés]."""
    
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
    ÉTAPE 2 : L'Architecte (Nvidia Nemotron Cloud)
    Prend le diagnostic et propose des solutions et de la prévention.
    """
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key="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"
    )
    
    system_prompt = """Tu es un Architecte DBA Oracle Senior. Voici le rapport d'anomalies généré par un analyste. 
Ta tâche est de résoudre ces problèmes et d'anticiper l'avenir.
Structure ta réponse exactement ainsi :
### 3. 🛠️ SOLUTIONS RECOMMANDÉES
[Propose des solutions pour les anomalies listées. RÈGLE ABSOLUE : Pour chaque action nécessitant une modification dans la base, fournis le code SQL ou PL/SQL exact encadré par des triples backticks : ```sql ... ```].
### 4. 🛡️ PRÉVENTION ET BONNES PRATIQUES
[En te basant sur le constat, prédis les problèmes qui pourraient survenir dans les prochains mois et donne des recommandations préventives]."""
    
    try:
        completion = client.chat.completions.create(
            model="nvidia/nvidia-nemotron-nano-9b-v2",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": diagnostic_text}
            ],
            temperature=0.2,
            top_p=0.7,
            max_tokens=4096,
        )
        return completion.choices[0].message.content
    except Exception as e:
        raise Exception(f"Erreur Nvidia API (Senior) : {str(e)}")

def analyze_database_health(audit_data: dict) -> dict:
    """
    Orchestration Séquentielle Junior/Senior.
    """
    context_data = serialize_audit_data(audit_data)
    
    try:
        # Étape 1 : Junior (Llama 3 Local)
        diagnostic_local = get_llama3_junior(context_data)
        
        # Étape 2 : Senior (Nvidia Cloud)
        solutions_expertes = get_nvidia_senior(diagnostic_local)
        
        # Fusion Finale
        texte_final = f"{diagnostic_local}\n\n{solutions_expertes}"
        
        return {
            "status": "success",
            "diagnostic_local": diagnostic_local,
            "solutions_expertes": solutions_expertes,
            "texte_final": texte_final
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "diagnostic_local": "Échec de l'analyse.",
            "solutions_expertes": "Indisponible.",
            "texte_final": f"Erreur lors de la génération du rapport IA : {str(e)}"
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
