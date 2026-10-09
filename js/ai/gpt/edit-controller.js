(function (root) {
  "use strict";
  var core = root.NaiGptEditCore;
  function currentCanvas() {
    return root.canvas;
  }
  function makeCanvas(w, h) {
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }
  function loadImage(url) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () {
        resolve(image);
      };
      image.onerror = function () {
        reject(new Error("图片解码失败，工程未修改。"));
      };
      image.src = url;
    });
  }
  function cloneObject(obj) {
    return new Promise(function (resolve) {
      obj.clone(
        resolve,
        typeof commonProperties !== "undefined" ? commonProperties : [],
      );
    });
  }
  function signature() {
    return (
      historyVisualSignature(customToJSON()) +
      "|" +
      currentCanvas().width +
      "x" +
      currentCanvas().height
    );
  }
  function assertReady() {
    if (root.NaiHistoryLoading || root.NaiPageLoading || !isSave())
      throw new Error("页面正在恢复或切换，请完成后再编辑。");
  }
  function assertFresh(snapshot) {
    assertReady();
    if (
      getCanvasGUID() !== snapshot.pageGuid ||
      currentCanvas() !== snapshot.canvas ||
      signature() !== snapshot.signature ||
      (snapshot.target &&
        currentCanvas().getObjects().indexOf(snapshot.target) < 0)
    )
      throw new Error("页面或图层已变化，预览已过期；请重新框选。");
  }
  async function renderObjects(
    objects,
    w,
    h,
    background,
    backgroundImage,
    backgroundVpt,
  ) {
    var off = new fabric.StaticCanvas(null, {
      width: w,
      height: h,
      backgroundColor: background || "",
      enableRetinaScaling: false,
      renderOnAddRemove: false,
    });
    try {
      var clones = await Promise.all(objects.map(cloneObject));
      clones.forEach(function (o) {
        off.add(o);
      });
      if (backgroundImage) {
        off.backgroundImage = await cloneObject(backgroundImage);
        off.backgroundVpt = backgroundVpt !== false;
      }
      off.renderAll();
      var out = makeCanvas(w, h);
      out.getContext("2d").drawImage(off.lowerCanvasEl, 0, 0);
      return out;
    } finally {
      off.dispose();
    }
  }
  function polygonMask(points, bounds) {
    var c = makeCanvas(bounds.width, bounds.height),
      ctx = c.getContext("2d");
    ctx.fillStyle = "white";
    ctx.beginPath();
    points.forEach(function (p, i) {
      ctx[i ? "lineTo" : "moveTo"](p.x - bounds.left, p.y - bounds.top);
    });
    ctx.closePath();
    ctx.fill();
    var data = ctx.getImageData(0, 0, c.width, c.height).data,
      mask = new Uint8Array(c.width * c.height);
    for (var i = 0; i < mask.length; i++)
      mask[i] = data[i * 4 + 3] >= 128 ? 255 : 0;
    return mask;
  }
  async function prepareSelection(points, target, customMask) {
    assertReady();
    var c = currentCanvas(),
      snapshot = {
        canvas: c,
        pageGuid: getCanvasGUID(),
        target: target || null,
        signature: signature(),
        width: c.width,
        height: c.height,
      };
    var b = core.bounds(points, c.width, c.height),
      size = core.requestSize(b.width, b.height),
      objects = c.getObjects(),
      index = target ? objects.indexOf(target) : objects.length - 1;
    if (target && index < 0) throw new Error("目标图层已删除。");
    var visibleObjects = objects.slice(0, index + 1).filter(function (o) {
      return !o.excludeFromExport && !o.excludeFromLayerPanel;
    });
    var rendered = await renderObjects(
      visibleObjects,
      c.width,
      c.height,
      c.backgroundColor,
      c.backgroundImage,
      c.backgroundVpt,
    );
    // Use page-native pixels with integer placement. Never resize the original page or image.
    var source = makeCanvas(b.width, b.height),
      ctx = source.getContext("2d");
    ctx.drawImage(rendered, -b.left, -b.top);
    var mask = customMask || polygonMask(points, b);
    if (mask.length !== b.width * b.height) throw new Error("遮罩尺寸不匹配。");
    if (target && target.clipPath) {
      // Render a solid proxy with the exact Fabric transform and crop relationship to constrain the panel clip.
      var shape = new fabric.Rect({
        width: target.width,
        height: target.height,
        fill: "#ffffff",
        strokeWidth: 0,
        originX: target.originX,
        originY: target.originY,
        left: target.left,
        top: target.top,
        scaleX: target.scaleX,
        scaleY: target.scaleY,
        angle: target.angle,
        flipX: target.flipX,
        flipY: target.flipY,
        skewX: target.skewX,
        skewY: target.skewY,
        clipPath: await cloneObject(target.clipPath),
        objectCaching: true,
      });
      var clip = await renderObjects([shape], c.width, c.height),
        clipPixels = clip
          .getContext("2d")
          .getImageData(b.left, b.top, b.width, b.height).data;
      // Preserve partially covered antialiased panel edges exactly; do not turn
      // them into fully opaque replacement pixels.
      for (var i = 0; i < mask.length; i++)
        if (clipPixels[i * 4 + 3] !== 255) mask[i] = 0;
    }
    if (
      !mask.some(function (v) {
        return v > 0;
      })
    )
      throw new Error("选区不在可见分镜内。");
    var padded = makeCanvas(size.width, size.height),
      pc = padded.getContext("2d");
    pc.fillStyle = "#ffffff";
    pc.fillRect(0, 0, padded.width, padded.height);
    pc.drawImage(source, 0, 0);
    var apiMask = makeCanvas(size.width, size.height),
      ac = apiMask.getContext("2d"),
      fullMask = new Uint8Array(size.width * size.height);
    for (var y = 0; y < b.height; y++)
      fullMask.set(
        mask.subarray(y * b.width, (y + 1) * b.width),
        y * size.width,
      );
    var d = ac.createImageData(size.width, size.height);
    d.data.set(core.gptMaskPixels(fullMask));
    ac.putImageData(d, 0, 0);
    Object.assign(snapshot, {
      bounds: b,
      size: size,
      mask: mask,
      source: source,
      sourceUrl: padded.toDataURL("image/png"),
      maskUrl: apiMask.toDataURL("image/png"),
      targetIndex: index,
    });
    assertFresh(snapshot);
    return snapshot;
  }
  async function createPreview(snapshot, dataUrl) {
    var image = await loadImage(dataUrl);
    core.checkResultSize(image.width, image.height, snapshot.size);
    var sized = makeCanvas(snapshot.size.width, snapshot.size.height);
    sized.getContext("2d").drawImage(image, 0, 0, sized.width, sized.height);
    var b = snapshot.bounds,
      pixels = sized.getContext("2d").getImageData(0, 0, b.width, b.height),
      patch = makeCanvas(b.width, b.height);
    pixels.data.set(core.maskPixels(pixels.data, snapshot.mask));
    patch.getContext("2d").putImageData(pixels, 0, 0);
    var after = makeCanvas(b.width, b.height);
    after.getContext("2d").drawImage(snapshot.source, 0, 0);
    after.getContext("2d").drawImage(patch, 0, 0);
    return {
      snapshot: snapshot,
      patchUrl: patch.toDataURL("image/png"),
      beforeUrl: snapshot.source.toDataURL("image/png"),
      afterUrl: after.toDataURL("image/png"),
      status: "preview",
    };
  }
  async function applyPreview(preview) {
    if (preview.status !== "preview") throw new Error("预览已应用或取消。");
    var s = preview.snapshot;
    assertFresh(s);
    var layer = await new Promise(function (resolve, reject) {
      fabric.Image.fromURL(preview.patchUrl, function (img) {
        if (img) resolve(img);
        else reject(new Error("回贴图层解码失败。"));
      });
    });
    if (preview.status !== "preview") throw new Error("预览已取消或应用。");
    assertFresh(s);
    var c = currentCanvas(),
      b = s.bounds;
    layer.set({
      left: b.left,
      top: b.top,
      originX: "left",
      originY: "top",
      name: "GPT 编辑 · " + (preview.operation || "局部修改"),
      objectCaching: false,
    });
    layer.naiGptEdit = {
      version: 1,
      pageGuid: s.pageGuid,
      sourceGuid: s.target ? getGUID(s.target) : "",
      bounds: b,
      operation: preview.operation || "edit",
    };
    getGUID(layer);
    var shouldSave = isSave();
    changeDoNotSaveHistory();
    try {
      c.insertAt(layer, s.targetIndex + 1, false);
      c.setActiveObject(layer);
      layer.setCoords();
      c.requestRenderAll();
    } finally {
      if (shouldSave) changeDoSaveHistory();
    }
    saveStateByManual();
    updateLayerPanel();
    preview.status = "applied";
    return true;
  }
  async function submit(snapshot, input, signal) {
    assertFresh(snapshot);
    var refs = input.references || [];
    var result = await providerRegistry.get("gpt-image").request(
      {
        operation: "edit",
        prompt: input.prompt,
        size: snapshot.size.api,
        images: [snapshot.sourceUrl].concat(
          refs.map(function (r) {
            return r.dataUrl;
          }),
        ),
        mask: snapshot.maskUrl,
        references: refs,
        character: input.character || "",
      },
      signal,
    );
    var preview = await createPreview(snapshot, result.images[0].dataUrl);
    preview.operation = input.operation || "edit";
    preview.provider = result.provider;
    return preview;
  }
  async function prepareMask(target, maskUrl) {
    var image = await loadImage(maskUrl),
      off = makeCanvas(image.width, image.height);
    off.getContext("2d").drawImage(image, 0, 0);
    var pixel = off
      .getContext("2d")
      .getImageData(0, 0, image.width, image.height).data;
    // Existing mask is image-local white=edit; reproject through the complete Fabric matrix.
    var local = makeCanvas(image.width, image.height),
      data = local.getContext("2d").createImageData(image.width, image.height);
    for (var i = 0; i < pixel.length; i += 4) {
      data.data[i] = 255;
      data.data[i + 1] = 255;
      data.data[i + 2] = 255;
      data.data[i + 3] = pixel[i];
    }
    local.getContext("2d").putImageData(data, 0, 0);
    var projected = makeCanvas(currentCanvas().width, currentCanvas().height),
      ctx = projected.getContext("2d"),
      m = target.calcTransformMatrix();
    ctx.transform.apply(ctx, m);
    ctx.drawImage(
      local,
      target.cropX || 0,
      target.cropY || 0,
      target.width,
      target.height,
      -target.width / 2,
      -target.height / 2,
      target.width,
      target.height,
    );
    var points = target.getCoords(true, true).map(function (p) {
        return { x: p.x, y: p.y };
      }),
      b = core.bounds(points, currentCanvas().width, currentCanvas().height),
      d = projected
        .getContext("2d")
        .getImageData(b.left, b.top, b.width, b.height).data,
      mask = new Uint8Array(b.width * b.height);
    for (var j = 0; j < mask.length; j++)
      mask[j] = d[j * 4 + 3] >= 128 ? 255 : 0;
    return prepareSelection(points, target, mask);
  }
  function openSelection(points, options) {
    return root.NaiGptEditUI.open(points, options || {});
  }
  function openForTarget(target) {
    var c = currentCanvas();
    target = target || c.getActiveObject();
    var pts = target
      ? target.getCoords(true, true)
      : [
          { x: 0, y: 0 },
          { x: c.width, y: 0 },
          { x: c.width, y: c.height },
          { x: 0, y: c.height },
        ];
    return openSelection(pts, { target: target });
  }
  function openGeneration(target) {
    return root.NaiGptEditUI.open(null, { generation: true, target: target });
  }
  root.NaiGptEditor = {
    prepareSelection: prepareSelection,
    prepareMask: prepareMask,
    createPreview: createPreview,
    applyPreview: applyPreview,
    submit: submit,
    assertFresh: assertFresh,
    openSelection: openSelection,
    openForTarget: openForTarget,
    openGeneration: openGeneration,
    signature: signature,
    makeCanvas: makeCanvas,
    loadImage: loadImage,
  };
})(window);
