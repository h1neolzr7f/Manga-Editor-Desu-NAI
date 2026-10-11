"""Prompt-helper example images, downloaded on first use instead of shipping ~167 MB in the repository.

json_js/prompt-helper-images.json lists every file with SHA-256 and size, grouped in packs. A pack with a
source URL (upstream Manga Editor Desu at a pinned commit) can be downloaded after the user clicks; every file
is verified before it is kept. Files land in user_data/prompt-helper/<same relative path> and 99_server.py
serves them at the original /03_images/imgPromptHelper/... URLs, so the prompt-helper data needs no change.
Images already present in the source tree (developer checkouts) are used as they are.
"""
import hashlib
import io
import zipfile
import json
import os
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
MANIFEST = os.path.join(ROOT, "json_js", "prompt-helper-images.json")


class PromptHelperError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def manifest():
    with open(MANIFEST, encoding="utf-8") as f:
        return json.load(f)


def store_dir():
    return os.path.join(ROOT, "user_data", "prompt-helper")


def _safe_rel(rel):
    parts = rel.replace("\\", "/").split("/")
    if not rel or rel.startswith("/") or any(p in ("", ".", "..") for p in parts):
        raise PromptHelperError("示例图清单里有不安全的路径。", 500)
    return "/".join(parts)


def local_path(rel, m=None):
    """Where an image is available locally (source tree first, then the download store), or None."""
    m = m or manifest()
    rel = _safe_rel(rel)
    for base in (ROOT, store_dir()):
        p = os.path.join(base, *(m["root"] + rel).split("/"))
        if os.path.isfile(p):
            return p
    return None


def status():
    m = manifest()
    packs = []
    for pid, pack in m["packs"].items():
        have = sum(1 for rel in pack["files"] if local_path(rel, m))
        packs.append({"id": pid, "label": pack.get("label", pid), "files": len(pack["files"]), "have": have,
                      "bytes": (pack.get("archive") or {}).get("size") or sum(v[1] for v in pack["files"].values()),
                      "downloadable": bool(pack.get("source") or pack.get("archive")),
                      "license": pack.get("license", "")})
    return {"ok": True, "packs": packs}


def download(pack_id, opener=urllib.request.urlopen):
    """Fetch the missing files of one pack, verifying SHA-256; returns the new status."""
    m = manifest()
    pack = m["packs"].get(pack_id)
    if not pack:
        raise PromptHelperError("没有这个示例图包。", 404)
    if pack.get("archive"):
        return _download_archive(m, pack, opener)
    source = pack.get("source")
    if not source:
        raise PromptHelperError("「%s」目前没有公开下载地址，暂时不能下载；提示词助手的文字功能不受影响。" % pack.get("label", pack_id), 409)
    from manga_model_guard import progress_start, progress_add, progress_end
    todo = [(rel, v) for rel, v in sorted(pack["files"].items()) if not local_path(rel, m)]
    name = "提示词示例图（%s）" % pack.get("label", pack_id)
    progress_start(name, sum(v[1] for _, v in todo))
    failed = []
    try:
        for i, (rel, (sha, size)) in enumerate(todo):
            rel = _safe_rel(rel)
            url = source + urllib.parse.quote(m["root"] + rel)
            try:
                with opener(url, timeout=60) as r:
                    data = r.read(size + 1)
            except Exception as error:
                if i == 0:
                    raise PromptHelperError("下载示例图失败：可能没有联网，或 GitHub 暂时无法访问。联网后再点一次「下载示例图」。（%s）" % error, 502)
                failed.append(rel)
                continue
            if len(data) != size or hashlib.sha256(data).hexdigest() != sha:
                failed.append(rel)
                continue
            target = os.path.join(store_dir(), *(m["root"] + rel).split("/"))
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target + ".part", "wb") as f:
                f.write(data)
            os.replace(target + ".part", target)
            progress_add(name, size)
    finally:
        progress_end(name)
    result = status()
    result["failed"] = len(failed)
    if failed:
        result["warning"] = "有 %d 张示例图下载失败或校验不符，已跳过；可稍后再点一次下载补齐。" % len(failed)
    return result



def _write(m, rel, data):
    target = os.path.join(store_dir(), *(m["root"] + rel).split("/"))
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target + ".part", "wb") as f:
        f.write(data)
    os.replace(target + ".part", target)


def _download_archive(m, pack, opener):
    """One zip (release asset): verify the zip's SHA-256, then every member against the manifest."""
    from manga_model_guard import progress_start, progress_add, progress_end
    arc = pack["archive"]
    name = "提示词示例图（%s）" % pack.get("label", "")
    progress_start(name, arc["size"])
    buf = io.BytesIO()
    try:
        try:
            with opener(arc["url"], timeout=120) as r:
                while True:
                    chunk = r.read(1 << 20)
                    if not chunk:
                        break
                    buf.write(chunk)
                    progress_add(name, len(chunk))
                    if buf.tell() > arc["size"]:
                        break
        except Exception as error:
            raise PromptHelperError("下载示例图失败：可能没有联网，或 GitHub 暂时无法访问。联网后再点一次「下载示例图」。（%s）" % error, 502)
    finally:
        progress_end(name)
    data = buf.getvalue()
    if len(data) != arc["size"] or hashlib.sha256(data).hexdigest() != arc["sha256"]:
        raise PromptHelperError("示例图压缩包校验不符（可能下载不完整或被篡改），已丢弃。请重试。", 502)
    failed = 0
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        names = set(z.namelist())
        for rel, (sha, size) in pack["files"].items():
            rel = _safe_rel(rel)
            if local_path(rel, m):
                continue
            if rel not in names:
                failed += 1
                continue
            body = z.read(rel)
            if len(body) != size or hashlib.sha256(body).hexdigest() != sha:
                failed += 1
                continue
            _write(m, rel, body)
    result = status()
    result["failed"] = failed
    if failed:
        result["warning"] = "有 %d 张示例图校验不符，已跳过。" % failed
    return result
