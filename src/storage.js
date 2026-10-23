import { isTimerPaused, normalizeTimer, pauseTimer, resumeTimer, sortTimers } from "./timer.js";

const LOCAL_KEY = "chronodeck.timers.v1";

function sanitizeTimers(value) {
  if (!Array.isArray(value)) return [];
  return sortTimers(value.flatMap((timer) => {
    try {
      const normalized = normalizeTimer(timer);
      normalized.updatedAt = Number(timer.updatedAt) || normalized.updatedAt;
      return [normalized];
    } catch {
      return [];
    }
  }));
}

export class TimerStore extends EventTarget {
  constructor() {
    super();
    this.timers = this.readLocal();
  }

  readLocal() {
    try {
      return sanitizeTimers(JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"));
    } catch {
      return [];
    }
  }

  writeLocal() {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(this.timers));
  }

  emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  async start() {
    this.emit("change", { source: "local" });
    this.emit("status", { state: "local", message: "Saved on this device" });
  }

  async commit(nextTimers) {
    this.timers = sortTimers(nextTimers);
    this.writeLocal();
    this.emit("change", { source: "local" });

  }

  add(timer) {
    return this.commit([...this.timers, normalizeTimer(timer)]);
  }

  update(id, changes) {
    const current = this.timers.find((timer) => timer.id === id);
    if (!current) return Promise.resolve();
    const updated = normalizeTimer({ ...current, ...changes, id, createdAt: current.createdAt });
    return this.commit(this.timers.map((timer) => timer.id === id ? updated : timer));
  }

  remove(id) {
    return this.commit(this.timers.filter((timer) => timer.id !== id));
  }

  pause(id, now = Date.now()) {
    const current = this.timers.find((timer) => timer.id === id);
    if (!current) return Promise.resolve();
    const paused = pauseTimer(current, now);
    if (paused === current) return Promise.resolve();
    return this.update(id, paused);
  }

  resume(id, now = Date.now()) {
    const current = this.timers.find((timer) => timer.id === id);
    if (!current || !isTimerPaused(current)) return Promise.resolve();
    return this.update(id, resumeTimer(current, now));
  }
}
