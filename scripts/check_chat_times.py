import sqlite3

conn = sqlite3.connect('data/whatsapp.db')
c = conn.cursor()
c.execute("""
SELECT id, account_id, name, last_message_text, last_message_timestamp, last_message_status 
FROM whatsapp_chats 
WHERE id LIKE '%63900%' OR id LIKE '%4866751652038%'
""")
for r in c.fetchall():
    print(r)
