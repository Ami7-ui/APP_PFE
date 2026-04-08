# test_pdf_refactor.py
import sys
import os

# Ajouter le chemin du backend pour l'import
sys.path.append(os.path.abspath('c:/app.py/backend'))

from db_functions import AuditPDF, save_audit_report
import json

# Simuler des données d'audit complexes
audit_data = {
    "performance": {
        "cpu": {"busy_pct": 12.5, "idle_pct": 87.5},
        "ram": {"used_mb": 4096, "max_mb": 16384, "history": ["User1: 50MB", "User2: 120MB"]},
        "details": {
            "sub_metrics": {"io_wait": 0.2, "steal": 0.0}
        }
    },
    "storage": {
        "total_gb": 500,
        "tablespaces": ["SYSTEM", "USERS", "TEMP"]
    }
}

ai_analysis = """
### ANALYSE DE L'EXPERTISE IA
Voici les points clés de l'audit pour la base **PROD_ORACLE_01**.

* **Performance CPU** : La charge est faible (12.5%), ce qui est excellent.
* **Mémoire RAM** : 4GB utilisés sur 16GB.
* **Recommandation** : Pensez à vérifier les index sur la table `ORDERS`.

```sql
SELECT index_name, table_name 
FROM all_indexes 
WHERE table_name = 'ORDERS';
```

---
#### Conclusion
Tout semble en ordre pour le moment.
"""

# Mock get_target_credentials to avoid DB connection
import db_functions
db_functions.get_target_credentials = lambda id_base: (None, None, None, None, "PROD_ORACLE_01")
db_functions.get_oracle_connection = lambda: None # Should not be called for PDF generation portion

# Hack save_audit_report to not try to insert into Oracle
original_save = db_functions.save_audit_report

def mock_save_audit_report(id_base, audit_data, ai_analysis_string):
    pdf = AuditPDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # Section 1
    pdf.chapter_title("1. Informations")
    pdf.chapter_body(f"Base : PROD_ORACLE_01")
    
    # Section 2 : Métriques
    pdf.chapter_title("2. Données Brutes")
    for cat, data in audit_data.items():
        pdf.set_font('helvetica', 'B', 12)
        pdf.set_text_color(14, 165, 233)
        pdf.cell(0, 10, f"--> METRIQUES : {cat.upper()}", 0, 1, 'L')
        clean_metrics = pdf.format_data_recursive(data)
        pdf.chapter_body(clean_metrics)
    
    # Section 3 : IA
    pdf.add_page()
    pdf.chapter_title("3. Expertise IA")
    pdf.chapter_body(ai_analysis_string)
    
    output_path = "c:/app.py/tmp/test_report.pdf"
    pdf.output(output_path)
    print(f"PDF généré avec succès dans : {output_path}")
    return True, "OK"

# Run locally
if __name__ == "__main__":
    mock_save_audit_report(1, audit_data, ai_analysis)
