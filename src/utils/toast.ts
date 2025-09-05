export type ToastVariant = 'info' | 'success' | 'warn' | 'danger';

export interface ToastOptions {
  id?: number;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  variant?: ToastVariant;
  duration?: number; // ms; undefined/0 = sticky
}

type Listener = (toasts: ToastOptions[]) => void;

let _id = 1;
const listeners = new Set<Listener>();
let toasts: ToastOptions[] = [];
const timers = new Map<number, number>();

const notify = () => {
  for (const l of listeners) l(toasts);
};

export const toast = {
  subscribe(fn: Listener) {
    listeners.add(fn);
    fn(toasts);
    return () => listeners.delete(fn);
  },
  show(opts: ToastOptions): number {
    const id = opts.id ?? _id++;
    const t: ToastOptions = { variant: 'info', duration: 5000, ...opts, id };
    toasts = [...toasts, t];
    notify();
    if (t.duration && t.duration > 0) {
      const timer = window.setTimeout(() => {
        toast.dismiss(id);
      }, t.duration);
      timers.set(id, timer);
    }
    return id;
  },
  dismiss(id: number) {
    const existing = toasts.find(t => t.id === id);
    if (!existing) return;
    const timer = timers.get(id);
    if (timer) window.clearTimeout(timer);
    timers.delete(id);
    toasts = toasts.filter(t => t.id !== id);
    existing.onClose?.();
    notify();
  },
  clearAll() {
    for (const id of Array.from(timers.keys())) {
      const timer = timers.get(id);
      if (timer) window.clearTimeout(timer);
    }
    timers.clear();
    toasts = [];
    notify();
  }
};

