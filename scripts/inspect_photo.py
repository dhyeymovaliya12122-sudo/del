import sqlite3, sys
sys.stdout.reconfigure(encoding='utf-8')
conn = sqlite3.connect('data/whatsapp.db')
c = conn.cursor()

c.execute("PRAGMA table_info(whatsapp_messages)")
cols = [r[1] for r in c.fetchall()]
print("COLS:", cols)

c.execute("SELECT * FROM whatsapp_messages WHERE id='AC228175CC67E68A7734D1F745E5DAA8'")
row = c.fetchone()
if row:
    print("\nROW:")
    for k, v in zip(cols, row):
        print(f"  {k}: {v}")

conn.close()
