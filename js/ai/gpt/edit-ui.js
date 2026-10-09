(function (root) {
  "use strict";
  var editor = root.NaiGptEditor,
    core = root.NaiGptEditCore;
  var panel,
    selection = null,
    references = [],
    preview = null,
    request = null,
    revision = 0,
    gesture = null,
    lassoMode = false,
    outline,
    paintMask = null;
  var OPERATIONS = {
    replace: "替换人物",
    outfit: "服装 / 配饰",
    expression: "表情",
    background: "替换背景",
    remove: "删除物体",
    free: "自由修改",
  };
  function el(tag, text) {
    var node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function input(label, id, type, value) {
    var row = el("label", label),
      field = el("input");
    field.id = id;
    field.type = type || "text";
    if (value !== undefined) field.value = value;
    row.appendChild(field);
    return row;
  }
  function field(id) {
    return panel.querySelector("#" + id);
  }
  function status(text) {
    field("gpt-status").textContent = text;
  }
  function invalidate() {
    revision++;
    if (preview) preview.status = "cancelled";
    preview = null;
    field("gpt-apply").disabled = true;
    field("gpt-comparison").replaceChildren();
  }
  function clearPaintMask() {
    if (paintMask) {
      InpaintMask.destroy();
      paintMask = null;
    }
    if (panel) field("gpt-mask-section").hidden = true;
  }
  function cancel() {
    revision++;
    if (request) request.abort();
    if (preview) preview.status = "cancelled";
    preview = null;
    if (panel) panel.hidden = true;
    clearPaintMask();
    removeOutline();
  }
  function button(text, fn, id) {
    var b = el("button", text);
    b.type = "button";
    if (id) b.id = id;
    b.addEventListener("click", fn);
    return b;
  }
  function configFields() {
    var config = root.NaiGptConfig.get();
    field("gpt-base").value = config.baseUrl;
    field("gpt-model").value = config.model;
    field("gpt-key").value = config.apiKey;
    field("gpt-quality").value = config.quality;
  }
  function storeConfig() {
    root.NaiGptConfig.set({
      baseUrl: field("gpt-base").value.trim(),
      model: field("gpt-model").value.trim(),
      apiKey: field("gpt-key").value.trim(),
      quality: field("gpt-quality").value,
    });
  }
  function build() {
    if (panel) return;
    panel = el("aside");
    panel.id = "nai-gpt-editor";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "GPT 漫画编辑");
    var head = el("header");
    head.append(el("strong", "GPT 漫画编辑"), button("关闭", cancel));
    panel.appendChild(head);
    var settings = el("details"),
      summary = el("summary", "接口设置");
    settings.appendChild(summary);
    settings.append(
      input("API 地址（兼容 /v1）", "gpt-base"),
      input("模型名称", "gpt-model"),
      input("API Key（仅当前会话）", "gpt-key", "password"),
    );
    var q = el("label", "质量"),
      quality = el("select");
    quality.id = "gpt-quality";
    ["high", "medium", "low", "auto"].forEach(function (v) {
      var o = el("option", v);
      o.value = v;
      quality.append(o);
    });
    q.append(quality);
    settings.append(
      q,
      el(
        "small",
        "自定义中转地址需完成真实接口测试后再确认兼容。不会自动重试收费请求。",
      ),
    );
    panel.append(settings);
    var operation = el("select");
    operation.id = "gpt-operation";
    Object.keys(OPERATIONS).forEach(function (k) {
      var o = el("option", OPERATIONS[k]);
      o.value = k;
      operation.append(o);
    });
    operation.addEventListener("change", invalidate);
    panel.append(operation);
    var prompt = el("textarea");
    prompt.id = "gpt-prompt";
    prompt.rows = 3;
    prompt.placeholder =
      "例如：替换为参考图人物，保留原姿势和画风，金色太阳眼镜必须保留。";
    prompt.addEventListener("input", invalidate);
    panel.append(prompt);
    var bounds = el("details");
    bounds.id = "gpt-bounds";
    bounds.append(el("summary", "调整选区（工程像素坐标）"));
    var grid = el("div");
    grid.className = "gpt-grid";
    ["x", "y", "width", "height"].forEach(function (id) {
      grid.append(input(id, "gpt-" + id, "number"));
    });
    bounds.append(grid, button("更新矩形选区", updateBounds));
    panel.append(bounds);
    panel.append(button("画笔精修遮罩", activateMask, "gpt-refine-mask"));
    var maskSection = el("div");
    maskSection.id = "gpt-mask-section";
    maskSection.hidden = true;
    var area = el("div");
    area.className = "gpt-mask-area";
    var maskBase = el("canvas");
    maskBase.id = "gpt-mask-base";
    var maskPaint = el("canvas");
    maskPaint.id = "gpt-mask-paint";
    area.append(maskBase, maskPaint);
    maskSection.append(
      el("small", "红色区域允许修改；未涂抹区域保持原像素。"),
      area,
      button("画笔", function () {
        InpaintMask.setMode("brush");
      }),
      button("橡皮", function () {
        InpaintMask.setMode("eraser");
      }),
      button("清空", function () {
        InpaintMask.clearMask();
        invalidate();
      }),
      button("全选", function () {
        InpaintMask.fillAll();
        invalidate();
      }),
    );
    var brush = input("笔刷大小（原图像素）", "gpt-mask-brush", "range", 30);
    brush.lastChild.min = 1;
    brush.lastChild.max = 150;
    brush.lastChild.addEventListener("input", function () {
      InpaintMask.setBrushSize(Number(this.value));
    });
    maskSection.append(brush);
    panel.append(maskSection);
    maskPaint.addEventListener("mousedown", invalidate);
    var refTitle = el("div");
    refTitle.append(
      el("strong", "参考图片"),
      el("small", "分别指定身份、服装、姿势或画风"),
    );
    var file = el("input");
    file.id = "gpt-reference-file";
    file.type = "file";
    file.accept = "image/png,image/jpeg,image/webp";
    file.multiple = true;
    file.addEventListener("change", importReferences);
    refTitle.append(file);
    panel.append(refTitle);
    var refs = el("div");
    refs.id = "gpt-references";
    panel.append(refs);
    var profiles = el("details");
    profiles.append(el("summary", "角色视觉档案（随工程保存）"));
    var select = el("select");
    select.id = "gpt-profile";
    select.addEventListener("change", loadProfile);
    profiles.append(select, input("角色名称", "gpt-character-name"));
    var character = el("textarea");
    character.id = "gpt-character";
    character.rows = 2;
    character.placeholder =
      "固定外貌与不可变特征；参考图仍然是概率约束，需逐页核对。";
    character.addEventListener("input", invalidate);
    profiles.append(
      character,
      button("保存档案", saveProfile),
      button("删除所选档案", deleteProfile),
    );
    panel.append(profiles);
    var generation = el("div");
    generation.id = "gpt-generation";
    generation.append(input("透明素材", "gpt-transparent", "checkbox"));
    var size = el("select");
    size.id = "gpt-size";
    ["1024x1024", "1536x1024", "1024x1536"].forEach(function (v) {
      var o = el("option", v);
      o.value = v;
      size.append(o);
    });
    generation.append(size);
    panel.append(generation);
    var actions = el("div");
    actions.className = "gpt-actions";
    actions.append(
      button("生成预览（收费）", generate, "gpt-generate"),
      button(
        "停止",
        function () {
          if (request) request.abort();
        },
        "gpt-stop",
      ),
      button("确认应用", apply, "gpt-apply"),
    );
    panel.append(actions);
    var state = el("p");
    state.id = "gpt-status";
    state.setAttribute("role", "status");
    state.setAttribute("aria-live", "polite");
    panel.append(state);
    var comparison = el("div");
    comparison.id = "gpt-comparison";
    panel.append(comparison);
    [
      "gpt-base",
      "gpt-model",
      "gpt-key",
      "gpt-quality",
      "gpt-transparent",
      "gpt-size",
    ].forEach(function (id) {
      field(id).addEventListener("change", invalidate);
    });
    document.body.append(panel);
    configFields();
  }
  async function filePng(file) {
    if (file.size > 20 * 1024 * 1024) throw new Error("参考图超过 20 MB。");
    var url = URL.createObjectURL(file);
    try {
      var image = await editor.loadImage(url),
        scale = Math.min(1, 1024 / Math.max(image.width, image.height)),
        c = editor.makeCanvas(
          Math.max(1, Math.round(image.width * scale)),
          Math.max(1, Math.round(image.height * scale)),
        );
      c.getContext("2d").drawImage(image, 0, 0, c.width, c.height);
      return c.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  async function importReferences(event) {
    invalidate();
    try {
      for (var file of Array.from(event.target.files)) {
        if (references.length >= 4) throw new Error("最多添加四张参考图。");
        references.push({
          dataUrl: await filePng(file),
          purpose: "identity",
          label: file.name,
        });
      }
      renderReferences();
      status("参考图已导入；发送请求前可以调整用途。");
    } catch (error) {
      status(error.message);
    } finally {
      event.target.value = "";
    }
  }
  function renderReferences() {
    var list = field("gpt-references");
    list.replaceChildren();
    references.forEach(function (ref, index) {
      var row = el("div");
      row.className = "gpt-reference";
      var image = el("img");
      image.src = ref.dataUrl;
      image.alt = ref.label;
      var purpose = el("select");
      [
        ["identity", "人物身份"],
        ["outfit", "服装"],
        ["pose", "姿势"],
        ["style", "画风"],
      ].forEach(function (item) {
        var o = el("option", item[1]);
        o.value = item[0];
        purpose.append(o);
      });
      purpose.value = ref.purpose;
      purpose.addEventListener("change", function () {
        ref.purpose = purpose.value;
        invalidate();
      });
      row.append(
        image,
        purpose,
        button("移除", function () {
          references.splice(index, 1);
          renderReferences();
          invalidate();
        }),
      );
      list.append(row);
    });
  }
  function profiles() {
    if (!Array.isArray(basePrompt.gptVisualProfiles))
      basePrompt.gptVisualProfiles = [];
    return basePrompt.gptVisualProfiles;
  }
  function renderProfiles() {
    var s = field("gpt-profile"),
      value = s.value;
    s.replaceChildren();
    var empty = el("option", "不使用档案");
    empty.value = "";
    s.append(empty);
    profiles().forEach(function (p) {
      var o = el("option", p.name);
      o.value = p.id;
      s.append(o);
    });
    s.value = value;
  }
  function loadProfile() {
    var p = profiles().find(function (p) {
      return p.id === field("gpt-profile").value;
    });
    if (!p) return;
    field("gpt-character-name").value = p.name;
    field("gpt-character").value = p.constraints;
    references = p.references.map(function (r) {
      return Object.assign({}, r);
    });
    renderReferences();
    invalidate();
  }
  function saveProfile() {
    var name = field("gpt-character-name").value.trim();
    if (!name) {
      status("请填写角色名称。");
      return;
    }
    var id =
        field("gpt-profile").value || "character_" + Date.now().toString(36),
      p = {
        id: id,
        name: name,
        constraints: field("gpt-character").value,
        references: references.map(function (r) {
          return Object.assign({}, r);
        }),
      },
      list = profiles(),
      index = list.findIndex(function (p) {
        return p.id === id;
      });
    if (index < 0) list.push(p);
    else list[index] = p;
    renderProfiles();
    field("gpt-profile").value = id;
    status("角色档案已加入工程；保存工程后可重新打开。");
  }
  function deleteProfile() {
    var id = field("gpt-profile").value;
    basePrompt.gptVisualProfiles = profiles().filter(function (p) {
      return p.id !== id;
    });
    renderProfiles();
    invalidate();
  }
  async function open(points, options) {
    build();
    if (request) {
      status("当前任务仍在进行；请先停止或等待。");
      panel.hidden = false;
      return;
    }
    clearPaintMask();
    revision++;
    invalidate();
    selection = { points: points, options: options || {}, snapshot: null };
    panel.hidden = false;
    references = [];
    renderReferences();
    renderProfiles();
    field("gpt-generation").hidden = !options.generation;
    field("gpt-bounds").hidden = !!options.generation;
    field("gpt-operation").hidden = !!options.generation;
    field("gpt-refine-mask").hidden = !!options.generation;
    field("gpt-apply").disabled = true;
    if (options.operation)
      field("gpt-operation").value =
        options.operation === "remove" ? "remove" : options.operation;
    if (options.prompt) field("gpt-prompt").value = options.prompt;
    if (points) {
      var b = core.bounds(points, canvas.width, canvas.height);
      field("gpt-x").value = b.left;
      field("gpt-y").value = b.top;
      field("gpt-width").value = b.width;
      field("gpt-height").value = b.height;
      drawOutline(points);
      status(
        "选区 " +
          b.width +
          " × " +
          b.height +
          " 像素；生成后先比较，再确认应用。",
      );
    } else status("生成结果确认后作为新图层加入当前页；原工程尺寸不变。");
    field("gpt-prompt").focus();
  }
  function updateBounds() {
    try {
      var x = Number(field("gpt-x").value),
        y = Number(field("gpt-y").value),
        w = Number(field("gpt-width").value),
        h = Number(field("gpt-height").value);
      if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0)
        throw new Error("选区尺寸必须为正数。");
      selection.points = [
        { x: x, y: y },
        { x: x + w, y: y },
        { x: x + w, y: y + h },
        { x: x, y: y + h },
      ];
      core.bounds(selection.points, canvas.width, canvas.height);
      clearPaintMask();
      selection.options.snapshot = null;
      invalidate();
      drawOutline(selection.points);
      status("矩形选区已更新。");
    } catch (error) {
      status(error.message);
    }
  }
  async function activateMask() {
    if (!selection || !selection.points) return;
    try {
      var snapshot = await editor.prepareSelection(
        selection.points,
        selection.options.target || null,
      );
      clearPaintMask();
      var base = field("gpt-mask-base"),
        paint = field("gpt-mask-paint");
      [base, paint].forEach(function (c) {
        c.width = snapshot.bounds.width;
        c.height = snapshot.bounds.height;
      });
      base.getContext("2d").drawImage(snapshot.source, 0, 0);
      field("gpt-mask-section").hidden = false;
      InpaintMask.init(paint);
      InpaintMask.setBrushSize(Number(field("gpt-mask-brush").value));
      paintMask = snapshot;
      invalidate();
      status(
        "用画笔涂出允许修改区域；ComfyUI 白色区域会转换为 GPT 透明 Alpha。",
      );
    } catch (error) {
      status(error.message);
    }
  }
  async function refinedSnapshot() {
    if (!paintMask)
      return (
        selection.options.snapshot ||
        editor.prepareSelection(
          selection.points,
          selection.options.target || null,
        )
      );
    editor.assertFresh(paintMask);
    if (!InpaintMask.hasMask())
      throw new Error("遮罩为空，请先涂抹要修改的区域。");
    var image = await editor.loadImage(InpaintMask.getMaskAsBlackWhite()),
      c = editor.makeCanvas(image.width, image.height);
    c.getContext("2d").drawImage(image, 0, 0);
    var d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data,
      mask = new Uint8Array(c.width * c.height);
    for (var i = 0; i < mask.length; i++)
      mask[i] = d[i * 4] && paintMask.mask[i] ? 255 : 0;
    return editor.prepareSelection(
      selection.points,
      selection.options.target || null,
      mask,
    );
  }
  function showComparison(before, after) {
    var box = field("gpt-comparison");
    box.replaceChildren();
    [
      [before, "修改前"],
      [after, "修改后（尚未应用）"],
    ].forEach(function (item) {
      if (!item[0]) return;
      var fig = el("figure"),
        img = el("img");
      img.src = item[0];
      img.alt = item[1];
      fig.append(img, el("figcaption", item[1]));
      box.append(fig);
    });
  }
  async function generate() {
    if (request || !selection) return;
    var prompt = field("gpt-prompt").value;
    if (!prompt.trim()) {
      status("请描述修改要求。");
      return;
    }
    if (
      field("gpt-operation").value === "replace" &&
      !selection.options.generation &&
      !references.some(function (r) {
        return r.purpose === "identity";
      })
    ) {
      status("人物替换请先添加人物身份参考图。");
      return;
    }
    storeConfig();
    var token = revision,
      controller = new AbortController();
    request = controller;
    field("gpt-generate").disabled = true;
    field("gpt-apply").disabled = true;
    status("准备原尺寸图片与遮罩…");
    try {
      if (selection.options.generation) {
        var pageGuid = getCanvasGUID(),
          sig = editor.signature();
        status("GPT 正在生成；不会自动重试。");
        var result = await providerRegistry
          .get("gpt-image")
          .generateImage(
            {
              prompt: prompt,
              size: field("gpt-size").value,
              background: field("gpt-transparent").checked
                ? "transparent"
                : "opaque",
              character: field("gpt-character").value,
              references: references,
            },
            controller.signal,
          );
        var image = await editor.loadImage(result.images[0].dataUrl),
          size = field("gpt-size").value.split("x").map(Number);
        core.checkResultSize(image.width, image.height, {
          width: size[0],
          height: size[1],
        });
        preview = {
          generation: true,
          dataUrl: result.images[0].dataUrl,
          pageGuid: pageGuid,
          signature: sig,
          status: "preview",
        };
        showComparison(null, preview.dataUrl);
      } else {
        var snapshot = await refinedSnapshot();
        selection.snapshot = snapshot;
        status("GPT 正在编辑；原图尚未修改。");
        preview = await editor.submit(
          snapshot,
          {
            prompt: OPERATIONS[field("gpt-operation").value] + "\n" + prompt,
            operation: field("gpt-operation").value,
            references: references,
            character: field("gpt-character").value,
          },
          controller.signal,
        );
        showComparison(preview.beforeUrl, preview.afterUrl);
      }
      if (token !== revision) {
        preview = null;
        status("要求或页面已变化，结果未应用；请重新预览。");
        return;
      }
      field("gpt-apply").disabled = false;
      status("预览完成。核对人物、细节和文字，确认后才会添加图层。");
    } catch (error) {
      preview = null;
      status(error.message);
    } finally {
      if (request === controller) request = null;
      field("gpt-generate").disabled = false;
    }
  }
  async function apply() {
    if (!preview) return;
    field("gpt-apply").disabled = true;
    try {
      if (preview.generation) {
        if (
          root.NaiHistoryLoading ||
          root.NaiPageLoading ||
          getCanvasGUID() !== preview.pageGuid ||
          editor.signature() !== preview.signature
        )
          throw new Error("页面已变化，请重新生成或预览。");
        var pending = preview,
          img = await new Promise(function (resolve) {
            fabric.Image.fromURL(pending.dataUrl, resolve);
          });
        if (
          preview !== pending ||
          editor.signature() !== pending.signature ||
          getCanvasGUID() !== pending.pageGuid
        )
          throw new Error("页面已变化，未应用。");
        img.set({
          left: 0,
          top: 0,
          name: "GPT 生图",
          scaleX: Math.min(
            1,
            canvas.width / img.width,
            canvas.height / img.height,
          ),
          scaleY: Math.min(
            1,
            canvas.width / img.width,
            canvas.height / img.height,
          ),
        });
        getGUID(img);
        changeDoNotSaveHistory();
        try {
          canvas.add(img);
          canvas.setActiveObject(img);
        } finally {
          changeDoSaveHistory();
        }
        saveStateByManual();
        pending.status = "applied";
      } else await editor.applyPreview(preview);
      status("已添加可撤销的新图层。原图和选区外内容保留。");
      preview = null;
      removeOutline();
      updateLayerPanel();
      canvas.requestRenderAll();
    } catch (error) {
      status(error.message);
    }
  }
  function pagePoint(event) {
    var c = canvas,
      r = c.upperCanvasEl.getBoundingClientRect();
    return core.clientToPage(
      { x: event.clientX, y: event.clientY },
      r,
      c.width,
      c.height,
      c.viewportTransform,
    );
  }
  function removeOutline() {
    if (outline) outline.remove();
    outline = null;
  }
  function drawOutline(points) {
    removeOutline();
    if (!points || points.length < 2) return;
    var r = canvas.upperCanvasEl.getBoundingClientRect();
    outline = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    outline.classList.add("gpt-selection-outline");
    outline.style.left = r.left + "px";
    outline.style.top = r.top + "px";
    outline.style.width = r.width + "px";
    outline.style.height = r.height + "px";
    outline.setAttribute(
      "viewBox",
      "0 0 " + canvas.width + " " + canvas.height,
    );
    var poly = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon",
    );
    poly.setAttribute(
      "points",
      points
        .map(function (p) {
          var q = core.transform(canvas.viewportTransform, p);
          return q.x + "," + q.y;
        })
        .join(" "),
    );
    outline.append(poly);
    document.body.append(outline);
  }
  function rectPoints(start, end) {
    return [
      { x: start.x, y: start.y },
      { x: end.x, y: start.y },
      { x: end.x, y: end.y },
      { x: start.x, y: end.y },
    ];
  }
  function bindGesture() {
    var wrapper = canvas.wrapperEl;
    root.NaiGptGesture = { ownsContextMenu: true };
    wrapper.addEventListener(
      "pointerdown",
      function (event) {
        if (event.button !== 2 && !(lassoMode && event.button === 0)) return;
        if (root.NaiHistoryLoading || root.NaiPageLoading) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        var target = canvas.findTarget(event, false);
        if (target && target.type === "activeSelection") target = null;
        gesture = {
          start: pagePoint(event),
          client: { x: event.clientX, y: event.clientY },
          target: target,
          points: [pagePoint(event)],
          lasso: lassoMode && event.button === 0,
          pointerId: event.pointerId,
          dragged: false,
        };
        wrapper.setPointerCapture(event.pointerId);
        if (typeof closeMenu === "function") closeMenu();
      },
      true,
    );
    wrapper.addEventListener(
      "contextmenu",
      function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      true,
    );
    wrapper.addEventListener(
      "pointermove",
      function (event) {
        if (!gesture || event.pointerId !== gesture.pointerId) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        var p = pagePoint(event);
        if (
          Math.hypot(
            event.clientX - gesture.client.x,
            event.clientY - gesture.client.y,
          ) > 6
        )
          gesture.dragged = true;
        if (gesture.lasso) gesture.points.push(p);
        else gesture.points = rectPoints(gesture.start, p);
        if (gesture.dragged) drawOutline(gesture.points);
      },
      true,
    );
    wrapper.addEventListener(
      "pointerup",
      function (event) {
        if (!gesture || event.pointerId !== gesture.pointerId) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        var completed = gesture;
        gesture = null;
        wrapper.releasePointerCapture(event.pointerId);
        if (completed.dragged) {
          var points = completed.lasso
            ? completed.points
            : rectPoints(completed.start, pagePoint(event));
          lassoMode = false;
          open(points, { target: completed.target });
        } else {
          removeOutline();
          if (completed.target) {
            canvas.setActiveObject(completed.target);
            canvas.requestRenderAll();
            showObjectMenu("right");
          } else {
            canvas.discardActiveObject();
            closeMenu();
          }
        }
      },
      true,
    );
    wrapper.addEventListener(
      "pointercancel",
      function () {
        gesture = null;
        removeOutline();
      },
      true,
    );
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        gesture = null;
        lassoMode = false;
        cancel();
      }
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    build();
    var bar = el("div");
    bar.id = "nai-gpt-toolbar";
    bar.append(
      button("GPT 改图", function () {
        editor.openForTarget();
      }),
      button("套索选区", function () {
        lassoMode = true;
        status("用左键圈选，Esc 取消。");
        panel.hidden = false;
      }),
      button("GPT 生图", function () {
        editor.openGeneration();
      }),
      button("字幕", function () {
        root.NaiSubtitleEditor.open({
          points: selection && selection.points,
          target: canvas.getActiveObject(),
        });
      }),
    );
    document.body.append(bar);
    bindGesture();
  });
  root.NaiGptEditUI = {
    open: open,
    cancel: cancel,
    importMask: async function (target, url, prompt) {
      try {
        var snapshot = await editor.prepareMask(target, url);
        open(target.getCoords(true, true), {
          target: target,
          snapshot: snapshot,
          prompt: prompt || "",
        });
      } catch (error) {
        build();
        panel.hidden = false;
        status(error.message);
      }
    },
  };
})(window);
