import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.abspath("backend"))

import db_functions

# Mock data simulating granular audit results
mock_audit_data = {
    "Script_1_Performance": [
        {"METRIC": "CPU Usage", "VALUE": "15%"},
        {"METRIC": "Active Sessions", "VALUE": "42"}
    ],
    "Script_2_Errors": [
        {"ERROR_CODE": "ORA-00001", "COUNT": "5", "DESCRIPTION": "Unique constraint violated 😊"}
    ]
}

ai_analysis = "### 1. Analyse\nTout va bien.\n### 2. Anomalies\nAucune."

try:
    print("Testing save_audit_report...")
    success, msg = db_functions.save_audit_report(id_base=1, audit_data=mock_audit_data, ai_analysis_string=ai_analysis)
    print(f"Success: {success}, Message: {msg}")
except Exception as e:
    import traceback
    traceback.print_exc()
