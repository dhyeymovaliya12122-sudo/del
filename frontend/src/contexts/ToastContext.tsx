import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ── Toast system ───────────────────────────────────────────────────────────────
interface Toast { id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string; }
interface ToastCtx { addToast: (type: Toast['type'], message: any) => void; }

const ToastContext = createContext<ToastCtx>({ addToast: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast['type'], rawMessage: any) => {
    let message = '';
    if (typeof rawMessage === 'string') {
      message = rawMessage;
    } else if (rawMessage && typeof rawMessage === 'object') {
      if (typeof rawMessage.message === 'string') {
        message = rawMessage.message;
      } else if (Array.isArray(rawMessage.message)) {
        message = rawMessage.message.join(', ');
      } else if (typeof rawMessage.error === 'string') {
        message = rawMessage.error;
      } else {
        try {
          message = JSON.stringify(rawMessage);
        } catch {
          message = String(rawMessage);
        }
      }
    } else {
      message = String(rawMessage ?? '');
    }

    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : t.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span>{typeof t.message === 'string' ? t.message : String(t.message)}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
