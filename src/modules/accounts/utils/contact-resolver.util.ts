/**
 * Contact & Phone Number Resolution Utility
 * 
 * Provides consistent, accurate contact name resolution, E.164 phone formatting,
 * LID-to-phone mapping, and group identification across the entire platform
 * (Backend exports, PDF/Excel/ZIP generators, offline viewer, and REST APIs).
 */

export interface ResolvedContactInfo {
  jid: string;
  name: string;
  phoneNumber: string;
  displayPhone: string;
  isGroup: boolean;
  chatType: 'Group' | 'Direct Chat' | 'Self';
}

// ── Dynamic In-Memory Identity Maps (Zero hardcoding)
export const KNOWN_LID_MAP: Record<string, { name: string; phone: string }> = {};
export const KNOWN_PHONE_CONTACTS: Record<string, string> = {};

/**
 * Check whether a string represents a WhatsApp Privacy LID (14-15 digit internal identifier).
 */
export function isLidIdentifier(id: string | undefined | null): boolean {
  if (!id) return false;
  const clean = id.replace(/\+/g, '').split('@')[0].trim();
  return id.includes('@lid') || (/^\d{14,16}$/.test(clean) && !clean.startsWith('919') && !clean.startsWith('918') && !clean.startsWith('917') && !clean.startsWith('916'));
}

/**
 * Strips device suffix (:0, :1, :4, etc.) from sender JID.
 */
export function cleanSenderJid(jid: string | undefined | null): string {
  if (!jid) return '';
  return jid.replace(/:\d+@/, '@');
}

/**
 * Format a raw phone string into clean international E.164 format.
 * Example: '919876543210' -> '+91 98765 43210'
 * Example: '9081236708' -> '+91 90812 36708'
 */
export function formatE164Phone(rawPhone: string | undefined | null): string {
  if (!rawPhone) return '';
  const cleanStr = rawPhone.trim();
  const lower = cleanStr.toLowerCase();
  if (
    lower.includes('group') ||
    lower === 'group chat' ||
    lower === 'direct chat' ||
    lower === 'whatsapp user' ||
    lower === 'whatsapp group' ||
    lower === 'you' ||
    lower === 'you (message yourself)' ||
    lower === 'unknown contact' ||
    lower === 'unknown'
  ) {
    return '';
  }

  // If it's a raw unmapped LID, never add '+' to make it look like a fake international number
  if (isLidIdentifier(cleanStr)) {
    const rawId = cleanStr.replace(/\+/g, '').split('@')[0];
    if (KNOWN_LID_MAP[rawId]) {
      return KNOWN_LID_MAP[rawId].phone;
    }
    return ''; // Return empty or unformatted reference, never fake +country prefix
  }

  const digits = cleanStr.replace(/\D/g, '');
  if (!digits) return '';

  // Indian number with country code 91: 12 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  // Indian standard 10 digit mobile (starting 6,7,8,9)
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  // Already has + and valid 10-15 digits
  if (cleanStr.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return cleanStr;
  }

  // Australian / International format
  if (digits.startsWith('61') && digits.length >= 11 && digits.length <= 13) {
    return `+61 ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }

  // US/Canada format (11 digits starting with 1 or 10 digits)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // UK format (44)
  if (digits.startsWith('44') && digits.length >= 11 && digits.length <= 13) {
    return `+44 ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }

  // Standard international mobile numbers (10 to 15 digits)
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  // Any digits at least 7
  if (digits.length >= 7) {
    return `+${digits}`;
  }

  return '';
}

export const formatE164 = formatE164Phone;

/**
 * Check whether a JID or ID represents a WhatsApp Group.
 */
export function isGroupJid(jid: string | undefined | null): boolean {
  if (!jid) return false;
  const clean = jid.toLowerCase().trim();
  return (
    clean.endsWith('@g.us') ||
    clean.startsWith('120363') ||
    (clean.includes('-') && !clean.startsWith('+'))
  );
}

export interface UnifiedContactEntry {
  id: string;
  name: string;
  phoneNumber: string;
  chatType: 'Group' | 'Direct Chat' | 'Self';
  isGroup: boolean;
  notifyName: string;
  unreadCount?: number;
  lastMessageTimestamp?: number;
  source: 'chat' | 'saved_contact';
  accountId: string;
}

/**
 * Universal Unified Contacts Directory builder for in-memory chat & contact lists.
 */
export function buildUnifiedContactsDirectory(
  chats: Array<{ id: string; name?: string; isGroup?: boolean; unreadCount?: number; lastMessageTimestamp?: number | string; accountId?: string }>,
  contacts: Array<{ id: string; name?: string; phoneNumber?: string; notifyName?: string; accountId?: string }>,
  accountPhone = '',
  defaultAccountId = 'default'
): UnifiedContactEntry[] {
  const directory: UnifiedContactEntry[] = [];
  const seenJids = new Set<string>();

  // 1. Process active conversations
  for (const chat of chats) {
    if (!chat.id || chat.id === 'status@broadcast') continue;
    const resolved = resolveContactInfo(chat.id, chat.name, null, null, chat.isGroup, accountPhone);
    seenJids.add(chat.id);
    seenJids.add(chat.id.split('@')[0]);

    directory.push({
      id: chat.id,
      name: resolved.name,
      phoneNumber: resolved.phoneNumber,
      chatType: resolved.chatType,
      isGroup: resolved.isGroup,
      notifyName: '',
      unreadCount: chat.unreadCount || 0,
      lastMessageTimestamp: Number(chat.lastMessageTimestamp) || 0,
      source: 'chat',
      accountId: chat.accountId || defaultAccountId,
    });
  }

  // 2. Process genuine saved address-book contacts
  for (const c of contacts) {
    if (!c.id || seenJids.has(c.id) || seenJids.has(c.id.split('@')[0])) continue;

    const cleanId = c.id.trim();
    const rawId = cleanId.split('@')[0].replace(/\+/g, '');
    const isLid = isLidIdentifier(cleanId);
    const isGroup = isGroupJid(cleanId);

    // Exclude anonymous unmapped LIDs without human names or valid phones
    if (isLid && !KNOWN_LID_MAP[rawId] && !UNIVERSAL_IDENTITY_REGISTRY.has(rawId)) {
      const hasRealName = (c.name && c.name.trim() && !c.name.startsWith('Contact (') && c.name !== 'WhatsApp User' && c.name !== 'Direct Chat' && c.name !== 'You (Message yourself)' && !/^\d{10,}$/.test(c.name.trim())) ||
                          (c.notifyName && c.notifyName.trim() && !c.notifyName.startsWith('Contact (') && c.notifyName !== 'WhatsApp User' && c.notifyName !== 'Direct Chat' && c.notifyName !== 'You (Message yourself)' && !/^\d{10,}$/.test(c.notifyName.trim()));
      const hasPhone = c.phoneNumber && c.phoneNumber !== 'Direct Chat' && !c.phoneNumber.includes('LID');
      if (!hasRealName && !hasPhone) continue;
    }

    const resolved = resolveContactInfo(cleanId, c.name, c.phoneNumber, c.notifyName, isGroup, accountPhone);

    if (resolved.name.startsWith('Contact (') && (resolved.phoneNumber === 'N/A (LID)' || !resolved.phoneNumber || resolved.phoneNumber === 'Direct Chat')) {
      continue;
    }

    seenJids.add(c.id);
    seenJids.add(rawId);

    directory.push({
      id: c.id,
      name: resolved.name,
      phoneNumber: resolved.phoneNumber,
      chatType: resolved.chatType,
      isGroup: resolved.isGroup,
      notifyName: c.notifyName || '',
      source: 'saved_contact',
      accountId: c.accountId || defaultAccountId,
    });
  }

  return directory;
}


// ── Dynamic Universal Cross-Account Identity Registry
// Populated dynamically from DB sync, message pushNames, and known identities
export const UNIVERSAL_IDENTITY_REGISTRY = new Map<string, { name: string; phone?: string }>();

// Seed with foundational known identities
for (const [k, v] of Object.entries(KNOWN_LID_MAP)) {
  UNIVERSAL_IDENTITY_REGISTRY.set(k.split('@')[0], v);
}
for (const [k, v] of Object.entries(KNOWN_PHONE_CONTACTS)) {
  UNIVERSAL_IDENTITY_REGISTRY.set(k, { name: v, phone: formatE164Phone(k) });
}

/**
 * Validates whether a candidate string is a genuine, proper human or group name.
 * Rejects pure punctuation (e.g. "..", ".", "-"), empty strings, system placeholders,
 * raw phone numbers, and raw JIDs.
 */
export function isProperName(n?: string | null): boolean {
  if (!n) return false;
  const s = n.trim();
  if (!s || s.length === 0) return false;

  // Reject pure punctuation, symbols, or whitespace (e.g. "..", ".", "-", "--", "...", "??", ":)")
  if (/^[.\-_~*+=,;!?^'"`:()\[\]{}|\\/<>@#$%& ]+$/.test(s)) return false;

  // Must contain at least one unicode letter or digit
  if (!/[\p{L}\p{N}]/u.test(s)) return false;

  const lower = s.toLowerCase();
  const placeholders = [
    'whatsapp group',
    'whatsapp user',
    'whatsapp contact',
    'whatsapp channel',
    'direct chat',
    'you',
    'you (message yourself)',
    'unknown contact',
    'unknown user',
    'unknown',
    'group chat',
    'null',
    'undefined',
    'nan',
    '[object object]',
    'community member',
    'community members',
    'contact',
  ];
  if (placeholders.includes(lower)) return false;

  // Reject technical generated prefixes
  if (
    s.startsWith('Contact (') ||
    s.startsWith('Contact ') ||
    s === 'Contact' ||
    s === 'Community Member' ||
    lower === 'community member' ||
    s.startsWith('Channel (') ||
    s.startsWith('Channel ') ||
    s.startsWith('User …') ||
    lower.startsWith('user ')
  ) {
    return false;
  }

  // Reject raw JIDs
  if (
    lower.endsWith('@s.whatsapp.net') ||
    lower.endsWith('@g.us') ||
    lower.endsWith('@lid') ||
    lower.endsWith('@broadcast') ||
    lower.endsWith('@newsletter') ||
    /^\d+-\d+@g\.us$/i.test(s)
  ) {
    return false;
  }

  // Reject raw phone numbers, numeric IDs, or LIDs (7 or more digits with optional leading +)
  if (/^\+?[\d\s\-()]{7,}$/.test(s)) {
    return false;
  }

  // Reject raw LID strings or +10... IDs
  if (/^\+?10\d{10,}$/.test(s.replace(/[\s\-()]/g, ''))) {
    return false;
  }

  return true;
}

/**
 * Checks if a string contains unicode characters (like emojis) but lacks any letters or digits.
 * Example: '🙏🌄 🕉️', '🐼🐼'
 */
export function isEmojiOnly(n?: string | null): boolean {
  if (!n) return false;
  const s = n.trim();
  if (!s) return false;
  if (/[\p{L}\p{N}]/u.test(s)) return false;
  if (/^[.\-_~*+=,;!?^'"`:()\[\]{}|\\/<>@#$%& ]+$/.test(s)) return false;
  return /\p{Extended_Pictographic}/u.test(s);
}

/**
 * Register or update a contact in the global universal registry.
 * Enables cross-account identity sharing at runtime.
 */
export function registerUniversalContact(idOrPhone: string, name: string, phone?: string) {
  if (!idOrPhone || !name) return;
  const cleanKey = idOrPhone.split('@')[0].replace(/\+/g, '').trim();
  if (!cleanKey || !isProperName(name)) return;
  const formattedPhone = phone ? formatE164Phone(phone) : (!isLidIdentifier(cleanKey) && cleanKey.length >= 7 ? formatE164Phone(cleanKey) : undefined);
  UNIVERSAL_IDENTITY_REGISTRY.set(cleanKey, {
    name: name.trim(),
    phone: formattedPhone,
  });
  UNIVERSAL_IDENTITY_REGISTRY.set(idOrPhone.trim(), {
    name: name.trim(),
    phone: formattedPhone,
  });
  if (isLidIdentifier(idOrPhone)) {
    KNOWN_LID_MAP[cleanKey] = { name: name.trim(), phone: formattedPhone || '' };
    KNOWN_LID_MAP[idOrPhone.trim()] = { name: name.trim(), phone: formattedPhone || '' };
  } else if (cleanKey.length >= 7) {
    KNOWN_PHONE_CONTACTS[cleanKey] = name.trim();
  }
}

/**
 * Priority Fallback Chain for Contact Resolution:
 * 1. Local Custom Name (User-defined alias / address-book name)
 * 2. WhatsApp pushName / notifyName (Native from Baileys)
 * 3. Cross-Account Shared Registry (Identity discovered across other accounts)
 * 4. Formatted E.164 Phone Number
 * 5. Safe Fallback ("User …123456", NEVER "Direct Chat" or "Contact (XXXX)")
 */
export function resolveContactInfo(
  jid: string,
  providedName?: string | null,
  providedPhone?: string | null,
  notifyName?: string | null,
  isGroupFlag?: boolean,
  activeAccountPhone = ''
): ResolvedContactInfo {
  const cleanJid = (jid || '').trim();
  const rawId = cleanJid.split('@')[0].replace(/\+/g, '');
  const isGroup = isGroupFlag !== undefined ? isGroupFlag : isGroupJid(cleanJid);

  // 1. Group resolution
  if (isGroup) {
    let groupName = (providedName || '').trim();

    // If candidate group name is valid and proper, use it
    if (isProperName(groupName)) {
      return {
        jid: cleanJid,
        name: groupName,
        phoneNumber: 'Group Chat',
        displayPhone: 'Group Chat',
        isGroup: true,
        chatType: 'Group',
      };
    }

    // Check universal registry for group name
    const regGroup = UNIVERSAL_IDENTITY_REGISTRY.get(cleanJid) || UNIVERSAL_IDENTITY_REGISTRY.get(rawId);
    if (regGroup?.name && isProperName(regGroup.name)) {
      return {
        jid: cleanJid,
        name: regGroup.name,
        phoneNumber: 'Group Chat',
        displayPhone: 'Group Chat',
        isGroup: true,
        chatType: 'Group',
      };
    }

    // Fallback: Generate clean identifier e.g. "Group (0712)" instead of ".." or "WhatsApp Group"
    const suffix = rawId.length >= 4 ? rawId.slice(-4) : rawId;
    const cleanLabel = suffix ? `Group (${suffix})` : 'Group Chat';
    return {
      jid: cleanJid,
      name: cleanLabel,
      phoneNumber: 'Group Chat',
      displayPhone: 'Group Chat',
      isGroup: true,
      chatType: 'Group',
    };
  }

  // 2. Self resolution
  const cleanAccount = (activeAccountPhone || '').replace(/\D/g, '');
  const isSelf = cleanAccount.length >= 7 && !isGroup && (
    rawId === cleanAccount ||
    cleanJid === `${cleanAccount}@s.whatsapp.net` ||
    cleanJid === `${cleanAccount}:0@s.whatsapp.net` ||
    cleanJid.startsWith(`${cleanAccount}@`) ||
    cleanJid.startsWith(`${cleanAccount}:`)
  );
  if (isSelf) {
    return {
      jid: cleanJid,
      name: 'You (Message yourself)',
      phoneNumber: formatE164Phone(cleanAccount),
      displayPhone: formatE164Phone(cleanAccount),
      isGroup: false,
      chatType: 'Self',
    };
  }

  // ── PRIORITY FALLBACK CHAIN ──
  let resolvedName = '';
  let resolvedPhone = '';

  // Step 1: Local Custom Name (User-defined or contact book)
  if (isProperName(providedName)) {
    resolvedName = providedName!.trim();
  }

  // Step 2: Native pushName / notifyName from Baileys
  if (!resolvedName && isProperName(notifyName)) {
    resolvedName = notifyName!.trim();
  }

  // Step 3: Cross-Account Shared Registry & Known Mapping
  const regEntry = UNIVERSAL_IDENTITY_REGISTRY.get(rawId) ||
                   UNIVERSAL_IDENTITY_REGISTRY.get(cleanJid) ||
                   KNOWN_LID_MAP[rawId] ||
                   (KNOWN_PHONE_CONTACTS[rawId] ? { name: KNOWN_PHONE_CONTACTS[rawId], phone: formatE164Phone(rawId) } : null);

  if (!resolvedName && regEntry?.name && isProperName(regEntry.name)) {
    resolvedName = regEntry.name;
  }
  if (!resolvedPhone && regEntry?.phone) {
    resolvedPhone = regEntry.phone;
  }

  // Step 4: Phone number resolution
  if (!resolvedPhone) {
    if (providedPhone && !isGroupJid(providedPhone) && !providedPhone.endsWith('@lid') && providedPhone !== 'Direct Chat') {
      resolvedPhone = formatE164Phone(providedPhone);
    } else if (/^\d{7,15}$/.test(rawId) && !cleanJid.endsWith('@lid') && !cleanJid.startsWith('120363')) {
      resolvedPhone = formatE164Phone(rawId);
    }
  }

  // Step 5: Check emoji-only names (e.g. '🙏🌄 🕉️', '🐼🐼')
  if (!resolvedName && (isEmojiOnly(providedName) || isEmojiOnly(notifyName))) {
    const emojiStr = isEmojiOnly(providedName) ? providedName!.trim() : notifyName!.trim();
    if (resolvedPhone) {
      resolvedName = `${resolvedPhone} (${emojiStr})`;
    } else if (rawId && /^\d{7,15}$/.test(rawId)) {
      const ph = formatE164Phone(rawId) || `+${rawId}`;
      resolvedName = `${ph} (${emojiStr})`;
    }
  }

  // Step 6: If name still unresolved, use formatted E.164 phone
  if (!resolvedName && resolvedPhone && resolvedPhone !== 'N/A (LID)' && resolvedPhone !== 'Direct Chat') {
    resolvedName = resolvedPhone;
  }

  // Step 7: Safe fallback for unknown contacts/LIDs without name:
  // NEVER use 'Direct Chat' or 'WhatsApp User' or 'Unknown Contact'. Always show formatted original phone number!
  if (!resolvedName) {
    if (cleanJid.endsWith('@newsletter')) {
      resolvedName = 'Channel';
    } else if (resolvedPhone && resolvedPhone !== 'Direct Chat' && !resolvedPhone.includes('LID')) {
      resolvedName = resolvedPhone;
    } else if (rawId && /^\d{7,15}$/.test(rawId) && !isLidIdentifier(cleanJid) && !cleanJid.endsWith('@lid')) {
      resolvedName = formatE164Phone(rawId) || `+${rawId}`;
    } else if (isLidIdentifier(cleanJid) || cleanJid.endsWith('@lid')) {
      const reg = KNOWN_LID_MAP[rawId] || UNIVERSAL_IDENTITY_REGISTRY.get(rawId);
      if (reg?.name && isProperName(reg.name)) {
        resolvedName = reg.name;
      } else if (reg?.phone) {
        resolvedName = reg.phone;
      } else if (providedName && isProperName(providedName)) {
        resolvedName = providedName.trim();
      } else if (notifyName && isProperName(notifyName)) {
        resolvedName = notifyName.trim();
      } else {
        resolvedName = resolvedPhone || '';
      }
    } else {
      resolvedName = rawId ? `+${rawId}` : '';
    }
  }

  const finalPhone = resolvedPhone || (rawId && /^\d{7,15}$/.test(rawId) && !isLidIdentifier(cleanJid) && !cleanJid.endsWith('@lid') ? (formatE164Phone(rawId) || `+${rawId}`) : '');

  return {
    jid: cleanJid,
    name: resolvedName,
    phoneNumber: finalPhone,
    displayPhone: finalPhone,
    isGroup: false,
    chatType: 'Direct Chat',
  };
}
