const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '..', 'assets', 'original', 'site-ui');
fs.mkdirSync(outDir, { recursive: true });

function svg(w, h, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
${body}
</svg>
`;
}

const font = 'Microsoft YaHei, Noto Sans SC, sans-serif';

function rect(x, y, w, h, fill, extra) {
  const rest = extra || {};
  const rx = rest.rx != null ? ` rx="${rest.rx}" ry="${rest.rx}"` : '';
  const op = rest.opacity != null ? ` opacity="${rest.opacity}"` : '';
  const st = rest.stroke ? ` stroke="${rest.stroke}" stroke-width="${rest.sw || 1}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${rx}${op}${st}/>`;
}

function text(x, y, value, fill, size, extra) {
  const rest = extra || {};
  const weight = rest.bold ? ' font-weight="700"' : '';
  const anchor = rest.anchor ? ` text-anchor="${rest.anchor}"` : '';
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-family="${font}"${weight}${anchor}>${value}</text>`;
}

function line(x1, y1, x2, y2, stroke, sw, opacity) {
  const op = opacity != null ? ` opacity="${opacity}"` : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw || 1}"${op}/>`;
}

const T = {
  bg: '#141414',
  panel: '#1c1c1c',
  card: '#242424',
  accent: '#f97316',
  muted: '#9ca3af',
  faint: '#6b7280',
  line: '#2e2e2e',
  white: '#f8fafc'
};

const D = {
  bg: '#0b1220',
  panel: '#152033',
  card: '#1b2a40',
  cyan: '#22d3ee',
  rose: '#e11d48',
  muted: '#94a3b8',
  white: '#e2e8f0'
};

const B = {
  bg: '#f3eee4',
  header: '#3d4a32',
  accent: '#4d7c0f',
  card: '#fffdf8',
  line: '#d6d0c4',
  ink: '#2f2a24',
  muted: '#7a7368'
};

function fakeThumbs(count, x0, y0, tw, th, gapX, gapY, cols, fill, barFill) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = x0 + col * (tw + gapX);
    const y = y0 + row * (th + gapY);
    parts.push(rect(x, y, tw, th, fill, { rx: 6 }));
    parts.push(rect(x, y + th - 10, tw * (0.35 + (i % 5) * 0.1), 6, barFill, { rx: 2 }));
  }
  return parts.join('\n');
}

function commentRows(n, x, y, w, fill, bar) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const yy = y + i * 28;
    parts.push(`<circle cx="${x + 10}" cy="${yy + 10}" r="8" fill="${fill}"/>`);
    parts.push(rect(x + 24, yy + 4, w * (0.55 + (i % 4) * 0.08), 6, bar, { rx: 2 }));
    parts.push(rect(x + 24, yy + 14, w * (0.35 + (i % 3) * 0.1), 5, bar, { rx: 2, opacity: 0.55 }));
  }
  return parts.join('\n');
}

const files = {
  'tube-top-bar.svg': svg(420, 72, [
    rect(0, 0, 420, 72, T.bg),
    rect(12, 16, 40, 40, T.accent, { rx: 8 }),
    `<polygon points="26,26 26,46 44,36" fill="#111"/>`,
    rect(64, 20, 260, 32, T.card, { rx: 16 }),
    rect(80, 32, 140, 8, T.line, { rx: 4 }),
    rect(336, 20, 72, 32, T.panel, { rx: 16 }),
    text(372, 41, '登录', T.muted, 13, { anchor: 'middle' })
  ].join('\n')),

  'tube-player.svg': svg(480, 280, [
    rect(0, 0, 480, 280, T.bg, { rx: 10 }),
    rect(12, 12, 456, 228, '#0a0a0a', { rx: 8 }),
    `<polygon points="218,92 218,168 286,130" fill="${T.white}" opacity="0.88"/>`,
    rect(12, 248, 456, 8, T.line, { rx: 4 }),
    rect(12, 248, 186, 8, T.accent, { rx: 4 }),
    `<circle cx="198" cy="252" r="7" fill="${T.accent}"/>`,
    text(20, 272, '12:04 / 28:41', T.muted, 11)
  ].join('\n')),

  'tube-related.svg': svg(220, 360, (() => {
    const parts = [rect(0, 0, 220, 360, T.bg), text(12, 22, '相关', T.white, 14, { bold: true })];
    for (let i = 0; i < 5; i++) {
      const y = 36 + i * 64;
      parts.push(rect(12, y, 88, 52, T.card, { rx: 6 }));
      parts.push(rect(12, y + 46, 40 + i * 6, 6, T.accent, { rx: 2 }));
      parts.push(rect(110, y + 8, 96, 8, T.muted, { rx: 2, opacity: 0.7 }));
      parts.push(rect(110, y + 24, 72, 6, T.faint, { rx: 2, opacity: 0.55 }));
      parts.push(rect(110, y + 38, 48, 6, T.faint, { rx: 2, opacity: 0.35 }));
    }
    return parts.join('\n');
  })()),

  'tube-comments.svg': svg(360, 280, [
    rect(0, 0, 360, 280, T.bg),
    text(14, 24, '评论 128', T.white, 14, { bold: true }),
    rect(14, 36, 332, 36, T.panel, { rx: 8 }),
    rect(26, 50, 180, 8, T.line, { rx: 4 }),
    commentRows(7, 14, 84, 300, T.card, T.line)
  ].join('\n')),

  'tube-chips.svg': svg(420, 56, (() => {
    const labels = ['推荐', '新作', '热门', '系列', '短片'];
    const parts = [rect(0, 0, 420, 56, T.bg)];
    let x = 10;
    labels.forEach((label, i) => {
      const w = 68;
      parts.push(rect(x, 12, w, 32, i === 0 ? T.accent : T.panel, { rx: 16 }));
      parts.push(text(x + w / 2, 33, label, i === 0 ? '#111' : T.muted, 12, { anchor: 'middle', bold: i === 0 }));
      x += w + 10;
    });
    return parts.join('\n');
  })()),

  'tube-stats.svg': svg(420, 48, [
    rect(0, 0, 420, 48, T.bg),
    text(14, 30, '128 万次播放', T.white, 13, { bold: true }),
    text(150, 30, '赞 8.2k', T.accent, 13),
    text(230, 30, '收藏', T.muted, 13),
    text(290, 30, '分享', T.muted, 13),
    text(350, 30, '列表', T.muted, 13)
  ].join('\n')),

  'tube-thumb-card.svg': svg(220, 160, [
    rect(0, 0, 220, 160, T.bg, { rx: 10 }),
    rect(8, 8, 204, 108, T.card, { rx: 8 }),
    `<polygon points="98,46 98,78 126,62" fill="${T.white}" opacity="0.8"/>`,
    rect(154, 96, 50, 14, '#000', { rx: 4, opacity: 0.7 }),
    text(179, 107, '12:08', T.white, 9, { anchor: 'middle' }),
    rect(8, 126, 150, 8, T.muted, { rx: 2, opacity: 0.8 }),
    rect(8, 142, 96, 6, T.faint, { rx: 2, opacity: 0.55 })
  ].join('\n')),

  'tube-home-grid.svg': svg(420, 280, [
    rect(0, 0, 420, 280, T.bg),
    fakeThumbs(6, 12, 12, 124, 76, 12, 14, 3, T.card, T.accent),
    rect(12, 196, 90, 8, T.muted, { rx: 2, opacity: 0.7 }),
    rect(148, 196, 70, 8, T.muted, { rx: 2, opacity: 0.7 }),
    rect(284, 196, 80, 8, T.muted, { rx: 2, opacity: 0.7 }),
    rect(12, 230, 90, 8, T.muted, { rx: 2, opacity: 0.7 }),
    rect(148, 230, 70, 8, T.muted, { rx: 2, opacity: 0.7 }),
    rect(284, 230, 80, 8, T.muted, { rx: 2, opacity: 0.7 })
  ].join('\n')),

  'tube-hd-badge.svg': svg(72, 32, [
    rect(0, 0, 72, 32, T.accent, { rx: 6 }),
    text(36, 22, 'HD', '#111', 16, { anchor: 'middle', bold: true })
  ].join('\n')),

  'tube-controls.svg': svg(420, 52, [
    rect(0, 0, 420, 52, T.bg, { rx: 8 }),
    `<polygon points="18,16 18,36 36,26" fill="${T.white}"/>`,
    rect(50, 22, 220, 8, T.line, { rx: 4 }),
    rect(50, 22, 88, 8, T.accent, { rx: 4 }),
    `<circle cx="138" cy="26" r="6" fill="${T.accent}"/>`,
    rect(288, 18, 18, 16, T.muted, { rx: 2, opacity: 0.7 }),
    rect(314, 18, 22, 16, T.muted, { rx: 3, opacity: 0.55 }),
    rect(348, 18, 56, 16, T.panel, { rx: 4 }),
    text(376, 30, '1x', T.muted, 10, { anchor: 'middle' })
  ].join('\n')),

  'danmaku-player.svg': svg(480, 280, (() => {
    const parts = [
      rect(0, 0, 480, 280, D.bg, { rx: 12 }),
      rect(10, 10, 460, 230, '#081018', { rx: 8 }),
      `<polygon points="218,92 218,168 286,130" fill="${D.cyan}" opacity="0.85"/>`
    ];
    const comments = [
      [24, 42, '好喜欢这一段', D.white],
      [160, 68, '前方高能', D.rose],
      [40, 98, '字幕组辛苦了', D.cyan],
      [220, 120, '再来亿遍', D.white],
      [80, 152, '这个构图绝了', D.cyan],
      [250, 178, '收藏了', D.rose]
    ];
    comments.forEach(([x, y, label, fill]) => {
      parts.push(text(x, y, label, fill, 13));
    });
    parts.push(rect(10, 248, 460, 8, D.card, { rx: 4 }));
    parts.push(rect(10, 248, 160, 8, D.cyan, { rx: 4 }));
    return parts.join('\n');
  })()),

  'danmaku-input.svg': svg(420, 52, [
    rect(0, 0, 420, 52, D.bg, { rx: 10 }),
    rect(10, 10, 300, 32, D.panel, { rx: 16 }),
    text(24, 32, '发一条弹幕…', D.muted, 12),
    rect(320, 10, 90, 32, D.rose, { rx: 16 }),
    text(365, 32, '发送', D.white, 13, { anchor: 'middle', bold: true })
  ].join('\n')),

  'danmaku-stats.svg': svg(420, 56, [
    rect(0, 0, 420, 56, D.bg),
    text(16, 34, '播放 86.2万', D.white, 13, { bold: true }),
    text(140, 34, '投币 1.2万', D.cyan, 13),
    text(250, 34, '收藏 3.8万', D.rose, 13),
    text(360, 34, '分享', D.muted, 13)
  ].join('\n')),

  'danmaku-cards.svg': svg(420, 160, (() => {
    const parts = [rect(0, 0, 420, 160, D.bg), text(12, 22, '接下来播放', D.white, 13, { bold: true })];
    for (let i = 0; i < 3; i++) {
      const x = 12 + i * 136;
      parts.push(rect(x, 34, 124, 72, D.card, { rx: 8 }));
      parts.push(rect(x, 92, 50 + i * 10, 8, D.cyan, { rx: 2 }));
      parts.push(rect(x, 116, 100, 8, D.muted, { rx: 2, opacity: 0.7 }));
      parts.push(rect(x, 132, 72, 6, D.muted, { rx: 2, opacity: 0.4 }));
    }
    return parts.join('\n');
  })()),

  'danmaku-nav.svg': svg(420, 48, (() => {
    const labels = ['推荐', '动画', '音乐', '游戏', '知识'];
    const parts = [rect(0, 0, 420, 48, D.bg)];
    labels.forEach((label, i) => {
      const x = 16 + i * 80;
      parts.push(text(x, 30, label, i === 1 ? D.cyan : D.muted, 13, { bold: i === 1 }));
      if (i === 1) parts.push(rect(x - 4, 38, 28, 3, D.rose, { rx: 2 }));
    });
    return parts.join('\n');
  })()),

  'danmaku-follow.svg': svg(140, 40, [
    rect(0, 0, 140, 40, D.rose, { rx: 20 }),
    text(70, 26, '+ 关注', D.white, 14, { anchor: 'middle', bold: true })
  ].join('\n')),

  'danmaku-chapters.svg': svg(420, 44, (() => {
    const parts = [
      rect(0, 0, 420, 44, D.bg, { rx: 8 }),
      rect(12, 18, 396, 8, D.card, { rx: 4 })
    ];
    [0.08, 0.27, 0.46, 0.71, 0.88].forEach((p, i) => {
      const x = 12 + 396 * p;
      parts.push(`<circle cx="${x}" cy="22" r="5" fill="${i === 2 ? D.rose : D.cyan}"/>`);
    });
    parts.push(text(12, 12, '章节', D.muted, 10));
    return parts.join('\n');
  })()),

  'danmaku-submit-badge.svg': svg(72, 28, [
    rect(0, 0, 72, 28, D.cyan, { rx: 6 }),
    text(36, 19, '投稿', '#082f3a', 13, { anchor: 'middle', bold: true })
  ].join('\n')),

  'danmaku-cover.svg': svg(220, 150, [
    rect(0, 0, 220, 150, D.bg, { rx: 12 }),
    rect(8, 8, 204, 96, D.card, { rx: 8 }),
    `<circle cx="110" cy="56" r="18" fill="${D.rose}" opacity="0.9"/>`,
    `<polygon points="104,46 104,66 122,56" fill="${D.white}"/>`,
    rect(8, 114, 140, 8, D.white, { rx: 2, opacity: 0.85 }),
    rect(8, 130, 88, 6, D.muted, { rx: 2, opacity: 0.55 })
  ].join('\n')),

  'board-header.svg': svg(420, 64, [
    rect(0, 0, 420, 64, B.header),
    rect(14, 16, 32, 32, B.accent, { rx: 6 }),
    rect(20, 22, 8, 8, B.card, { rx: 1 }),
    rect(32, 22, 8, 8, B.card, { rx: 1 }),
    rect(20, 34, 8, 8, B.card, { rx: 1 }),
    rect(32, 34, 8, 8, B.card, { rx: 1 }),
    text(58, 38, '图区', B.card, 18, { bold: true }),
    rect(250, 16, 156, 32, '#2f3828', { rx: 16 }),
    rect(266, 28, 90, 8, '#6b7a5c', { rx: 4 })
  ].join('\n')),

  'board-grid.svg': svg(420, 280, (() => {
    const parts = [rect(0, 0, 420, 280, B.bg)];
    for (let i = 0; i < 8; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 12 + col * 102;
      const y = 12 + row * 132;
      parts.push(rect(x, y, 92, 92, B.card, { rx: 6, stroke: B.line, sw: 1 }));
      parts.push(rect(x + 10, y + 14, 72, 48, '#e7dfd0', { rx: 4 }));
      parts.push(rect(x + 8, y + 100, 76, 7, B.muted, { rx: 2, opacity: 0.7 }));
    }
    return parts.join('\n');
  })()),

  'board-card.svg': svg(180, 220, [
    rect(0, 0, 180, 220, B.card, { rx: 10, stroke: B.line, sw: 1 }),
    rect(10, 10, 160, 130, '#e7dfd0', { rx: 8 }),
    rect(10, 150, 120, 10, B.ink, { rx: 2, opacity: 0.75 }),
    rect(10, 168, 88, 8, B.muted, { rx: 2, opacity: 0.6 }),
    text(10, 202, '12 图 · 48 评', B.accent, 12, { bold: true })
  ].join('\n')),

  'board-thread.svg': svg(360, 240, (() => {
    const parts = [
      rect(0, 0, 360, 240, B.bg),
      rect(10, 10, 340, 64, B.card, { rx: 8, stroke: B.line, sw: 1 }),
      text(22, 34, '楼主', B.accent, 12, { bold: true }),
      rect(22, 46, 220, 8, B.ink, { rx: 2, opacity: 0.55 })
    ];
    for (let i = 0; i < 3; i++) {
      const y = 86 + i * 48;
      parts.push(rect(10, y, 340, 40, B.card, { rx: 8, stroke: B.line, sw: 1 }));
      parts.push(text(22, y + 18, (i + 2) + ' 楼', B.muted, 11));
      parts.push(rect(58, y + 16, 180 + i * 20, 8, B.ink, { rx: 2, opacity: 0.45 }));
    }
    return parts.join('\n');
  })()),

  'board-tags.svg': svg(360, 56, (() => {
    const labels = ['最新', '热门', '精华', '长图', '系列'];
    const parts = [rect(0, 0, 360, 56, B.bg)];
    let x = 10;
    labels.forEach((label, i) => {
      const w = 60;
      parts.push(rect(x, 12, w, 32, i === 0 ? B.accent : B.card, { rx: 6, stroke: B.line, sw: 1 }));
      parts.push(text(x + w / 2, 33, label, i === 0 ? B.card : B.ink, 12, { anchor: 'middle' }));
      x += w + 8;
    });
    return parts.join('\n');
  })()),

  'board-pager.svg': svg(320, 40, (() => {
    const parts = [rect(0, 0, 320, 40, B.bg)];
    ['‹', '1', '2', '3', '…', '12', '›'].forEach((label, i) => {
      const x = 12 + i * 42;
      const active = i === 2;
      parts.push(rect(x, 6, 32, 28, active ? B.accent : B.card, { rx: 6, stroke: B.line, sw: 1 }));
      parts.push(text(x + 16, 25, label, active ? B.card : B.ink, 13, { anchor: 'middle', bold: active }));
    });
    return parts.join('\n');
  })()),

  'board-filters.svg': svg(420, 44, [
    rect(0, 0, 420, 44, B.bg),
    text(12, 28, '排序', B.muted, 12),
    rect(48, 8, 88, 28, B.card, { rx: 6, stroke: B.line, sw: 1 }),
    text(92, 27, '最新回复', B.ink, 12, { anchor: 'middle' }),
    rect(148, 8, 88, 28, B.card, { rx: 6, stroke: B.line, sw: 1 }),
    text(192, 27, '今日', B.ink, 12, { anchor: 'middle' }),
    rect(248, 8, 88, 28, B.accent, { rx: 6 }),
    text(292, 27, '发帖', B.card, 12, { anchor: 'middle', bold: true })
  ].join('\n')),

  'board-reply.svg': svg(360, 120, [
    rect(0, 0, 360, 120, B.card, { rx: 10, stroke: B.line, sw: 1 }),
    text(14, 24, '回帖', B.ink, 13, { bold: true }),
    rect(14, 36, 332, 44, B.bg, { rx: 6, stroke: B.line, sw: 1 }),
    rect(14, 48, 160, 8, B.muted, { rx: 2, opacity: 0.45 }),
    rect(248, 88, 98, 24, B.accent, { rx: 6 }),
    text(297, 104, '发表', B.card, 12, { anchor: 'middle', bold: true })
  ].join('\n')),

  'board-banner.svg': svg(420, 48, [
    rect(0, 0, 420, 48, '#efe6d2', { rx: 8, stroke: B.accent, sw: 1.5 }),
    text(16, 30, '公告：本页为漫画用通用图区布局，不含真实站点标识。', B.ink, 12)
  ].join('\n'))
};

Object.entries(files).forEach(([name, content]) => {
  fs.writeFileSync(path.join(outDir, name), content);
});

console.log('wrote', Object.keys(files).length, 'site-ui svgs to', outDir);
