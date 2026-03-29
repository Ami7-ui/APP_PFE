import sys
import os
import io
# Force UTF-8 encoding for console output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import db_functions
from main import ScriptRequest, SqlRequest

def test_db_functions():
    print("Testing db_functions.get_all_metriques()...")
    try:
        scripts = db_functions.get_all_metriques()
        if not scripts:
            print("No scripts found in DB, please ensure the database is accessible and has data.")
        else:
            s = scripts[0]
            expected_keys = ["ID", "Nom_Scripte", "Contenu_Script", "Type_Scripte"]
            missing = [k for k in expected_keys if k not in s]
            if missing:
                print(f"FAILED: Missing keys in get_all_metriques: {missing}")
            else:
                print(f"SUCCESS: get_all_metriques returned keys: {list(s.keys())}")
    except Exception as e:
        print(f"ERROR testing db_functions: {e}")

def test_models():
    print("\nTesting Pydantic models in main.py...")
    try:
        # Test ScriptRequest matches frontend (Nom_Scripte, Contenu_Script, Type_Scripte)
        req = ScriptRequest(
            Nom_Scripte="Test Script",
            Contenu_Script="SELECT 1 FROM DUAL",
            Type_Scripte="Audit"
        )
        print(f"SUCCESS: ScriptRequest model is correct: {req.model_dump()}")
        
        # Test SqlRequest (used for execution)
        sql_req = SqlRequest(script="SELECT * FROM v$session")
        print(f"SUCCESS: SqlRequest model is correct: {sql_req.model_dump()}")
    except Exception as e:
        print(f"FAILED: Model mismatch: {e}")

if __name__ == "__main__":
    test_db_functions()
    test_models()
