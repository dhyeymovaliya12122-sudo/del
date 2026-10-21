import sqlite3
import sys
import time

conn = sqlite3.connect('data/whatsapp.db')
c = conn.cursor()
c.execute("""
    SELECT id, chat_jid, sender_jid, from_me, text, is_edited, timestamp 
    FROM whatsapp_messages 
    ORDER BY timestamp DESC
    LIMIT 30
""")
rows = c.fetchall()
for r in rows:
    sys.stdout.buffer.write((repr(r) + '\n').encode('utf-8'))
