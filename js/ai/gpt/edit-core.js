(function (root) {
  "use strict";
  function transform(matrix, p) {
    return {
      x: matrix[0] * p.x + matrix[2] * p.y + matrix[4],
      y: matrix[1] * p.x + matrix[3] * p.y + matrix[5],
    };
  }
  function inverse(m) {
    var det = m[0] * m[3] - m[1] * m[2];
    if (!Number.isFinite(det) || Math.abs(det) < 1e-12)
      throw new Error("无法转换零尺寸图层坐标。");
    return [
      m[3] / det,
      -m[1] / det,
      -m[2] / det,
      m[0] / det,
      (m[2] * m[5] - m[3] * m[4]) / det,
      (m[1] * m[4] - m[0] * m[5]) / det,
    ];
  }
  function pageToImage(image, p) {
    var local = transform(inverse(image.calcTransformMatrix()), p);
    return {
      x: local.x + image.width / 2 + (image.cropX || 0),
      y: local.y + image.height / 2 + (image.cropY || 0),
    };
  }
  function clientToPage(p, rect, width, height, viewport) {
    return transform(inverse(viewport), {
      x: ((p.x - rect.left) * width) / rect.width,
      y: ((p.y - rect.top) * height) / rect.height,
    });
  }
  function bounds(points, width, height) {
    if (!points || points.length < 3) throw new Error("请框选或圈选有效区域。");
    var xs = points.map(function (p) {
        return p.x;
      }),
      ys = points.map(function (p) {
        return p.y;
      });
    var left = Math.max(0, Math.floor(Math.min.apply(null, xs))),
      top = Math.max(0, Math.floor(Math.min.apply(null, ys)));
    var right = Math.min(width, Math.ceil(Math.max.apply(null, xs))),
      bottom = Math.min(height, Math.ceil(Math.max.apply(null, ys)));
    if (right <= left || bottom <= top) throw new Error("选区在画布外。");
    return { left: left, top: top, width: right - left, height: bottom - top };
  }
  function requestSize(w, h) {
    var sizes = [
      { width: 1024, height: 1024, api: "1024x1024" },
      { width: 1536, height: 1024, api: "1536x1024" },
      { width: 1024, height: 1536, api: "1024x1536" },
    ];
    var size = sizes.find(function (s) {
      return w <= s.width && h <= s.height;
    });
    if (!size)
      throw new Error(
        "选区超过当前 GPT 输出分辨率；请缩小选区。不会通过简单放大伪装无损。",
      );
    return size;
  }
  function checkResultSize(w, h, size) {
    if (w < size.width || h < size.height)
      throw new Error(
        "返回图片分辨率不足，已保留原图。请提高供应商输出尺寸后重试。",
      );
    if (Math.abs(w / h - size.width / size.height) > 0.001)
      throw new Error("返回图片比例不符合请求；不能准确回贴，已保留原图。");
  }
  function maskPixels(pixels, mask) {
    if (pixels.length !== mask.length * 4)
      throw new Error("图片与选区尺寸不一致。");
    var out = new Uint8ClampedArray(pixels);
    for (var i = 0; i < mask.length; i++)
      out[i * 4 + 3] = Math.round((out[i * 4 + 3] * mask[i]) / 255);
    return out;
  }
  function gptMaskPixels(mask) {
    var out = new Uint8ClampedArray(mask.length * 4);
    for (var i = 0; i < mask.length; i++) out[i * 4 + 3] = 255 - mask[i];
    return out;
  }
  // Used for independent pixel verification and preview; original array is never mutated.
  function compositePixels(source, patch) {
    var out = new Uint8ClampedArray(source);
    for (var i = 0; i < source.length; i += 4) {
      if (patch[i + 3] === 0) continue;
      var a = patch[i + 3] / 255,
        b = source[i + 3] / 255,
        alpha = a + b * (1 - a);
      for (var c = 0; c < 3; c++)
        out[i + c] = alpha
          ? Math.round((patch[i + c] * a + source[i + c] * b * (1 - a)) / alpha)
          : 0;
      out[i + 3] = Math.round(alpha * 255);
    }
    return out;
  }
  root.NaiGptEditCore = {
    transform: transform,
    inverse: inverse,
    pageToImage: pageToImage,
    clientToPage: clientToPage,
    bounds: bounds,
    requestSize: requestSize,
    checkResultSize: checkResultSize,
    maskPixels: maskPixels,
    gptMaskPixels: gptMaskPixels,
    compositePixels: compositePixels,
  };
})(typeof window !== "undefined" ? window : globalThis);
