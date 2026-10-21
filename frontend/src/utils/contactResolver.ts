/**
 * contactResolver.ts (Frontend)
 *
 * Provides accurate contact name resolution, E.164 phone formatting,
 * avatar initials generation, and multi-account identity mapping
 * for the React frontend (chats list, chat header, export modal).
 */

// ── Dynamic Universal Cross-Account & Contact Identity Registry
// Automatically populated in real-time from accounts, contacts, chats, and incoming messages.
// ZERO manual IDs or hardcoding required.
export const DYNAMIC_IDENTITY_MAP = new Map<string, { name: string; phone: string }>();
export const KNOWN_LID_MAP: Record<string, { name: string; phone: string }> = {};
export const KNOWN_PHONE_CONTACTS: Record<string, string> = {};

/**
 * Automatically registers an account owner's phone, displayName, and LID.
 * Works dynamically for any current or future account connected.
 */
export function autoRegisterAccount(account?: {
  id?: string | null;
  phoneNumber?: string | null;
  displayName?: string | null;
  lid?: string | null;
} | null) {
  if (!account) return;
  const name = isProperName(account.displayName) ? account.displayName!.trim() : null;

  const phone = account.phoneNumber ? (formatE164(account.phoneNumber) || account.phoneNumber) : '';
  const digits = account.phoneNumber ? account.phoneNumber.replace(/\D/g, '') : '';

  if (digits) {
    if (name) KNOWN_PHONE_CONTACTS[digits] = name;
    DYNAMIC_IDENTITY_MAP.set(digits, { name: name || phone, phone });
    DYNAMIC_IDENTITY_MAP.set(`${digits}@s.whatsapp.net`, { name: name || phone, phone });
  }

  if (account.id) {
    DYNAMIC_IDENTITY_MAP.set(account.id, { name: name || phone, phone });
  }

  if (account.lid) {
    const rawLid = account.lid.split('@')[0].replace(/\D/g, '');
    if (rawLid) {
      if (name) {
        KNOWN_LID_MAP[rawLid] = { name, phone };
        KNOWN_LID_MAP[`${rawLid}@lid`] = { name, phone };
      }
      DYNAMIC_IDENTITY_MAP.set(rawLid, { name: name || phone, phone });
      DYNAMIC_IDENTITY_MAP.set(`${rawLid}@lid`, { name: name || phone, phone });
    }
  }
}

export const registerAccountDisplayName = (phone?: string | null, displayName?: string | null, lid?: string | null) => {
  autoRegisterAccount({ phoneNumber: phone, displayName, lid });
};

/**
 * Universal resolver for WhatsApp Account owners.
 * Strict rules:
 * 1. Shows proper name of number owner if available (rejecting placeholder IDs, sub names, system tags).
 * 2. If no proper name is available, shows formatted mobile number (e.g. +91 98765 43210).
 * 3. Never returns raw UUIDs, "sub_xxx", or internal IDs.
 */
export function resolveAccountDisplayName(account?: {
  id?: string | null;
  phoneNumber?: string | null;
  displayName?: string | null;
} | null): string {
  if (!account) return 'Account';

  const rawName = account.displayName?.trim();
  if (rawName && isProperName(rawName)) {
    const lower = rawName.toLowerCase();
    const isPlaceholder =
      lower === 'whatsapp account' ||
      lower === 'default account' ||
      lower === 'account' ||
      lower.startsWith('unlinked') ||
      lower.startsWith('pending') ||
      lower.startsWith('sub_') ||
      lower.startsWith('sub-') ||
      lower.startsWith('sub ');

    if (!isPlaceholder) {
      return rawName;
    }
  }

  // Fallback to formatted mobile number
  if (account.phoneNumber) {
    const cleanPhone = account.phoneNumber.replace(/unlinked_/gi, '').trim();
    const formatted = formatE164(cleanPhone);
    if (formatted) return formatted;
    const digits = cleanPhone.replace(/\D/g, '');
    if (digits.length >= 7) return `+${digits}`;
  }

  // If ID itself is a phone number
  if (account.id && !account.id.includes('-') && /^\d+$/.test(account.id.replace(/\D/g, ''))) {
    const digits = account.id.replace(/\D/g, '');
    if (digits.length >= 7) {
      return formatE164(digits) || `+${digits}`;
    }
  }

  return 'Account';
}

/**
 * Automatically registers any contact from the address-book or API.
 * Works dynamically for any contact across any connected account.
 */
export function autoRegisterContact(contact?: {
  id?: string | null;
  name?: string | null;
  notifyName?: string | null;
  phoneNumber?: string | null;
} | null) {
  if (!contact || !contact.id) return;
  const rawId = contact.id.split('@')[0].replace(/\+/g, '').trim();
  const properName = isProperName(contact.name)
    ? contact.name!.trim()
    : isProperName(contact.notifyName)
      ? contact.notifyName!.trim()
      : null;

  const isLid = isLidId(contact.id) || isLidId(rawId);
  const cleanPhone = (contact.phoneNumber && !isProperName(contact.phoneNumber) && !isLidId(contact.phoneNumber))
    ? formatE164(contact.phoneNumber)
    : (!isLid && rawId && /^\d+$/.test(rawId) ? formatE164(rawId) : '');

  if (properName) {
    DYNAMIC_IDENTITY_MAP.set(contact.id, { name: properName, phone: cleanPhone });
    DYNAMIC_IDENTITY_MAP.set(rawId, { name: properName, phone: cleanPhone });
    if (isLid) {
      KNOWN_LID_MAP[rawId] = { name: properName, phone: cleanPhone };
      KNOWN_LID_MAP[`${rawId}@lid`] = { name: properName, phone: cleanPhone };
    }
    const phoneDigits = cleanPhone.replace(/\D/g, '');
    if (phoneDigits) {
      KNOWN_PHONE_CONTACTS[phoneDigits] = properName;
      DYNAMIC_IDENTITY_MAP.set(phoneDigits, { name: properName, phone: cleanPhone });
    }
  }
}

/**
 * Automatically registers chat identities from active conversations or incoming messages.
 */
export function autoRegisterChat(chat?: {
  id?: string | null;
  name?: string | null;
  notifyName?: string | null;
} | null) {
  if (!chat || !chat.id) return;
  const rawId = chat.id.split('@')[0].replace(/\+/g, '').trim();
  const properName = isProperName(chat.name)
    ? chat.name!.trim()
    : isProperName(chat.notifyName)
      ? chat.notifyName!.trim()
      : null;

  if (properName) {
    const isLid = isLidId(chat.id) || isLidId(rawId);
    const cleanPhone = !isLid && rawId && /^\d+$/.test(rawId) ? formatE164(rawId) : '';
    DYNAMIC_IDENTITY_MAP.set(chat.id, { name: properName, phone: cleanPhone });
    DYNAMIC_IDENTITY_MAP.set(rawId, { name: properName, phone: cleanPhone });
    if (isLid) {
      KNOWN_LID_MAP[rawId] = { name: properName, phone: cleanPhone };
      KNOWN_LID_MAP[`${rawId}@lid`] = { name: properName, phone: cleanPhone };
    }
  }
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
    'community member',
    'null',
    'undefined',
    'nan',
    '[object object]',
  ];
  if (placeholders.includes(lower)) return false;

  // Reject technical generated prefixes
  if (
    s.startsWith('Contact (') ||
    s.startsWith('Contact ') ||
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
  // If it has letters or digits, it's not emoji-only
  if (/[\p{L}\p{N}]/u.test(s)) return false;
  // If it's pure punctuation like "..", it's not a valid emoji identity either
  if (/^[.\-_~*+=,;!?^'"`:()\[\]{}|\\/<>@#$%& ]+$/.test(s)) return false;
  // Contains emoji/symbol characters
  return /\p{Extended_Pictographic}/u.test(s);
}

export function isValidHumanName(n?: string | null): boolean {
  return isProperName(n);
}

export function formatE164(phone: string | undefined | null): string {
  if (!phone) return '';
  const cleanStr = phone.trim();
  const lower = cleanStr.toLowerCase();
  if (
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

  // Do not format raw unmapped LIDs
  const cleanId = cleanStr.replace(/\+/g, '').split('@')[0];
  if (cleanStr.includes('@lid') || (/^\d{14,16}$/.test(cleanId) && !cleanId.startsWith('919') && !cleanId.startsWith('918') && !cleanId.startsWith('917') && !cleanId.startsWith('916'))) {
    if (KNOWN_LID_MAP[cleanId]) return KNOWN_LID_MAP[cleanId].phone;
    return '';
  }

  const digits = cleanStr.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.startsWith('61') && digits.length >= 11 && digits.length <= 13) {
    return `+61 ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.startsWith('44') && digits.length >= 11 && digits.length <= 13) {
    return `+44 ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  if (cleanStr.startsWith('+') && digits.length >= 7 && digits.length <= 15) return cleanStr;
  if (digits.length >= 7 && digits.length <= 15) return `+${digits}`;
  return digits ? `+${digits}` : '';
}

export function isGroupChat(chatId: string, isGroupFlag?: boolean): boolean {
  if (isGroupFlag !== undefined) return isGroupFlag;
  return chatId.endsWith('@g.us') || chatId.startsWith('120363') || (chatId.includes('-') && !chatId.startsWith('+'));
}

/**
 * Sanitizes message snippets by removing raw group JID prefixes like '120363407791015930: '
 */
export function cleanMessageSnippet(rawSnippet?: string): string {
  if (!rawSnippet) return '';
  return rawSnippet.replace(/^(120363\d+|[0-9]{15,}@g\.us):\s*/i, '').trim();
}

/**
 * Generates clean, aesthetic initials for avatars.
 * Never outputs "..", ".", or raw punctuation.
 */
export function getInitials(name?: string | null, isGroup?: boolean): string {
  if (!name) return isGroup ? 'GP' : 'WA';
  const trimmed = name.trim();

  // If generated label like "Group (0712)"
  if (/^Group\s*\(\d+\)/i.test(trimmed)) {
    const num = trimmed.replace(/\D/g, '');
    return num ? num.slice(-2) : 'GP';
  }

  // Reject raw LID strings or +10... IDs or community member from showing '10' or 'CM' as initials
  if (isLidId(trimmed) || /^\+?10\d{10,}$/.test(trimmed.replace(/[\s\-()]/g, '')) || /^community\s*member$/i.test(trimmed)) {
    return 'WA';
  }

  // Check phone number format
  if (/^\+?[\d\s\-()]{7,}$/.test(trimmed)) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length >= 10) {
      if (digits.startsWith('91') && digits.length >= 12) {
        return digits.slice(2, 4);
      }
      return digits.slice(0, 2);
    }
    return digits ? digits.slice(0, 2) : 'WA';
  }

  // Strip leading '+'
  const cleaned = trimmed.replace(/^\+/, '').trim();

  // Extract letter words (names)
  const letterWords = cleaned.split(/[\s\-._/]+/).filter(w => /[\p{L}]/u.test(w));
  if (letterWords.length >= 2) {
    const c1 = letterWords[0].match(/[\p{L}]/u)?.[0] || '';
    const c2 = letterWords[1].match(/[\p{L}]/u)?.[0] || '';
    if (c1 && c2) return (c1 + c2).toUpperCase();
  }
  if (letterWords.length === 1) {
    const chars = letterWords[0].match(/[\p{L}]/gu) || [];
    if (chars.length >= 2) return (chars[0] + chars[1]).toUpperCase();
    if (chars.length === 1) return chars[0].toUpperCase();
  }

  // Digits fallback
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length >= 10) {
    if (digits.startsWith('91') && digits.length >= 12) {
      return digits.slice(2, 4);
    }
    return digits.slice(0, 2);
  }

  // Safe fallback
  return isGroup ? 'GP' : 'WA';
}

export function isLidId(idOrPhone?: string | null): boolean {
  if (!idOrPhone) return false;
  const s = idOrPhone.trim();
  if (s.endsWith('@lid') || s.includes('LID') || s.includes('@lid')) return true;
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 14 && !digits.startsWith('919') && !digits.startsWith('918') && !digits.startsWith('917') && !digits.startsWith('916')) {
    return true;
  }
  return false;
}

export function resolveChatDisplayName(
  chat: { id: string; name?: string; isGroup?: boolean; notifyName?: string },
  contactsList?: { id: string; name?: string; phoneNumber?: string; notifyName?: string }[]
): { name: string; phone: string; isGroup: boolean } {
  const cleanId = (chat.id || '').trim();
  const rawId = cleanId.split('@')[0].replace(/\+/g, '');
  const isGrp = isGroupChat(cleanId, chat.isGroup);

  if (isGrp) {
    let gName = (chat.name || '').trim();

    // 1. If existing group name is proper, use it
    if (isProperName(gName)) {
      return { name: gName, phone: '', isGroup: true };
    }

    // 2. Try looking up in contactsList
    if (contactsList?.length) {
      const matched = contactsList.find(c => c.id === chat.id || c.id === cleanId);
      if (matched && isProperName(matched.name)) {
        return { name: matched.name!.trim(), phone: '', isGroup: true };
      }
    }

    // 3. Fallback: If chat.name exists and has characters, use it; otherwise group id suffix
    const suffix = rawId.length >= 4 ? rawId.slice(-4) : rawId;
    const finalGroupName = (gName && gName !== 'WhatsApp Group' && gName !== '..') ? gName : `Group (${suffix})`;
    return { name: finalGroupName, phone: '', isGroup: true };
  }

  // 1. Check dynamic identity registry
  const dynamicEntry = DYNAMIC_IDENTITY_MAP.get(cleanId) || DYNAMIC_IDENTITY_MAP.get(rawId);
  if (dynamicEntry?.name && isProperName(dynamicEntry.name)) {
    return { name: dynamicEntry.name, phone: dynamicEntry.phone || (!isLidId(rawId) ? formatE164(rawId) : ''), isGroup: false };
  }

  // 2. Check known direct phone numbers & known LIDs
  if (KNOWN_PHONE_CONTACTS[rawId]) {
    const ph = formatE164(rawId) || `+${rawId}`;
    return { name: KNOWN_PHONE_CONTACTS[rawId], phone: ph, isGroup: false };
  }

  if (KNOWN_LID_MAP[rawId] || KNOWN_LID_MAP[cleanId]) {
    const known = KNOWN_LID_MAP[rawId] || KNOWN_LID_MAP[cleanId];
    return { name: known.name, phone: known.phone || '', isGroup: false };
  }

  const isLid = isLidId(cleanId) || isLidId(rawId);

  // 3. Check contactsList for saved address book name or notify name
  if (contactsList?.length) {
    const matched = contactsList.find(
      c => c.id === chat.id || c.id === `${rawId}@s.whatsapp.net` || c.id === `${rawId}@lid`
    );
    if (matched) {
      const properName = isProperName(matched.name) ? matched.name!.trim() :
                         isProperName(matched.notifyName) ? matched.notifyName!.trim() : null;

      const cleanPn = (matched.phoneNumber && !isProperName(matched.phoneNumber) && !isLidId(matched.phoneNumber))
        ? formatE164(matched.phoneNumber)
        : (!isLid ? (formatE164(rawId) || (rawId && /^\d+$/.test(rawId) ? `+${rawId}` : '')) : '');

      if (properName) {
        return { name: properName, phone: cleanPn || '', isGroup: false };
      }

      // Check emoji-only names (e.g. '🙏🌄 🕉️', '🐼🐼')
      const emojiName = (matched.name && isEmojiOnly(matched.name)) ? matched.name.trim() :
                        (matched.notifyName && isEmojiOnly(matched.notifyName)) ? matched.notifyName.trim() : null;
      if (emojiName && cleanPn) {
        return { name: `${cleanPn} (${emojiName})`, phone: cleanPn, isGroup: false };
      }

      if (cleanPn) {
        return { name: cleanPn, phone: cleanPn, isGroup: false };
      }
    }
  }

  // 4. Check chat direct proper name or notify name
  const directName = isProperName(chat.name) ? chat.name!.trim() :
                     isProperName(chat.notifyName) ? chat.notifyName!.trim() : null;
  const formattedPhone = !isLid ? (formatE164(rawId) || (rawId && /^\d+$/.test(rawId) ? `+${rawId}` : '')) : '';

  if (directName) {
    return { name: directName, phone: formattedPhone, isGroup: false };
  }

  // 5. If chat has an emoji-only name (e.g. '🙏🌄 🕉️'), pair with phone number
  const name = (chat.name || '').trim();
  if (isEmojiOnly(name) && formattedPhone) {
    return { name: `${formattedPhone} (${name})`, phone: formattedPhone, isGroup: false };
  }

  // 6. Channel / Newsletter
  if (cleanId.endsWith('@newsletter')) {
    return { name: isProperName(name) ? name : 'Channel', phone: '', isGroup: false };
  }

  // 7. Regular phone number (genuine original contact number)
  if (formattedPhone) {
    return { name: formattedPhone, phone: formattedPhone, isGroup: false };
  }

  // 8. If LID has a non-corrupt stored name in chat.name (e.g. 'raj' or 'Raj . College')
  if (isLid && name && isProperName(name) && !name.startsWith('+') && !name.startsWith('Contact') && name !== cleanId && name !== 'Community Member') {
    return { name, phone: '', isGroup: false };
  }

  // 9. If LID or Chat has any matching phone in address book
  if (contactsList?.length) {
    const fallbackContact = contactsList.find(c => {
      const cDigits = (c.phoneNumber || c.id).replace(/\D/g, '');
      const rawDigits = rawId.replace(/\D/g, '');
      return (cDigits && rawDigits && (cDigits.includes(rawDigits) || rawDigits.includes(cDigits))) ||
             c.id === chat.id || c.id === cleanId;
    });
    if (fallbackContact) {
      const cProperName = isProperName(fallbackContact.name) ? fallbackContact.name!.trim() :
                          isProperName(fallbackContact.notifyName) ? fallbackContact.notifyName!.trim() : null;
      const cPhone = formatE164(fallbackContact.phoneNumber || fallbackContact.id);
      if (cProperName) return { name: cProperName, phone: cPhone || '', isGroup: false };
      if (cPhone) return { name: cPhone, phone: cPhone, isGroup: false };
    }
  }

  // 10. Extract digits from ID if not LID and format as standard mobile number
  if (!isLid && rawId) {
    const digits = rawId.replace(/\D/g, '');
    if (digits.length >= 7) {
      const formatted = formatE164(digits) || `+${digits}`;
      return { name: formatted, phone: formatted, isGroup: false };
    }
  }

  // 11. Final strict fallback: If proper human name is present, return it. Otherwise formatted phone or "User".
  if (name && isProperName(name)) {
    return { name, phone: formattedPhone, isGroup: false };
  }

  return {
    name: formattedPhone || (rawId && !isLid && /^\d+$/.test(rawId) ? `+${rawId}` : 'User'),
    phone: formattedPhone,
    isGroup: false,
  };
}


