import { filterTimersByLabel, formatTarget, getTimerRemaining, isTimerPaused } from "./timer.js";

const WIDGET_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@500;600;700&display=swap');

  :root {
    color-scheme: dark;
    font-family: "Manrope", sans-serif;
    color: #f3f1e8;
    background: #0c0d10;
    --ink: #f3f1e8;
    --muted: #85878d;
    --line: #292b30;
    --panel: #141518;
    --acid: #d9ff43;
    --danger: #ff5d52;
  }

  * { box-sizing: border-box; }
  html, body { min-width: 250px; min-height: 100%; margin: 0; background: #0c0d10; }
  body { padding: 16px; background: radial-gradient(circle at 100% 0, rgba(217,255,67,.08), transparent 36%), #0c0d10; }
  .widget-header { position: sticky; z-index: 2; top: -16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: -16px -16px 12px; padding: 14px 16px 12px; background: rgba(12,13,16,.94); border-bottom: 1px solid var(--line); backdrop-filter: blur(12px); }
  .widget-brand { display: flex; align-items: center; gap: 9px; min-width: 0; font-size: 12px; font-weight: 700; letter-spacing: -.02em; }
  .widget-brand-mark { display: grid; flex: 0 0 auto; place-items: center; width: 28px; height: 28px; color: #111; background: var(--acid); border-radius: 50%; }
  .widget-brand-mark svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.9; }
  .widget-brand-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .widget-brand-name span { color: var(--acid); }
  .widget-summary { flex: 0 0 auto; text-align: right; }
  .widget-mode { display: block; color: var(--acid); font: 500 8px/1 "DM Mono", monospace; letter-spacing: .14em; }
  .widget-count { display: block; margin-top: 5px; color: var(--muted); font: 400 9px/1 "DM Mono", monospace; }
  .widget-list { display: grid; gap: 8px; }
  .widget-timer { position: relative; overflow: hidden; padding: 13px 14px 14px; background: var(--panel); border: 1px solid #24262b; border-radius: 8px; }
  .widget-timer::after { content: ""; position: absolute; right: -35px; bottom: -54px; width: 100px; height: 100px; border: 1px solid rgba(217,255,67,.08); border-radius: 50%; pointer-events: none; }
  .widget-timer-top { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: start; gap: 12px; }
  .widget-label { min-width: 0; margin: 0; overflow: hidden; color: var(--ink); font-size: 14px; font-weight: 600; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
  .widget-status { display: flex; flex: 0 0 auto; align-items: center; gap: 6px; color: #96989e; font: 500 8px/1 "DM Mono", monospace; letter-spacing: .08em; }
  .widget-status::before { content: ""; width: 5px; height: 5px; background: var(--acid); border-radius: 50%; box-shadow: 0 0 8px var(--acid); }
  .widget-target { position: relative; z-index: 1; margin: 6px 0 12px; overflow: hidden; color: #6f7177; font: 400 8px/1.3 "DM Mono", monospace; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
  .widget-countdown { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; }
  .widget-unit { padding: 8px 7px 7px; background: #0f1012; border: 1px solid #23252a; border-radius: 5px; }
  .widget-unit strong { display: block; font: 400 18px/.95 "DM Mono", monospace; letter-spacing: -.08em; }
  .widget-unit span { display: block; margin-top: 6px; color: #66686e; font: 500 7px/1 "DM Mono", monospace; letter-spacing: .1em; }
  .widget-timer.is-expired { border-color: rgba(255,93,82,.42); background: #1c1415; }
  .widget-timer.is-expired .widget-status, .widget-timer.is-expired .widget-unit strong { color: var(--danger); }
  .widget-timer.is-expired .widget-status::before { background: var(--danger); box-shadow: 0 0 8px var(--danger); }
  .widget-timer.is-paused { border-color: rgba(217,255,67,.34); }
  .widget-timer.is-paused .widget-status { color: var(--acid); }
  .widget-timer.is-paused .widget-status::before { box-shadow: none; }
  .widget-timer.is-paused .widget-countdown { opacity: .64; }
  .widget-empty { min-height: 175px; display: grid; place-items: center; align-content: center; padding: 24px; text-align: center; border: 1px dashed #303238; border-radius: 8px; }
  .widget-empty-icon { display: grid; place-items: center; width: 42px; height: 42px; margin-bottom: 16px; color: var(--acid); border: 1px solid #3a3c42; border-radius: 50%; }
  .widget-empty-icon svg { width: 21px; height: 21px; fill: none; stroke: currentColor; stroke-width: 1.8; }
  .widget-empty strong { font-size: 15px; }
  .widget-empty p { margin: 7px 0 0; color: var(--muted); font-size: 11px; line-height: 1.45; }

  body[data-mode="single"] { padding: 14px; }
  body[data-mode="single"] .widget-header { top: -14px; margin: -14px -14px 10px; padding: 12px 14px 10px; }
  body[data-mode="single"] .widget-timer { padding: 15px; }
  body[data-mode="single"] .widget-label { font-size: 17px; }
  body[data-mode="single"] .widget-target { margin: 7px 0 14px; }
  body[data-mode="single"] .widget-unit strong { font-size: 22px; }

  @media (max-width: 310px) {
    body { padding: 10px; }
    .widget-header { top: -10px; margin: -10px -10px 8px; padding: 10px; }
    .widget-brand-name { display: none; }
    .widget-unit { padding-inline: 4px; }
    .widget-unit strong { font-size: 16px; }
  }
`;

const CLOCK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

function escapeHtml(value) {
  const replacements = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(value).replace(/[&<>"']/g, (character) => replacements[character]);
}

export function getWidgetTimers(timers, mode, filter = "") {
  if (mode?.kind === "single") {
    const timer = timers.find((item) => item.id === mode.timerId);
    return timer ? [timer] : [];
  }
  return filterTimersByLabel(timers, filter);
}

export function getWidgetWindowSize(timerCount, modeKind = "collection") {
  if (modeKind === "single") return { width: 360, height: 270 };
  const safeCount = Math.max(0, Number(timerCount) || 0);
  return {
    width: 380,
    height: Math.min(540, Math.max(280, 104 + safeCount * 132))
  };
}

function timerMarkup(timer) {
  const targetLabel = isTimerPaused(timer) ? "Paused · End time shifts on resume" : formatTarget(timer.target);
  return `
    <article class="widget-timer" data-timer-id="${escapeHtml(timer.id)}">
      <div class="widget-timer-top">
        <h2 class="widget-label">${escapeHtml(timer.label)}</h2>
        <span class="widget-status" data-part="status">COUNTING</span>
      </div>
      <p class="widget-target">${escapeHtml(targetLabel)}</p>
      <div class="widget-countdown" aria-live="off">
        <div class="widget-unit"><strong data-unit="days">00</strong><span>DAYS</span></div>
        <div class="widget-unit"><strong data-unit="hours">00</strong><span>HRS</span></div>
        <div class="widget-unit"><strong data-unit="minutes">00</strong><span>MIN</span></div>
        <div class="widget-unit"><strong data-unit="seconds">00</strong><span>SEC</span></div>
      </div>
    </article>`;
}

function prepareWidgetDocument(widgetWindow) {
  const document = widgetWindow.document;
  document.title = "ChronoDeck Timer Widget";
  document.documentElement.lang = "en";
  document.head.innerHTML = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0c0d10">
    <title>ChronoDeck Timer Widget</title>
    <style>${WIDGET_STYLES}</style>`;
  document.body.innerHTML = `
    <header class="widget-header">
      <div class="widget-brand">
        <span class="widget-brand-mark">${CLOCK_ICON}</span>
        <span class="widget-brand-name">CHRONO<span>DECK</span></span>
      </div>
      <div class="widget-summary">
        <span class="widget-mode" data-part="mode">ALL TIMERS</span>
        <span class="widget-count" data-part="count">LIVE</span>
      </div>
    </header>
    <main class="widget-list" data-part="list"></main>`;
}

export function createTimerWidget({ getTimers, getFilter, onError, onStateChange } = {}) {
  let widgetWindow = null;
  let mode = { kind: "collection" };
  let contentSignature = "";

  const isOpen = () => Boolean(widgetWindow && !widgetWindow.closed);

  function close() {
    const currentWindow = widgetWindow;
    widgetWindow = null;
    contentSignature = "";
    if (currentWindow && !currentWindow.closed) currentWindow.close();
    onStateChange?.(false, mode);
  }

  function refresh() {
    if (!isOpen()) return;
    const timers = getWidgetTimers(getTimers?.() || [], mode, getFilter?.() || "");
    const document = widgetWindow.document;
    const filter = String(getFilter?.() || "").trim();
    const modeLabel = mode.kind === "single" ? "PINNED TIMER" : filter ? "FILTERED TIMERS" : "ALL TIMERS";
    const countLabel = mode.kind === "single"
      ? "LIVE COUNTDOWN"
      : `${timers.length} ${timers.length === 1 ? "TIMER" : "TIMERS"}`;

    document.body.dataset.mode = mode.kind;
    document.querySelector('[data-part="mode"]').textContent = modeLabel;
    document.querySelector('[data-part="count"]').textContent = countLabel;

    const nextSignature = JSON.stringify([
      mode.kind,
      mode.kind === "collection" ? filter : mode.timerId,
      timers.map((timer) => [timer.id, timer.label, timer.target, timer.pausedRemaining])
    ]);
    if (nextSignature !== contentSignature) {
      const list = document.querySelector('[data-part="list"]');
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const emptyMessage = mode.kind === "single"
        ? "The selected countdown is no longer available."
        : filter
          ? "No countdown matches the current filter."
          : "Add a countdown in ChronoDeck to see it here.";
      list.innerHTML = timers.length
        ? timers.map(timerMarkup).join("")
        : `<div class="widget-empty"><span class="widget-empty-icon">${CLOCK_ICON}</span><strong>No timers to show</strong><p>${emptyMessage}</p></div>`;
      widgetWindow.scrollTo(0, scrollTop);
      contentSignature = nextSignature;
    }

    document.querySelectorAll("[data-timer-id]").forEach((card, index) => {
      const timer = timers[index];
      if (!timer) return;
      const paused = isTimerPaused(timer);
      const remaining = getTimerRemaining(timer);
      card.classList.toggle("is-expired", remaining.expired);
      card.classList.toggle("is-paused", paused);
      card.querySelector('[data-part="status"]').textContent = paused ? "PAUSED" : remaining.expired ? "TIME'S UP" : "COUNTING";
      for (const unit of ["days", "hours", "minutes", "seconds"]) {
        card.querySelector(`[data-unit="${unit}"]`).textContent = String(remaining[unit]).padStart(2, "0");
      }
      card.querySelector(".widget-countdown").setAttribute(
        "aria-label",
        `${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds`
      );
    });
  }

  async function open(nextMode) {
    close();
    mode = nextMode;
    const timers = getWidgetTimers(getTimers?.() || [], mode, getFilter?.() || "");
    const size = getWidgetWindowSize(timers.length, mode.kind);

    try {
      const openedWindow = "documentPictureInPicture" in window
        ? await window.documentPictureInPicture.requestWindow(size)
        : window.open("", "chronodeck-timer-widget", `popup=yes,width=${size.width},height=${size.height},resizable=yes`);

      if (!openedWindow) throw new Error("The browser blocked the timer widget window.");
      widgetWindow = openedWindow;
      contentSignature = "";
      prepareWidgetDocument(openedWindow);
      refresh();
      openedWindow.setInterval(refresh, 250);
      openedWindow.addEventListener("pagehide", () => {
        if (widgetWindow === openedWindow) {
          widgetWindow = null;
          contentSignature = "";
          onStateChange?.(false, mode);
        }
      }, { once: true });
      onStateChange?.(true, mode);
    } catch (error) {
      widgetWindow = null;
      onStateChange?.(false, mode);
      onError?.(error);
    }
  }

  return {
    close,
    isOpen,
    refresh,
    openCollection: () => open({ kind: "collection" }),
    openSingle: (timerId) => open({ kind: "single", timerId })
  };
}
