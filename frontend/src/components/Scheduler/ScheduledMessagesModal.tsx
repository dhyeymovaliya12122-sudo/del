import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Send, Trash2, CheckCircle2,
  AlertCircle, RefreshCw, X, Plus, Repeat, Users
} from 'lucide-react';
import { schedulerApi, ScheduledMessage } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatIndianDateTime } from '../../utils/indianTime';

interface ScheduledMessagesModalProps {
  accountId: string;
  defaultToJid?: string;
  defaultContactName?: string;
  initialMessageText?: string;
  initialRepeatType?: 'once' | 'daily' | 'weekly' | 'monthly';
  initialShowCreate?: boolean;
  isMultiRecipient?: boolean;
  onClose: () => void;
  onNavigateToCampaigns?: (draftText?: string) => void;
}

export default function ScheduledMessagesModal({
  accountId,
  defaultToJid = '',
  defaultContactName = '',
  initialMessageText = '',
  initialRepeatType = 'once',
  initialShowCreate = false,
  isMultiRecipient = false,
  onClose,
  onNavigateToCampaigns,
}: ScheduledMessagesModalProps) {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(initialShowCreate);

  // Form State
  const [multiRecipientMode, setMultiRecipientMode] = useState(isMultiRecipient);
  const [toJid, setToJid] = useState(defaultToJid);
  const [recipientsInput, setRecipientsInput] = useState(defaultToJid ? defaultToJid.replace('@s.whatsapp.net', '') : '');
  const [messageText, setMessageText] = useState(initialMessageText);
  const [scheduledAt, setScheduledAt] = useState('');
  const [repeatType, setRepeatType] = useState<'once' | 'daily' | 'weekly' | 'monthly'>(initialRepeatType);
  const [submitting, setSubmitting] = useState(false);

  const { addToast } = useToast();

  const loadMessages = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await schedulerApi.list(accountId);
      setMessages(data);
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        addToast('error', `Failed to load scheduled messages: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    // Default scheduled time: 1 hour from now formatted for datetime-local input
    const d = new Date(Date.now() + 60 * 60 * 1000);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    setScheduledAt(localISOTime);
  }, [accountId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !scheduledAt) {
      addToast('warning', 'Please fill message content and scheduled date/time');
      return;
    }

    let parsedJids: string[] = [];
    if (multiRecipientMode) {
      parsedJids = recipientsInput
        .split(/[\n,;]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .map(num => {
          if (num.includes('@')) return num;
          const clean = num.replace(/[^0-9]/g, '');
          return clean ? `${clean}@s.whatsapp.net` : '';
        })
        .filter(Boolean);
    } else {
      if (!toJid.trim()) {
        addToast('warning', 'Please enter a recipient phone number or JID');
        return;
      }
      const raw = toJid.trim();
      parsedJids = [raw.includes('@') ? raw : `${raw.replace(/[^0-9]/g, '')}@s.whatsapp.net`];
    }

    if (parsedJids.length === 0) {
      addToast('warning', 'Please enter at least one valid recipient phone number');
      return;
    }

    setSubmitting(true);
    try {
      const scheduledIso = new Date(scheduledAt).toISOString();
      const results = await Promise.allSettled(
        parsedJids.map(targetJid =>
          schedulerApi.create({
            accountId,
            toJid: targetJid,
            messageText: messageText.trim(),
            scheduledAt: scheduledIso,
            repeatType,
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      if (successful > 0) {
        addToast('success', `Message successfully scheduled for ${successful} contact${successful > 1 ? 's' : ''}!`);
        setShowCreate(false);
        setMessageText('');
        if (multiRecipientMode) setRecipientsInput('');
        loadMessages();
      } else {
        addToast('error', 'Failed to schedule message for the given recipient(s)');
      }
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to schedule message');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await schedulerApi.cancel(id);
      addToast('success', 'Scheduled message cancelled');
      loadMessages();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to cancel message');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#202c33] border-b border-[#2a3942]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Calendar size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#e9edef] flex items-center gap-2">
                Message Scheduler
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Feature Not In Meta
                </span>
              </h2>
              <p className="text-xs text-[#8696a0]">
                Schedule one-time or recurring messages to any contact
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
            >
              <Plus size={14} />
              Schedule New
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#374248] text-[#aebac1] hover:text-white rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0c1317]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-[#8696a0]">
              <RefreshCw size={28} className="animate-spin mb-2 text-blue-400" />
              <p className="text-xs">Loading schedules...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-[#8696a0] border border-dashed border-[#2a3942] rounded-xl p-6">
              <Clock size={40} className="text-[#8696a0] mb-3 opacity-40" />
              <p className="font-semibold text-sm text-[#e9edef]">No scheduled messages yet</p>
              <p className="text-xs mt-1 text-center max-w-sm">
                Schedule birthday wishes, client reminders, follow-ups, or recurring morning announcements.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
              >
                Schedule Your First Message
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((item) => {
                const isPending = item.status === 'pending';
                const isSent = item.status === 'sent';
                const isFailed = item.status === 'failed';
                const formattedDate = formatIndianDateTime(item.scheduledAt);

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-[#182229] border border-[#2a3942] rounded-xl flex items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          isPending ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          isSent ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {item.status}
                        </span>
                        {item.repeatType !== 'once' && (
                          <span className="flex items-center gap-1 text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                            <Repeat size={10} />
                            {item.repeatType}
                          </span>
                        )}
                        <span className="text-xs text-[#8696a0] font-mono">
                          To: {item.toJid.replace('@s.whatsapp.net', '')}
                        </span>
                      </div>
                      <p className="text-sm text-[#e9edef] line-clamp-2">{item.messageText}</p>
                      <div className="flex items-center gap-2 text-xs text-[#8696a0]">
                        <Clock size={12} />
                        <span>Scheduled: {formattedDate}</span>
                      </div>
                    </div>

                    <div>
                      {isPending && (
                        <button
                          onClick={() => handleCancel(item.id)}
                          className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Cancel message"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Schedule Message Form */}
        {showCreate && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-[#202c33] border border-[#2a3942] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#2a3942] pb-3">
                <h3 className="font-bold text-[#e9edef] flex items-center gap-2">
                  <Clock size={18} className="text-blue-400" />
                  Schedule Message
                </h3>
                <button onClick={() => setShowCreate(false)} className="text-[#8696a0] hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                {/* Single vs Multi Mode Selector */}
                <div className="flex items-center justify-between p-1 bg-[#111b21] rounded-lg border border-[#2a3942]">
                  <button
                    type="button"
                    onClick={() => setMultiRecipientMode(false)}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                      !multiRecipientMode
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-[#8696a0] hover:text-[#e9edef]'
                    }`}
                  >
                    Single Contact
                  </button>
                  <button
                    type="button"
                    onClick={() => setMultiRecipientMode(true)}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      multiRecipientMode
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-[#8696a0] hover:text-[#e9edef]'
                    }`}
                  >
                    <Users size={13} />
                    <span>Multiple Contacts</span>
                  </button>
                </div>

                {!multiRecipientMode ? (
                  <div>
                    <label className="block text-xs font-semibold text-[#8696a0] mb-1">
                      Recipient (Phone Number or JID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 919876543210 or +1234567890"
                      value={toJid}
                      onChange={(e) => setToJid(e.target.value)}
                      className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg px-3 py-2 text-sm text-[#e9edef] focus:outline-none focus:border-blue-500"
                      required={!multiRecipientMode}
                    />
                    {defaultContactName && (
                      <p className="text-[11px] text-emerald-400 mt-0.5">Recipient: {defaultContactName}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-emerald-400">
                        Multiple Recipients (Phone Numbers)
                      </label>
                      <span className="text-[11px] text-[#8696a0]">
                        {recipientsInput.split(/[\n,;]+/).filter(s => s.trim().length >= 7).length} parsed
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Paste comma, space, or newline-separated numbers (e.g. +91 9876543210, +1 4155552671)"
                      value={recipientsInput}
                      onChange={(e) => setRecipientsInput(e.target.value)}
                      className="w-full bg-[#111b21] border border-emerald-500/30 rounded-lg px-3 py-2 text-xs font-mono text-[#e9edef] focus:outline-none focus:border-emerald-500"
                      required={multiRecipientMode}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#8696a0] mb-1">Message Content</label>
                  <textarea
                    rows={3}
                    placeholder="Type the message you want to send..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg px-3 py-2 text-sm text-[#e9edef] focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#8696a0] mb-1">Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg px-2.5 py-2 text-xs text-[#e9edef] focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#8696a0] mb-1">Repeat Cycle</label>
                    <select
                      value={repeatType}
                      onChange={(e) => setRepeatType(e.target.value as any)}
                      className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg px-2.5 py-2 text-xs text-[#e9edef] focus:outline-none focus:border-blue-500"
                    >
                      <option value="once">Send Once</option>
                      <option value="daily">Daily Repeat</option>
                      <option value="weekly">Weekly Repeat</option>
                      <option value="monthly">Monthly Repeat</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 text-xs text-[#8696a0] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50"
                  >
                    {submitting ? 'Scheduling...' : multiRecipientMode ? 'Schedule for All' : 'Confirm Schedule'}
                  </button>
                </div>

                {onNavigateToCampaigns && (
                  <div className="pt-2 border-t border-[#2a3942]/60 flex items-center justify-between">
                    <span className="text-[11px] text-[#8696a0]">Need CSV import or marketing templates?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToCampaigns(messageText);
                      }}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
                    >
                      Open Campaigns Engine →
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
