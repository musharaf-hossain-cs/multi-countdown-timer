import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const manifestPath = new URL("../public/manifest.webmanifest", import.meta.url);

function getPngDimensions(buffer) {
  const pngSignature = "89504e470d0a1a0a";
  assert.equal(buffer.subarray(0, 8).toString("hex"), pngSignature);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

test("web app manifest contains the metadata required for installation", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  assert.equal(manifest.name, "ChronoDeck — Multi Countdown Timer");
  assert.equal(manifest.short_name, "ChronoDeck");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.theme_color);
  assert.ok(manifest.background_color);

  const icons = new Map(manifest.icons.map((icon) => [icon.sizes, icon]));
  assert.equal(icons.get("192x192")?.type, "image/png");
  assert.equal(icons.get("512x512")?.type, "image/png");
});

test("manifest icon files have their declared PNG dimensions", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  for (const icon of manifest.icons) {
    const iconUrl = new URL(`../public/${icon.src.replace(/^\.\//, "")}`, import.meta.url);
    const dimensions = getPngDimensions(await readFile(iconUrl));
    const [width, height] = icon.sizes.split("x").map(Number);
    assert.deepEqual(dimensions, { width, height });
  }
});
