import sys
import os
import io

# Force UTF-8 encoding for console output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.append(os.path.join(os.getcwd(), 'backend'))

import db_functions  # type: ignore

def test_audit():
    print("Testing db_functions.executer_audit_basique(1)...") # assuming ID 1 exists
    try:
        ok, msg, data = db_functions.executer_audit_basique(1)
        if not ok:
            print(f"Audit failed: {msg}")
            return
            
        print("Audit successful.")
        
        if "cpu" in data and data["cpu"]:
            cpu_data = data["cpu"]
            print(f"CPU Data Found: busy_pct: {cpu_data.get('busy_pct')}%, history length: {len(cpu_data.get('history', []))}")
        else:
            print("FAILED: No CPU data found.")
            
        if "ram" in data and data["ram"]:
            ram_data = data["ram"]
            print(f"RAM Data Found: ram_pct: {ram_data.get('ram_pct')}%, sga_detail length: {len(ram_data.get('sga_detail', []))}")
        else:
            print("FAILED: No RAM data found.")
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == '__main__':
    test_audit()
