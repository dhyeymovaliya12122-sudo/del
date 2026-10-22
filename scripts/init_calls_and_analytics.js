const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, '..', 'data', 'whatsapp.db');
const db = new Database(dbPath);

console.log('--- Initializing Calls & Live Telemarketing Analytics ---');

// 1. Create whatsapp_calls table
db.exec(`
  CREATE TABLE IF NOT EXISTS whatsapp_calls (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    caller_jid TEXT NOT NULL,
    caller_name TEXT,
    direction TEXT DEFAULT 'incoming',
    status TEXT DEFAULT 'connected',
    duration INTEGER DEFAULT 0,
    is_video BOOLEAN DEFAULT 0,
    is_group BOOLEAN DEFAULT 0,
    timestamp BIGINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_wa_calls_acc_ts ON whatsapp_calls (account_id, timestamp);
  CREATE INDEX IF NOT EXISTS idx_wa_calls_caller_ts ON whatsapp_calls (caller_jid, timestamp);
`);

console.log('✅ Table whatsapp_calls ensured.');

// Fetch default account ID
const account = db.prepare('SELECT id FROM whatsapp_accounts LIMIT 1').get();
const accountId = account ? account.id : '56ba4445-fcca-4c14-80f9-f4b69c53dc45';

// Fetch real contacts to use for realistic call and message generation
const contacts = db.prepare("SELECT id, name, notify_name, phone_number FROM whatsapp_contacts WHERE name != '' LIMIT 50").all();
console.log(`Found ${contacts.length} named contacts.`);

// 2. Check existing call count
const callCount = db.prepare('SELECT count(*) as c FROM whatsapp_calls').get().c;
console.log(`Current call count in database: ${callCount}`);

const now = new Date();
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
const yesterdayStart = todayStart - 86400000;
const lastWeekStart = todayStart - 7 * 86400000;

if (callCount === 0) {
  console.log('Seeding initial call records for Today, Yesterday, and Last Week...');
  const insertCall = db.prepare(`
    INSERT INTO whatsapp_calls (id, account_id, caller_jid, caller_name, direction, status, duration, is_video, is_group, timestamp, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(? / 1000, 'unixepoch'))
  `);

  const seedBatch = db.transaction(() => {
    // Helper to generate calls for a timeframe
    function generateCalls(targetTotal, targetConnected, targetIncoming, targetOutgoing, targetMissed, targetRejected, targetNever, targetNotPickup, startTime, endTime) {
      let created = 0;
      const span = endTime - startTime;

      for (let i = 0; i < targetTotal; i++) {
        const contact = contacts[i % contacts.length] || { id: `9198765432${i}@s.whatsapp.net`, name: `Client #${i + 1}` };
        const ts = startTime + Math.floor(Math.random() * span);
        
        let direction = i < targetIncoming ? 'incoming' : 'outgoing';
        let status = 'connected';
        let duration = 0;

        if (i < targetConnected) {
          status = 'connected';
          duration = Math.floor(25 + Math.random() * 280); // 25s to 305s
        } else if (i < targetConnected + targetMissed) {
          status = 'missed';
          duration = 0;
        } else if (i < targetConnected + targetMissed + targetRejected) {
          status = 'rejected';
          duration = 0;
        } else if (i < targetConnected + targetMissed + targetRejected + targetNever) {
          status = 'never_attended';
          duration = 0;
        } else {
          status = 'not_pickup';
          duration = 0;
        }

        const callId = `call_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`;
        insertCall.run(
          callId,
          accountId,
          contact.id,
          contact.name || contact.notify_name || 'Client',
          direction,
          status,
          duration,
          0,
          0,
          ts,
          ts
        );
        created++;
      }
      return created;
    }

    // Today (30 calls)
    generateCalls(30, 11, 2, 28, 12, 1, 2, 4, todayStart + 9 * 3600000, now.getTime());
    // Yesterday (835 calls)
    generateCalls(835, 449, 139, 696, 71, 11, 8, 296, yesterdayStart + 9 * 3600000, todayStart - 3600000);
    // Last Week (previous 5 days: ~3763 calls)
    generateCalls(3763, 1921, 579, 3184, 382, 4, 33, 468, lastWeekStart, yesterdayStart);
  });

  seedBatch();
  const newCallCount = db.prepare('SELECT count(*) as c FROM whatsapp_calls').get().c;
  console.log(`✅ Seeded calls successfully! Total calls in database: ${newCallCount}`);
}

// 3. Ensure Today and Yesterday have live messages in whatsapp_messages
const todayMsgs = db.prepare('SELECT count(*) as c FROM whatsapp_messages WHERE timestamp >= ?').get(todayStart).c;
console.log(`Today's message count in database: ${todayMsgs}`);

if (todayMsgs === 0) {
  console.log('Seeding recent active live messages for Today and Yesterday...');
  const insertMsg = db.prepare(`
    INSERT INTO whatsapp_messages (id, account_id, chat_jid, sender_jid, sender_name, from_me, text, media_type, status, timestamp, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(? / 1000, 'unixepoch'))
  `);

  const sampleTexts = [
    'Hello, I would like more information regarding the telemarketing campaign.',
    'Please send the pricing proposal and schedule.',
    'Sure, our representative will call you in 10 minutes.',
    'Thank you for confirming your requirement.',
    'Can we reschedule the demo call for 3:00 PM today?',
    'Yes, 3:00 PM works perfectly. Looking forward to speaking with you.',
    'I have shared the catalog brochure.',
    'Got it, reviewing the details now.',
    'Confirmed the deal for 100 seats.',
    'Great working with you!'
  ];

  const msgBatch = db.transaction(() => {
    // Generate 45 messages for today
    for (let i = 0; i < 45; i++) {
      const contact = contacts[i % contacts.length] || { id: `9198765432${i}@s.whatsapp.net`, name: `Client #${i + 1}` };
      const fromMe = i % 2 === 0 ? 1 : 0;
      const ts = todayStart + (i * 12 * 60000) + Math.floor(Math.random() * 60000);
      if (ts > now.getTime()) continue;
      const status = fromMe ? (i % 3 === 0 ? 'read' : 'delivered') : 'delivered';
      const text = sampleTexts[i % sampleTexts.length];
      const mediaType = i % 5 === 0 ? 'image' : i % 7 === 0 ? 'document' : null;
      const id = `MSG_TODAY_${Date.now()}_${i}_${crypto.randomBytes(3).toString('hex')}`;

      insertMsg.run(
        id,
        accountId,
        contact.id,
        fromMe ? `${accountId}@s.whatsapp.net` : contact.id,
        contact.name || 'Client',
        fromMe,
        text,
        mediaType,
        status,
        ts,
        ts
      );
    }

    // Generate 85 messages for yesterday
    for (let i = 0; i < 85; i++) {
      const contact = contacts[i % contacts.length] || { id: `9198765432${i}@s.whatsapp.net`, name: `Client #${i + 1}` };
      const fromMe = i % 2 === 0 ? 1 : 0;
      const ts = yesterdayStart + (i * 15 * 60000) + Math.floor(Math.random() * 60000);
      const status = 'read';
      const text = sampleTexts[i % sampleTexts.length];
      const mediaType = i % 6 === 0 ? 'image' : null;
      const id = `MSG_YEST_${yesterdayStart}_${i}_${crypto.randomBytes(3).toString('hex')}`;

      insertMsg.run(
        id,
        accountId,
        contact.id,
        fromMe ? `${accountId}@s.whatsapp.net` : contact.id,
        contact.name || 'Client',
        fromMe,
        text,
        mediaType,
        status,
        ts,
        ts
      );
    }
  });

  msgBatch();
  const totalMsgs = db.prepare('SELECT count(*) as c FROM whatsapp_messages').get().c;
  console.log(`✅ Seeded recent messages. Total messages in database now: ${totalMsgs}`);
}

console.log('--- Initialization Finished Successfully ---');
