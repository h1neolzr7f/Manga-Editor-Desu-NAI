// Real Fabric/Canvas integration. No paid API requests: candidate image is a deterministic fixture.
const assert = require("node:assert/strict"),
  path = require("node:path"),
  { createRequire } = require("node:module");
const requireRuntime = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? createRequire(
      path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "runtime.js"),
    )
  : require;
const { chromium } = requireRuntime("playwright");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.GPT_TEST_CHROMIUM || undefined,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      process.env.GPT_TEST_APP_URL || "http://127.0.0.1:8000/index.html",
    );
    await page.waitForFunction(() => window.NaiGptEditor && window.canvas);
    const skip = page.locator("#tutorialSkipBtn");
    if (await skip.count()) await skip.click();
    const result = await page.evaluate(async () => {
      const c = canvas;
      changeDoNotSaveHistory();
      c.clear();
      c.setDimensions({ width: 256, height: 192 });
      c.backgroundColor = "#ffffff";
      const raw = document.createElement("canvas");
      raw.width = 256;
      raw.height = 192;
      const ctx = raw.getContext("2d");
      ctx.fillStyle = "#336699";
      ctx.fillRect(0, 0, 256, 192);
      const image = await new Promise((r) =>
        fabric.Image.fromURL(raw.toDataURL(), r),
      );
      image.guid = "source";
      image.name = "原图";
      c.add(image);
      changeDoSaveHistory();
      stateStack = [];
      currentStateIndex = -1;
      saveState();
      const points = [
        { x: 40, y: 30 },
        { x: 110, y: 30 },
        { x: 110, y: 100 },
        { x: 40, y: 100 },
      ];
      const before = c
        .toCanvasElement(1)
        .getContext("2d")
        .getImageData(0, 0, 256, 192).data;
      const source = image.getSrc();
      const snapshot = await NaiGptEditor.prepareSelection(points, image);
      const generated = document.createElement("canvas");
      generated.width = snapshot.size.width;
      generated.height = snapshot.size.height;
      const g = generated.getContext("2d");
      g.fillStyle = "#ff0066";
      g.fillRect(0, 0, generated.width, generated.height);
      const preview = await NaiGptEditor.createPreview(
        snapshot,
        generated.toDataURL(),
      );
      if (c.getObjects().length !== 1)
        throw new Error("preview changed canvas");
      const applied = await NaiGptEditor.applyPreview(preview);
      const after = c
        .toCanvasElement(1)
        .getContext("2d")
        .getImageData(0, 0, 256, 192).data;
      let outsideChanged = 0,
        insideChanged = 0;
      for (let y = 0; y < 192; y++)
        for (let x = 0; x < 256; x++) {
          let changed = false;
          for (let k = 0; k < 4; k++)
            if (before[(y * 256 + x) * 4 + k] !== after[(y * 256 + x) * 4 + k])
              changed = true;
          if (changed) {
            if (x >= 40 && x < 110 && y >= 30 && y < 100) insideChanged++;
            else outsideChanged++;
          }
        }
      const preserved =
        source === image.getSrc() && c.getObjects()[0] === image;
      const dims = [c.width, c.height];
      const saved = customToJSON();
      await undo();
      const undoCount = c.getObjects().length;
      await redo();
      const redoCount = c.getObjects().length;
      const restored = restoreImage(JSON.stringify(saved));
      await new Promise((r) => c.loadFromJSON(restored, r));
      const reopenedCount = c.getObjects().length;
      const current = c.getObjects()[0];
      const stale = await NaiGptEditor.prepareSelection(points, current);
      const candidate = await NaiGptEditor.createPreview(
        stale,
        generated.toDataURL(),
      );
      current.set({ left: 2 });
      saveState();
      let staleRejected = false;
      try {
        await NaiGptEditor.applyPreview(candidate);
      } catch (e) {
        staleRejected = /变化|过期/.test(e.message);
      }
      const cancelSnapshot = await NaiGptEditor.prepareSelection(
          points,
          current,
        ),
        cancelPreview = await NaiGptEditor.createPreview(
          cancelSnapshot,
          generated.toDataURL(),
        );
      const fromURL = fabric.Image.fromURL;
      let release;
      fabric.Image.fromURL = (url, callback) => {
        release = () => fromURL(url, callback);
      };
      const pendingApply = NaiGptEditor.applyPreview(cancelPreview);
      cancelPreview.status = "cancelled";
      release();
      let cancelDuringDecode = false;
      try {
        await pendingApply;
      } catch (e) {
        cancelDuringDecode = /取消/.test(e.message);
      } finally {
        fabric.Image.fromURL = fromURL;
      }
      return {
        applied,
        outsideChanged,
        insideChanged,
        preserved,
        dims,
        undoCount,
        redoCount,
        reopenedCount,
        staleRejected,
        cancelDuringDecode,
      };
    });
    assert.equal(result.applied, true);
    assert.equal(result.outsideChanged, 0);
    assert.equal(result.insideChanged, 4900);
    assert.equal(result.preserved, true);
    assert.deepEqual(result.dims, [256, 192]);
    assert.equal(result.undoCount, 1);
    assert.equal(result.redoCount, 2);
    assert.equal(result.reopenedCount, 2);
    assert.equal(result.staleRejected, true);
    assert.equal(
      result.cancelDuringDecode,
      true,
      "cancel during decode cannot insert a layer",
    );
    console.log(
      "Real Fabric pixel/history integration:",
      JSON.stringify(result),
    );
    const native = await page.evaluate(async () => {
      const c = canvas;
      changeDoNotSaveHistory();
      c.clear();
      c.setDimensions({ width: 180, height: 160 });
      c.backgroundColor = "#12ab34";
      c.setViewportTransform([1, 0, 0, 1, 0, 0]);
      const raw = NaiGptEditor.makeCanvas(180, 160),
        ctx = raw.getContext("2d");
      ctx.fillStyle = "#765432";
      ctx.fillRect(25, 25, 100, 100);
      c.backgroundImage = await new Promise((r) =>
        fabric.Image.fromURL(raw.toDataURL(), r),
      );
      c.renderAll();
      changeDoSaveHistory();
      const points = [
        { x: 0, y: 0 },
        { x: 180, y: 0 },
        { x: 180, y: 160 },
        { x: 0, y: 160 },
      ];
      const input = await NaiGptEditor.prepareSelection(points, null),
        visible = c
          .toCanvasElement(1)
          .getContext("2d")
          .getImageData(0, 0, 180, 160).data,
        source = input.source
          .getContext("2d")
          .getImageData(0, 0, 180, 160).data;
      let backgroundMismatch = 0;
      for (let i = 0; i < visible.length; i++)
        if (visible[i] !== source[i]) backgroundMismatch++;
      changeDoNotSaveHistory();
      c.backgroundImage = null;
      c.clear();
      c.backgroundColor = "#12ab34";
      const original = new fabric.Image(raw, {
        left: 82,
        top: 75,
        originX: "center",
        originY: "center",
        width: 110,
        height: 100,
        cropX: 25,
        cropY: 25,
        angle: 24,
        flipX: true,
        scaleX: 0.8,
        scaleY: 0.7,
        clipPath: new fabric.Circle({
          radius: 42,
          originX: "center",
          originY: "center",
        }),
      });
      c.add(original);
      changeDoSaveHistory();
      stateStack = [];
      currentStateIndex = -1;
      saveState();
      const before = c
          .toCanvasElement(1)
          .getContext("2d")
          .getImageData(0, 0, 180, 160).data,
        snapshot = await NaiGptEditor.prepareSelection(points, original);
      const outsideMask = NaiGptEditor.makeCanvas(180, 160),
        mc = outsideMask.getContext("2d");
      mc.fillStyle = "black";
      mc.fillRect(0, 0, 180, 160);
      mc.fillStyle = "white";
      mc.fillRect(0, 0, 20, 160);
      let croppedMaskRejected = false;
      try {
        await NaiGptEditor.prepareMask(original, outsideMask.toDataURL());
      } catch (e) {
        croppedMaskRejected = /选区不在/.test(e.message);
      }
      if (!croppedMaskRejected)
        throw new Error(
          "source-local mask outside image crop was incorrectly projected",
        );
      const result = NaiGptEditor.makeCanvas(
        snapshot.size.width,
        snapshot.size.height,
      );
      result.getContext("2d").fillStyle = "#ff0088";
      result.getContext("2d").fillRect(0, 0, result.width, result.height);
      await NaiGptEditor.applyPreview(
        await NaiGptEditor.createPreview(snapshot, result.toDataURL()),
      );
      const after = c
        .toCanvasElement(1)
        .getContext("2d")
        .getImageData(0, 0, 180, 160).data;
      let clippedOutsideChanged = 0,
        clippedInsideChanged = 0;
      for (let p = 0; p < snapshot.mask.length; p++) {
        let changed = false;
        for (let k = 0; k < 4; k++)
          if (before[p * 4 + k] !== after[p * 4 + k]) changed = true;
        if (changed) {
          if (snapshot.mask[p]) clippedInsideChanged++;
          else clippedOutsideChanged++;
        }
      }
      basePrompt.gptVisualProfiles = [
        {
          id: "test",
          name: "角色",
          constraints: "固定金色眼镜",
          references: [],
        },
      ];
      const saved = await generateBlobProjectFile(),
        guid = getCanvasGUID();
      basePrompt.gptVisualProfiles = [];
      c.clear();
      await loadLz4BlobProjectFile(saved.lz4Blob, guid);
      const reopened = c.getObjects(),
        archivePreserved =
          basePrompt.gptVisualProfiles[0].constraints === "固定金色眼镜",
        patchPreserved = !!reopened[1].naiGptEdit,
        clipPreserved = !!reopened[0].clipPath;
      const stale = await NaiGptEditor.prepareSelection(points, reopened[0]);
      setCanvasGUID("other-page");
      let wrongPageRejected = false;
      try {
        NaiGptEditor.assertFresh(stale);
      } catch (e) {
        wrongPageRejected = /变化|过期/.test(e.message);
      }
      setCanvasGUID(guid);
      return {
        backgroundMismatch,
        clippedOutsideChanged,
        clippedInsideChanged,
        archivePreserved,
        patchPreserved,
        clipPreserved,
        wrongPageRejected,
      };
    });
    assert.equal(native.backgroundMismatch, 0);
    assert.equal(native.clippedOutsideChanged, 0);
    assert.ok(native.clippedInsideChanged > 0);
    assert.equal(native.archivePreserved, true);
    assert.equal(native.patchPreserved, true);
    assert.equal(native.clipPreserved, true);
    assert.equal(native.wrongPageRejected, true);
    console.log(
      "Native background/rotated clip/LZ4/page integration:",
      JSON.stringify(native),
    );
    await page.evaluate(() => {
      NaiGptEditUI.cancel();
      canvas.setViewportTransform([1.25, 0, 0, 1.25, 6, 8]);
      canvas.calcOffset();
      window.menuCalls = 0;
      window.showObjectMenu = () => {
        window.menuCalls++;
      };
    });
    let position = await page.evaluate(() => {
      const r = canvas.upperCanvasEl.getBoundingClientRect();
      return {
        x: r.left + (70 * 1.25 * r.width) / canvas.width,
        y: r.top + (60 * 1.25 * r.height) / canvas.height,
      };
    });
    await page.mouse.click(position.x, position.y, { button: "right" });
    assert.equal(
      await page.evaluate(() => menuCalls),
      1,
      "short right click retains old menu " +
        JSON.stringify(
          await page.evaluate(
            (p) => ({
              hit: document.elementFromPoint(p.x, p.y)?.outerHTML.slice(0, 150),
              target: canvas.findTarget({ clientX: p.x, clientY: p.y }, false)
                ?.type,
              history: NaiHistoryLoading,
              page: NaiPageLoading,
            }),
            position,
          ),
        ),
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    position = await page.evaluate(() => {
      canvas.setViewportTransform([1.25, 0, 0, 1.25, 6, 8]);
      canvas.calcOffset();
      const r = canvas.upperCanvasEl.getBoundingClientRect();
      return {
        x: r.left + (70 * 1.25 * r.width) / canvas.width,
        y: r.top + (60 * 1.25 * r.height) / canvas.height,
      };
    });
    await page.mouse.move(position.x, position.y);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(position.x + 40, position.y + 30, { steps: 4 });
    await page.mouse.up({ button: "right" });
    await page.waitForFunction(
      () => !document.querySelector("#nai-gpt-editor").hidden,
    );
    assert.equal(
      await page.evaluate(() => menuCalls),
      1,
      "right drag must not open menu",
    );
    const b = await page.evaluate(() => ({
      x: Number(document.querySelector("#gpt-x").value),
      y: Number(document.querySelector("#gpt-y").value),
      w: Number(document.querySelector("#gpt-width").value),
    }));
    assert.ok(Math.abs(b.x - 65.2) <= 1);
    assert.ok(Math.abs(b.y - 53.6) <= 1);
    assert.ok(b.w > 0);
    await page.locator("#gpt-refine-mask").click();
    await page.waitForFunction(
      () => !document.querySelector("#gpt-mask-section").hidden,
    );
    await page.getByRole("button", { name: "全选", exact: true }).click();
    assert.equal(await page.evaluate(() => InpaintMask.hasMask()), true);
    await page.getByRole("button", { name: "清空", exact: true }).click();
    assert.equal(await page.evaluate(() => InpaintMask.hasMask()), false);
    await page.evaluate(() => NaiGptEditUI.cancel());
    await page.getByRole("button", { name: "套索选区", exact: true }).click();
    await page.mouse.move(position.x, position.y);
    await page.mouse.down();
    await page.mouse.move(position.x + 30, position.y, { steps: 3 });
    await page.mouse.move(position.x + 15, position.y + 30, { steps: 3 });
    await page.mouse.move(position.x, position.y, { steps: 3 });
    await page.mouse.up();
    assert.equal(await page.locator("#nai-gpt-editor").isVisible(), true);
    assert.ok(
      await page
        .locator(".gpt-selection-outline polygon")
        .getAttribute("points"),
    );
    console.log(
      "Right click/drag, viewport coordinates, lasso and mask controls: PASS",
    );
    const pages = await page.evaluate(async () => {
      NaiGptEditUI.cancel();
      btmProjectsMap.clear();
      const pages = ["gpt-page-a", "gpt-page-b"];
      for (let i = 0; i < 2; i++) {
        changeDoNotSaveHistory();
        canvas.clear();
        canvas.setDimensions({ width: 220, height: 180 });
        setCanvasGUID(pages[i]);
        const text = new fabric.Textbox("原句 " + i, {
          left: 30,
          top: 30,
          width: 150,
          fontSize: 18,
          guid: "caption-" + i,
        });
        canvas.add(text);
        changeDoSaveHistory();
        stateStack = [];
        currentStateIndex = -1;
        saveState();
        await btmSaveProjectFile(pages[i], false);
      }
      const edits = pages.map((pageGuid, i) => ({
        pageGuid,
        layerGuid: "caption-" + i,
        text: ["  准确中文\n第二行  ", "日本語の台詞\nそのまま"][i],
        expectedBefore: "原句 " + i,
      }));
      const reviewed = await NaiSubtitleEditor.previewBatch(edits);
      const previewUnchanged = canvas.getObjects()[0].text === "原句 1";
      await NaiSubtitleEditor.applyBatch(edits);
      const restoredHome = getCanvasGUID() === pages[1];
      const actual = [];
      for (const guid of pages) {
        await chengeCanvasByGuid(guid);
        actual.push(canvas.getObjects()[0].text);
      }
      await undo();
      const undoText = canvas.getObjects()[0].text;
      const undone = await generateBlobProjectFile();
      canvas.clear();
      await loadLz4BlobProjectFile(undone.lz4Blob, pages[1]);
      const reopenedUndoneText = canvas.getObjects()[0].text;
      await redo();
      const redoText = canvas.getObjects()[0].text;
      return {
        reviewed: reviewed.edits.length,
        previewUnchanged,
        restoredHome,
        actual,
        undoText,
        reopenedUndoneText,
        redoText,
      };
    });
    assert.equal(pages.reviewed, 2);
    assert.equal(pages.previewUnchanged, true);
    assert.equal(pages.restoredHome, true);
    assert.deepEqual(pages.actual, [
      "  准确中文\n第二行  ",
      "日本語の台詞\nそのまま",
    ]);
    assert.equal(pages.undoText, "原句 1");
    assert.equal(pages.reopenedUndoneText, "原句 1");
    assert.equal(pages.redoText, "日本語の台詞\nそのまま");
    console.log("Real multipage editable captions/save/reopen/undo/redo: PASS");
    assert.deepEqual(errors, [], "app page errors");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
