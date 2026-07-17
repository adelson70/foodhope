import { create } from 'zustand';

export type ToastTone = 'success' | 'error';

export type ToastItem = {
  id: string;
  tone: ToastTone;
  message: string;
};

type ToastState = {
  items: ToastItem[];
  push: (tone: ToastTone, message: string) => void;
  dismiss: (id: string) => void;
};

const TOAST_TTL_MS = 4200;
const MAX_TOASTS = 2;
const timers = new Map<string, number>();

function clearTimer(id: string) {
  const timer = timers.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: (tone, message) => {
    const id = crypto.randomUUID();
    const current = get().items;
    const nextItems =
      current.length >= MAX_TOASTS
        ? [...current.slice(current.length - MAX_TOASTS + 1), { id, tone, message }]
        : [...current, { id, tone, message }];

    if (current.length >= MAX_TOASTS) {
      const removed = current.slice(0, current.length - MAX_TOASTS + 1);
      for (const item of removed) {
        clearTimer(item.id);
      }
    }

    set({ items: nextItems });

    timers.set(
      id,
      window.setTimeout(() => {
        timers.delete(id);
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      }, TOAST_TTL_MS),
    );
  },
  dismiss: (id) => {
    clearTimer(id);
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },
}));
