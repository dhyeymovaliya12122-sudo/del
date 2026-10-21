import re

file_path = r'frontend/src/components/WhatsAppWeb/WhatsAppAccountsManagerDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add highlightKeyword function before the main component
if 'function highlightKeyword(' not in code:
    helper = '''
function highlightKeyword(text: string, keywords: string[]) {
  if (!text || keywords.length === 0) return <span>{text}</span>;
  const valid = keywords.filter(k => k && k.trim());
  if (valid.length === 0) return <span>{text}</span>;
  const escaped = valid.map(k => k.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        valid.some(k => k.toLowerCase() === part.toLowerCase()) ? (
          <mark
            key={i}
            style={{
              background: 'rgba(244, 63, 94, 0.25)',
              color: '#fda4af',
              padding: '1px 4px',
              borderRadius: 4,
              fontWeight: 700,
            }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}
'''
    code = code.replace('export default function WhatsAppAccountsManagerDashboard({', helper + '\nexport default function WhatsAppAccountsManagerDashboard({')

# 2. Add explorer date & keyword filter states
state_target = "  const [isSendingReply, setIsSendingReply] = useState(false);"
new_states = """  const [isSendingReply, setIsSendingReply] = useState(false);

  // ── Account Chats Explorer Date & Keyword Filter State ────────────────────
  const [explorerDatePreset, setExplorerDatePreset] = useState<DateFilterPreset>('all');
  const [explorerCustomStart, setExplorerCustomStart] = useState<string>('');
  const [explorerCustomEnd, setExplorerCustomEnd] = useState<string>('');
  const [explorerKeywords, setExplorerKeywords] = useState<string[]>([]);
  const [explorerKeywordInput, setExplorerKeywordInput] = useState<string>('');
  const [explorerStatusFilter, setExplorerStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [explorerDirectionFilter, setExplorerDirectionFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');

  const explorerDateRange = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    let label = 'All Time';

    if (explorerDatePreset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = `Today (${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
    } else if (explorerDatePreset === 'yesterday') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      label = 'Yesterday';
    } else if (explorerDatePreset === 'last7') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
      end = new Date();
      label = 'Last 7 Days';
    } else if (explorerDatePreset === 'last30') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
      end = new Date();
      label = 'Last 30 Days';
    } else if (explorerDatePreset === 'custom') {
      if (explorerCustomStart) start = new Date(`${explorerCustomStart}T00:00:00`);
      if (explorerCustomEnd) end = new Date(`${explorerCustomEnd}T23:59:59`);
      label = 'Custom Range';
    }

    return {
      startDate: start ? start.toISOString() : undefined,
      endDate: end ? end.toISOString() : undefined,
      label,
    };
  }, [explorerDatePreset, explorerCustomStart, explorerCustomEnd]);

  const filteredExplorerChats = useMemo(() => {
    return accountChats.filter(chat => {
      if (chatSearch.trim()) {
        const q = chatSearch.toLowerCase();
        const matchesName = (chat.name || chat.id).toLowerCase().includes(q);
        const matchesText = (chat.lastMessageText || '').toLowerCase().includes(q);
        if (!matchesName && !matchesText) return false;
      }
      if (explorerStatusFilter === 'unread' && (!chat.unreadCount || chat.unreadCount === 0)) return false;
      if (explorerStatusFilter === 'read' && (chat.unreadCount && chat.unreadCount > 0)) return false;
      if (explorerDirectionFilter === 'incoming' && chat.lastMessageFromMe) return false;
      if (explorerDirectionFilter === 'outgoing' && !chat.lastMessageFromMe) return false;
      if (explorerKeywords.length > 0) {
        const text = (chat.lastMessageText || '').toLowerCase();
        const matches = explorerKeywords.some(kw => text.includes(kw.toLowerCase()));
        if (!matches) return false;
      }
      return true;
    });
  }, [accountChats, chatSearch, explorerStatusFilter, explorerDirectionFilter, explorerKeywords]);"""

if 'const [explorerKeywords, setExplorerKeywords]' not in code:
    code = code.replace(state_target, new_states)

# 3. Update handleOpenChatExplorer and loadExplorerChats
old_handle = """  const handleOpenChatExplorer = async (account: Account) => {
    setChatExplorerAccount(account);
    setSelectedChat(null);
    setChatMessages([]);
    setIsLoadingChats(true);
    try {
      const chats = await whatsappWebApi.getChats(
        account.id,
        undefined,
        300,
        0,
        dateRange.startDate,
        dateRange.endDate
      );
      setAccountChats(chats || []);
      if (chats && chats.length > 0) {
        handleSelectChatInExplorer(account.id, chats[0]);
      }
    } catch (err: any) {
      console.error('Failed to load account chats:', err);
      addToast('error', `Could not load chats for ${account.displayName || account.phoneNumber}`);
    } finally {
      setIsLoadingChats(false);
    }
  };"""

new_handle = """  const loadExplorerChats = async (account: Account, startDate?: string, endDate?: string) => {
    setIsLoadingChats(true);
    try {
      const chats = await whatsappWebApi.getChats(
        account.id,
        undefined,
        300,
        0,
        startDate,
        endDate
      );
      setAccountChats(chats || []);
      if (chats && chats.length > 0) {
        handleSelectChatInExplorer(account.id, chats[0]);
      } else {
        setSelectedChat(null);
        setChatMessages([]);
      }
    } catch (err: any) {
      console.error('Failed to load account chats:', err);
      addToast('error', `Could not load chats for ${account.displayName || account.phoneNumber}`);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const handleOpenChatExplorer = async (account: Account) => {
    setChatExplorerAccount(account);
    setSelectedChat(null);
    setChatMessages([]);
    setExplorerDatePreset(datePreset);
    setExplorerCustomStart(customStartDate);
    setExplorerCustomEnd(customEndDate);
    setExplorerKeywords([]);
    setExplorerKeywordInput('');
    setExplorerStatusFilter('all');
    setExplorerDirectionFilter('all');
    setChatSearch('');
    loadExplorerChats(account, dateRange.startDate, dateRange.endDate);
  };

  // Re-fetch explorer chats when explorer date preset changes
  useEffect(() => {
    if (chatExplorerAccount) {
      loadExplorerChats(chatExplorerAccount, explorerDateRange.startDate, explorerDateRange.endDate);
    }
  }, [explorerDateRange.startDate, explorerDateRange.endDate]);"""

if 'const loadExplorerChats = async' not in code:
    code = code.replace(old_handle, new_handle)

# 4. Insert Filter Ribbon into Explorer modal header
modal_header_end = """              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => {
                    onSelectAccount(chatExplorerAccount);
                    if (onNavigateToChats) {
                      onNavigateToChats(chatExplorerAccount);
                    }
                    setChatExplorerAccount(null);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: '#00a884',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ExternalLink size={13} />
                  <span>Open in WhatsApp</span>
                </button>
                <button onClick={() => setChatExplorerAccount(null)} style={styles.modalCloseBtn}>
                  <X size={18} color="#8696a0" />
                </button>
              </div>
            </div>"""

filter_ribbon = """              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => {
                    onSelectAccount(chatExplorerAccount);
                    if (onNavigateToChats) {
                      onNavigateToChats(chatExplorerAccount);
                    }
                    setChatExplorerAccount(null);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: '#00a884',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ExternalLink size={13} />
                  <span>Open in WhatsApp</span>
                </button>
                <button onClick={() => setChatExplorerAccount(null)} style={styles.modalCloseBtn}>
                  <X size={18} color="#8696a0" />
                </button>
              </div>
            </div>

            {/* Filter Ribbon inside Explorer matching screenshot */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              background: 'rgba(15, 28, 33, 0.85)',
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginTop: 10,
            }}>
              {/* Date Preset Selector */}
              <div style={{ position: 'relative' }}>
                <select
                  value={explorerDatePreset}
                  onChange={e => setExplorerDatePreset(e.target.value as any)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 7,
                    padding: '6px 24px 6px 10px',
                    color: '#2dd4bf',
                    fontSize: 12,
                    fontWeight: 600,
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all" style={{ background: '#0e181c' }}>All Time</option>
                  <option value="today" style={{ background: '#0e181c' }}>Today</option>
                  <option value="yesterday" style={{ background: '#0e181c' }}>Yesterday</option>
                  <option value="last7" style={{ background: '#0e181c' }}>Last 7 Days</option>
                  <option value="last30" style={{ background: '#0e181c' }}>Last 30 Days</option>
                  <option value="custom" style={{ background: '#0e181c' }}>Custom Range</option>
                </select>
                <ChevronRight size={12} color="#2dd4bf" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
              </div>

              {/* Custom Date Inputs if Custom */}
              {explorerDatePreset === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="date"
                    value={explorerCustomStart}
                    onChange={e => setExplorerCustomStart(e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 6,
                      padding: '4px 6px',
                      color: '#e2e8f0',
                      fontSize: 11,
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#8696a0' }}>to</span>
                  <input
                    type="date"
                    value={explorerCustomEnd}
                    onChange={e => setExplorerCustomEnd(e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 6,
                      padding: '4px 6px',
                      color: '#e2e8f0',
                      fontSize: 11,
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              {/* Status Filter */}
              <div style={{ position: 'relative' }}>
                <select
                  value={explorerStatusFilter}
                  onChange={e => setExplorerStatusFilter(e.target.value as any)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 7,
                    padding: '6px 24px 6px 10px',
                    color: '#e2e8f0',
                    fontSize: 12,
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all" style={{ background: '#0e181c' }}>All Status</option>
                  <option value="unread" style={{ background: '#0e181c' }}>Unread Only</option>
                  <option value="read" style={{ background: '#0e181c' }}>Read Only</option>
                </select>
                <ChevronRight size={12} color="#8696a0" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
              </div>

              {/* Direction Filter */}
              <div style={{ position: 'relative' }}>
                <select
                  value={explorerDirectionFilter}
                  onChange={e => setExplorerDirectionFilter(e.target.value as any)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 7,
                    padding: '6px 24px 6px 10px',
                    color: '#e2e8f0',
                    fontSize: 12,
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all" style={{ background: '#0e181c' }}>All Replies</option>
                  <option value="incoming" style={{ background: '#0e181c' }}>Incoming Replies</option>
                  <option value="outgoing" style={{ background: '#0e181c' }}>Outgoing Replies</option>
                </select>
                <ChevronRight size={12} color="#8696a0" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
              </div>

              {/* Word in reply search input */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 7,
                padding: '5px 10px',
                minWidth: 160,
                flex: 1,
              }}>
                <Search size={12} color="#8696a0" />
                <input
                  type="text"
                  placeholder='Word in reply — e.g. "B"'
                  value={explorerKeywordInput}
                  onChange={e => setExplorerKeywordInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && explorerKeywordInput.trim()) {
                      e.preventDefault();
                      const trimmed = explorerKeywordInput.trim().toLowerCase();
                      if (!explorerKeywords.includes(trimmed)) {
                        setExplorerKeywords([...explorerKeywords, trimmed]);
                      }
                      setExplorerKeywordInput('');
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: 12,
                    outline: 'none',
                    width: '100%',
                  }}
                />
                {explorerKeywordInput.trim() && (
                  <button
                    onClick={() => {
                      const trimmed = explorerKeywordInput.trim().toLowerCase();
                      if (!explorerKeywords.includes(trimmed)) {
                        setExplorerKeywords([...explorerKeywords, trimmed]);
                      }
                      setExplorerKeywordInput('');
                    }}
                    style={{
                      background: '#00a884',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + Add
                  </button>
                )}
              </div>

              {/* Active keyword chips matching screenshot */}
              {explorerKeywords.map(kw => (
                <div
                  key={kw}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'rgba(244, 63, 94, 0.08)',
                    border: '1px solid rgba(244, 63, 94, 0.35)',
                    borderRadius: 7,
                    padding: '4px 8px',
                    color: '#fb7185',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: 12, opacity: 0.8 }}>⊘</span>
                  <span>{kw}</span>
                  <span
                    onClick={() => setExplorerKeywords(explorerKeywords.filter(k => k !== kw))}
                    style={{ cursor: 'pointer', fontSize: 13, marginLeft: 2, color: '#fda4af' }}
                    title={`Remove "${kw}" filter`}
                  >
                    ⊗
                  </span>
                </div>
              ))}
            </div>"""

if 'Filter Ribbon inside Explorer matching screenshot' not in code:
    code = code.replace(modal_header_end, filter_ribbon)

# 5. Replace accountChats.filter(...) with filteredExplorerChats.map in left column
old_chat_map = """                  ) : (
                    accountChats
                      .filter(c => !chatSearch || (c.name || c.id).toLowerCase().includes(chatSearch.toLowerCase()))
                      .map(chat => {"""

new_chat_map = """                  ) : (
                    filteredExplorerChats.map(chat => {"""

code = code.replace(old_chat_map, new_chat_map)

# 6. In message bubbles, highlight keywords in msg.text
old_msg_text = """                            <div style={{ fontSize: 12.5, lineHeight: 1.4, wordBreak: 'break-word' }}>
                              {msg.text}
                            </div>"""

new_msg_text = """                            <div style={{ fontSize: 12.5, lineHeight: 1.4, wordBreak: 'break-word' }}>
                              {highlightKeyword(msg.text, explorerKeywords)}
                            </div>"""

code = code.replace(old_msg_text, new_msg_text)

# Also update duration label in explorer header to use explorerDateRange.label
code = code.replace('Duration: {dateRange.label}', 'Duration: {explorerDateRange.label}')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated WhatsAppAccountsManagerDashboard.tsx successfully!")
