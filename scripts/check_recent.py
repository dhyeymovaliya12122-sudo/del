import sqlite3
import sys

conn = sqlite3.connect('data/whatsapp.db')
c = conn.cursor()
c.execute("""
SELECT id, chat_jid, sender_jid, from_me, text, is_edited, media_type, timestamp, created_at
FROM whatsapp_messages 
WHERE timestamp > 1790328000000 OR created_at > '2026-09-25 09:30:00'
ORDER BY timestamp DESC
""")
rows = c.fetchall()
print(f"Messages since 3:00 PM: {len(rows)}")
for r in rows:
    sys.stdout.buffer.write((repr(r) + '\n').encode('utf-8'))
