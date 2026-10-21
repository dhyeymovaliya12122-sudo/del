import { DataSource } from 'typeorm';
import { WhatsappMessageEntity } from './src/modules/session-hydration/entities/whatsapp-message.entity';
import { KNOWN_LID_MAP } from './src/modules/accounts/utils/contact-resolver.util';

async function test() {
  const ds = new DataSource({
    type: 'sqlite',
    database: 'data/whatsapp.db',
    entities: [WhatsappMessageEntity],
  });
  await ds.initialize();
  const repo = ds.getRepository(WhatsappMessageEntity);

  const accountId = '773eaa53-0a41-45ad-a616-c45bf1cef2cf';
  const chatJid = '916390035039@s.whatsapp.net';

  const cleanJid = decodeURIComponent(chatJid).trim();
  const phone = cleanJid.split('@')[0].replace(/\+/g, '');

  const jidVariants = [
    cleanJid,
    `${phone}@s.whatsapp.net`,
    `${phone}@lid`,
  ];

  for (const [lidKey, info] of Object.entries(KNOWN_LID_MAP)) {
    const cleanLid = lidKey.split('@')[0];
    const cleanPhoneDigits = info.phone.replace(/\D/g, '');
    if (cleanJid.includes(cleanLid) || phone === cleanLid || (cleanPhoneDigits && phone === cleanPhoneDigits)) {
      jidVariants.push(`${cleanLid}@lid`);
      if (cleanPhoneDigits) {
        jidVariants.push(`${cleanPhoneDigits}@s.whatsapp.net`);
      }
    }
  }

  console.log('jidVariants:', jidVariants);

  const messages = await repo
    .createQueryBuilder('msg')
    .where('msg.accountId = :accountId', { accountId })
    .andWhere('msg.chatJid IN (:...jids)', { jids: jidVariants })
    .andWhere('(msg.text IS NOT NULL AND msg.text != :empty OR msg.mediaType IS NOT NULL)', { empty: '' })
    .orderBy('msg.timestamp', 'DESC')
    .take(100)
    .getMany();

  console.log('Found messages count:', messages.length);
  for (const m of messages) {
    console.log({ id: m.id, text: m.text, isEdited: m.isEdited, timestamp: m.timestamp });
  }

  await ds.destroy();
}

test().catch(console.error);
