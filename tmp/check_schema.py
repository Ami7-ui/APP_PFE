import sys
import os
sys.path.append('backend')
from oracle_db import get_oracle_connection

def check_schema():
    conn = get_oracle_connection()
    cur = conn.cursor()
    cur.execute("SELECT COLUMN_NAME, DATA_TYPE, NULLABLE FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'METRIQUE'")
    print('Columns in METRIQUE:', cur.fetchall())
    
    cur.execute("SELECT TABLE_NAME FROM USER_TABLES")
    print('Tables:', cur.fetchall())
    
    # Also check TYPE_METRIQUE if it exists
    try:
        cur.execute("SELECT * FROM TYPE_METRIQUE")
        print('Types in TYPE_METRIQUE:', cur.fetchall())
    except:
        print('Table TYPE_METRIQUE does not exist or error.')

if __name__ == "__main__":
    check_schema()
