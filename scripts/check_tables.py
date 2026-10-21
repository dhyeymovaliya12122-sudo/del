import sqlite3
import os
import json
from datetime import datetime

db_path = './data/whatsapp.db'
con = sqlite3.connect(db_path)
con.row_factory = sqlite3.Row
cur = con.cursor()

print("========================================")
print("  WHATSAPP ENGINE DATABASE DEEP SCAN")
print("========================================")

accounts = cur.execute("SELECT id, display_name, phone_number, status, updated_at FROM whatsapp_accounts").fetchall()
print(f"Accounts ({len(accounts)}):")
for acc in accounts:
    print(f"  ID: {acc['id']}")
    print(f"  Name: {acc['display_name']} | Phone: {acc['phone_number']} | Status: {acc['status']} | Updated: {acc['updated_at']}")

print("\n--- MESSAGE BREAKDOWN BY MEDIA TYPE ---")
breakdown = cur.execute("""
    SELECT 
        COALESCE(media_type, 'text') as mType, 
        COUNT(*) as total,
        SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as outbound,
        SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as inbound
    FROM whatsapp_messages 
    GROUP BY mType
""").fetchall()
for b in breakdown:
    print(f"  Type: {b['mType']:<12} | Total: {b['total']:>4} | Outbound: {b['outbound']:>4} | Inbound: {b['inbound']:>4}")

print("\n--- RECENT 10 MESSAGES ---")
last_msgs = cur.execute("""
    SELECT id, chat_jid, sender_name, from_me, media_type, media_url, text, timestamp 
    FROM whatsapp_messages 
    ORDER BY timestamp DESC 
    LIMIT 10
""").fetchall()
for m in last_msgs:
    direction = "OUT (->)" if m['from_me'] else "IN  (<-)"
    t = datetime.fromtimestamp(m['timestamp'] / 1000.0).strftime('%Y-%m-%d %H:%M:%S') if m['timestamp'] else 'N/A'
    txt = (m['text'] or '').replace('\n', ' ')[:40]
    print(f"[{direction}] [{t}] {m['sender_name'] or m['chat_jid'][:20]}: ({m['media_type'] or 'text'}) {txt} [url: {m['media_url'] or 'none'}]")

print("\n--- MEDIA MESSAGES DETAIL (LAST 10) ---")
media_msgs = cur.execute("""
    SELECT id, chat_jid, sender_name, from_me, media_type, media_url, file_name, mime_type, file_size, timestamp 
    FROM whatsapp_messages 
    WHERE media_type IS NOT NULL 
    ORDER BY timestamp DESC 
    LIMIT 10
""").fetchall()
if not media_msgs:
    print("  No media messages found in database yet.")
else:
    for m in media_msgs:
        direction = "OUT" if m['from_me'] else "IN"
        print(f"  [{direction}] ID: {m['id']} | Type: {m['media_type']} | MIME: {m['mime_type']} | File: {m['file_name']} | Size: {m['file_size']} | URL: {m['media_url']}")

print("\n--- MEDIA DIRECTORY ON DISK ---")
media_dir = './data/media'
if os.path.exists(media_dir):
    files = []
    for r, d, f in os.walk(media_dir):
        for file in f:
            full = os.path.join(r, file)
            files.append((full, os.path.getsize(full)))
    print(f"Total media files on disk: {len(files)}")
    for fp, sz in files[-15:]:
        print(f"  {fp} ({sz} bytes)")
else:
    print(f"Directory {media_dir} does not exist.")

print("========================================")
