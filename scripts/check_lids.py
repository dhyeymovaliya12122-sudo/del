import sqlite3, sys
sys.stdout.reconfigure(encoding='utf-8')
conn = sqlite3.connect('data/whatsapp.db')
c = conn.cursor()

c.execute("SELECT id, name, phone_number, notify_name FROM whatsapp_contacts WHERE id LIKE '%@lid%'")
rows = c.fetchall()
print(f"Total @lid contacts in DB: {len(rows)}")
for r in rows:
    print(r)

conn.close()
