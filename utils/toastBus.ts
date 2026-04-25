type ToastListener = (message: string, durationMs?: number) => void;

class ToastBus {
  private listeners: Set<ToastListener> = new Set();

  on(listener: ToastListener) {
    this.listeners.add(listener);
  }

  off(listener: ToastListener) {
    this.listeners.delete(listener);
  }

  show(message: string, durationMs?: number) {
    for (const l of this.listeners) {
      try {
        l(message, durationMs);
      } catch {}
    }
  }
}

export const toastBus = new ToastBus();
