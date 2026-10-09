/* Shared, dependency-free geometry and light-bubble erase rules.
 * DOM/Fabric code belongs to manga-smart-text-editor.js, not here. */
(function (root) {
  'use strict';

  function normalizeBox(raw, pageWidth, pageHeight) {
    if (!raw || !Number.isFinite(pageWidth) || !Number.isFinite(pageHeight) ||
        pageWidth <= 0 || pageHeight <= 0) return null;
    const x = Number(raw.x), y = Number(raw.y), w = Number(raw.width), h = Number(raw.height);
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return null;
    const left = Math.max(0, Math.min(pageWidth, x));
    const top = Math.max(0, Math.min(pageHeight, y));
    const right = Math.max(0, Math.min(pageWidth, x + w));
    const bottom = Math.max(0, Math.min(pageHeight, y + h));
    if (right - left < 2 || bottom - top < 2) return null;
    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  function normalizeManualDrag(start, end, pageWidth, pageHeight) {
    return normalizeBox({
      x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
      width: Math.abs(start.x - end.x), height: Math.abs(start.y - end.y)
    }, pageWidth, pageHeight);
  }

  function mapDetections(items, pageWidth, pageHeight) {
    if (!Array.isArray(items)) return [];
    const drafts = [];
    for (const item of items.slice(0, 120)) {
      const box = normalizeBox(item, pageWidth, pageHeight);
      const text = typeof item.text === 'string' ? item.text.trim().slice(0, 500) : '';
      if (!box || !text) continue;
      drafts.push({ ...box, text, erase: true, vertical: !!item.vertical,
        confidence: Math.max(0, Math.min(100, Number(item.confidence) || 0)) });
    }
    return drafts;
  }

  // Sample an external ring, not the OCR word's black strokes. Only uniform,
  // opaque backgrounds may be covered locally; don't paint over artwork.
  function boundaryColor(rgba) {
    if (!rgba || rgba.length < 12 || rgba.length % 4 !== 0) return { safe: false };
    const n = rgba.length / 4, rgb = [0, 0, 0];
    for (let i = 0; i < rgba.length; i += 4) {
      if (rgba[i + 3] < 250) return { safe: false };
      rgb[0] += rgba[i];
      rgb[1] += rgba[i + 1];
      rgb[2] += rgba[i + 2];
    }
    const mean = rgb.map(x => x / n);
    let variance = 0;
    for (let i = 0; i < rgba.length; i += 4) {
      variance += ((rgba[i] - mean[0]) ** 2 + (rgba[i + 1] - mean[1]) ** 2 +
        (rgba[i + 2] - mean[2]) ** 2) / (3 * n);
    }
    return { safe: Math.sqrt(variance) <= 16,
      color: { r: Math.round(mean[0]), g: Math.round(mean[1]), b: Math.round(mean[2]) },
      variation: Math.sqrt(variance) };
  }

  root.MangaSmartTextCore = Object.freeze({
    normalizeBox, normalizeManualDrag, mapDetections, boundaryColor
  });
})(typeof window !== 'undefined' ? window : this);
