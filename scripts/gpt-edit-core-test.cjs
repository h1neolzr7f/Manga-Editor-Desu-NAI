const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");
const context = { console, Uint8ClampedArray, Uint8Array, Math };
context.globalThis = context;
test("GPT edit core is available", () => {
  assert.ok(fs.existsSync("js/ai/gpt/edit-core.js"), "missing GPT edit core");
  vm.runInNewContext(
    fs.readFileSync("js/ai/gpt/edit-core.js", "utf8"),
    context,
  );
  assert.ok(context.NaiGptEditCore);
});
test("rotated flipped crop coordinates map through inverse Fabric matrix", () => {
  const g = context.NaiGptEditCore;
  // Source center at 100,80; rotated 90 degrees with flipped X.
  const image = {
    width: 40,
    height: 20,
    cropX: 5,
    cropY: 7,
    calcTransformMatrix: () => [0, -2, -3, 0, 100, 80],
  };
  const p = g.pageToImage(image, { x: 85, y: 100 });
  assert.ok(Math.abs(p.x - 15) < 1e-9);
  assert.ok(Math.abs(p.y - 22) < 1e-9);
});
test("inverse viewport handles zoom pan and nonuniform CSS scale", () => {
  const p = context.NaiGptEditCore.clientToPage(
    { x: 180, y: 130 },
    { left: 10, top: 20, width: 400, height: 200 },
    800,
    400,
    [2, 0, 0, 2, 20, 10],
  );
  assert.deepEqual(JSON.parse(JSON.stringify(p)), { x: 160, y: 105 });
});
test("hard alpha patch cannot change any outside-mask pixel", () => {
  const g = context.NaiGptEditCore;
  const source = Uint8ClampedArray.from([
    1, 2, 3, 255, 4, 5, 6, 128, 7, 8, 9, 0,
  ]);
  const result = Uint8ClampedArray.from([
    99, 99, 99, 255, 30, 40, 50, 255, 99, 99, 99, 255,
  ]);
  const mask = Uint8Array.from([0, 255, 0]);
  const patch = g.maskPixels(result, mask);
  assert.equal(patch[3], 0);
  assert.equal(patch[11], 0);
  assert.equal(patch[7], 255);
  const composite = g.compositePixels(source, patch);
  assert.deepEqual(
    Array.from(composite.slice(0, 4)),
    Array.from(source.slice(0, 4)),
  );
  assert.deepEqual(
    Array.from(composite.slice(8, 12)),
    Array.from(source.slice(8, 12)),
  );
  assert.deepEqual(
    Array.from(source),
    [1, 2, 3, 255, 4, 5, 6, 128, 7, 8, 9, 0],
  );
});
test("Comfy white edit mask becomes GPT transparent edit alpha", () => {
  const alpha = context.NaiGptEditCore.gptMaskPixels(
    Uint8Array.from([0, 255, 128]),
  );
  assert.deepEqual(Array.from(alpha), [0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 127]);
});
test("large selection and undersized output are rejected, never silently upscaled", () => {
  const g = context.NaiGptEditCore;
  assert.throws(() => g.requestSize(2000, 1400), /分辨率/);
  assert.throws(
    () => g.checkResultSize(512, 512, { width: 1024, height: 1024 }),
    /分辨率/,
  );
  assert.throws(
    () => g.checkResultSize(1536, 1024, { width: 1024, height: 1024 }),
    /比例/,
  );
  assert.equal(g.requestSize(1300, 800).api, "1536x1024");
});
