
import sqlite3

conn = sqlite3.connect('data/whatsapp.db')
c = conn.cursor()
c.execute("SELECT id FROM whatsapp_messages WHERE id LIKE 'today_%'")
print('Found dummy messages:', c.fetchall())
c.execute("DELETE FROM whatsapp_messages WHERE id LIKE 'today_%'")
c.execute("DELETE FROM whatsapp_chats WHERE id IN ('919876543210@s.whatsapp.net', '919123456789@s.whatsapp.net', '919888877777@s.whatsapp.net')")
conn.commit()

c.execute("SELECT from_me, COUNT(*) FROM whatsapp_messages GROUP BY from_me")
print('Actual message counts remaining:', c.fetchall())
c.execute("SELECT COUNT(*) FROM whatsapp_messages")
print('Total real messages:', c.fetchone()[0])
conn.close()
