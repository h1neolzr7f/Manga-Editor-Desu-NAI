const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '..', 'assets', 'original', 'starter');
fs.mkdirSync(outDir, { recursive: true });

function svg(w, h, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none">
${body}
</svg>
`;
}

const files = {
  'speed-lines.svg': svg(256, 256, (() => {
    const lines = [];
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const inner = 42 + (i % 3) * 8;
      const outer = 124;
      lines.push(`<line x1="${128 + Math.cos(a) * inner}" y1="${128 + Math.sin(a) * inner}" x2="${128 + Math.cos(a) * outer}" y2="${128 + Math.sin(a) * outer}" stroke="#111" stroke-width="${0.7 + (i % 4) * 0.35}" stroke-linecap="round"/>`);
    }
    return lines.join('\n');
  })()),

  'focus-lines.svg': svg(256, 256, (() => {
    const lines = [];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2 + (i % 2) * 0.02;
      const inner = 18;
      const outer = 126;
      lines.push(`<line x1="${128 + Math.cos(a) * inner}" y1="${128 + Math.sin(a) * inner}" x2="${128 + Math.cos(a) * outer}" y2="${128 + Math.sin(a) * outer}" stroke="#111" stroke-width="${i % 5 === 0 ? 1.4 : 0.45}" opacity="${0.45 + (i % 3) * 0.18}"/>`);
    }
    return lines.join('\n');
  })()),

  'motion-whoosh.svg': svg(320, 160, (() => {
    const lines = [];
    for (let i = 0; i < 14; i++) {
      const y = 18 + i * 9.5;
      const x0 = 12 + (i % 3) * 18;
      lines.push(`<path d="M${x0} ${y} C ${90 + i} ${y - 4}, ${180} ${y + 3}, ${308} ${y}" stroke="#111" stroke-width="${1.2 + (i % 3) * 0.4}" opacity="${0.35 + (i % 4) * 0.15}"/>`);
    }
    return lines.join('\n');
  })()),

  'sparkle.svg': svg(128, 128, `
<g fill="#111" transform="translate(64 64)">
  <polygon points="0,-38 6,-6 38,0 6,6 0,38 -6,6 -38,0 -6,-6"/>
  <polygon points="0,-16 3,-3 16,0 3,3 0,16 -3,3 -16,0 -3,-3" fill="#fff" opacity="0.35"/>
</g>`),

  'sparkle-burst.svg': svg(160, 160, (() => {
    const stars = ['<g fill="#111">'];
    const pts = [[80, 80, 1], [28, 36, 0.45], [132, 30, 0.38], [24, 118, 0.4], [138, 124, 0.5], [80, 22, 0.32], [80, 140, 0.28]];
    pts.forEach(([x, y, s]) => {
      stars.push(`<g transform="translate(${x} ${y}) scale(${s})"><polygon points="0,-22 4,-4 22,0 4,4 0,22 -4,4 -22,0 -4,-4"/></g>`);
    });
    stars.push('</g>');
    return stars.join('\n');
  })()),

  'rain-streaks.svg': svg(220, 280, (() => {
    const lines = [];
    for (let i = 0; i < 28; i++) {
      const x = 10 + (i * 47) % 200;
      const y = 8 + (i * 31) % 220;
      lines.push(`<line x1="${x}" y1="${y}" x2="${x + 10}" y2="${y + 48}" stroke="#4b6280" stroke-width="1.4" opacity="${0.35 + (i % 4) * 0.12}" stroke-linecap="round"/>`);
    }
    return lines.join('\n');
  })()),

  'snow-dots.svg': svg(220, 280, (() => {
    const dots = [];
    for (let i = 0; i < 40; i++) {
      const x = 12 + (i * 53) % 196;
      const y = 14 + (i * 37) % 252;
      const r = 1.4 + (i % 5) * 0.7;
      dots.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#9aa7b8" opacity="${0.45 + (i % 3) * 0.18}"/>`);
    }
    return dots.join('\n');
  })()),

  'shock-burst.svg': svg(220, 220, `
<polygon fill="#111" points="110,8 124,78 208,46 150,110 212,168 124,148 110,212 96,148 8,168 70,110 12,46 96,78"/>
<polygon fill="#fff" points="110,54 118,98 162,86 128,114 160,150 118,136 110,176 102,136 60,150 92,114 58,86 102,98"/>`),

  'sun-rays.svg': svg(256, 256, (() => {
    const rays = ['<circle cx="128" cy="128" r="22" fill="#111"/>'];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const inner = 34;
      const outer = i % 2 ? 118 : 96;
      rays.push(`<line x1="${128 + Math.cos(a) * inner}" y1="${128 + Math.sin(a) * inner}" x2="${128 + Math.cos(a) * outer}" y2="${128 + Math.sin(a) * outer}" stroke="#111" stroke-width="${i % 2 ? 6 : 3.2}" stroke-linecap="round"/>`);
    }
    return rays.join('\n');
  })()),

  'vignette-frame.svg': svg(256, 320, `
<rect x="8" y="8" width="240" height="304" rx="4" stroke="#111" stroke-width="10" fill="none"/>
<rect x="22" y="22" width="212" height="276" stroke="#111" stroke-width="1.2" fill="none" opacity="0.45"/>`),

  'sweat-drop.svg': svg(80, 120, `
<path fill="#4b9ad8" d="M40 8 C58 40, 68 62, 68 78 C68 98, 55 112, 40 112 C25 112, 12 98, 12 78 C12 62, 22 40, 40 8Z"/>
<ellipse cx="30" cy="72" rx="8" ry="12" fill="#fff" opacity="0.45"/>`),

  'anger-vein.svg': svg(120, 90, `
<path d="M18 58 L42 34 L34 34 L58 12 L50 12 L78 8 M42 58 L66 34 L58 34 L82 12" stroke="#c81e1e" stroke-width="7" fill="none" stroke-linecap="square" stroke-linejoin="miter"/>`),

  'heart.svg': svg(120, 110, `
<path fill="#c81e1e" d="M60 96 C20 68, 8 42, 28 24 C42 12, 56 20, 60 34 C64 20, 78 12, 92 24 C112 42, 100 68, 60 96Z"/>`),

  'flower.svg': svg(120, 120, `
<g transform="translate(60 60)" fill="#e8a0b8">
  <circle cx="0" cy="-22" r="16"/><circle cx="19" cy="-8" r="16"/><circle cx="12" cy="16" r="16"/><circle cx="-12" cy="16" r="16"/><circle cx="-19" cy="-8" r="16"/>
  <circle cx="0" cy="0" r="10" fill="#f3d36b"/>
</g>`),

  'music-note.svg': svg(90, 130, `
<path fill="#111" d="M58 18 L58 88 C58 102, 46 112, 34 112 C22 112, 12 102, 12 90 C12 78, 22 70, 34 70 C42 70, 50 74, 54 80 L54 28 L78 22 L78 18Z"/>`),

  'question-mark.svg': svg(80, 140, `
<path fill="#111" d="M18 38 C18 18, 34 8, 50 8 C66 8, 78 20, 78 36 C78 52, 66 60, 54 68 C48 72, 44 78, 44 88 L28 88 C28 70, 34 64, 44 58 C54 52, 60 48, 60 36 C60 28, 54 22, 46 22 C38 22, 34 28, 34 36Z"/>
<circle cx="36" cy="118" r="10" fill="#111"/>`),

  'exclamation.svg': svg(60, 140, `
<rect x="22" y="8" width="16" height="88" rx="8" fill="#111"/>
<circle cx="30" cy="122" r="10" fill="#111"/>`),

  'spiral-dizzy.svg': svg(140, 140, `
<path d="M70 70 m0 -8 a8 8 0 1 1 0.1 0 m0 0 a16 16 0 1 0 -0.2 0 m0 0 a26 26 0 1 1 0.3 0 m0 0 a38 38 0 1 0 -0.4 0 m0 0 a52 52 0 1 1 0.5 0" stroke="#111" stroke-width="5" fill="none" stroke-linecap="round"/>`),

  'tear.svg': svg(70, 110, `
<path fill="#5aa0d6" d="M35 6 C52 36, 62 56, 62 74 C62 92, 50 104, 35 104 C20 104, 8 92, 8 74 C8 56, 18 36, 35 6Z"/>`),

  'blush-lines.svg': svg(160, 70, `
<g stroke="#e07a8a" stroke-width="6" stroke-linecap="round">
  <line x1="18" y1="18" x2="8" y2="52"/><line x1="40" y1="18" x2="30" y2="52"/><line x1="62" y1="18" x2="52" y2="52"/>
  <line x1="98" y1="18" x2="108" y2="52"/><line x1="120" y1="18" x2="130" y2="52"/><line x1="142" y1="18" x2="152" y2="52"/>
</g>`),

  'nameplate-dark.svg': svg(280, 72, `
<rect x="4" y="8" width="272" height="56" rx="6" fill="#111"/>
<rect x="10" y="14" width="260" height="44" rx="3" stroke="#e8d48a" stroke-width="1.4" fill="none"/>`),

  'nameplate-gold.svg': svg(280, 72, `
<rect x="4" y="8" width="272" height="56" rx="8" fill="#1f2937"/>
<rect x="4" y="8" width="272" height="56" rx="8" stroke="#d4af37" stroke-width="3" fill="none"/>
<rect x="14" y="18" width="252" height="36" rx="2" stroke="#d4af37" stroke-width="1" fill="none" opacity="0.7"/>`),

  'speech-tail-left.svg': svg(80, 70, `
<polygon fill="#fff" stroke="#111" stroke-width="4" points="8,8 72,8 72,42 28,42 12,64 22,42 8,42"/>`),

  'thought-cloud.svg': svg(200, 140, `
<g fill="#fff" stroke="#111" stroke-width="4">
  <ellipse cx="108" cy="58" rx="78" ry="42"/>
  <circle cx="48" cy="70" r="28"/><circle cx="168" cy="66" r="24"/><circle cx="92" cy="38" r="30"/>
</g>
<circle cx="36" cy="112" r="10" fill="#fff" stroke="#111" stroke-width="3"/>
<circle cx="18" cy="128" r="6" fill="#fff" stroke="#111" stroke-width="3"/>`),

  'frame-corner.svg': svg(220, 220, `
<g fill="none" stroke="#111" stroke-width="8" stroke-linecap="square">
  <path d="M28 88 L28 28 L88 28"/><path d="M192 88 L192 28 L132 28"/>
  <path d="M28 132 L28 192 L88 192"/><path d="M192 132 L192 192 L132 192"/>
</g>`),

  'frame-double.svg': svg(240, 300, `
<rect x="10" y="10" width="220" height="280" stroke="#111" stroke-width="8" fill="none"/>
<rect x="22" y="22" width="196" height="256" stroke="#111" stroke-width="2" fill="none"/>`),

  'panel-jagged.svg': svg(240, 180, `
<polygon fill="#fff" stroke="#111" stroke-width="5" points="12,40 48,8 110,22 170,6 228,36 220,92 232,150 168,172 96,158 28,174 8,110"/>`),

  'caption-bar.svg': svg(320, 64, `
<rect x="0" y="8" width="320" height="48" fill="#111"/>
<rect x="12" y="20" width="48" height="8" fill="#fff" opacity="0.85"/>
<rect x="12" y="36" width="96" height="6" fill="#fff" opacity="0.45"/>`),

  'person-bust.svg': svg(160, 200, `
<circle cx="80" cy="58" r="36" fill="#1f2937"/>
<path fill="#1f2937" d="M28 196 C28 136, 48 112, 80 112 C112 112, 132 136, 132 196Z"/>`),

  'person-full.svg': svg(140, 280, `
<circle cx="70" cy="36" r="24" fill="#1f2937"/>
<rect x="48" y="62" width="44" height="86" rx="12" fill="#1f2937"/>
<rect x="36" y="148" width="18" height="92" rx="8" fill="#1f2937"/>
<rect x="86" y="148" width="18" height="92" rx="8" fill="#1f2937"/>
<rect x="22" y="72" width="18" height="70" rx="8" fill="#1f2937"/>
<rect x="100" y="72" width="18" height="70" rx="8" fill="#1f2937"/>`),

  'person-side.svg': svg(140, 240, `
<circle cx="78" cy="40" r="22" fill="#1f2937"/>
<path fill="#1f2937" d="M58 62 C90 62, 102 78, 98 150 L78 150 L70 230 L52 230 L58 150 C40 142, 38 90, 58 62Z"/>`),

  'two-people.svg': svg(220, 220, `
<circle cx="78" cy="50" r="26" fill="#1f2937"/>
<path fill="#1f2937" d="M36 196 C36 128, 52 108, 78 108 C104 108, 120 128, 120 196Z"/>
<circle cx="148" cy="58" r="22" fill="#334155"/>
<path fill="#334155" d="M114 196 C114 140, 128 122, 148 122 C168 122, 182 140, 182 196Z"/>`),

  'person-chibi.svg': svg(140, 180, `
<circle cx="70" cy="52" r="40" fill="#1f2937"/>
<rect x="48" y="96" width="44" height="50" rx="16" fill="#1f2937"/>
<rect x="44" y="146" width="16" height="26" rx="7" fill="#1f2937"/>
<rect x="80" y="146" width="16" height="26" rx="7" fill="#1f2937"/>`),

  'cat-sit.svg': svg(160, 140, `
<ellipse cx="86" cy="92" rx="46" ry="30" fill="#1f2937"/>
<circle cx="58" cy="52" r="26" fill="#1f2937"/>
<polygon points="38,40 42,12 58,38" fill="#1f2937"/>
<polygon points="62,36 78,10 84,40" fill="#1f2937"/>
<path d="M128 88 C150 70, 154 40, 140 28" stroke="#1f2937" stroke-width="8" fill="none" stroke-linecap="round"/>`),

  'bird.svg': svg(160, 120, `
<ellipse cx="78" cy="64" rx="36" ry="22" fill="#1f2937"/>
<circle cx="112" cy="54" r="16" fill="#1f2937"/>
<polygon points="126,54 150,60 126,66" fill="#d97706"/>
<path d="M78 64 C48 40, 28 38, 18 52" stroke="#1f2937" stroke-width="8" fill="none"/>
<line x1="70" y1="84" x2="62" y2="108" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/>
<line x1="84" y1="84" x2="90" y2="108" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/>`),

  'city-skyline.svg': svg(320, 160, `
<rect x="0" y="0" width="320" height="160" fill="#e8eef4"/>
<g fill="#1f2937">
  <rect x="8" y="70" width="36" height="90"/><rect x="50" y="40" width="28" height="120"/>
  <rect x="86" y="86" width="44" height="74"/><rect x="138" y="28" width="32" height="132"/>
  <rect x="178" y="60" width="40" height="100"/><rect x="226" y="18" width="24" height="142"/>
  <rect x="258" y="76" width="54" height="84"/>
</g>
<g fill="#94a3b8" opacity="0.55">
  <rect x="16" y="82" width="6" height="8"/><rect x="28" y="82" width="6" height="8"/>
  <rect x="58" y="52" width="6" height="8"/><rect x="70" y="52" width="6" height="8"/>
  <rect x="148" y="42" width="6" height="8"/><rect x="148" y="58" width="6" height="8"/>
</g>`),

  'window-rect.svg': svg(180, 220, `
<rect x="16" y="16" width="148" height="188" fill="#dbeafe" stroke="#1f2937" stroke-width="10"/>
<line x1="90" y1="16" x2="90" y2="204" stroke="#1f2937" stroke-width="8"/>
<line x1="16" y1="110" x2="164" y2="110" stroke="#1f2937" stroke-width="8"/>`),

  'door.svg': svg(140, 240, `
<rect x="18" y="12" width="104" height="216" rx="4" fill="#7c4a2a" stroke="#1f2937" stroke-width="8"/>
<circle cx="100" cy="128" r="8" fill="#d4af37"/>`),

  'moon.svg': svg(140, 140, `
<path fill="#e2e8f0" stroke="#1f2937" stroke-width="4" d="M92 22 C48 28, 22 70, 36 108 C70 132, 118 118, 124 74 C96 92, 70 70, 92 22Z"/>`),

  'leaf.svg': svg(140, 160, `
<path fill="#3f7d4e" d="M70 8 C118 40, 132 90, 70 152 C8 90, 22 40, 70 8Z"/>
<line x1="70" y1="20" x2="70" y2="148" stroke="#1f2937" stroke-width="3"/>`),

  'tree-simple.svg': svg(160, 220, `
<rect x="70" y="140" width="20" height="70" fill="#6b3f24"/>
<circle cx="80" cy="92" r="62" fill="#3f7d4e"/>
<circle cx="48" cy="110" r="36" fill="#4d8f5c"/>
<circle cx="112" cy="108" r="34" fill="#4d8f5c"/>`),

  'stamp-circle.svg': svg(140, 140, `
<circle cx="70" cy="70" r="58" fill="none" stroke="#b91c1c" stroke-width="8" stroke-dasharray="10 6"/>
<circle cx="70" cy="70" r="42" fill="none" stroke="#b91c1c" stroke-width="3"/>`),

  'arrow-impact.svg': svg(200, 80, `
<polygon fill="#111" points="8,40 132,18 132,32 192,40 132,48 132,62"/>`),

  'cross-hatch.svg': svg(160, 160, (() => {
    const lines = [];
    for (let i = -160; i < 160; i += 10) {
      lines.push(`<line x1="${i}" y1="0" x2="${i + 160}" y2="160" stroke="#111" stroke-width="1" opacity="0.45"/>`);
      lines.push(`<line x1="${i + 160}" y1="0" x2="${i}" y2="160" stroke="#111" stroke-width="1" opacity="0.28"/>`);
    }
    return `<clipPath id="hatchClip"><rect width="160" height="160"/></clipPath><g clip-path="url(#hatchClip)">${lines.join('')}</g>`;
  })()),

  'screen-dots.svg': svg(160, 160, (() => {
    const dots = [];
    for (let y = 8; y < 160; y += 10) {
      for (let x = 8; x < 160; x += 10) {
        dots.push(`<circle cx="${x + ((y / 10) % 2) * 4}" cy="${y}" r="1.6" fill="#111" opacity="0.55"/>`);
      }
    }
    return dots.join('\n');
  })()),

  'wind-lines.svg': svg(280, 140, (() => {
    const lines = [];
    for (let i = 0; i < 9; i++) {
      const y = 16 + i * 13;
      lines.push(`<path d="M12 ${y} C 80 ${y - 8}, 160 ${y + 8}, 268 ${y}" stroke="#64748b" stroke-width="${1.4 + (i % 3) * 0.5}" fill="none" opacity="${0.4 + (i % 3) * 0.15}"/>`);
    }
    return lines.join('\n');
  })()),

  'ink-splash.svg': svg(180, 160, `
<circle cx="78" cy="82" r="28" fill="#111"/>
<circle cx="118" cy="58" r="10" fill="#111"/>
<circle cx="44" cy="50" r="8" fill="#111"/>
<circle cx="132" cy="102" r="7" fill="#111"/>
<circle cx="36" cy="108" r="6" fill="#111"/>
<circle cx="96" cy="34" r="5" fill="#111"/>
<circle cx="150" cy="78" r="4" fill="#111"/>
<path d="M78 54 C90 20, 70 8, 62 22" stroke="#111" stroke-width="6" fill="none"/>`),

  'star-burst.svg': svg(180, 180, `
<polygon fill="#111" points="90,8 104,68 166,68 116,104 134,166 90,128 46,166 64,104 14,68 76,68"/>`),

  'crescent.svg': svg(140, 140, `
<path fill="#111" d="M92 18 A58 58 0 1 0 92 122 A42 42 0 1 1 92 18Z"/>`)
};

let count = 0;
for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, name), content, 'utf8');
  count += 1;
}

const readme = `# Original starter decorations

Geometric manga decorations drawn for this pack. No third-party character,
logo, or trademark art. Safe to ship with the public project.

Reload the editor and open 素材库, or click 恢复入门包.
`;
fs.writeFileSync(path.join(outDir, 'README.md'), readme, 'utf8');
console.log('wrote ' + count + ' svg files to ' + outDir);
