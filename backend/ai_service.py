import json
import ollama
from openai import OpenAI

def serialize_audit_data(audit_data: dict) -> str:
    """
    Sérialise le dictionnaire d'audit complet (les 6 catégories) en une chaîne JSON.
    Gère le cas où le dictionnaire reçu est le format consolidé {audit_data: ...}.
    """
    if not audit_data:
        return "{}"
    
    # Si on reçoit par erreur le format de stockage complet, on extrait les métriques
    metrics = audit_data.get("audit_data", audit_data) if isinstance(audit_data, dict) else audit_data
    
    return json.dumps(metrics, ensure_ascii=False)


def get_llama3_junior(context_data: str) -> str:
    """
    Rôle 'Junior' : Analyse les métriques et identifie les anomalies sans donner de solutions.
    ÉTAPE 1 : Le Diagnosticien (Llama 3 Local)
    Fait un constat sans proposer de solutions.
    """
    system_prompt = """Tu es un Analyste DBA Oracle fonctionnant en environnement sécurisé local. Je te fournis les métriques du DERNIER audit et de l'audit ACTUEL.
Ta tâche est de comparer ces données pour les 6 catégories et d'isoler les problèmes. Ne donne pas de solutions.
Structure ta réponse OBLIGATOIREMENT ainsi :
### 1. ÉVOLUTION DES 6 CATÉGORIES
Fais un bilan comparatif (Amélioration, Dégradation ou Stabilité) pour TOUTES ces catégories, une par une :
- Performance système : [Ton analyse]
- Stockage : [Ton analyse]
- Requêtes : [Ton analyse]
- Connexions : [Ton analyse]
- Réplication et HA : [Ton analyse]
- Métier : [Ton analyse]

### 2. ANOMALIES ET DÉGRADATIONS
[Fais une liste à puces claire des problèmes critiques ou des régressions détectées entre les deux audits]."""
    
    try:
        print(f"[DEBUG] Appel Llama 3 Junior (Local)...")
        response = ollama.chat(
            model='llama3',
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': context_data}
            ],
            options={'temperature': 0.1}
        )
        result = response['message']['content']
        print(f"[DEBUG] Llama 3 Junior a répondu ({len(result)} chars)")
        return result
    except Exception as e:
        print(f"[ERROR] Échec Llama 3 Junior : {e}")
        raise Exception(f"Erreur Llama 3 (Junior) : {str(e)}")

def get_nvidia_senior(diagnostic_text: str, custom_system_prompt: str = None) -> str:
    """
    ÉTAPE 2 : L'Architecte (Nvidia Nemotron Cloud)
    Prend le diagnostic et propose des solutions et de la prévention.
    """
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key="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"
    )
    
    system_prompt = custom_system_prompt or """Tu es un Architecte DBA Oracle Senior. Voici la liste des anomalies détectées par notre outil de monitoring interne. 
Propose des solutions techniques.
Structure ta réponse OBLIGATOIREMENT ainsi :
### 3. SOLUTIONS RECOMMANDÉES
[Propose des solutions. RÈGLE ABSOLUE : Si une action en base est requise, fournis le code SQL/PLSQL encadré par des triples backticks ```sql].
### 4. PRÉVENTION ET BONNES PRATIQUES
[Donne des conseils pour éviter que ces anomalies ne se reproduisent]."""
    
    try:
        if not diagnostic_text or len(diagnostic_text.strip()) < 10:
            print("[WARNING] Texte de diagnostic vide ou trop court pour Nvidia.")
            return "Aucune anomalie détectée à traiter par l'Expert Cloud."

        print(f"[DEBUG] Appel Nvidia Senior (Cloud)...")
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
        result = completion.choices[0].message.content
        print(f"[DEBUG] Nvidia Senior a répondu ({len(result)} chars)")
        return result
    except Exception as e:
        print(f"[ERROR] Échec Nvidia Senior : {e}")
        raise Exception(f"Erreur Nvidia API (Senior) : {str(e)}")

def extract_anomalies(diagnostic_text: str) -> str:
    """Extraire UNIQUEMENT la section d'anomalies pour l'envoyer au cloud"""
    try:
        import re
        # Extraire le texte après "### 2. ⚠️ ANOMALIES"
        pattern = re.compile(r'### 2\.\s*⚠️\s*ANOMALIES.*?(?=###|$)', re.IGNORECASE | re.DOTALL)
        match = pattern.search(diagnostic_text)
        if match:
            return match.group(0).strip()
        
        # Fallback si LLaMA 3 a mal formaté
        parts = diagnostic_text.split('### 2.')
        if len(parts) > 1:
            return f"### 2.{parts[1]}".strip()
            
        return "Anomalies détectées : " + diagnostic_text
    except Exception as e:
        return diagnostic_text

def analyze_granular_results(granular_data: dict) -> dict:
    """
    Analyse les résultats d'un audit granulaire (sélection de scripts).
    Le format attendu est {"Nom du Script": [lignes_de_donnees], ...}
    """
    context_data = "RÉSULTATS DE L'AUDIT SQL GRANULAIRE :\n"
    context_data += json.dumps(granular_data, ensure_ascii=False, indent=2)
    
    try:
        # Étape 1 : Junior (Llama 3 Local)
        system_prompt = """Tu es un Analyste DBA Oracle. Je te fournis les résultats de plusieurs scripts SQL exécutés sur une base de données.
Ta tâche est d'analyser ces résultats bruts et d'isoler les anomalies ou les points d'attention. Ne donne pas de solutions.
Structure ta réponse OBLIGATOIREMENT ainsi :
### 1. ANALYSE DES RÉSULTATS PAR SCRIPT
[Fais un bilan pour chaque script exécuté].
### 2. ⚠️ ANOMALIES DÉTECTÉES
[Liste les problèmes potentiels trouvés dans les données]."""

        print(f"[DEBUG] Appel Llama 3 Junior pour Audit Granulaire...")
        response = ollama.chat(
            model='llama3',
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': context_data}
            ],
            options={'temperature': 0.1}
        )
        diagnostic_local = response['message']['content']
        
        # Étape 2 : Senior (Nvidia Cloud)
        anomalies_only = extract_anomalies(diagnostic_local)
        solutions_expertes = get_nvidia_senior(anomalies_only)
        
        return {
            "status": "success",
            "diagnostic_local": diagnostic_local,
            "solutions_expertes": solutions_expertes,
            "texte_final": f"{diagnostic_local}\n\n{solutions_expertes}"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def analyze_database_health(audit_data: dict, last_audit_data: dict = None) -> dict:
    """
    Orchestration Séquentielle Junior/Senior Sécurisée.
    """
    context_data = ""
    if last_audit_data and audit_data:
        context_data = f"DERNIER AUDIT:\n{serialize_audit_data(last_audit_data)}\n\n"
        context_data += f"AUDIT ACTUEL:\n{serialize_audit_data(audit_data)}"
    else:
        context_data = f"AUDIT (Pas d'historique dispo):\n{serialize_audit_data(audit_data)}"
    
    try:
        # Étape 1 : Junior (Llama 3 Local) - Reçoit tout le JSON brut
        diagnostic_local = get_llama3_junior(context_data)
        
        # Étape 2 : Sécurisation (Extraire uniquement les anomalies, sans chiffres bruts)
        anomalies_only = extract_anomalies(diagnostic_local)
        
        # Étape 3 : Senior (Nvidia Cloud) - Ne reçoit que les anomalies textes
        solutions_expertes = get_nvidia_senior(anomalies_only)
        
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

def analyze_phv_plans(query: str, plans: list) -> str:
    """
    Analyse les plans d'exécution (PHV) fournis.
    Si un seul plan est fourni, explique sa stratégie.
    Si plusieurs plans sont fournis, les compare.
    """
    system_prompt = """Tu es un expert DBA Oracle Senior. On te fournit une liste de plusieurs plans d'exécution (PHVs) pour un unique SQL_ID. 
Ton objectif est de réaliser une étude comparative pour déterminer quelle stratégie d'exécution est la plus efficace.

RÈGLE DE FORMATAGE OBLIGATOIRE : Lorsque tu génères un tableau comparatif, tu DOIS utiliser la syntaxe Markdown standard ET insérer un véritable retour à la ligne (\\n) après chaque ligne du tableau, y compris après la ligne de séparation (---). Ne génère JAMAIS un tableau sur une seule ligne continue.

Structure ta réponse ainsi :
### 📊 Tableau Comparatif Synthétique
(Crée un petit tableau Markdown comparant les PHVs sur le Coût total, les Lectures Disque et le type de Jointure dominante).

### ⚖️ Analyse Comparative
- Explique pourquoi les plans diffèrent (ex: 'Le PHV X utilise un Index Range Scan alors que le PHV Y force un Full Table Scan').
- Identifie les régressions de performance entre les plans.

### 🏆 Verdict : Le Meilleur PHV
- Désigne clairement le numéro du PHV le plus performant.
- Justifie ce choix (ex: 'Le PHV [Numéro] est optimal car il minimise les entrées/sorties malgré un coût CPU légèrement plus haut').

### 🛡️ Concepts de Stabilisation
- Explique comment "fixer" ce meilleur plan dans Oracle (évoque les concepts de SQL Plan Baselines ou de SQL Profiles sans donner de code brut)."""

    # Préparation du contexte
    user_content = f"REQUÊTE SQL :\n```sql\n{query}\n```\n\n"
    
    for i, plan in enumerate(plans):
        phv = plan.get('phv', f'Plan {i+1}')
        steps = plan.get('steps', [])
        user_content += f"PLAN D'EXÉCUTION (PHV: {phv}) :\n"
        # On simplifie les colonnes pour le prompt
        for s in steps:
            op = s.get('OPERATION') or s.get('operation')
            opt = s.get('OPTIONS') or s.get('options')
            obj = s.get('OBJECT_NAME') or s.get('object_name')
            cost = s.get('COST') or s.get('cost')
            card = s.get('CARDINALITY') or s.get('cardinality')
            depth = s.get('depth', 0)
            user_content += f"{'  ' * depth}- {op} ({opt}) | Object: {obj} | Cost: {cost} | Card: {card}\n"
        user_content += "\n"

    try:
        # On utilise nvidia_senior avec le prompt spécifique défini ci-dessus
        return get_nvidia_senior(user_content, custom_system_prompt=system_prompt)
    except Exception as e:
        # Fallback llama3 local si nvidia échoue
        response = ollama.chat(
            model='llama3',
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_content}
            ],
            options={'temperature': 0.2}
        )
        return response['message']['content']
