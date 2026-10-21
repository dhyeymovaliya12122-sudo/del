import sqlite3

con = sqlite3.connect('./data/whatsapp.db')
con.row_factory = sqlite3.Row
cur = con.cursor()

print("--- MATCHING CHATS ---")
rows = cur.execute("SELECT id, name, last_message_text, unread_count FROM whatsapp_chats WHERE name LIKE '%Rajai%' OR name LIKE '%Harsh%' OR id LIKE '%61512672608264%'").fetchall()
for r in rows:
    print(dict(r))

print("\n--- MATCHING CONTACTS ---")
c_rows = cur.execute("SELECT id, name, notify_name, phone_number FROM whatsapp_contacts WHERE name LIKE '%Rajai%' OR name LIKE '%Harsh%' OR id LIKE '%61512672608264%'").fetchall()
for r in c_rows:
    print(dict(r))
