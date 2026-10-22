import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastState {
  toast: ToastItem | null;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showToast: (message, type = 'info', duration = 3000) => {
    const id = Date.now().toString();
    set({ toast: { id, message, type, duration } });
  },
  hideToast: () => set({ toast: null }),
}));
