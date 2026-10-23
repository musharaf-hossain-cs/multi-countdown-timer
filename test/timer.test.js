import test from "node:test";
import assert from "node:assert/strict";
import { fromLocalInputValues, normalizeTimer, sortTimers, splitDuration, toLocalInputValues } from "../src/timer.js";

test("sortTimers orders countdowns by target time", () => {
  const timers = [
    { id: "later", target: 300, createdAt: 1 },
    { id: "first", target: 100, createdAt: 2 },
    { id: "middle", target: 200, createdAt: 3 }
  ];
  assert.deepEqual(sortTimers(timers).map((timer) => timer.id), ["first", "middle", "later"]);
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
