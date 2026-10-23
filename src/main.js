import "./styles.css";
import { TimerStore } from "./storage.js";
import { filterTimersByLabel, formatTarget, getNewlyExpiredTimers, getPresentationLayout, resolveTarget, splitDuration, toLocalInputValues } from "./timer.js";
import { icons } from "./icons.js";

const store = new TimerStore();
let view = localStorage.getItem("chronodeck.view") || "grid";
let editingId = null;
let lastUpdatedSecond = -1;
let focusMode = false;
let labelFilter = "";
let targetInputsTouched = false;
let trackedActiveTimerIds = new Set(store.timers.filter((timer) => timer.target > Date.now()).map((timer) => timer.id));
let pendingExpiredTimerLabels = new Set();
let tabAlertInterval = null;
let tabAlertFrameVisible = false;

const defaultDocumentTitle = document.title;
const favicon = document.querySelector('link[rel~="icon"]');
const defaultFaviconHref = favicon?.href;
const alertFaviconHref = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="15" fill="#ff5d52"/>
    <path d="M32 14v5m-9-8h18M32 20a17 17 0 1 0 0 34 17 17 0 0 0 0-34Zm0 7v8l6 4" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`)}`;

const app = document.querySelector("#app");
app.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <a class="brand" href="./" aria-label="ChronoDeck home">
        <span class="brand-mark">${icons.clock}</span>
        <span>CHRONO<span>DECK</span></span>
      </a>
      <div class="topbar-actions">
        <div class="sync-badge" data-state="loading"><i></i><span>Loading</span></div>
        <button class="primary-button" id="addTimerTop" aria-label="New timer">${icons.plus}<span>New timer</span></button>
      </div>
    </header>

    <main>
      <section class="intro">
        <div>
          <p class="eyebrow">TIME, BEAUTIFULLY ORDERED</p>
          <h1>Everything you're<br><em>waiting for.</em></h1>
          <p class="intro-copy">Keep every milestone in sight. Timers automatically line up from nearest to furthest.</p>
        </div>
        <div class="intro-stat" aria-live="polite">
          <strong id="timerCount">0</strong>
          <span>ACTIVE<br>TIMERS</span>
        </div>
      </section>

      <section class="board" id="board">
        <div class="board-toolbar">
          <div>
            <p class="section-kicker">YOUR COUNTDOWNS</p>
            <p class="section-meta" id="sortMeta">Sorted by time remaining</p>
          </div>
          <div class="view-controls" aria-label="View options">
            <input class="label-filter" id="labelFilter" type="search" placeholder="Filter by label" aria-label="Filter timers by label" autocomplete="off">
            <div class="segmented" role="group" aria-label="Layout">
              <button data-view="grid" aria-label="Grid view">${icons.grid}</button>
              <button data-view="list" aria-label="List view">${icons.list}</button>
            </div>
            <button class="icon-text-button" id="focusButton" aria-label="Enter focus mode" aria-pressed="false">${icons.focus}<span>Focus</span></button>
            <button class="icon-text-button" id="fullscreenButton">${icons.expand}<span>Present</span></button>
            <div class="focus-timer-count" aria-live="polite">
              <strong id="focusTimerCount">0</strong>
              <span>ACTIVE<br>TIMERS</span>
            </div>
          </div>
        </div>
        <div class="timer-board" id="timerBoard" aria-live="polite"></div>
      </section>
    </main>

    <footer>
      <span>CHRONODECK</span>
      <span>A SITE BY MUSHARAF HOSSAIN</span>
      <span id="year"></span>
    </footer>
  </div>

  <dialog id="timerDialog">
    <form method="dialog" id="timerForm">
      <div class="dialog-heading">
        <div><p class="eyebrow" id="dialogEyebrow">NEW COUNTDOWN</p><h2 id="dialogTitle">Add a timer</h2></div>
        <button class="icon-button" type="button" data-dismiss="timer-dialog" aria-label="Close">${icons.close}</button>
      </div>
      <label>Label<input id="labelInput" name="label" maxlength="80" placeholder="e.g. Product launch" required autocomplete="off"></label>
      <fieldset class="time-option duration-option">
        <legend>Run timer for</legend>
        <div class="duration-grid">
          <label>Days<input id="durationDays" name="durationDays" type="number" min="0" max="36500" step="1" inputmode="numeric" placeholder="00"></label>
          <label>Hours<input id="durationHours" name="durationHours" type="number" min="0" max="23" step="1" inputmode="numeric" placeholder="00"></label>
          <label>Minutes<input id="durationMinutes" name="durationMinutes" type="number" min="0" max="59" step="1" inputmode="numeric" placeholder="00"></label>
          <label>Seconds<input id="durationSeconds" name="durationSeconds" type="number" min="0" max="59" step="1" inputmode="numeric" placeholder="00"></label>
        </div>
        <p class="duration-note">Starts counting from the moment you save.</p>
      </fieldset>
      <div class="form-divider"><span>OR SET AN END DATE</span></div>
      <fieldset class="time-option">
        <legend>End date &amp; time</legend>
        <div class="form-row">
          <label>Date<input id="dateInput" name="date" type="date"></label>
          <label>Time<input id="timeInput" name="time" type="time"></label>
        </div>
      </fieldset>
      <p class="form-error" id="formError" role="alert"></p>
      <div class="dialog-actions">
        <button class="secondary-button" type="button" data-dismiss="timer-dialog">Cancel</button>
        <button class="primary-button" id="saveTimer" value="default">Save timer</button>
      </div>
    </form>
  </dialog>

  <dialog id="deleteDialog" class="confirm-dialog">
    <form method="dialog">
      <p class="eyebrow">REMOVE COUNTDOWN</p>
      <h2>Delete this timer?</h2>
      <p id="deleteMessage">This action cannot be undone.</p>
      <div class="dialog-actions">
        <button class="secondary-button" value="cancel">Keep it</button>
        <button class="danger-button" id="confirmDelete" value="default">Delete timer</button>
      </div>
    </form>
  </dialog>
`;

const elements = {
  board: document.querySelector("#board"),
  timerBoard: document.querySelector("#timerBoard"),
  timerCount: document.querySelector("#timerCount"),
  focusTimerCount: document.querySelector("#focusTimerCount"),
  labelFilter: document.querySelector("#labelFilter"),
  syncBadge: document.querySelector(".sync-badge"),
  dialog: document.querySelector("#timerDialog"),
  form: document.querySelector("#timerForm"),
  label: document.querySelector("#labelInput"),
  date: document.querySelector("#dateInput"),
  time: document.querySelector("#timeInput"),
  durationDays: document.querySelector("#durationDays"),
  durationHours: document.querySelector("#durationHours"),
  durationMinutes: document.querySelector("#durationMinutes"),
  durationSeconds: document.querySelector("#durationSeconds"),
  formError: document.querySelector("#formError"),
  deleteDialog: document.querySelector("#deleteDialog"),
  deleteMessage: document.querySelector("#deleteMessage"),
  confirmDelete: document.querySelector("#confirmDelete")
};

function escapeHtml(value) {
  const node = document.createElement("span");
  node.textContent = value;
  return node.innerHTML;
}

function unit(value, label) {
  return `<div class="time-unit"><strong>${String(value).padStart(2, "0")}</strong><span>${label}</span></div>`;
}

function renderTimer(timer) {
  const remaining = splitDuration(timer.target);
  const status = remaining.expired ? "TIME'S UP" : "COUNTING DOWN";
  return `
    <article class="timer-card ${remaining.expired ? "is-expired" : ""}" data-id="${timer.id}">
      <div class="card-topline">
        <span class="timer-status"><i></i>${status}</span>
        <div class="card-actions">
          <button data-action="edit" aria-label="Edit ${escapeHtml(timer.label)}">${icons.edit}</button>
          <button data-action="delete" aria-label="Delete ${escapeHtml(timer.label)}">${icons.trash}</button>
        </div>
      </div>
      <div class="card-title-wrap">
        <h2>${escapeHtml(timer.label)}</h2>
        <p>${formatTarget(timer.target)}</p>
      </div>
      <div class="countdown" aria-label="${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds">
        ${unit(remaining.days, "DAYS")}
        <span class="colon">:</span>
        ${unit(remaining.hours, "HRS")}
        <span class="colon">:</span>
        ${unit(remaining.minutes, "MIN")}
        <span class="colon">:</span>
        ${unit(remaining.seconds, "SEC")}
      </div>
    </article>
  `;
}

function getTabAlertTitle() {
  const labels = [...pendingExpiredTimerLabels];
  if (labels.length === 1) return `⏰ ${labels[0]} ended!`;
  return `⏰ ${labels.length} timers ended!`;
}

function updateTabAlertFrame() {
  tabAlertFrameVisible = !tabAlertFrameVisible;
  document.title = tabAlertFrameVisible ? getTabAlertTitle() : defaultDocumentTitle;
  if (favicon) favicon.href = tabAlertFrameVisible ? alertFaviconHref : defaultFaviconHref;
}

function startTabAlert(expiredTimers) {
  expiredTimers.forEach((timer) => pendingExpiredTimerLabels.add(timer.label));
  if (tabAlertInterval) return;
  tabAlertFrameVisible = false;
  updateTabAlertFrame();
  tabAlertInterval = window.setInterval(updateTabAlertFrame, 800);
}

function stopTabAlert() {
  if (tabAlertInterval) window.clearInterval(tabAlertInterval);
  tabAlertInterval = null;
  tabAlertFrameVisible = false;
  pendingExpiredTimerLabels.clear();
  document.title = defaultDocumentTitle;
  if (favicon) favicon.href = defaultFaviconHref;
}

function trackTimerExpirations(now) {
  const newlyExpiredTimers = getNewlyExpiredTimers(store.timers, trackedActiveTimerIds, now);
  trackedActiveTimerIds = new Set(
    store.timers.filter((timer) => timer.target > now).map((timer) => timer.id)
  );
  if (document.hidden && newlyExpiredTimers.length) startTabAlert(newlyExpiredTimers);
}

function refreshCountdowns() {
  const now = Date.now();
  const timersById = new Map(store.timers.map((timer) => [timer.id, timer]));
  const activeCount = store.timers.filter((timer) => timer.target > now).length;
  trackTimerExpirations(now);

  elements.timerBoard.querySelectorAll(".timer-card").forEach((card) => {
    const timer = timersById.get(card.dataset.id);
    if (!timer) return;

    const remaining = splitDuration(timer.target, now);
    card.classList.toggle("is-expired", remaining.expired);

    const status = card.querySelector(".timer-status");
    if (status?.lastChild) status.lastChild.textContent = remaining.expired ? "TIME'S UP" : "COUNTING DOWN";

    const values = [remaining.days, remaining.hours, remaining.minutes, remaining.seconds];
    card.querySelectorAll(".time-unit strong").forEach((unitElement, index) => {
      unitElement.textContent = String(values[index]).padStart(2, "0");
    });

    card.querySelector(".countdown")?.setAttribute(
      "aria-label",
      `${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds`
    );
  });

  elements.timerCount.textContent = activeCount;
  elements.focusTimerCount.textContent = activeCount;
}

function setPresentationGrid() {
  const cards = [...elements.timerBoard.querySelectorAll(".timer-card")];
  const count = Math.max(1, cards.length);
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const layout = getPresentationLayout(count, aspect);
  const cellWidth = (window.innerWidth - ((layout.columns + 1) * 10)) / layout.columns;
  const cellHeight = (window.innerHeight - ((layout.rows + 1) * 10)) / layout.rows;
  const digitSize = Math.max(16, Math.min(84, cellWidth / 14, cellHeight / 5));
  const titleSize = Math.max(18, Math.min(72, cellWidth / 10, cellHeight / 4));
  const paddingSize = Math.max(8, Math.min(44, cellWidth / 18, cellHeight / 8));
  elements.timerBoard.style.setProperty("--present-tracks", layout.tracks);
  elements.timerBoard.style.setProperty("--present-rows", layout.rows);
  elements.timerBoard.style.setProperty("--present-digit", `${digitSize}px`);
  elements.timerBoard.style.setProperty("--present-title", `${titleSize}px`);
  elements.timerBoard.style.setProperty("--present-padding", `${paddingSize}px`);

  cards.forEach((card) => card.style.removeProperty("--present-start"));
  if (layout.lastRowCount < layout.columns && cards[layout.firstLastRowIndex]) {
    cards[layout.firstLastRowIndex].style.setProperty("--present-start", layout.firstLastRowTrack);
  }
}

function render() {
  elements.timerBoard.dataset.view = view;
  document.querySelectorAll("button[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
    button.setAttribute("aria-pressed", String(button.dataset.view === view));
  });
  const activeCount = store.timers.filter((timer) => timer.target > Date.now()).length;
  const visibleTimers = filterTimersByLabel(store.timers, labelFilter);
  elements.timerCount.textContent = activeCount;
  elements.focusTimerCount.textContent = activeCount;

  if (!store.timers.length) {
    elements.timerBoard.innerHTML = `
      <div class="empty-state">
        <span>${icons.clock}</span>
        <p class="eyebrow">YOUR TIMELINE IS CLEAR</p>
        <h2>What are you<br>looking forward to?</h2>
        <p>Add your first countdown and give the future a place on the screen.</p>
        <button class="primary-button" data-action="add" aria-label="Add first timer">${icons.plus}<span>Add first timer</span></button>
      </div>`;
  } else if (!visibleTimers.length) {
    elements.timerBoard.innerHTML = `
      <div class="empty-state filter-empty-state">
        <span>${icons.clock}</span>
        <p class="eyebrow">NO MATCHING TIMERS</p>
        <h2>Nothing matches<br>“${escapeHtml(labelFilter.trim())}”</h2>
        <p>Try another label or clear the filter to see every countdown.</p>
      </div>`;
  } else {
    elements.timerBoard.innerHTML = visibleTimers.map(renderTimer).join("");
  }
  setPresentationGrid();
}

function openTimerDialog(timer = null) {
  editingId = timer?.id || null;
  const values = toLocalInputValues(timer?.target);
  const remaining = timer ? splitDuration(timer.target) : null;
  elements.label.value = timer?.label || "";
  elements.date.value = values.date;
  elements.time.value = values.time;
  elements.durationDays.value = remaining ? remaining.days : "";
  elements.durationHours.value = remaining ? remaining.hours : "";
  elements.durationMinutes.value = remaining ? remaining.minutes : "";
  elements.durationSeconds.value = remaining ? remaining.seconds : "";
  targetInputsTouched = false;
  elements.formError.textContent = "";
  document.querySelector("#dialogEyebrow").textContent = timer ? "EDIT COUNTDOWN" : "NEW COUNTDOWN";
  document.querySelector("#dialogTitle").textContent = timer ? "Update timer" : "Add a timer";
  document.querySelector("#saveTimer").textContent = timer ? "Save changes" : "Save timer";
  elements.dialog.showModal();
  requestAnimationFrame(() => elements.label.focus());
}

function openDeleteDialog(timer) {
  elements.confirmDelete.dataset.id = timer.id;
  elements.deleteMessage.textContent = `“${timer.label}” will be removed for everyone.`;
  elements.deleteDialog.showModal();
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const currentTimer = editingId ? store.timers.find((timer) => timer.id === editingId) : null;
    const target = currentTimer && !targetInputsTouched
      ? currentTimer.target
      : resolveTarget({
        date: elements.date.value,
        time: elements.time.value,
        duration: {
          days: elements.durationDays.value,
          hours: elements.durationHours.value,
          minutes: elements.durationMinutes.value,
          seconds: elements.durationSeconds.value
        }
      });
    if (editingId) await store.update(editingId, { label: elements.label.value, target });
    else await store.add({ label: elements.label.value, target });
    elements.dialog.close();
  } catch (error) {
    elements.formError.textContent = error.message;
  }
});

[elements.durationDays, elements.durationHours, elements.durationMinutes, elements.durationSeconds]
  .forEach((input) => input.addEventListener("input", () => {
    targetInputsTouched = true;
  }));

[elements.date, elements.time].forEach((input) => input.addEventListener("input", () => {
  targetInputsTouched = true;
  elements.durationDays.value = "";
  elements.durationHours.value = "";
  elements.durationMinutes.value = "";
  elements.durationSeconds.value = "";
}));

elements.form.querySelectorAll('[data-dismiss="timer-dialog"]').forEach((button) => {
  button.addEventListener("click", () => elements.dialog.close());
});

elements.confirmDelete.addEventListener("click", async (event) => {
  event.preventDefault();
  await store.remove(event.currentTarget.dataset.id);
  elements.deleteDialog.close();
});

document.querySelector("#addTimerTop").addEventListener("click", () => openTimerDialog());

elements.timerBoard.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const action = actionButton.dataset.action;
  if (action === "add") return openTimerDialog();
  const timer = store.timers.find((item) => item.id === actionButton.closest("[data-id]")?.dataset.id);
  if (!timer) return;
  if (action === "edit") openTimerDialog(timer);
  if (action === "delete") openDeleteDialog(timer);
});

document.querySelectorAll("button[data-view]").forEach((button) => button.addEventListener("click", () => {
  view = button.dataset.view;
  localStorage.setItem("chronodeck.view", view);
  render();
}));

elements.labelFilter.addEventListener("input", (event) => {
  labelFilter = event.currentTarget.value;
  render();
});

document.querySelector("#focusButton").addEventListener("click", (event) => {
  focusMode = !focusMode;
  document.querySelector(".shell").classList.toggle("is-focus-mode", focusMode);
  event.currentTarget.classList.toggle("is-active", focusMode);
  event.currentTarget.setAttribute("aria-pressed", String(focusMode));
  event.currentTarget.setAttribute("aria-label", focusMode ? "Exit focus mode" : "Enter focus mode");
  event.currentTarget.querySelector("span").textContent = focusMode ? "Exit focus" : "Focus";
  window.scrollTo(0, 0);
});

document.querySelector("#fullscreenButton").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await elements.board.requestFullscreen();
  } catch {
    elements.syncBadge.dataset.state = "offline";
    elements.syncBadge.querySelector("span").textContent = "Fullscreen unavailable";
  }
});

document.addEventListener("fullscreenchange", () => {
  elements.board.classList.toggle("is-presenting", Boolean(document.fullscreenElement));
  setPresentationGrid();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) stopTabAlert();
});
window.addEventListener("pagehide", stopTabAlert);
window.addEventListener("resize", setPresentationGrid);
document.addEventListener("keydown", (event) => {
  if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
  if (event.key.toLowerCase() === "f" && !elements.dialog.open && !elements.deleteDialog.open) {
    document.querySelector("#fullscreenButton").click();
  }
  if (event.key.toLowerCase() === "n" && !elements.dialog.open && !elements.deleteDialog.open) openTimerDialog();
});

store.addEventListener("change", () => {
  render();
  trackedActiveTimerIds = new Set(
    store.timers.filter((timer) => timer.target > Date.now()).map((timer) => timer.id)
  );
});
store.addEventListener("status", (event) => {
  elements.syncBadge.dataset.state = event.detail.state;
  elements.syncBadge.querySelector("span").textContent = event.detail.message;
});

window.setInterval(() => {
  const second = Math.floor(Date.now() / 1000);
  if (second !== lastUpdatedSecond && store.timers.length) {
    lastUpdatedSecond = second;
    refreshCountdowns();
  }
}, 250);

document.querySelector("#year").textContent = new Date().getFullYear();
render();
store.start();
