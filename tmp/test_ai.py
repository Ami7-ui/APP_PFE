import sys
sys.path.append('c:/app.py/backend')
import ai_service
import json

dummy_audit = {
    "performance": {"cpu": 10, "ram": 20},
    "storage": {"total": 100},
    "connections": {"active": 5},
    "queries": {"top": []},
    "replication": {"status": "OK"},
    "metier": {"count": 100}
}

print("Testing AI Service Orchestration...")
try:
    res = ai_service.analyze_database_health(dummy_audit, None)
    print("Result:", json.dumps(res, indent=2))
except Exception as e:
    print("Fatal Error:", str(e))
