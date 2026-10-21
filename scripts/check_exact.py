import sqlite3
import sys

conn = sqlite3.connect('data/whatsapp.db')
c = conn.cursor()
c.execute("""
SELECT id, account_id, chat_jid, sender_jid, from_me, text, is_edited, media_type, timestamp 
FROM whatsapp_messages 
WHERE chat_jid = '4866751652038@lid' OR chat_jid = '916390035039@s.whatsapp.net'
ORDER BY timestamp ASC
""")
msgs = c.fetchall()
print(f"MESSAGES COUNT: {len(msgs)}")
for m in msgs:
    sys.stdout.buffer.write((repr(m) + '\n').encode('utf-8'))
