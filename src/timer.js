export const MAX_LABEL_LENGTH = 80;

export function normalizeTimer(input) {
  const label = String(input?.label ?? "").trim().slice(0, MAX_LABEL_LENGTH);
  const target = Number(input?.target);

  if (!label) throw new Error("A label is required.");
  if (!Number.isFinite(target)) throw new Error("Choose a valid date and time.");

  return {
    id: String(input.id || crypto.randomUUID()),
    label,
    target,
    createdAt: Number.isFinite(Number(input.createdAt)) ? Number(input.createdAt) : Date.now(),
    updatedAt: Date.now()
  };
}

export function sortTimers(timers) {
  return [...timers].sort((a, b) => a.target - b.target || a.createdAt - b.createdAt);
}

export function filterTimersByLabel(timers, query) {
  const normalizedQuery = String(query ?? "").trim().toLocaleLowerCase();
  if (!normalizedQuery) return [...timers];
  return timers.filter((timer) => String(timer.label ?? "").toLocaleLowerCase().includes(normalizedQuery));
}

export function getNewlyExpiredTimers(timers, trackedActiveIds, now = Date.now()) {
  const trackedIds = trackedActiveIds instanceof Set ? trackedActiveIds : new Set(trackedActiveIds || []);
  return timers.filter((timer) => timer.target <= now && trackedIds.has(timer.id));
}

export function splitDuration(target, now = Date.now()) {
  const delta = target - now;
  const totalSeconds = Math.max(0, Math.ceil(delta / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { expired: delta <= 0, days, hours, minutes, seconds, delta };
}

export function formatTarget(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

export function toLocalInputValues(timestamp = Date.now() + 3600000) {
  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`
  };
}

export function fromLocalInputValues(date, time) {
  if (!date || !time) return NaN;
  return new Date(`${date}T${time}`).getTime();
}

function parseDurationPart(value, label, max) {
  if (value === "" || value === null || value === undefined) return 0;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > max) {
    throw new Error(`${label} must be a whole number from 0 to ${max}.`);
  }
  return number;
}

export function durationToMilliseconds(duration = {}) {
  const days = parseDurationPart(duration.days, "Days", 36500);
  const hours = parseDurationPart(duration.hours, "Hours", 23);
  const minutes = parseDurationPart(duration.minutes, "Minutes", 59);
  const seconds = parseDurationPart(duration.seconds, "Seconds", 59);

  return (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
}

export function resolveTarget({ date, time, duration, now = Date.now() }) {
  const durationMs = durationToMilliseconds(duration);
  if (durationMs > 0) return now + durationMs;

  const target = fromLocalInputValues(date, time);
  if (!Number.isFinite(target)) {
    throw new Error("Choose an end date and time or enter a duration.");
  }
  return target;
}

export function getPresentationLayout(count, aspectRatio = 16 / 9) {
  const safeCount = Math.max(1, Math.floor(Number(count) || 0));
  const safeAspect = Math.max(0.5, Number(aspectRatio) || 16 / 9);

  let columns;
  if (safeCount === 1) columns = 1;
  else if (safeCount <= 4) columns = 2;
  else columns = Math.min(safeCount, Math.ceil(Math.sqrt(safeCount * safeAspect)));

  const rows = Math.ceil(safeCount / columns);
  const remainder = safeCount % columns;
  const lastRowCount = remainder || columns;

  return {
    columns,
    rows,
    tracks: columns * 2,
    lastRowCount,
    firstLastRowIndex: safeCount - lastRowCount,
    firstLastRowTrack: remainder ? columns - remainder + 1 : 1
  };
}
