import sqlite3, sys
sys.stdout.reconfigure(encoding='utf-8')
conn = sqlite3.connect('data/whatsapp.db')
c = conn.cursor()

c.execute("SELECT id, name, phone_number, notify_name FROM whatsapp_contacts WHERE id LIKE '%61512672608264%' OR name LIKE '%Raj%'")
print("CONTACTS:")
for r in c.fetchall():
    print(r)

c.execute("SELECT id, name, last_message_text FROM whatsapp_chats WHERE id LIKE '%61512672608264%'")
print("\nCHATS:")
for r in c.fetchall():
    print(r)

c.execute("SELECT id, chat_jid, sender_jid, from_me, text, media_type, datetime(timestamp/1000, 'unixepoch') FROM whatsapp_messages WHERE chat_jid LIKE '%61512672608264%' ORDER BY timestamp DESC LIMIT 20")
print("\nMESSAGES:")
for r in c.fetchall():
    print(r)

conn.close()
