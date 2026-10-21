import sqlite3

con = sqlite3.connect('./data/whatsapp.db')
cur = con.cursor()
for t in ['whatsapp_accounts', 'whatsapp_messages', 'whatsapp_chats']:
    cols = cur.execute(f"PRAGMA table_info({t})").fetchall()
    print(f"\nCOLUMNS IN {t}:")
    for c in cols:
        print(f"  {c[1]} ({c[2]})")
