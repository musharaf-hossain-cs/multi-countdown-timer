import test from "node:test";
import assert from "node:assert/strict";
import { isAppInBackground, updateAppBadge } from "../src/app-alert.js";

test("isAppInBackground detects hidden and unfocused app windows", () => {
  assert.equal(isAppInBackground({ hidden: true, hasFocus: () => true }), true);
  assert.equal(isAppInBackground({ hidden: false, hasFocus: () => false }), true);
  assert.equal(isAppInBackground({ hidden: false, hasFocus: () => true }), false);
});

test("updateAppBadge sets a persistent timer count and clears it at zero", () => {
  const calls = [];
  const navigatorLike = {
    setAppBadge: (count) => {
      calls.push(["set", count]);
      return Promise.resolve();
    },
    clearAppBadge: () => {
      calls.push(["clear"]);
      return Promise.resolve();
    }
  };

  updateAppBadge(navigatorLike, 2);
  updateAppBadge(navigatorLike, 0);

  assert.deepEqual(calls, [["set", 2], ["clear"]]);
});

test("updateAppBadge safely tolerates missing or failing browser support", async () => {
  assert.doesNotThrow(() => updateAppBadge({}, 1));
  assert.doesNotThrow(() => updateAppBadge({ setAppBadge: () => { throw new Error("unsupported"); } }, 1));
  assert.doesNotThrow(() => updateAppBadge({ setAppBadge: () => Promise.reject(new Error("blocked")) }, 1));
  await Promise.resolve();
});
