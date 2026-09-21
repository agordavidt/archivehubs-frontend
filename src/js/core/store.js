const listeners = new Map();

export const store = {
  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event).delete(fn);
  },
  emit(event, payload) {
    listeners.get(event)?.forEach(fn => {
      try { fn(payload); }
      catch (e) { console.error(`[store] handler for "${event}" failed:`, e); }
    });
  },
};