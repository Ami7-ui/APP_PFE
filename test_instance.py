import oracledb
try:
    conn = oracledb.connect(user='oracledb', password='oracledb', dsn='172.16.2.25:1521/FREEPDB1')
    cur = conn.cursor()
    cur.execute("SELECT STARTUP_TIME FROM V$INSTANCE")
    print(cur.fetchone())
except Exception as e:
    print("Error:", e)
