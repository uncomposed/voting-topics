import React, { useEffect, useState } from 'react';
import { toast, type ToastOptions } from '../utils/toast';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastOptions[]>([]);

  useEffect(() => {
    const unsub = toast.subscribe(setToasts);
    return () => { unsub(); };
  }, []);

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.variant || 'info'}`} role="status">
          <div className="toast-body">
            <div className="toast-text">
              {t.title && <div className="toast-title">{t.title}</div>}
              <div className="toast-message">{t.message}</div>
            </div>
            <div className="toast-actions">
              {t.actionLabel && t.onAction && (
                <button
                  className="btn small ghost"
                  onClick={() => {
                    try { t.onAction?.(); } finally { if (t.id) toast.dismiss(t.id); }
                  }}
                >
                  {t.actionLabel}
                </button>
              )}
              <button
                className="btn small"
                aria-label="Dismiss"
                onClick={() => t.id && toast.dismiss(t.id)}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
