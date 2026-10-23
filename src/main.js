import "./styles.css";
import { TimerStore } from "./storage.js";
import { formatTarget, fromLocalInputValues, splitDuration, toLocalInputValues } from "./timer.js";
import { icons } from "./icons.js";

const store = new TimerStore();
let view = localStorage.getItem("chronodeck.view") || "grid";
let editingId = null;
let lastRenderedSecond = -1;

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
            <div class="segmented" role="group" aria-label="Layout">
              <button data-view="grid" aria-label="Grid view">${icons.grid}</button>
              <button data-view="list" aria-label="List view">${icons.list}</button>
            </div>
            <button class="icon-text-button" id="fullscreenButton">${icons.expand}<span>Present</span></button>
          </div>
        </div>
        <div class="timer-board" id="timerBoard" aria-live="polite"></div>
      </section>
    </main>

    <footer>
      <span>CHRONODECK</span>
      <span>Time moves forward. So do you.</span>
      <span id="year"></span>
    </footer>
  </div>

  <dialog id="timerDialog">
    <form method="dialog" id="timerForm">
      <div class="dialog-heading">
        <div><p class="eyebrow" id="dialogEyebrow">NEW COUNTDOWN</p><h2 id="dialogTitle">Add a timer</h2></div>
        <button class="icon-button" value="cancel" aria-label="Close">${icons.close}</button>
      </div>
      <label>Label<input id="labelInput" name="label" maxlength="80" placeholder="e.g. Product launch" required autocomplete="off"></label>
      <div class="form-row">
        <label>Date<input id="dateInput" name="date" type="date" required></label>
        <label>Time<input id="timeInput" name="time" type="time" required></label>
      </div>
      <p class="form-error" id="formError" role="alert"></p>
      <div class="dialog-actions">
        <button class="secondary-button" value="cancel">Cancel</button>
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
  syncBadge: document.querySelector(".sync-badge"),
  dialog: document.querySelector("#timerDialog"),
  form: document.querySelector("#timerForm"),
  label: document.querySelector("#labelInput"),
  date: document.querySelector("#dateInput"),
  time: document.querySelector("#timeInput"),
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

function setPresentationGrid() {
  const count = Math.max(1, store.timers.length);
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const columns = Math.max(1, Math.ceil(Math.sqrt(count * aspect)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const cellWidth = (window.innerWidth - ((columns + 1) * 10)) / columns;
  const cellHeight = (window.innerHeight - ((rows + 1) * 10)) / rows;
  const digitSize = Math.max(24, Math.min(84, cellWidth / 12, cellHeight / 5));
  const titleSize = Math.max(24, Math.min(72, cellWidth / 10, cellHeight / 4));
  elements.timerBoard.style.setProperty("--present-cols", columns);
  elements.timerBoard.style.setProperty("--present-rows", rows);
  elements.timerBoard.style.setProperty("--present-digit", `${digitSize}px`);
  elements.timerBoard.style.setProperty("--present-title", `${titleSize}px`);
}

function render() {
  elements.timerBoard.dataset.view = view;
  document.querySelectorAll("button[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
    button.setAttribute("aria-pressed", String(button.dataset.view === view));
  });
  elements.timerCount.textContent = store.timers.filter((timer) => timer.target > Date.now()).length;

  if (!store.timers.length) {
    elements.timerBoard.innerHTML = `
      <div class="empty-state">
        <span>${icons.clock}</span>
        <p class="eyebrow">YOUR TIMELINE IS CLEAR</p>
        <h2>What are you<br>looking forward to?</h2>
        <p>Add your first countdown and give the future a place on the screen.</p>
        <button class="primary-button" data-action="add" aria-label="Add first timer">${icons.plus}<span>Add first timer</span></button>
      </div>`;
  } else {
    elements.timerBoard.innerHTML = store.timers.map(renderTimer).join("");
  }
  setPresentationGrid();
}

function openTimerDialog(timer = null) {
  editingId = timer?.id || null;
  const values = toLocalInputValues(timer?.target);
  elements.label.value = timer?.label || "";
  elements.date.value = values.date;
  elements.time.value = values.time;
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
  const target = fromLocalInputValues(elements.date.value, elements.time.value);
  try {
    if (editingId) await store.update(editingId, { label: elements.label.value, target });
    else await store.add({ label: elements.label.value, target });
    elements.dialog.close();
  } catch (error) {
    elements.formError.textContent = error.message;
  }
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
window.addEventListener("resize", setPresentationGrid);
document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "f" && !elements.dialog.open && !elements.deleteDialog.open) {
    document.querySelector("#fullscreenButton").click();
  }
  if (event.key.toLowerCase() === "n" && !elements.dialog.open && !elements.deleteDialog.open) openTimerDialog();
});

store.addEventListener("change", render);
store.addEventListener("status", (event) => {
  elements.syncBadge.dataset.state = event.detail.state;
  elements.syncBadge.querySelector("span").textContent = event.detail.message;
});

window.setInterval(() => {
  const second = Math.floor(Date.now() / 1000);
  if (second !== lastRenderedSecond && store.timers.length) {
    lastRenderedSecond = second;
    render();
  }
}, 250);

document.querySelector("#year").textContent = new Date().getFullYear();
render();
store.start();
