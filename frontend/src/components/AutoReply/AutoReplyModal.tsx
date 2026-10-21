import React, { useState, useEffect } from 'react';
import {
  Bot, Plus, Trash2, CheckCircle2,
  Clock, X, RefreshCw, Zap, Shield, ToggleLeft, ToggleRight
} from 'lucide-react';
import { autoReplyApi, AutoReplyRule } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface AutoReplyModalProps {
  accountId: string;
  initialShowCreate?: boolean;
  initialName?: string;
  initialTriggerType?: 'contains' | 'keyword' | 'regex' | 'new_contact' | 'any';
  initialTriggerValue?: string;
  initialReplyMessage?: string;
  initialOnlyOutsideHours?: boolean;
  onClose: () => void;
}

export default function AutoReplyModal({
  accountId,
  initialShowCreate = false,
  initialName = '',
  initialTriggerType = 'contains',
  initialTriggerValue = '',
  initialReplyMessage = '',
  initialOnlyOutsideHours = false,
  onClose,
}: AutoReplyModalProps) {
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(initialShowCreate);

  // Form State
  const [name, setName] = useState(initialName);
  const [triggerType, setTriggerType] = useState<'contains' | 'keyword' | 'regex' | 'new_contact' | 'any'>(initialTriggerType);
  const [triggerValue, setTriggerValue] = useState(initialTriggerValue);
  const [replyMessage, setReplyMessage] = useState(initialReplyMessage);
  const [onlyOutsideHours, setOnlyOutsideHours] = useState(initialOnlyOutsideHours);
  const [businessHoursStart, setBusinessHoursStart] = useState('09:00');
  const [businessHoursEnd, setBusinessHoursEnd] = useState('18:00');
  const [submitting, setSubmitting] = useState(false);

  const { addToast } = useToast();

  const loadRules = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await autoReplyApi.list(accountId);
      setRules(data);
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        addToast('error', `Failed to load auto-reply rules: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, [accountId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !replyMessage.trim()) {
      addToast('warning', 'Please fill name and reply message');
      return;
    }

    setSubmitting(true);
    try {
      await autoReplyApi.create({
        accountId,
        name: name.trim(),
        triggerType,
        triggerValue: triggerValue.trim(),
        replyMessage: replyMessage.trim(),
        isActive: true,
        onlyOutsideHours,
        businessHoursStart: onlyOutsideHours ? businessHoursStart : undefined,
        businessHoursEnd: onlyOutsideHours ? businessHoursEnd : undefined,
      });
      addToast('success', 'Auto-reply rule created!');
      setShowCreate(false);
      setName('');
      setTriggerValue('');
      setReplyMessage('');
      loadRules();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to create rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await autoReplyApi.toggle(id);
      loadRules();
    } catch (err: any) {
      addToast('error', 'Failed to toggle rule');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this auto-reply rule?')) return;
    try {
      await autoReplyApi.delete(id);
      addToast('success', 'Rule deleted');
      loadRules();
    } catch (err: any) {
      addToast('error', 'Failed to delete rule');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#202c33] border-b border-[#2a3942]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Bot size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#e9edef] flex items-center gap-2">
                Keyword Auto-Reply Engine
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  24/7 Smart Bot
                </span>
              </h2>
              <p className="text-xs text-[#8696a0]">
                Respond instantly to customer queries, pricing requests, FAQs, and after-hours messages
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
            >
              <Plus size={14} />
              New Rule
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
              <RefreshCw size={28} className="animate-spin mb-2 text-purple-400" />
              <p className="text-xs">Loading rules...</p>
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-[#8696a0] border border-dashed border-[#2a3942] rounded-xl p-6">
              <Zap size={40} className="text-[#8696a0] mb-3 opacity-40" />
              <p className="font-semibold text-sm text-[#e9edef]">No auto-reply rules configured</p>
              <p className="text-xs mt-1 text-center max-w-sm">
                Create keyword rules to instantly answer messages containing "price", "catalog", "help", or setup after-hours away notices.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
              >
                Create Your First Rule
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                    rule.isActive
                      ? 'bg-[#182229] border-[#2a3942] shadow-sm'
                      : 'bg-[#12191d] border-[#1d272d] opacity-60'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#e9edef]">{rule.name}</span>
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                          {rule.triggerType}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggle(rule.id)}
                          className="p-1 text-[#8696a0] hover:text-white transition-colors"
                          title={rule.isActive ? 'Active - Click to Pause' : 'Paused - Click to Activate'}
                        >
                          {rule.isActive ? (
                            <ToggleRight size={22} className="text-emerald-400" />
                          ) : (
                            <ToggleLeft size={22} className="text-[#8696a0]" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-1 text-[#8696a0] hover:text-rose-400 transition-colors"
                          title="Delete rule"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {rule.triggerValue && (
                      <div className="text-xs text-[#8696a0] flex items-center gap-1">
                        <span>Trigger:</span>
                        <span className="font-mono bg-[#111b21] px-1.5 py-0.5 rounded text-purple-300 border border-[#2a3942]">
                          "{rule.triggerValue}"
                        </span>
                      </div>
                    )}

                    <div className="p-2.5 rounded-lg bg-[#111b21] border border-[#222d34] text-xs text-[#e9edef] italic line-clamp-3">
                      "{rule.replyMessage}"
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#222d34] flex items-center justify-between text-[11px] text-[#8696a0]">
                    <div className="flex items-center gap-3">
                      <span>Matches: <strong className="text-purple-300">{rule.matchCount ?? 0}</strong></span>
                      <span>Replies sent: <strong className="text-emerald-300">{rule.replyCount ?? 0}</strong></span>
                    </div>
                    {rule.onlyOutsideHours && (
                      <span className="flex items-center gap-1 text-amber-300">
                        <Clock size={10} />
                        After hours
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Create Auto-Reply Rule */}
        {showCreate && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-[#202c33] border border-[#2a3942] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#2a3942] pb-3">
                <h3 className="font-bold text-[#e9edef] flex items-center gap-2">
                  <Bot size={18} className="text-purple-400" />
                  Add Auto-Reply Rule
                </h3>
                <button onClick={() => setShowCreate(false)} className="text-[#8696a0] hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8696a0] mb-1">Rule Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Price Query Auto-Reply"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg px-3 py-2 text-sm text-[#e9edef] focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#8696a0] mb-1">Trigger Match Type</label>
                    <select
                      value={triggerType}
                      onChange={(e) => setTriggerType(e.target.value as any)}
                      className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg px-2.5 py-2 text-xs text-[#e9edef] focus:outline-none focus:border-purple-500"
                    >
                      <option value="contains">Message Contains</option>
                      <option value="keyword">Exact Keyword</option>
                      <option value="regex">Regex Expression</option>
                      <option value="new_contact">New Contact First Message</option>
                      <option value="any">Any Incoming Message</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#8696a0] mb-1">Keyword / Trigger Value</label>
                    <input
                      type="text"
                      placeholder="e.g. price, catalogue"
                      value={triggerValue}
                      onChange={(e) => setTriggerValue(e.target.value)}
                      disabled={triggerType === 'new_contact' || triggerType === 'any'}
                      className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg px-2.5 py-2 text-xs text-[#e9edef] focus:outline-none focus:border-purple-500 disabled:opacity-40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8696a0] mb-1">Automated Reply Message</label>
                  <textarea
                    rows={3}
                    placeholder="Hi! Thanks for contacting us. Our prices start from..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg px-3 py-2 text-sm text-[#e9edef] focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div className="p-3 bg-[#111b21] border border-[#2a3942] rounded-lg space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#e9edef]">
                    <input
                      type="checkbox"
                      checked={onlyOutsideHours}
                      onChange={(e) => setOnlyOutsideHours(e.target.checked)}
                      className="accent-purple-500"
                    />
                    Only reply outside business hours
                  </label>
                  {onlyOutsideHours && (
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div>
                        <span className="text-[10px] text-[#8696a0]">Hours Start:</span>
                        <input
                          type="time"
                          value={businessHoursStart}
                          onChange={(e) => setBusinessHoursStart(e.target.value)}
                          className="w-full bg-[#202c33] border border-[#2a3942] rounded px-2 py-1 text-xs text-[#e9edef]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8696a0]">Hours End:</span>
                        <input
                          type="time"
                          value={businessHoursEnd}
                          onChange={(e) => setBusinessHoursEnd(e.target.value)}
                          className="w-full bg-[#202c33] border border-[#2a3942] rounded px-2 py-1 text-xs text-[#e9edef]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
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
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save Rule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
