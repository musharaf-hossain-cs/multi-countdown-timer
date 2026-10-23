import test from "node:test";
import assert from "node:assert/strict";
import { durationToMilliseconds, filterTimersByLabel, fromLocalInputValues, getNewlyExpiredTimers, getPresentationLayout, normalizeTimer, resolveTarget, sortTimers, splitDuration, toLocalInputValues } from "../src/timer.js";

test("sortTimers orders countdowns by target time", () => {
  const timers = [
    { id: "later", target: 300, createdAt: 1 },
    { id: "first", target: 100, createdAt: 2 },
    { id: "middle", target: 200, createdAt: 3 }
  ];
  assert.deepEqual(sortTimers(timers).map((timer) => timer.id), ["first", "middle", "later"]);
});

test("filterTimersByLabel matches partial labels without mutating the timer list", () => {
  const timers = [
    { id: "launch", label: "Product Launch" },
    { id: "trip", label: "Dhaka Trip" },
    { id: "review", label: "Launch Review" }
  ];

  assert.deepEqual(filterTimersByLabel(timers, " LAUnch ").map((timer) => timer.id), ["launch", "review"]);
  assert.deepEqual(filterTimersByLabel(timers, "").map((timer) => timer.id), ["launch", "trip", "review"]);
  assert.equal(timers.length, 3);
});

test("getNewlyExpiredTimers only returns timers that crossed expiry while tracked", () => {
  const timers = [
    { id: "expired", target: 999 },
    { id: "still-active", target: 1001 },
    { id: "already-expired", target: 500 }
  ];

  assert.deepEqual(
    getNewlyExpiredTimers(timers, new Set(["expired", "still-active"]), 1000).map((timer) => timer.id),
    ["expired"]
  );
});

test("splitDuration calculates units and expiry", () => {
  assert.deepEqual(splitDuration(1000 + 90061000, 1000), {
    expired: false,
    days: 1,
    hours: 1,
    minutes: 1,
    seconds: 1,
    delta: 90061000
  });
  assert.deepEqual(splitDuration(999, 1000), {
    expired: true,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    delta: -1
  });
});

test("normalizeTimer validates and trims labels", () => {
  const timer = normalizeTimer({ id: "x", label: "  Launch  ", target: 123 });
  assert.equal(timer.label, "Launch");
  assert.throws(() => normalizeTimer({ label: "", target: 123 }), /label/i);
  assert.throws(() => normalizeTimer({ label: "Test", target: NaN }), /date/i);
});

test("local date input helpers round-trip", () => {
  const input = toLocalInputValues(new Date(2030, 5, 7, 8, 9).getTime());
  assert.deepEqual(input, { date: "2030-06-07", time: "08:09" });
  assert.equal(fromLocalInputValues(input.date, input.time), new Date(2030, 5, 7, 8, 9).getTime());
});

test("durationToMilliseconds combines days, hours, minutes, and seconds", () => {
  assert.equal(durationToMilliseconds({ days: "1", hours: "2", minutes: "3", seconds: "4" }), 93784000);
  assert.equal(durationToMilliseconds({}), 0);
  assert.throws(() => durationToMilliseconds({ hours: "24" }), /Hours/);
  assert.throws(() => durationToMilliseconds({ seconds: "1.5" }), /Seconds/);
});

test("resolveTarget prefers a positive duration and falls back to end date", () => {
  const now = new Date(2030, 0, 1, 10, 0).getTime();
  assert.equal(resolveTarget({
    date: "2040-01-01",
    time: "00:00",
    duration: { minutes: "5" },
    now
  }), now + 300000);

  assert.equal(resolveTarget({
    date: "2030-01-02",
    time: "12:30",
    duration: {},
    now
  }), new Date(2030, 0, 2, 12, 30).getTime());

  assert.throws(() => resolveTarget({ date: "", time: "", duration: {}, now }), /end date/i);
});

test("presentation layout follows balanced video-call placement", () => {
  assert.deepEqual(getPresentationLayout(1), {
    columns: 1,
    rows: 1,
    tracks: 2,
    lastRowCount: 1,
    firstLastRowIndex: 0,
    firstLastRowTrack: 1
  });
  assert.deepEqual(getPresentationLayout(2), {
    columns: 2,
    rows: 1,
    tracks: 4,
    lastRowCount: 2,
    firstLastRowIndex: 0,
    firstLastRowTrack: 1
  });
  assert.deepEqual(getPresentationLayout(3), {
    columns: 2,
    rows: 2,
    tracks: 4,
    lastRowCount: 1,
    firstLastRowIndex: 2,
    firstLastRowTrack: 2
  });
  assert.deepEqual(getPresentationLayout(4), {
    columns: 2,
    rows: 2,
    tracks: 4,
    lastRowCount: 2,
    firstLastRowIndex: 2,
    firstLastRowTrack: 1
  });
  assert.equal(getPresentationLayout(5).firstLastRowTrack, 2);
});
