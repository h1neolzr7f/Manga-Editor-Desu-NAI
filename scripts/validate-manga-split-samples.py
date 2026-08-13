from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw


SRC = Path(r"C:\Users\tzzcomputer\Downloads\测试切分文档")
OUT = Path(r"C:\Users\tzzcomputer\Desktop\Manga-Editor-Desu\outputs\manga-split-validation")
OUT.mkdir(parents=True, exist_ok=True)


def clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))


def box_area(box: dict) -> int:
    return max(0, box["w"]) * max(0, box["h"])


def box_right(box: dict) -> int:
    return box["x"] + box["w"]


def box_bottom(box: dict) -> int:
    return box["y"] + box["h"]


def intersection(a: dict, b: dict) -> int:
    x1 = max(a["x"], b["x"])
    y1 = max(a["y"], b["y"])
    x2 = min(box_right(a), box_right(b))
    y2 = min(box_bottom(a), box_bottom(b))
    return max(0, x2 - x1) * max(0, y2 - y1)


def iou(a: dict, b: dict) -> float:
    hit = intersection(a, b)
    total = box_area(a) + box_area(b) - hit
    return hit / total if total else 0.0


def build_masks(image: Image.Image, threshold: int = 245) -> tuple[list[int], list[int], list[int]]:
    rgb = image.convert("RGB")
    data = list(rgb.getdata())
    ink: list[int] = []
    white: list[int] = []
    frame: list[int] = []
    for r, g, b in data:
        luma = 0.299 * r + 0.587 * g + 0.114 * b
        spread = max(r, g, b) - min(r, g, b)
        is_white = luma >= threshold and spread < 46
        ink.append(0 if is_white else 1)
        white.append(1 if is_white else 0)
        frame.append(1 if luma < 118 and spread < 95 else 0)
    return ink, white, frame


def find_content_box(mask: list[int], width: int, height: int) -> dict:
    min_x, min_y, max_x, max_y = width, height, -1, -1
    for y in range(height):
        row = y * width
        for x in range(width):
            if mask[row + x]:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    if max_x < min_x:
        margin = round(min(width, height) * 0.035)
        return {"x": margin, "y": margin, "w": width - margin * 2, "h": height - margin * 2, "source": "single-page-fallback"}
    pad = max(3, round(min(width, height) * 0.01))
    min_x = clamp(min_x - pad, 0, width - 1)
    min_y = clamp(min_y - pad, 0, height - 1)
    max_x = clamp(max_x + pad, 0, width - 1)
    max_y = clamp(max_y + pad, 0, height - 1)
    return {"x": min_x, "y": min_y, "w": max_x - min_x + 1, "h": max_y - min_y + 1, "source": "single-page-content"}


def white_ratio(mask: list[int], width: int, region: dict, axis: str, pos: int) -> float:
    total = 0
    count = 0
    if axis == "x":
        for y in range(region["y"], region["y"] + region["h"]):
            count += 1
            total += mask[y * width + pos]
    else:
        row = pos * width
        for x in range(region["x"], region["x"] + region["w"]):
            count += 1
            total += mask[row + x]
    return total / count if count else 0.0


def find_white_gutter(mask: list[int], width: int, region: dict, axis: str) -> dict | None:
    size = region["w"] if axis == "x" else region["h"]
    start = region["x"] if axis == "x" else region["y"]
    edge = max(5, round(size * 0.035))
    min_thickness = max(5, round(size * 0.01))
    bands = []
    current = None
    for scan in range(start + edge, start + size - edge):
        clear = white_ratio(mask, width, region, axis, scan) >= 0.965
        if clear and current is None:
            current = {"start": scan, "end": scan}
        elif clear:
            current["end"] = scan
        elif current is not None:
            if current["end"] - current["start"] + 1 >= min_thickness:
                bands.append(current)
            current = None
    if current is not None and current["end"] - current["start"] + 1 >= min_thickness:
        bands.append(current)
    if not bands:
        return None
    bands.sort(key=lambda b: ((b["end"] - b["start"] + 1) * 10 - abs((b["start"] + b["end"]) / 2 - (start + size / 2)) * 0.02), reverse=True)
    return bands[0]


def split_white_gutters(mask: list[int], width: int, height: int, region: dict, boxes: list[dict], depth: int = 0) -> None:
    if depth > 8 or len(boxes) >= 24 or region["w"] < width * 0.09 or region["h"] < height * 0.06:
        boxes.append({**region, "area": box_area(region), "source": "gutter-split"})
        return
    vertical = find_white_gutter(mask, width, region, "x")
    horizontal = find_white_gutter(mask, width, region, "y")
    best_axis = None
    best = None
    if vertical and horizontal:
        best_axis = "x" if vertical["end"] - vertical["start"] >= horizontal["end"] - horizontal["start"] else "y"
        best = vertical if best_axis == "x" else horizontal
    elif vertical:
        best_axis, best = "x", vertical
    elif horizontal:
        best_axis, best = "y", horizontal
    if not best:
        boxes.append({**region, "area": box_area(region), "source": "gutter-split"})
        return
    if best_axis == "x":
        before = {"x": region["x"], "y": region["y"], "w": best["start"] - region["x"], "h": region["h"]}
        after = {"x": best["end"] + 1, "y": region["y"], "w": region["x"] + region["w"] - best["end"] - 1, "h": region["h"]}
    else:
        before = {"x": region["x"], "y": region["y"], "w": region["w"], "h": best["start"] - region["y"]}
        after = {"x": region["x"], "y": best["end"] + 1, "w": region["w"], "h": region["y"] + region["h"] - best["end"] - 1}
    if box_area(before) < width * height * 0.01 or box_area(after) < width * height * 0.01:
        boxes.append({**region, "area": box_area(region), "source": "gutter-split"})
        return
    split_white_gutters(mask, width, height, before, boxes, depth + 1)
    split_white_gutters(mask, width, height, after, boxes, depth + 1)


def line_count(mask: list[int], width: int, region: dict, axis: str, pos: int) -> int:
    if axis == "x":
        return sum(mask[y * width + pos] for y in range(region["y"], region["y"] + region["h"]))
    row = pos * width
    return sum(mask[row + x] for x in range(region["x"], region["x"] + region["w"]))


def find_low_ink_gutter(mask: list[int], width: int, region: dict, axis: str) -> dict | None:
    size = region["w"] if axis == "x" else region["h"]
    cross = region["h"] if axis == "x" else region["w"]
    start = region["x"] if axis == "x" else region["y"]
    edge = max(5, round(size * 0.035))
    min_thickness = max(4, round(size * 0.008))
    max_ink = max(2, round(cross * 0.018))
    bands = []
    current = None
    for scan in range(start + edge, start + size - edge):
        clear = line_count(mask, width, region, axis, scan) <= max_ink
        if clear and current is None:
            current = {"start": scan, "end": scan}
        elif clear:
            current["end"] = scan
        elif current is not None:
            if current["end"] - current["start"] + 1 >= min_thickness:
                bands.append(current)
            current = None
    if current is not None and current["end"] - current["start"] + 1 >= min_thickness:
        bands.append(current)
    if not bands:
        return None
    bands.sort(key=lambda b: ((b["end"] - b["start"] + 1) * 10 - abs((b["start"] + b["end"]) / 2 - (start + size / 2)) * 0.03), reverse=True)
    return bands[0]


def split_low_ink_gutters(mask: list[int], width: int, height: int, region: dict, boxes: list[dict], depth: int = 0) -> None:
    if depth > 8 or len(boxes) >= 24 or region["w"] < width * 0.09 or region["h"] < height * 0.06:
        boxes.append({**region, "area": box_area(region), "source": "gutter-split"})
        return
    vertical = find_low_ink_gutter(mask, width, region, "x")
    horizontal = find_low_ink_gutter(mask, width, region, "y")
    best_axis = None
    best = None
    if vertical and horizontal:
        best_axis = "x" if vertical["end"] - vertical["start"] >= horizontal["end"] - horizontal["start"] else "y"
        best = vertical if best_axis == "x" else horizontal
    elif vertical:
        best_axis, best = "x", vertical
    elif horizontal:
        best_axis, best = "y", horizontal
    if not best:
        boxes.append({**region, "area": box_area(region), "source": "gutter-split"})
        return
    if best_axis == "x":
        before = {"x": region["x"], "y": region["y"], "w": best["start"] - region["x"], "h": region["h"]}
        after = {"x": best["end"] + 1, "y": region["y"], "w": region["x"] + region["w"] - best["end"] - 1, "h": region["h"]}
    else:
        before = {"x": region["x"], "y": region["y"], "w": region["w"], "h": best["start"] - region["y"]}
        after = {"x": region["x"], "y": best["end"] + 1, "w": region["w"], "h": region["y"] + region["h"] - best["end"] - 1}
    if box_area(before) < width * height * 0.01 or box_area(after) < width * height * 0.01:
        boxes.append({**region, "area": box_area(region), "source": "gutter-split"})
        return
    split_low_ink_gutters(mask, width, height, before, boxes, depth + 1)
    split_low_ink_gutters(mask, width, height, after, boxes, depth + 1)


def dedupe(boxes: list[dict]) -> list[dict]:
    kept: list[dict] = []
    for box in sorted(boxes, key=box_area, reverse=True):
        duplicate = False
        for other in kept:
            hit = intersection(box, other)
            if iou(box, other) > 0.42 or hit / max(1, min(box_area(box), box_area(other))) > 0.72:
                duplicate = True
                break
        if not duplicate:
            kept.append(box)
    return kept


def edge_ink_ratio(mask: list[int], width: int, height: int, box: dict, edge: int = 3) -> float:
    left = clamp(round(box["x"]), 0, width - 1)
    right = clamp(round(box["x"] + box["w"] - 1), 0, width - 1)
    top = clamp(round(box["y"]), 0, height - 1)
    bottom = clamp(round(box["y"] + box["h"] - 1), 0, height - 1)
    hits = 0
    total = 0
    for y in range(max(0, top - edge), min(height - 1, top + edge) + 1):
        for x in range(left, right + 1):
            total += 1
            hits += mask[y * width + x]
    for y in range(max(0, bottom - edge), min(height - 1, bottom + edge) + 1):
        for x in range(left, right + 1):
            total += 1
            hits += mask[y * width + x]
    for y in range(top, bottom + 1):
        for x in range(max(0, left - edge), min(width - 1, left + edge) + 1):
            total += 1
            hits += mask[y * width + x]
    for y in range(top, bottom + 1):
        for x in range(max(0, right - edge), min(width - 1, right + edge) + 1):
            total += 1
            hits += mask[y * width + x]
    return hits / total if total else 0.0


def ink_ratio(mask: list[int], width: int, box: dict) -> float:
    area = box_area(box)
    if not area:
        return 0.0
    total = 0
    for y in range(box["y"], box["y"] + box["h"]):
        row = y * width
        for x in range(box["x"], box["x"] + box["w"]):
            total += mask[row + x]
    return total / area


def overlap_length(a1: int, a2: int, b1: int, b2: int) -> int:
    return max(0, min(a2, b2) - max(a1, b1))


def quantile(values: list[int], q: float) -> float:
    if not values:
        return 0
    sorted_values = sorted(values)
    pos = (len(sorted_values) - 1) * q
    base = int(pos)
    rest = pos - base
    if base + 1 < len(sorted_values):
        return sorted_values[base] + rest * (sorted_values[base + 1] - sorted_values[base])
    return sorted_values[base]


def find_horizontal_segments(mask: list[int], width: int, height: int) -> list[dict]:
    min_run = max(32, round(width * 0.075))
    max_gap = max(3, round(width * 0.006))
    segments: list[dict] = []
    for y in range(height):
        start = -1
        last_ink = -1
        gap = 0
        row = y * width
        for x in range(width):
            if mask[row + x]:
                if start < 0:
                    start = x
                last_ink = x
                gap = 0
            elif start >= 0:
                gap += 1
                if gap > max_gap:
                    if last_ink - start + 1 >= min_run:
                        segments.append({"x1": start, "x2": last_ink, "y1": y, "y2": y, "cx": (start + last_ink) / 2, "cy": y})
                    start = -1
                    last_ink = -1
                    gap = 0
        if start >= 0 and last_ink - start + 1 >= min_run:
            segments.append({"x1": start, "x2": last_ink, "y1": y, "y2": y, "cx": (start + last_ink) / 2, "cy": y})
    segments.sort(key=lambda s: s["x2"] - s["x1"], reverse=True)
    return segments[:700]


def find_vertical_segments(mask: list[int], width: int, height: int) -> list[dict]:
    min_run = max(32, round(height * 0.055))
    max_gap = max(3, round(height * 0.006))
    segments: list[dict] = []
    for x in range(width):
        start = -1
        last_ink = -1
        gap = 0
        for y in range(height):
            if mask[y * width + x]:
                if start < 0:
                    start = y
                last_ink = y
                gap = 0
            elif start >= 0:
                gap += 1
                if gap > max_gap:
                    if last_ink - start + 1 >= min_run:
                        segments.append({"x1": x, "x2": x, "y1": start, "y2": last_ink, "cx": x, "cy": (start + last_ink) / 2})
                    start = -1
                    last_ink = -1
                    gap = 0
        if start >= 0 and last_ink - start + 1 >= min_run:
            segments.append({"x1": x, "x2": x, "y1": start, "y2": last_ink, "cx": x, "cy": (start + last_ink) / 2})
    segments.sort(key=lambda s: s["y2"] - s["y1"], reverse=True)
    return segments[:700]


def separator_balance(region: dict, axis: str, pos: int) -> float:
    before = pos - region["x"] if axis == "x" else pos - region["y"]
    after = region["x"] + region["w"] - pos if axis == "x" else region["y"] + region["h"] - pos
    return min(before, after) / max(before, after) if before > 0 and after > 0 else 0


def add_projection_candidates(mask: list[int], width: int, height: int, region: dict, candidates: list[dict]) -> None:
    for axis in ("x", "y"):
        size = region["w"] if axis == "x" else region["h"]
        cross = region["h"] if axis == "x" else region["w"]
        start = region["x"] if axis == "x" else region["y"]
        edge = max(5, round(size * 0.035))
        scans = [{"pos": pos, "count": line_count(mask, width, region, axis, pos)} for pos in range(start + edge, start + size - edge)]
        if not scans:
            continue
        peak = quantile([s["count"] for s in scans], 0.94)
        min_hits = max(round(cross * 0.18), round(peak * 0.70), 12)
        max_thickness = max(4, round(size * 0.035))
        current = None
        for scan in scans:
            strong = scan["count"] >= min_hits
            if strong and current is None:
                current = {"start": scan["pos"], "end": scan["pos"], "best": scan["count"], "best_pos": scan["pos"], "gap": 0}
            elif strong:
                current["end"] = scan["pos"]
                current["gap"] = 0
                if scan["count"] > current["best"]:
                    current["best"] = scan["count"]
                    current["best_pos"] = scan["pos"]
            elif current is not None:
                current["gap"] += 1
                if current["gap"] > 2:
                    thickness = current["end"] - current["start"] + 1
                    balance = separator_balance(region, axis, current["best_pos"])
                    if thickness <= max_thickness and balance >= 0.14:
                        candidates.append({"axis": axis, "pos": current["best_pos"], "score": (current["best"] / max(1, cross)) * 135 + balance * 45})
                    current = None
        if current is not None:
            thickness = current["end"] - current["start"] + 1
            balance = separator_balance(region, axis, current["best_pos"])
            if thickness <= max_thickness and balance >= 0.14:
                candidates.append({"axis": axis, "pos": current["best_pos"], "score": (current["best"] / max(1, cross)) * 135 + balance * 45})


def split_frame_separators(mask: list[int], horizontals: list[dict], verticals: list[dict], width: int, height: int, region: dict, boxes: list[dict], depth: int = 0, use_projection: bool = False) -> None:
    if depth > 8 or len(boxes) >= 24 or region["w"] < width * 0.10 or region["h"] < height * 0.07:
        boxes.append({**region, "area": box_area(region), "source": "frame-separator"})
        return
    min_child_w = max(24, round(width * 0.055))
    min_child_h = max(24, round(height * 0.045))
    edge_pad = max(6, round(min(region["w"], region["h"]) * 0.035))
    candidates = []
    for line in horizontals:
        y = round(line["cy"])
        if y <= region["y"] + max(edge_pad, min_child_h) or y >= region["y"] + region["h"] - max(edge_pad, min_child_h):
            continue
        overlap = overlap_length(line["x1"], line["x2"], region["x"], region["x"] + region["w"])
        coverage = overlap / max(1, region["w"])
        balance = separator_balance(region, "y", y)
        if coverage >= 0.50 and balance >= 0.14:
            candidates.append({"axis": "y", "pos": y, "score": coverage * 100 + (overlap / max(1, width)) * 30 + balance * 35})
    for line in verticals:
        x = round(line["cx"])
        if x <= region["x"] + max(edge_pad, min_child_w) or x >= region["x"] + region["w"] - max(edge_pad, min_child_w):
            continue
        overlap = overlap_length(line["y1"], line["y2"], region["y"], region["y"] + region["h"])
        coverage = overlap / max(1, region["h"])
        balance = separator_balance(region, "x", x)
        if coverage >= 0.50 and balance >= 0.14:
            candidates.append({"axis": "x", "pos": x, "score": coverage * 100 + (overlap / max(1, height)) * 30 + balance * 35})
    if use_projection:
        add_projection_candidates(mask, width, height, region, candidates)
    if not candidates:
        boxes.append({**region, "area": box_area(region), "source": "frame-separator"})
        return
    candidates.sort(key=lambda c: c["score"], reverse=True)
    split = candidates[0]
    gap = max(2, round(min(width, height) * 0.004))
    if split["axis"] == "x":
        before = {"x": region["x"], "y": region["y"], "w": split["pos"] - gap - region["x"], "h": region["h"]}
        after = {"x": split["pos"] + gap, "y": region["y"], "w": region["x"] + region["w"] - split["pos"] - gap, "h": region["h"]}
    else:
        before = {"x": region["x"], "y": region["y"], "w": region["w"], "h": split["pos"] - gap - region["y"]}
        after = {"x": region["x"], "y": split["pos"] + gap, "w": region["w"], "h": region["y"] + region["h"] - split["pos"] - gap}
    if box_area(before) < width * height * 0.012 or box_area(after) < width * height * 0.012:
        boxes.append({**region, "area": box_area(region), "source": "frame-separator"})
        return
    split_frame_separators(mask, horizontals, verticals, width, height, before, boxes, depth + 1, use_projection)
    split_frame_separators(mask, horizontals, verticals, width, height, after, boxes, depth + 1, use_projection)


def filter_separator_boxes(boxes: list[dict], frame: list[int], width: int, height: int, region: dict) -> list[dict]:
    page_area = width * height
    boxes = [
        b for b in boxes
        if page_area * 0.012 <= box_area(b) <= page_area * 0.88
        and b["w"] >= width * 0.12
        and b["h"] >= height * 0.045
        and not (b["w"] < width * 0.18 and b["h"] > height * 0.60)
        and not (b["w"] < width * 0.16 and b["h"] < height * 0.55)
        and not (b["h"] < height * 0.07 and b["w"] < width * 0.75)
    ]
    boxes = dedupe(boxes)
    boxes = [b for b in boxes if not (box_area(b) < page_area * 0.05 and ink_ratio(frame, width, b) < 0.012)]
    coverage = sum(box_area(b) for b in boxes) / max(1, box_area(region))
    large_panels = sum(1 for b in boxes if box_area(b) >= page_area * 0.08)
    small_panels = sum(1 for b in boxes if box_area(b) < page_area * 0.04)
    return boxes if len(boxes) >= 2 and coverage >= 0.18 and large_panels >= 2 and not (len(boxes) > 6 and small_panels > 1) else []


def detect_separator_boxes(frame: list[int], width: int, height: int, region: dict) -> list[dict]:
    horizontals = find_horizontal_segments(frame, width, height)
    verticals = find_vertical_segments(frame, width, height)
    boxes: list[dict] = []
    split_frame_separators(frame, horizontals, verticals, width, height, region, boxes, use_projection=False)
    structural = filter_separator_boxes(boxes, frame, width, height, region)
    if len(structural) >= 2:
        return structural
    boxes = []
    split_frame_separators(frame, horizontals, verticals, width, height, region, boxes, use_projection=True)
    return filter_separator_boxes(boxes, frame, width, height, region)


def detect_panels(image: Image.Image) -> list[dict]:
    max_side = 1100
    scale = min(1.0, max_side / max(image.width, image.height))
    resized = image.resize((round(image.width * scale), round(image.height * scale)))
    width, height = resized.size
    ink, white, frame = build_masks(resized)
    content = find_content_box(ink, width, height)
    margin = max(2, round(min(width, height) * 0.006))
    region = {
        "x": clamp(content["x"] + margin, 0, width - 1),
        "y": clamp(content["y"] + margin, 0, height - 1),
        "w": max(1, content["w"] - margin * 2),
        "h": max(1, content["h"] - margin * 2),
    }
    boxes: list[dict] = []
    separator_boxes = detect_separator_boxes(frame, width, height, region)
    if separator_boxes:
        boxes = separator_boxes
    else:
        split_white_gutters(white, width, height, region, boxes)
        split_low_ink_gutters(frame, width, height, region, boxes)
    page_area = width * height
    boxes = [
        b for b in boxes
        if page_area * 0.012 <= box_area(b) <= page_area * 0.88
        and b["w"] >= width * 0.055
        and b["h"] >= height * 0.045
        and not (b.get("source") == "frame-separator" and b["w"] < width * 0.12)
        and not (b.get("source") == "frame-separator" and b["w"] < width * 0.18 and b["h"] > height * 0.60)
        and not (b.get("source") == "gutter-split" and b["w"] < width * 0.16 and b["h"] < height * 0.55)
        and not (b.get("source") == "gutter-split" and b["h"] < height * 0.07 and b["w"] < width * 0.75)
        and not (edge_ink_ratio(frame, width, height, b, 3) < 0.045 and box_area(b) < page_area * 0.12)
    ]
    boxes = dedupe(boxes)
    coverage = sum(box_area(b) for b in boxes) / max(1, box_area(content))
    if len(boxes) < 2 or coverage < 0.18:
        boxes = [content]
    boxes.sort(key=lambda b: (round(b["y"] / max(1, b["h"] * 0.42)), b["x"]))
    scale_back = 1 / scale
    return [
        {
            "index": i + 1,
            "x": round(b["x"] * scale_back),
            "y": round(b["y"] * scale_back),
            "w": round(b["w"] * scale_back),
            "h": round(b["h"] * scale_back),
            "source": b.get("source", "gutter-split"),
        }
        for i, b in enumerate(boxes[:24])
    ]


def draw_overlay(path: Path, panels: list[dict]) -> None:
    image = Image.open(path).convert("RGB")
    draw = ImageDraw.Draw(image)
    colors = [(255, 0, 0), (0, 180, 255), (0, 190, 80), (255, 140, 0), (180, 0, 255)]
    for i, box in enumerate(panels):
        color = colors[i % len(colors)]
        x1, y1 = box["x"], box["y"]
        x2, y2 = x1 + box["w"], y1 + box["h"]
        for off in range(5):
            draw.rectangle([x1 + off, y1 + off, x2 - off, y2 - off], outline=color)
        draw.text((x1 + 8, y1 + 8), str(i + 1), fill=color)
    out = OUT / f"{path.stem}_overlay.jpg"
    image.save(out, quality=92)


def main() -> None:
    summary = []
    for path in sorted(SRC.glob("*")):
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}:
            continue
        image = Image.open(path)
        panels = detect_panels(image)
        draw_overlay(path, panels)
        summary.append({"file": path.name, "size": [image.width, image.height], "panel_count": len(panels), "panels": panels})
    (OUT / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
