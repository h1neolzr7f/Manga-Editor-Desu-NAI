/* Native <input type=file> shows the browser's own English "Choose Files / No file chosen" and ignores the theme.
 * Every visible file input gets a themed "选择图片…" button and a Chinese file-name line instead; the input itself
 * stays in the DOM (hidden), so change handlers and automation keep working. */
(function (root) {
  'use strict';
  function names(input) {
    const f = Array.from(input.files || []);
    if (!f.length) return '还没选择文件';
    return f.length === 1 ? f[0].name : '已选 ' + f.length + ' 个文件：' + f.map(x => x.name).join('、');
  }
  function enhance(input) {
    if (input.dataset.filePick || input.offsetParent === null) return;
    input.dataset.filePick = '1';
    const wrap = document.createElement('span'); wrap.className = 'ui-file-pick';
    if (input.id) wrap.id = input.id + 'PickRow';
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ui-btn ui-btn-ghost ui-file-pick-btn';
    btn.textContent = input.multiple ? '选择图片…（可多选）' : '选择图片…';
    if (input.id) btn.id = input.id + 'Pick';
    const label = document.createElement('span'); label.className = 'ui-file-pick-name ui-muted'; label.textContent = names(input);
    input.classList.add('ui-file-hidden');
    // outside a wrapping <label> (panel labels have fixed layouts; the next row would cover the button)
    const host = input.parentNode && input.parentNode.tagName === 'LABEL' ? input.parentNode : input;
    host.parentNode.insertBefore(wrap, host.nextSibling);
    wrap.appendChild(btn); wrap.appendChild(label);
    btn.addEventListener('click', () => input.click());
    input.addEventListener('change', () => { label.textContent = names(input); });
  }
  function scan() { document.querySelectorAll('input[type=file]:not([data-file-pick])').forEach(enhance); }
  root.FilePick = { scan, enhance, names };
  if (typeof document !== 'undefined') {
    const start = () => { scan(); new MutationObserver(() => scan()).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] }); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
