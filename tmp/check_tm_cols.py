import sys
import os
sys.path.append('backend')
from oracle_db import get_oracle_connection

def check_type_metrique_columns():
    conn = get_oracle_connection()
    cur = conn.cursor()
    cur.execute("SELECT COLUMN_NAME FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'TYPE_METRIQUE'")
    print('Columns in TYPE_METRIQUE:', cur.fetchall())

if __name__ == "__main__":
    check_type_metrique_columns()
