"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNIVERSAL_IDENTITY_REGISTRY = exports.formatE164 = exports.KNOWN_PHONE_CONTACTS = exports.KNOWN_LID_MAP = void 0;
exports.isLidIdentifier = isLidIdentifier;
exports.cleanSenderJid = cleanSenderJid;
exports.formatE164Phone = formatE164Phone;
exports.isGroupJid = isGroupJid;
exports.buildUnifiedContactsDirectory = buildUnifiedContactsDirectory;
exports.isProperName = isProperName;
exports.isEmojiOnly = isEmojiOnly;
exports.registerUniversalContact = registerUniversalContact;
exports.resolveContactInfo = resolveContactInfo;
exports.KNOWN_LID_MAP = {};
exports.KNOWN_PHONE_CONTACTS = {};
function isLidIdentifier(id) {
    if (!id)
        return false;
    const clean = id.replace(/\+/g, '').split('@')[0].trim();
    return id.includes('@lid') || (/^\d{14,16}$/.test(clean) && !clean.startsWith('919') && !clean.startsWith('918') && !clean.startsWith('917') && !clean.startsWith('916'));
}
function cleanSenderJid(jid) {
    if (!jid)
        return '';
    return jid.replace(/:\d+@/, '@');
}
function formatE164Phone(rawPhone) {
    if (!rawPhone)
        return '';
    const cleanStr = rawPhone.trim();
    const lower = cleanStr.toLowerCase();
    if (lower.includes('group') ||
        lower === 'group chat' ||
        lower === 'direct chat' ||
        lower === 'whatsapp user' ||
        lower === 'whatsapp group' ||
        lower === 'you' ||
        lower === 'you (message yourself)' ||
        lower === 'unknown contact' ||
        lower === 'unknown') {
        return '';
    }
    if (isLidIdentifier(cleanStr)) {
        const rawId = cleanStr.replace(/\+/g, '').split('@')[0];
        if (exports.KNOWN_LID_MAP[rawId]) {
            return exports.KNOWN_LID_MAP[rawId].phone;
        }
        return '';
    }
    const digits = cleanStr.replace(/\D/g, '');
    if (!digits)
        return '';
    if (digits.length === 12 && digits.startsWith('91')) {
        return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    if (digits.length === 10 && /^[6-9]/.test(digits)) {
        return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    if (cleanStr.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
        return cleanStr;
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
    if (digits.length >= 10 && digits.length <= 15) {
        return `+${digits}`;
    }
    if (digits.length >= 7) {
        return `+${digits}`;
    }
    return '';
}
exports.formatE164 = formatE164Phone;
function isGroupJid(jid) {
    if (!jid)
        return false;
    const clean = jid.toLowerCase().trim();
    return (clean.endsWith('@g.us') ||
        clean.startsWith('120363') ||
        (clean.includes('-') && !clean.startsWith('+')));
}
function buildUnifiedContactsDirectory(chats, contacts, accountPhone = '', defaultAccountId = 'default') {
    const directory = [];
    const seenJids = new Set();
    for (const chat of chats) {
        if (!chat.id || chat.id === 'status@broadcast')
            continue;
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
    for (const c of contacts) {
        if (!c.id || seenJids.has(c.id) || seenJids.has(c.id.split('@')[0]))
            continue;
        const cleanId = c.id.trim();
        const rawId = cleanId.split('@')[0].replace(/\+/g, '');
        const isLid = isLidIdentifier(cleanId);
        const isGroup = isGroupJid(cleanId);
        if (isLid && !exports.KNOWN_LID_MAP[rawId] && !exports.UNIVERSAL_IDENTITY_REGISTRY.has(rawId)) {
            const hasRealName = (c.name && c.name.trim() && !c.name.startsWith('Contact (') && c.name !== 'WhatsApp User' && c.name !== 'Direct Chat' && c.name !== 'You (Message yourself)' && !/^\d{10,}$/.test(c.name.trim())) ||
                (c.notifyName && c.notifyName.trim() && !c.notifyName.startsWith('Contact (') && c.notifyName !== 'WhatsApp User' && c.notifyName !== 'Direct Chat' && c.notifyName !== 'You (Message yourself)' && !/^\d{10,}$/.test(c.notifyName.trim()));
            const hasPhone = c.phoneNumber && c.phoneNumber !== 'Direct Chat' && !c.phoneNumber.includes('LID');
            if (!hasRealName && !hasPhone)
                continue;
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
exports.UNIVERSAL_IDENTITY_REGISTRY = new Map();
for (const [k, v] of Object.entries(exports.KNOWN_LID_MAP)) {
    exports.UNIVERSAL_IDENTITY_REGISTRY.set(k.split('@')[0], v);
}
for (const [k, v] of Object.entries(exports.KNOWN_PHONE_CONTACTS)) {
    exports.UNIVERSAL_IDENTITY_REGISTRY.set(k, { name: v, phone: formatE164Phone(k) });
}
function isProperName(n) {
    if (!n)
        return false;
    const s = n.trim();
    if (!s || s.length === 0)
        return false;
    if (/^[.\-_~*+=,;!?^'"`:()\[\]{}|\\/<>@#$%& ]+$/.test(s))
        return false;
    if (!/[\p{L}\p{N}]/u.test(s))
        return false;
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
    if (placeholders.includes(lower))
        return false;
    if (s.startsWith('Contact (') ||
        s.startsWith('Contact ') ||
        s === 'Contact' ||
        s === 'Community Member' ||
        lower === 'community member' ||
        s.startsWith('Channel (') ||
        s.startsWith('Channel ') ||
        s.startsWith('User …') ||
        lower.startsWith('user ')) {
        return false;
    }
    if (lower.endsWith('@s.whatsapp.net') ||
        lower.endsWith('@g.us') ||
        lower.endsWith('@lid') ||
        lower.endsWith('@broadcast') ||
        lower.endsWith('@newsletter') ||
        /^\d+-\d+@g\.us$/i.test(s)) {
        return false;
    }
    if (/^\+?[\d\s\-()]{7,}$/.test(s)) {
        return false;
    }
    if (/^\+?10\d{10,}$/.test(s.replace(/[\s\-()]/g, ''))) {
        return false;
    }
    return true;
}
function isEmojiOnly(n) {
    if (!n)
        return false;
    const s = n.trim();
    if (!s)
        return false;
    if (/[\p{L}\p{N}]/u.test(s))
        return false;
    if (/^[.\-_~*+=,;!?^'"`:()\[\]{}|\\/<>@#$%& ]+$/.test(s))
        return false;
    return /\p{Extended_Pictographic}/u.test(s);
}
function registerUniversalContact(idOrPhone, name, phone) {
    if (!idOrPhone || !name)
        return;
    const cleanKey = idOrPhone.split('@')[0].replace(/\+/g, '').trim();
    if (!cleanKey || !isProperName(name))
        return;
    const formattedPhone = phone ? formatE164Phone(phone) : (!isLidIdentifier(cleanKey) && cleanKey.length >= 7 ? formatE164Phone(cleanKey) : undefined);
    exports.UNIVERSAL_IDENTITY_REGISTRY.set(cleanKey, {
        name: name.trim(),
        phone: formattedPhone,
    });
    exports.UNIVERSAL_IDENTITY_REGISTRY.set(idOrPhone.trim(), {
        name: name.trim(),
        phone: formattedPhone,
    });
    if (isLidIdentifier(idOrPhone)) {
        exports.KNOWN_LID_MAP[cleanKey] = { name: name.trim(), phone: formattedPhone || '' };
        exports.KNOWN_LID_MAP[idOrPhone.trim()] = { name: name.trim(), phone: formattedPhone || '' };
    }
    else if (cleanKey.length >= 7) {
        exports.KNOWN_PHONE_CONTACTS[cleanKey] = name.trim();
    }
}
function resolveContactInfo(jid, providedName, providedPhone, notifyName, isGroupFlag, activeAccountPhone = '') {
    const cleanJid = (jid || '').trim();
    const rawId = cleanJid.split('@')[0].replace(/\+/g, '');
    const isGroup = isGroupFlag !== undefined ? isGroupFlag : isGroupJid(cleanJid);
    if (isGroup) {
        let groupName = (providedName || '').trim();
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
        const regGroup = exports.UNIVERSAL_IDENTITY_REGISTRY.get(cleanJid) || exports.UNIVERSAL_IDENTITY_REGISTRY.get(rawId);
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
    const cleanAccount = (activeAccountPhone || '').replace(/\D/g, '');
    const isSelf = cleanAccount.length >= 7 && !isGroup && (rawId === cleanAccount ||
        cleanJid === `${cleanAccount}@s.whatsapp.net` ||
        cleanJid === `${cleanAccount}:0@s.whatsapp.net` ||
        cleanJid.startsWith(`${cleanAccount}@`) ||
        cleanJid.startsWith(`${cleanAccount}:`));
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
    let resolvedName = '';
    let resolvedPhone = '';
    if (isProperName(providedName)) {
        resolvedName = providedName.trim();
    }
    if (!resolvedName && isProperName(notifyName)) {
        resolvedName = notifyName.trim();
    }
    const regEntry = exports.UNIVERSAL_IDENTITY_REGISTRY.get(rawId) ||
        exports.UNIVERSAL_IDENTITY_REGISTRY.get(cleanJid) ||
        exports.KNOWN_LID_MAP[rawId] ||
        (exports.KNOWN_PHONE_CONTACTS[rawId] ? { name: exports.KNOWN_PHONE_CONTACTS[rawId], phone: formatE164Phone(rawId) } : null);
    if (!resolvedName && regEntry?.name && isProperName(regEntry.name)) {
        resolvedName = regEntry.name;
    }
    if (!resolvedPhone && regEntry?.phone) {
        resolvedPhone = regEntry.phone;
    }
    if (!resolvedPhone) {
        if (providedPhone && !isGroupJid(providedPhone) && !providedPhone.endsWith('@lid') && providedPhone !== 'Direct Chat') {
            resolvedPhone = formatE164Phone(providedPhone);
        }
        else if (/^\d{7,15}$/.test(rawId) && !cleanJid.endsWith('@lid') && !cleanJid.startsWith('120363')) {
            resolvedPhone = formatE164Phone(rawId);
        }
    }
    if (!resolvedName && (isEmojiOnly(providedName) || isEmojiOnly(notifyName))) {
        const emojiStr = isEmojiOnly(providedName) ? providedName.trim() : notifyName.trim();
        if (resolvedPhone) {
            resolvedName = `${resolvedPhone} (${emojiStr})`;
        }
        else if (rawId && /^\d{7,15}$/.test(rawId)) {
            const ph = formatE164Phone(rawId) || `+${rawId}`;
            resolvedName = `${ph} (${emojiStr})`;
        }
    }
    if (!resolvedName && resolvedPhone && resolvedPhone !== 'N/A (LID)' && resolvedPhone !== 'Direct Chat') {
        resolvedName = resolvedPhone;
    }
    if (!resolvedName) {
        if (cleanJid.endsWith('@newsletter')) {
            resolvedName = 'Channel';
        }
        else if (resolvedPhone && resolvedPhone !== 'Direct Chat' && !resolvedPhone.includes('LID')) {
            resolvedName = resolvedPhone;
        }
        else if (rawId && /^\d{7,15}$/.test(rawId) && !isLidIdentifier(cleanJid) && !cleanJid.endsWith('@lid')) {
            resolvedName = formatE164Phone(rawId) || `+${rawId}`;
        }
        else if (isLidIdentifier(cleanJid) || cleanJid.endsWith('@lid')) {
            const reg = exports.KNOWN_LID_MAP[rawId] || exports.UNIVERSAL_IDENTITY_REGISTRY.get(rawId);
            if (reg?.name && isProperName(reg.name)) {
                resolvedName = reg.name;
            }
            else if (reg?.phone) {
                resolvedName = reg.phone;
            }
            else if (providedName && isProperName(providedName)) {
                resolvedName = providedName.trim();
            }
            else if (notifyName && isProperName(notifyName)) {
                resolvedName = notifyName.trim();
            }
            else {
                resolvedName = resolvedPhone || '';
            }
        }
        else {
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
//# sourceMappingURL=contact-resolver.util.js.map