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

  // Where replacement text may go: the bubble interior (≈ the rectangle inside an elliptical
  // bubble, 15% inset per side), never smaller than the original text box. Erasing still uses the
  // tight text box; only placement/fitting use this, so a short Chinese line is not squeezed
  // into the narrow column of the old vertical Japanese text.
  function bubbleTextArea(bubble, box, pageWidth, pageHeight) {
    const b = bubble && normalizeBox(bubble, pageWidth, pageHeight);
    if (!b) return null;
    const x0 = Math.min(box.x, b.x + b.width * 0.15), y0 = Math.min(box.y, b.y + b.height * 0.15);
    const x1 = Math.max(box.x + box.width, b.x + b.width * 0.85), y1 = Math.max(box.y + box.height, b.y + b.height * 0.85);
    return { x: Math.round(x0), y: Math.round(y0), width: Math.round(x1 - x0), height: Math.round(y1 - y0) };
  }

  function mapDetections(items, pageWidth, pageHeight) {
    if (!Array.isArray(items)) return [];
    const drafts = [];
    for (const item of items.slice(0, 120)) {
      const box = normalizeBox(item, pageWidth, pageHeight);
      const text = typeof item.text === 'string' ? item.text.trim().slice(0, 500) : '';
      if (!box || !text) continue;
      const draft = { ...box, text, erase: true, vertical: !!item.vertical,
        confidence: Math.max(0, Math.min(100, Number(item.confidence) || 0)) };
      const area = bubbleTextArea(item.bubble, box, pageWidth, pageHeight);
      if (area) draft.textArea = area;
      drafts.push(draft);
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

  // Pick a font size so the new caption fits the original text area (a longer replacement no
  // longer spills out of the bubble). measure(text, size) -> horizontal pixel width.
  // Shrinks down to 55% of the natural size (min 10px), then wraps by character.
  // maxSize (optional): cap at about the original lettering size, so text fitted into a whole
  // bubble interior is not blown up far beyond the glyphs it replaces.
  function fitText(text, box, vertical, measure, maxSize) {
    const clean = String(text || '').replace(/\r/g, '');
    const along = vertical ? box.height : box.width;      // reading direction
    const across = vertical ? box.width : box.height;
    const cap = Number(maxSize) > 0 ? Math.max(10, Math.round(maxSize)) : 128;
    const natural = Math.max(10, Math.min(128, cap, Math.round(across * 0.85)));
    const minimum = Math.max(10, Math.floor(natural * 0.55));
    const length = (line, size) => vertical ? Array.from(line).length * size * 1.02 : measure(line, size);
    const lines = clean.split('\n');
    const longest = size => Math.max(...lines.map(line => length(line, size)));
    for (let size = natural; size >= minimum; size--) {
      if (longest(size) <= along) return { fontSize: size, text: clean, lines: lines.length, wrapped: false };
    }
    const wrapped = [];
    for (const line of lines) {
      let current = '';
      for (const ch of Array.from(line)) {
        if (current && length(current + ch, minimum) > along) { wrapped.push(current); current = ch; } else current += ch;
      }
      wrapped.push(current);
    }
    return { fontSize: minimum, text: wrapped.join('\n'), lines: wrapped.length, wrapped: true };
  }

  root.MangaSmartTextCore = Object.freeze({
    normalizeBox, normalizeManualDrag, mapDetections, boundaryColor, fitText
  });
})(typeof window !== 'undefined' ? window : this);
