import sys
import os
sys.path.append('backend')
from oracle_db import get_oracle_connection

def check_data():
    conn = get_oracle_connection()
    cur = conn.cursor()
    
    print('Checking METRIQUE table...')
    cur.execute("SELECT ID_METRIQUE, NOM_METRIQUE, ID_TYPE_BASE, ID_TYPE_METRIQUE FROM METRIQUE")
    rows = cur.fetchall()
    print(f'Total rows in METRIQUE: {len(rows)}')
    for r in rows:
        print(f'ID: {r[0]}, Name: {r[1]}, TypeBase: {r[2]}, TypeMetrique: {r[3]}')
        
    print('\nChecking TYPE_BASE_CIBLE table...')
    cur.execute("SELECT ID_TYPE_BASE, NOM_TYPE FROM TYPE_BASE_CIBLE")
    print(cur.fetchall())
    
    print('\nChecking TYPE_METRIQUE table...')
    cur.execute("SELECT ID_TYPE_METRIQUE, NOM_TYPE FROM TYPE_METRIQUE")
    print(cur.fetchall())

if __name__ == "__main__":
    check_data()
