/**
 * Download clearly licensed free assets into assets/public/.
 * Sources: Kenney CC0 packs (official zips) + Heroicons MIT + Tabler MIT.
 * Does not copy MayerTalk / Arknights / Discord / WeChat brand art.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'assets', 'public');
const TMP = path.join(ROOT, 'user_data', 'cache', 'vendor-tmp');
const IMAGE_EXT = new Set(['.png', '.svg', '.webp', '.jpg', '.jpeg']);
const SKIP_DIR = /spritesheet|preview|__macosx|playstation|xbox|nintendo|steam|epic|discord|wechat|whatsapp|instagram|facebook|twitter|arknights|mayertalk|meta quest|valve index|playdate|oculus/i;
const SKIP_FILE = /spritesheet|preview|@2x|license|readme|\.import$/i;

const KENNEY_PAGES = [
  'https://kenney.nl/assets/ui-pack',
  'https://kenney.nl/assets/game-icons',
  'https://kenney.nl/assets/ui-pack-adventure',
  'https://kenney.nl/assets/input-prompts',
  'https://kenney.nl/assets/pattern-pack',
  'https://kenney.nl/assets/particle-pack',
  'https://kenney.nl/assets/pixel-ui-pack'
];

const TABLER_KEEP = /^(message|chat|phone|device-mobile|mood|heart|star|cloud|sun|moon|rain|snow|user|photo|send|microphone|video|battery|wifi|signal|bubble|sparkles|flame|bolt|wind|droplet|map-pin|home|bell|camera|sticker|alien|ghost|robot|cat|dog|fish|leaf|tree|mountain|building|door|window|mail|note|music|volume|player-play|player-pause|dots|plus|x|check|arrow-|chevron-|circle-dashed|quote|pencil|eraser|palette|brush|lasso|layers|frame|crop|shadow|brightness|contrast|droplet|umbrella|tornado|haze|fog|snowflake)/;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slug(value) {
  return String(value || 'asset').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
}

async function download(url, dest) {
  ensureDir(path.dirname(dest));
  const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'nai-comic-studio-asset-vendor' } });
  if (!res.ok) throw new Error('download failed ' + res.status + ' ' + url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

function extractZip(zipPath, dest) {
  ensureDir(dest);
  const result = spawnSync('tar', ['-xf', zipPath, '-C', dest], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error('tar extract failed: ' + (result.stderr || result.stdout || zipPath));
  }
}

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR.test(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function copyFiltered(srcRoot, destRoot) {
  const copied = [];
  for (const file of walk(srcRoot, [])) {
    const ext = path.extname(file).toLowerCase();
    if (!IMAGE_EXT.has(ext)) continue;
    const rel = path.relative(srcRoot, file);
    if (SKIP_FILE.test(rel) || SKIP_DIR.test(rel)) continue;
    const dest = path.join(destRoot, rel);
    ensureDir(path.dirname(dest));
    fs.copyFileSync(file, dest);
    copied.push(rel.replace(/\\/g, '/'));
  }
  return copied;
}

async function kenneyZipUrl(pageUrl) {
  const res = await fetch(pageUrl, { headers: { 'User-Agent': 'nai-comic-studio-asset-vendor' } });
  const html = await res.text();
  const match = html.match(/https:\/\/kenney\.nl\/media\/pages\/assets\/[^"' ]+\.zip/);
  if (!match) throw new Error('no zip on ' + pageUrl);
  return match[0];
}

function gitSparse(repo, dest, sparsePath) {
  if (fs.existsSync(path.join(dest, '.git'))) return;
  ensureDir(path.dirname(dest));
  execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', repo, dest], { stdio: 'inherit' });
  execFileSync('git', ['sparse-checkout', 'set', sparsePath], { cwd: dest, stdio: 'inherit' });
}

function chineseName(rel, pack) {
  const base = path.basename(rel, path.extname(rel)).replace(/[-_]+/g, ' ');
  return pack + ' / ' + base;
}

function tagsFor(rel, source) {
  const text = (source + ' ' + rel).toLowerCase();
  const tags = [source];
  if (/button|btn/.test(text)) tags.push('ui', 'button');
  if (/panel|window|frame/.test(text)) tags.push('ui', 'frame');
  if (/icon/.test(text)) tags.push('icon');
  if (/pattern|tile/.test(text)) tags.push('tone', 'paper');
  if (/particle|smoke|fire|explosion/.test(text)) tags.push('effect');
  if (/prompt|keyboard|mouse|touch/.test(text)) tags.push('ui', 'input');
  if (/pixel/.test(text)) tags.push('pixel');
  if (/message|chat|bubble/.test(text)) tags.push('chat', 'bubble');
  if (/phone|mobile/.test(text)) tags.push('phone', 'ui');
  if (/mood|heart|star|emotion/.test(text)) tags.push('emotion');
  if (/cloud|rain|snow|sun|moon|wind/.test(text)) tags.push('weather');
  if (/user|avatar/.test(text)) tags.push('avatar');
  if (tags.length === 1) tags.push('ui');
  return Array.from(new Set(tags));
}

function recordFor(rel, source, license) {
  const posix = rel.replace(/\\/g, '/');
  const id = 'asset_public_' + slug(source + '_' + posix);
  const ext = path.extname(posix).toLowerCase();
  return {
    id,
    name: chineseName(posix, source),
    type: 'image',
    path: 'assets/public/' + posix,
    relativePath: 'assets/public/' + posix,
    mime: ext === '.svg' ? 'image/svg+xml' : 'image/png',
    hash: 'public:' + source + ':' + posix,
    tags: tagsFor(posix, source),
    sourceType: 'public',
    sourceUrl: license.sourceUrl,
    creator: license.creator,
    license: {
      type: license.type,
      source: license.source,
      publicAllowed: true,
      notes: license.notes
    },
    thumbnail: 'assets/public/' + posix,
    private: false,
    missing: false
  };
}

async function vendorKenney() {
  const destRoot = path.join(PUBLIC, 'kenney');
  ensureDir(destRoot);
  fs.writeFileSync(path.join(destRoot, 'LICENSE.txt'),
    'Kenney.nl game assets, Creative Commons CC0 1.0.\nhttps://kenney.nl\nAttribution appreciated but not required.\n');
  for (const page of KENNEY_PAGES) {
    const zipUrl = await kenneyZipUrl(page);
    const pack = page.split('/').pop();
    const zipPath = path.join(TMP, pack + '.zip');
    const extractTo = path.join(TMP, pack);
    console.log('Kenney', pack, zipUrl);
    await download(zipUrl, zipPath);
    if (fs.existsSync(extractTo)) fs.rmSync(extractTo, { recursive: true, force: true });
    extractZip(zipPath, extractTo);
    const copied = copyFiltered(extractTo, path.join(destRoot, pack));
    console.log('  copied', copied.length, 'images');
  }
}

async function vendorHeroicons() {
  const dest = path.join(TMP, 'heroicons');
  gitSparse('https://github.com/tailwindlabs/heroicons.git', dest, 'optimized/24/outline');
  const src = path.join(dest, 'optimized', '24', 'outline');
  const out = path.join(PUBLIC, 'heroicons');
  const copied = copyFiltered(src, out);
  fs.copyFileSync(path.join(dest, 'LICENSE'), path.join(out, 'LICENSE'));
  console.log('Heroicons copied', copied.length);
}

async function vendorTabler() {
  const dest = path.join(TMP, 'tabler-icons');
  gitSparse('https://github.com/tabler/tabler-icons.git', dest, 'icons/outline');
  const src = path.join(dest, 'icons', 'outline');
  const out = path.join(PUBLIC, 'tabler');
  ensureDir(out);
  let copied = 0;
  if (!fs.existsSync(src)) {
    console.log('Tabler outline missing after sparse checkout');
    return;
  }
  for (const name of fs.readdirSync(src)) {
    if (!name.endsWith('.svg')) continue;
    const stem = name.slice(0, -4);
    if (!TABLER_KEEP.test(stem)) continue;
    fs.copyFileSync(path.join(src, name), path.join(out, name));
    copied += 1;
  }
  const licenseSrc = ['LICENSE', 'LICENSE.md'].map((file) => path.join(dest, file)).find((file) => fs.existsSync(file));
  if (licenseSrc) fs.copyFileSync(licenseSrc, path.join(out, 'LICENSE'));
  console.log('Tabler copied', copied);
}

async function vendorRevoy() {
  const out = path.join(PUBLIC, 'revoy');
  ensureDir(out);
  const urls = [
    'https://www.peppercarrot.com/0_sources/0ther/vector/hi-res/speechbubbles-template_by-David-Revoy.png'
  ];
  for (const url of urls) {
    try {
      const dest = path.join(out, path.basename(url));
      await download(url, dest);
      fs.writeFileSync(path.join(out, 'LICENSE.txt'),
        'Speech bubble template by David Revoy, www.peppercarrot.com\nCreative Commons Attribution 4.0 (CC BY 4.0)\nhttps://creativecommons.org/licenses/by/4.0/\n');
      console.log('Revoy copied', path.basename(url));
    } catch (error) {
      console.log('Revoy skip', error.message);
    }
  }
}

function buildManifest() {
  const assets = [];
  const packs = [
    { dir: 'kenney', source: 'kenney', type: 'cc0', creator: 'Kenney.nl', sourceUrl: 'https://kenney.nl', notes: 'CC0 1.0, attribution appreciated' },
    { dir: 'heroicons', source: 'heroicons', type: 'mit', creator: 'Tailwind Labs', sourceUrl: 'https://github.com/tailwindlabs/heroicons', notes: 'MIT License' },
    { dir: 'tabler', source: 'tabler', type: 'mit', creator: 'Tabler', sourceUrl: 'https://github.com/tabler/tabler-icons', notes: 'MIT License' },
    { dir: 'revoy', source: 'revoy', type: 'cc-by-4.0', creator: 'David Revoy', sourceUrl: 'https://www.peppercarrot.com', notes: 'CC BY 4.0, credit David Revoy' }
  ];
  for (const pack of packs) {
    const root = path.join(PUBLIC, pack.dir);
    if (!fs.existsSync(root)) continue;
    for (const file of walk(root, [])) {
      const ext = path.extname(file).toLowerCase();
      if (!IMAGE_EXT.has(ext)) continue;
      const rel = path.relative(PUBLIC, file).replace(/\\/g, '/');
      assets.push(recordFor(rel, pack.source, {
        type: pack.type,
        source: pack.sourceUrl,
        sourceUrl: pack.sourceUrl,
        creator: pack.creator,
        notes: pack.notes
      }));
    }
  }
  const manifest = {
    schemaVersion: 1,
    type: 'nai-comic-free-public-pack',
    createdAt: new Date().toISOString(),
    count: assets.length,
    assets
  };
  fs.writeFileSync(path.join(PUBLIC, 'free-pack-manifest.json'), JSON.stringify(manifest));
  console.log('manifest', assets.length, 'assets');
  return manifest;
}

async function main() {
  ensureDir(TMP);
  ensureDir(PUBLIC);
  if (process.argv.includes('--manifest-only')) {
    buildManifest();
    return;
  }
  await vendorKenney();
  await vendorHeroicons();
  await vendorTabler();
  await vendorRevoy();
  buildManifest();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
