/* Exact editable dialogue. No model is permitted to rewrite the text field. */
(function (root) {
  "use strict";
  var batchBusy = false;
  var dialog;
  var session;
  function currentCanvas() {
    if (typeof canvas === "undefined" || !canvas)
      throw new Error("画布尚未准备好。");
    return canvas;
  }
  function pageGuid() {
    return typeof getCanvasGUID === "function"
      ? getCanvasGUID()
      : currentCanvas().canvasGuid;
  }
  function assertReady(expectedPage) {
    if (root.NaiPageLoading || root.NaiHistoryLoading)
      throw new Error("页面正在加载，请稍后重试。");
    if (expectedPage && pageGuid() !== expectedPage)
      throw new Error("当前页面已改变，请重新选择。");
  }
  function objects() {
    return currentCanvas().getObjects();
  }
  function editable(target) {
    return (
      !!target &&
      ["textbox", "i-text", "text", "vertical-textbox"].includes(target.type) &&
      typeof target.text === "string"
    );
  }
  function resolveTarget(target) {
    if (!target) return null;
    var all = objects();
    if (typeof target === "string")
      target = all.find(function (object) {
        return object.guid === target;
      });
    if (!all.includes(target)) return null;
    if (editable(target)) return target;
    return (
      all.find(function (object) {
        return (
          editable(object) &&
          (object.targetObject === target ||
            (Array.isArray(target.guids) && target.guids.includes(object.guid)))
        );
      }) || null
    );
  }
  function bounds(target) {
    if (target && typeof target.getBoundingRect === "function")
      return target.getBoundingRect(true, true);
    return {
      left: target.left || 0,
      top: target.top || 0,
      width: target.width || 1,
      height: target.height || 1,
    };
  }
  function rectanglePoints(rect) {
    return [
      { x: rect.left, y: rect.top },
      { x: rect.left + rect.width, y: rect.top },
      { x: rect.left + rect.width, y: rect.top + rect.height },
      { x: rect.left, y: rect.top + rect.height },
    ];
  }
  function validatePoints(points) {
    if (
      !Array.isArray(points) ||
      points.length < 3 ||
      points.length > 1000 ||
      points.some(function (p) {
        return !p || !Number.isFinite(p.x) || !Number.isFinite(p.y);
      })
    )
      throw new Error("请先圈选至少三个有效的画布坐标。");
    return points.map(function (p) {
      return { x: p.x, y: p.y };
    });
  }
  function pointInPolygon(point, points) {
    var inside = false;
    for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
      var a = points[i],
        b = points[j];
      if (
        a.y > point.y !== b.y > point.y &&
        point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
      )
        inside = !inside;
    }
    return inside;
  }
  function selectionData(selection) {
    assertReady();
    if (!selection) selection = { target: currentCanvas().getActiveObject() };
    if (selection.type) selection = { target: selection };
    var target = selection.target;
    if (!target && !selection.points)
      target = currentCanvas().getActiveObject();
    if (typeof target === "string")
      target = objects().find(function (object) {
        return object.guid === target;
      });
    if (selection.target && (!target || !objects().includes(target)))
      throw new Error("当前图层已改变或失效，请重新选择。");
    var resolved = resolveTarget(target);
    var points = selection.points
      ? validatePoints(selection.points)
      : target
        ? rectanglePoints(bounds(target))
        : null;
    if (!resolved && points && !target) {
      var matches = objects().filter(function (object) {
        if (!editable(object)) return false;
        var rect = bounds(object);
        return pointInPolygon(
          { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
          points,
        );
      });
      if (matches.length === 1) resolved = matches[0];
      if (matches.length > 1)
        throw new Error(
          "圈选包含多个文字图层，请单独选择一个，或使用明确的批量清单。",
        );
    }
    if (!points) throw new Error("请选择文字图层、气泡或圈选图片中的台词。");
    return { target: resolved, points: points, pageGuid: pageGuid() };
  }
  async function detect(selection) {
    var data = selectionData(selection);
    if (data.target)
      return Object.assign(data, {
        source: "editable",
        text: data.target.text,
        ocrAvailable: typeof root.TextDetector === "function",
      });
    if (typeof root.TextDetector !== "function")
      return Object.assign(data, {
        source: "manual",
        text: "",
        ocrAvailable: false,
      });
    var c = currentCanvas();
    var xs = data.points.map(function (p) {
        return p.x;
      }),
      ys = data.points.map(function (p) {
        return p.y;
      });
    var left = Math.max(0, Math.min.apply(null, xs)),
      top = Math.max(0, Math.min.apply(null, ys));
    var right = Math.min(c.getWidth(), Math.max.apply(null, xs)),
      bottom = Math.min(c.getHeight(), Math.max.apply(null, ys));
    if (right <= left || bottom <= top) throw new Error("圈选区域不在画布内。");
    try {
      var fingerprint = signature();
      var crop = c.toCanvasElement(1, {
        left: left,
        top: top,
        width: right - left,
        height: bottom - top,
      });
      var found = await new root.TextDetector().detect(crop);
      assertReady(data.pageGuid);
      if (signature() !== fingerprint) {
        var staleError = new Error("画布已改变，请重新识别。");
        staleError.stale = true;
        throw staleError;
      }
      var sorted = found.slice().sort(function (a, b) {
        return (
          a.boundingBox.y - b.boundingBox.y || a.boundingBox.x - b.boundingBox.x
        );
      });
      return Object.assign(data, {
        source: "ocr",
        text: sorted
          .map(function (item) {
            return item.rawValue;
          })
          .join("\n"),
        ocrAvailable: true,
      });
    } catch (error) {
      assertReady(data.pageGuid);
      if (error.stale) throw error;
      return Object.assign(data, {
        source: "manual",
        text: "",
        ocrAvailable: true,
        ocrError: "本机 OCR 未能识别，请手动输入准确台词。",
      });
    }
  }
  function exactText(text) {
    if (typeof text !== "string" || text.length > 50000)
      throw new Error("台词必须是最多 50000 字符的原文字符串。");
    return text;
  }
  function signature() {
    var c = currentCanvas();
    return JSON.stringify({
      width: c.getWidth(),
      height: c.getHeight(),
      background: c.backgroundColor,
      objects: objects().map(function (object) {
        var value =
          typeof object.toObject === "function"
            ? object.toObject(
                typeof commonProperties === "undefined" ? [] : commonProperties,
              )
            : object;
        return typeof object.toObject === "function"
          ? value
          : {
              guid: object.guid,
              type: object.type,
              text: object.text,
              left: object.left,
              top: object.top,
              width: object.width,
              height: object.height,
            };
      }),
    });
  }
  function setText(target, text) {
    if (typeof target.exitEditing === "function" && target.isEditing)
      target.exitEditing();
    target.set({ text: text });
    if (
      target.type === "vertical-textbox" &&
      typeof target.updateDimensions === "function"
    )
      target.updateDimensions();
    else if (typeof target.initDimensions === "function")
      target.initDimensions();
    target.dirty = true;
    target.setCoords();
    // Keep the existing bubble reference and GUID. Refresh its geometry using the app's own bindings.
    if (target.targetObject) {
      if (
        typeof speechBubbleTextChaged === "function" &&
        typeof isSpeechBubbleText === "function" &&
        isSpeechBubbleText(target)
      )
        speechBubbleTextChaged(target);
      if (
        typeof freehandBubbleTextChanged === "function" &&
        typeof isFreehandBubbleText === "function" &&
        isFreehandBubbleText(target)
      )
        freehandBubbleTextChanged(target);
    }
  }
  function transaction(operation) {
    var wasSaving = typeof isSave === "function" ? isSave() : true;
    if (!wasSaving) throw new Error("历史记录正在恢复，请稍后重试。");
    if (
      typeof changeDoNotSaveHistory !== "function" ||
      typeof saveStateByManual !== "function"
    )
      throw new Error("撤销记录尚未准备好。");
    changeDoNotSaveHistory();
    var result;
    try {
      result = operation();
    } finally {
      changeDoSaveHistory();
    }
    currentCanvas().requestRenderAll();
    if (typeof updateLayerPanel === "function") updateLayerPanel();
    saveStateByManual();
    return result;
  }
  async function replaceText(target, text) {
    if (batchBusy) throw new Error("批量操作进行中。");
    assertReady();
    exactText(text);
    var resolved = resolveTarget(target);
    if (!resolved) throw new Error("当前文字图层已改变或失效，请重新选择。");
    if (resolved.text === text) return resolved;
    return transaction(function () {
      setText(resolved, text);
      return resolved;
    });
  }
  function parseInstruction(instruction) {
    if (typeof instruction !== "string" || instruction.length > 10000)
      return null;
    var match = instruction.match(
      /^\s*把“([^“”]*)”改成“([^“”]*)”\s*[。.]?\s*$/,
    );
    return match ? { from: match[1], to: match[2] } : null;
  }
  function validatedEdits(edits) {
    if (!Array.isArray(edits) || !edits.length || edits.length > 200)
      throw new Error("批量清单应包含 1–200 个明确编辑。");
    var known =
      typeof btmGetGuids === "function" ? btmGetGuids() : [pageGuid()];
    var seen = new Set();
    return edits.map(function (edit) {
      if (
        !edit ||
        typeof edit.pageGuid !== "string" ||
        !known.includes(edit.pageGuid)
      )
        throw new Error("清单包含未知页面 (pageGuid)。");
      if (typeof edit.layerGuid !== "string" || !edit.layerGuid)
        throw new Error("请填写每个图层的 layerGuid。");
      exactText(edit.text);
      var key = edit.pageGuid + "\n" + edit.layerGuid;
      if (seen.has(key)) throw new Error("同一页面图层不能重复编辑。");
      seen.add(key);
      if (edit.expectedBefore !== undefined) exactText(edit.expectedBefore);
      return {
        pageGuid: edit.pageGuid,
        layerGuid: edit.layerGuid,
        text: edit.text,
        expectedBefore: edit.expectedBefore,
      };
    });
  }
  async function switchPage(guid) {
    if (pageGuid() === guid) {
      assertReady(guid);
      return;
    }
    if (typeof chengeCanvasByGuid !== "function")
      throw new Error("分页加载功能不可用。");
    await chengeCanvasByGuid(guid);
    assertReady(guid);
  }
  async function savePage(guid) {
    if (typeof btmSaveProjectFile !== "function")
      throw new Error("分页保存功能不可用。");
    await btmSaveProjectFile(guid, false);
    assertReady(guid);
  }
  async function batchWork(edits, apply) {
    if (batchBusy) throw new Error("批量操作进行中。");
    assertReady();
    edits = validatedEdits(edits);
    var home = pageGuid(),
      review = [],
      changedPages = [],
      resolvedTargets = new Set();
    var groups = new Map();
    edits.forEach(function (edit) {
      if (!groups.has(edit.pageGuid)) groups.set(edit.pageGuid, []);
      groups.get(edit.pageGuid).push(edit);
    });
    batchBusy = true;
    try {
      await savePage(home);
      // Validate every page before changing any text. A missing target aborts the complete list.
      for (var entry of groups) {
        await switchPage(entry[0]);
        for (var edit of entry[1]) {
          var target = resolveTarget(edit.layerGuid);
          if (!target)
            throw new Error("找不到可编辑图层 (layerGuid): " + edit.layerGuid);
          if (!target.guid)
            throw new Error("文字图层没有稳定 GUID，请重新选择或保存页面。");
          var targetKey = edit.pageGuid + "\n" + target.guid;
          if (resolvedTargets.has(targetKey))
            throw new Error("清单重复指向同一文字图层，请只保留一个编辑。");
          resolvedTargets.add(targetKey);
          if (
            edit.expectedBefore !== undefined &&
            target.text !== edit.expectedBefore
          )
            throw new Error("图层台词已改变，请重新预览批量清单。");
          review.push(
            Object.assign({}, edit, {
              before: target.text,
              resolvedGuid: target.guid,
            }),
          );
        }
      }
      if (apply) {
        for (var pageEntry of groups) {
          await switchPage(pageEntry[0]);
          var changes = review.filter(function (item) {
            return item.pageGuid === pageEntry[0];
          });
          var targets = changes.map(function (item) {
            var target = resolveTarget(item.resolvedGuid);
            if (!target || target.text !== item.before)
              throw new Error("图层已改变，请重新预览批量清单。");
            return target;
          });
          if (
            changes.some(function (item) {
              return item.before !== item.text;
            })
          ) {
            transaction(function () {
              changes.forEach(function (item, index) {
                setText(targets[index], item.text);
              });
            });
            changedPages.push(pageEntry[0]);
            await savePage(pageEntry[0]);
          }
        }
      }
      return { edits: review, changedPages: changedPages };
    } catch (error) {
      if (changedPages.length)
        error.message +=
          " 已完成页面：" + changedPages.join("、") + "；每页可单独撤销。";
      throw error;
    } finally {
      try {
        await switchPage(home);
      } finally {
        batchBusy = false;
      }
    }
  }
  function element(tag, text, parent) {
    var node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }
  function field(label, tag, parent) {
    var row = element("label", label, parent);
    row.style.display = "block";
    row.style.marginTop = "10px";
    var input = element(tag, undefined, row);
    input.style.cssText =
      "display:block;width:100%;box-sizing:border-box;margin-top:4px;";
    return input;
  }
  function buildDialog() {
    if (dialog) return;
    var box = element("dialog");
    box.id = "nai-subtitle-dialog";
    box.style.cssText =
      "width:min(620px,90vw);max-height:85vh;overflow:auto;background:#202329;color:#f4f4f4;border:1px solid #626873;border-radius:12px;padding:20px;";
    element("h2", "精确台词编辑", box);
    var status = element("p", "", box);
    status.setAttribute("role", "status");
    var before = element("pre", "", box);
    before.style.cssText =
      "white-space:pre-wrap;overflow-wrap:anywhere;padding:10px;background:#111;";
    var text = field("替换后准确台词（保留空格、标点和换行）", "textarea", box);
    text.id = "nai-subtitle-text";
    text.rows = 5;
    var after = element("pre", "", box);
    after.style.cssText = before.style.cssText;
    text.addEventListener("input", function () {
      after.textContent = text.value;
    });
    var instruction = field("可选指令：把“旧”改成“新”", "input", box);
    var parse = element("button", "解析到准确台词字段", box);
    parse.type = "button";
    var orientation = field("新增文字方向", "select", box);
    ["横排", "竖排"].forEach(function (name, index) {
      var option = element("option", name, orientation);
      option.value = index ? "vertical" : "horizontal";
    });
    var cleanupLabel = element("label", "", box);
    cleanupLabel.style.display = "block";
    var cleanup = element("input", undefined, cleanupLabel);
    cleanup.type = "checkbox";
    element(
      "span",
      " 添加纯白覆盖层（仅适用于白色背景；会遮住圈选内画面）",
      cleanupLabel,
    );
    var remove = element("button", "用 GPT 清除图片中原台词…", box);
    remove.type = "button";
    var apply = element("button", "应用准确台词", box);
    apply.type = "button";
    apply.id = "nai-subtitle-apply";
    var close = element("button", "关闭", box);
    close.type = "button";
    close.addEventListener("click", function () {
      box.close();
    });
    var batchSection = element("details", undefined, box);
    element("summary", "跨页批量替换（明确页面与图层）", batchSection);
    var pages = element("p", "", batchSection);
    element(
      "p",
      '清单格式：[{"pageGuid":"页面 GUID","layerGuid":"文字或气泡 GUID","text":"准确台词"}]。先预览，再应用。',
      batchSection,
    );
    var batch = field("编辑清单 JSON", "textarea", batchSection);
    batch.rows = 5;
    batch.value = "[]";
    var batchPreview = element("pre", "", batchSection);
    batchPreview.style.cssText = before.style.cssText;
    var previewButton = element("button", "预览批量清单", batchSection);
    previewButton.type = "button";
    var batchApply = element("button", "应用已预览清单", batchSection);
    batchApply.type = "button";
    batchApply.disabled = true;
    var reviewedJSON = null;
    var reviewedEdits = null;
    batch.addEventListener("input", function () {
      reviewedJSON = null;
      batchApply.disabled = true;
    });
    async function guarded(action) {
      apply.disabled = true;
      previewButton.disabled = true;
      batchApply.disabled = true;
      remove.disabled = true;
      parse.disabled = true;
      try {
        await action();
      } catch (error) {
        status.textContent = error.message;
      } finally {
        apply.disabled = false;
        previewButton.disabled = false;
        batchApply.disabled = !reviewedJSON;
        remove.disabled = !!(session && session.target);
        parse.disabled = false;
      }
    }
    parse.addEventListener("click", function () {
      var parsed = parseInstruction(instruction.value);
      if (!parsed) {
        status.textContent =
          "仅支持完整格式：把“旧”改成“新”。也可以直接输入准确台词。";
        return;
      }
      var original = session ? session.text : "";
      if (!parsed.from || !original.includes(parsed.from)) {
        status.textContent = "原文中没有该旧台词，请检查后重试。";
        return;
      }
      text.value = original.split(parsed.from).join(parsed.to);
      after.textContent = text.value;
    });
    apply.addEventListener("click", function () {
      guarded(async function () {
        assertReady(session.pageGuid);
        if (signature() !== session.signature)
          throw new Error("画布已改变，请重新打开台词编辑。");
        if (session.target) await replaceText(session.target, text.value);
        else {
          exactText(text.value);
          var c = currentCanvas();
          var points = validatePoints(session.points);
          var xs = points.map(function (p) {
              return p.x;
            }),
            ys = points.map(function (p) {
              return p.y;
            });
          var left = Math.max(0, Math.min.apply(null, xs)),
            top = Math.max(0, Math.min.apply(null, ys));
          var width = Math.min(c.getWidth(), Math.max.apply(null, xs)) - left,
            height = Math.min(c.getHeight(), Math.max.apply(null, ys)) - top;
          if (width <= 0 || height <= 0)
            throw new Error("圈选区域不在画布内。");
          var Constructor =
            orientation.value === "vertical"
              ? root.fabric.VerticalTextbox
              : root.fabric.Textbox;
          if (!Constructor) throw new Error("文字编辑类尚未加载。");
          var newText = new Constructor(text.value, {
            left: left,
            top: top,
            width: width,
            height: height,
            fontSize: 32,
            fontFamily: "sans-serif",
            fill: "#000",
            splitByGrapheme: true,
          });
          transaction(function () {
            if (cleanup.checked)
              c.add(
                new root.fabric.Polygon(points, {
                  fill: "#fff",
                  strokeWidth: 0,
                  selectable: true,
                  name: "台词白色覆盖层",
                }),
              );
            if (typeof getGUID === "function") getGUID(newText);
            c.add(newText);
            c.setActiveObject(newText);
            session.target = newText;
          });
        }
        status.textContent = "已应用准确台词；可撤销。";
        session.signature = signature();
        session.text = text.value;
        before.textContent = "替换前 / 当前：\n" + text.value;
      });
    });
    remove.addEventListener("click", function () {
      guarded(async function () {
        assertReady(session.pageGuid);
        if (signature() !== session.signature)
          throw new Error("画布已改变，请重新选择。");
        if (
          !root.NaiGptEditor ||
          typeof root.NaiGptEditor.openSelection !== "function"
        )
          throw new Error("GPT 圈选编辑尚未准备好。");
        box.close();
        await root.NaiGptEditor.openSelection(session.points, {
          operation: "remove",
          prompt:
            "Remove only printed text inside the selected area. Preserve the speech bubble outline, background, and all artwork. Do not add any new letters or dialogue.",
        });
      });
    });
    previewButton.addEventListener("click", function () {
      guarded(async function () {
        var result = await batchWork(JSON.parse(batch.value), false);
        batchPreview.textContent = result.edits
          .map(function (item) {
            return (
              item.pageGuid +
              " / " +
              item.layerGuid +
              "\n替换前：\n" +
              item.before +
              "\n替换后：\n" +
              item.text
            );
          })
          .join("\n\n");
        reviewedJSON = batch.value;
        reviewedEdits = result.edits.map(function (item) {
          return {
            pageGuid: item.pageGuid,
            layerGuid: item.layerGuid,
            text: item.text,
            expectedBefore: item.before,
          };
        });
        status.textContent = "批量清单已预览，请核对准确台词。";
        // Page switches recreate Fabric objects; refresh the current target by GUID.
        if (session && session.target)
          session.target = resolveTarget(session.target.guid);
        if (session) session.signature = signature();
      });
    });
    batchApply.addEventListener("click", function () {
      guarded(async function () {
        if (!reviewedJSON || reviewedJSON !== batch.value)
          throw new Error("请先预览当前清单。");
        var result = await batchWork(reviewedEdits, true);
        reviewedJSON = null;
        status.textContent =
          "已完成 " +
          result.changedPages.length +
          " 个页面，每页保存一次撤销记录。";
        if (session && session.target)
          session.target = resolveTarget(session.target.guid);
        if (session) session.signature = signature();
      });
    });
    document.body.appendChild(box);
    dialog = {
      box: box,
      status: status,
      before: before,
      text: text,
      after: after,
      instruction: instruction,
      orientation: orientation,
      cleanup: cleanup,
      cleanupLabel: cleanupLabel,
      remove: remove,
      pages: pages,
    };
  }
  async function open(selection) {
    if (batchBusy) throw new Error("批量操作进行中。");
    var detected = await detect(selection);
    buildDialog();
    session = Object.assign(detected, { signature: signature() });
    dialog.before.textContent = "替换前：\n" + detected.text;
    dialog.text.value = detected.text;
    dialog.after.textContent = detected.text;
    dialog.instruction.value = "";
    dialog.cleanup.checked = false;
    dialog.orientation.disabled = !!detected.target;
    dialog.cleanup.disabled = !!detected.target;
    dialog.remove.disabled = !!detected.target;
    dialog.status.textContent =
      detected.source === "editable"
        ? "已找到可编辑文字图层。直接替换，保留图层与气泡关联。"
        : detected.source === "ocr"
          ? "本机 OCR 建议已填入；请逐字核对准确台词，再应用。"
          : detected.ocrError ||
            "本机 OCR 不可用。请手动输入准确台词，新增可编辑文字图层。";
    dialog.pages.textContent =
      "页面 GUID：" +
      (typeof btmGetGuids === "function"
        ? btmGetGuids().join("、")
        : pageGuid()) +
      "；当前目标图层：" +
      ((detected.target && detected.target.guid) || "无");
    if (!dialog.box.open) dialog.box.showModal();
    dialog.text.focus({ preventScroll: true });
    return detected;
  }
  root.NaiSubtitleEditor = {
    open: open,
    detect: detect,
    replaceText: replaceText,
    applyBatch: function (edits) {
      return batchWork(edits, true);
    },
    previewBatch: function (edits) {
      return batchWork(edits, false);
    },
    parseInstruction: parseInstruction,
  };
})(window);
