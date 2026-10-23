import assert from "node:assert/strict";
import { test } from "node:test";
import { getWidgetTimers, getWidgetWindowSize } from "../src/widget.js";

const timers = [
  { id: "one", label: "Product launch", target: 1000 },
  { id: "two", label: "Team meetup", target: 2000 },
  { id: "three", label: "Launch retrospective", target: 3000 }
];

test("collection widget follows the current timer filter", () => {
  assert.deepEqual(
    getWidgetTimers(timers, { kind: "collection" }, "launch").map((timer) => timer.id),
    ["one", "three"]
  );
  assert.equal(getWidgetTimers(timers, { kind: "collection" }).length, 3);
});

test("single widget includes only its selected timer", () => {
  assert.deepEqual(getWidgetTimers(timers, { kind: "single", timerId: "two" }), [timers[1]]);
  assert.deepEqual(getWidgetTimers(timers, { kind: "single", timerId: "missing" }), []);
});

test("widget window stays compact and caps long lists", () => {
  assert.deepEqual(getWidgetWindowSize(1, "single"), { width: 360, height: 270 });
  assert.equal(getWidgetWindowSize(0).height, 280);
  assert.equal(getWidgetWindowSize(20).height, 540);
});
