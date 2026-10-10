import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const materialPath = path.join(rootDir, "json_js", "00_novelai_materials.js");
const outputRoot = path.join(rootDir, "03_images", "imgPromptHelper", "novelai");
const comicOutputRoot = process.env.NAI_COMIC_OUTPUT_ROOT
  ? path.resolve(process.env.NAI_COMIC_OUTPUT_ROOT)
  : path.join(rootDir, "outputs", "nai-comic-demo");
const requestedComicStory = process.env.NAI_COMIC_STORY || "";
const NAI_MAX_PIXELS = Number(process.env.NAI_MAX_PIXELS || 1024 * 1024);
const NAI_MAX_EDGE = Number(process.env.NAI_MAX_EDGE || 1536);
const NAI_MIN_EDGE = Number(process.env.NAI_MIN_EDGE || 512);

const DEFAULT_NEGATIVE = [
  "lowres",
  "bad anatomy",
  "bad hands",
  "bad fingers",
  "extra digits",
  "missing fingers",
  "deformed arms",
  "bad arms",
  "bad skin",
  "discolored skin",
  "asymmetrical arms",
  "malformed body",
  "text",
  "watermark",
  "signature",
  "logo",
  "blurry",
  "cropped face",
  "duplicate"
].join(", ");

const DEFAULT_QUALITY = "masterpiece, best quality, amazing quality, very aesthetic, highres, ultra-detailed, intricate details, professional manga illustration, pixiv award winning, trending on pixiv, beautiful detailed eyes, perfect anatomy, cinematic lighting, soft volumetric light, elegant sensual atmosphere, clean lineart, anime coloring, high resolution, sharp focus";
const PREVIEW_MODEL_IDENTITY = [
  "same character model",
  "1girl",
  "young adult",
  "silver white hair",
  "long hair",
  "blue eyes",
  "slim build",
  "calm expression",
  "small black hair ribbon",
  "white blouse",
  "navy pleated skirt"
].join(", ");
const PREVIEW_STYLE_LOCK = [
  "single clear reference thumbnail",
  "simple neutral gray background",
  "centered composition",
  "anime style",
  "clean readable silhouette",
  "no text"
].join(", ");

function slugify(value) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[:/\\?*"<>|]+/g, " ")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "tag";
}

function stableSeed(value) {
  const text = value.toString();
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

function round64(value) {
  return Math.max(64, Math.round(Number(value) / 64) * 64);
}

function clampNovelAiSize(width, height) {
  width = Number(width) || 1024;
  height = Number(height) || 1024;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    width = 1024;
    height = 1024;
  }
  let aspect = width / height;
  if (!Number.isFinite(aspect) || aspect <= 0) aspect = 1;
  let safeHeight = Math.sqrt(NAI_MAX_PIXELS / aspect);
  let safeWidth = safeHeight * aspect;
  if (safeWidth > NAI_MAX_EDGE) {
    safeWidth = NAI_MAX_EDGE;
    safeHeight = safeWidth / aspect;
  }
  if (safeHeight > NAI_MAX_EDGE) {
    safeHeight = NAI_MAX_EDGE;
    safeWidth = safeHeight * aspect;
  }
  safeWidth = Math.max(64, Math.min(NAI_MAX_EDGE, round64(safeWidth)));
  safeHeight = Math.max(64, Math.min(NAI_MAX_EDGE, round64(safeHeight)));
  while (safeWidth * safeHeight > NAI_MAX_PIXELS) {
    if (safeWidth / Math.max(1, safeHeight) > aspect && safeWidth > 64) {
      safeWidth -= 64;
    } else if (safeHeight > 64) {
      safeHeight -= 64;
    } else {
      break;
    }
  }
  if (safeWidth < NAI_MIN_EDGE && safeHeight < NAI_MAX_EDGE) {
    const raisedWidth = NAI_MIN_EDGE;
    const raisedHeight = round64(raisedWidth / aspect);
    if (raisedWidth * raisedHeight <= NAI_MAX_PIXELS && raisedHeight <= NAI_MAX_EDGE) {
      safeWidth = raisedWidth;
      safeHeight = Math.max(64, raisedHeight);
    }
  }
  if (safeHeight < NAI_MIN_EDGE && safeWidth < NAI_MAX_EDGE) {
    const raisedHeight = NAI_MIN_EDGE;
    const raisedWidth = round64(raisedHeight * aspect);
    if (raisedWidth * raisedHeight <= NAI_MAX_PIXELS && raisedWidth <= NAI_MAX_EDGE) {
      safeHeight = raisedHeight;
      safeWidth = Math.max(64, raisedWidth);
    }
  }
  return { width: safeWidth, height: safeHeight };
}

function textOf(value) {
  return (value || "").toString();
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

async function loadMaterials() {
  const source = await fs.readFile(materialPath, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(`${source}\nwindow.__materials = novelai_materials;`, context, { filename: materialPath });
  return { source, data: context.window.__materials };
}

function walkMaterialTags(data, parents = [], result = []) {
  for (const [key, value] of Object.entries(data || {})) {
    if (key === "en" || key === "hr" || key.startsWith("horizontalLine")) continue;
    if (!isPlainObject(value)) continue;
    if (Object.prototype.hasOwnProperty.call(value, "url")) {
      result.push({
        tag: key,
        item: value,
        alias: value.alias || key,
        url: value.url || null,
        parents
      });
      continue;
    }
    walkMaterialTags(value, parents.concat(key), result);
  }
  return result;
}

function buildPreviewPrompt(entry) {
  const category = entry.parents.join(", ");
  const isScene = category.includes("Camera") || category.includes("Light") || category.includes("Background") || category.includes("Art Style") || category.includes("Set Style");
  const sceneSupport = isScene ? "same character model visible, full body or upper body, tag demonstration" : "";
  return [
    DEFAULT_QUALITY,
    PREVIEW_MODEL_IDENTITY,
    PREVIEW_STYLE_LOCK,
    sceneSupport,
    entry.tag,
    `visual focus on ${entry.tag}`,
    "prompt adherence test image"
  ].filter(Boolean).join(", ");
}

function buildRequest({ prompt, negativePrompt, width = 512, height = 512, seed = -1, steps = 18, scale = 5, model }) {
  const actualSeed = seed > 0 ? seed : Math.floor(Math.random() * 4294967295);
  const safeSize = clampNovelAiSize(width, height);
  const parameters = {
    params_version: 3,
    width: safeSize.width,
    height: safeSize.height,
    scale,
    sampler: "k_euler_ancestral",
    steps,
    n_samples: 1,
    ucPreset: 2,
    qualityToggle: true,
    sm: false,
    sm_dyn: false,
    autoSmea: false,
    dynamic_thresholding: false,
    controlnet_strength: 1,
    legacy: false,
    add_original_image: false,
    cfg_rescale: 0,
    uncond_scale: 1,
    noise_schedule: model.startsWith("nai-diffusion-4") ? "karras" : "native",
    seed: actualSeed,
    negative_prompt: negativePrompt,
    legacy_uc: false,
    legacy_v3_extend: false,
    skip_cfg_above_sigma: null,
    use_coords: false,
    normalize_reference_strength_multiple: true,
    characterPrompts: [],
    reference_image_multiple: [],
    reference_information_extracted_multiple: [],
    reference_strength_multiple: [],
    deliberate_euler_ancestral_bug: false,
    prefer_brownian: true
  };

  if (model.startsWith("nai-diffusion-4")) {
    parameters.v4_prompt = {
      caption: { base_caption: prompt, char_captions: [] },
      use_coords: false,
      use_order: true
    };
    parameters.v4_negative_prompt = {
      caption: { base_caption: negativePrompt, char_captions: [] },
      legacy_uc: false
    };
  }

  return {
    input: prompt,
    model,
    action: "generate",
    parameters
  };
}

async function responseToImageBuffer(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await response.json();
    const image = json.image || (json.images && json.images[0]);
    if (!image) throw new Error("NovelAI returned JSON without image data");
    return Buffer.from(image, "base64");
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (contentType.includes("image/")) return bytes;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return extractFirstImageFromZip(bytes);
  }
  throw new Error(`Unsupported NovelAI response content-type: ${contentType}`);
}

function extractFirstImageFromZip(bytes) {
  const eocdOffset = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocdOffset === -1) throw new Error("Invalid zip: missing central directory");
  const centralDirSize = bytes.readUInt32LE(eocdOffset + 12);
  const centralDirOffset = bytes.readUInt32LE(eocdOffset + 16);
  let offset = centralDirOffset;
  const end = centralDirOffset + centralDirSize;
  while (offset + 46 <= end && offset + 46 <= bytes.length) {
    if (bytes.readUInt32LE(offset) !== 0x02014b50) break;
    const compression = bytes.readUInt16LE(offset + 10);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const fileNameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localHeaderOffset = bytes.readUInt32LE(offset + 42);
    const fileName = bytes.slice(offset + 46, offset + 46 + fileNameLength).toString("utf8");
    if (/\.(png|jpe?g|webp)$/i.test(fileName)) {
      if (bytes.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
        throw new Error("Invalid zip: bad local file header");
      }
      const localNameLength = bytes.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = bytes.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const dataEnd = dataStart + compressedSize;
      const payload = bytes.slice(dataStart, dataEnd);
      if (compression === 0) return payload;
      if (compression === 8) return zlib.inflateRawSync(payload);
      throw new Error(`Unsupported zip compression method: ${compression}`);
    }
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  throw new Error("NovelAI zip did not contain an image");
}

async function generateImage({ token, prompt, negativePrompt, outputPath, width, height, seed, steps, scale, model, endpoint }) {
  const payload = buildRequest({ prompt, negativePrompt, width, height, seed, steps, scale, model });
  console.log(`NovelAI request size: ${payload.parameters.width}x${payload.parameters.height}, samples=1`);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: /^Bearer\s+/i.test(token) ? token : `Bearer ${token}`,
      Accept: "application/zip, application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NovelAI failed ${response.status}: ${text.slice(0, 500)}`);
  }
  const image = await responseToImageBuffer(response);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, image);
  return { seed: payload.parameters.seed, outputPath };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateImageWithRetry(options, retries = Number(process.env.NAI_RETRIES || 8)) {
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await generateImage(options);
    } catch (error) {
      lastError = error;
      const message = (error && error.message) || String(error);
      if (attempt >= retries) break;
      const delay = Math.min(60000, 3500 * attempt);
      console.log(`Retry ${attempt}/${retries - 1} after error: ${message.slice(0, 180)}`);
      await sleep(delay);
    }
  }
  throw lastError;
}

async function materialUrlExists(url) {
  if (!url) return false;
  try {
    const filePath = path.join(rootDir, url.replace(/\//g, path.sep));
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

function assignMaterialUrls(data, missingEntries) {
  for (const entry of missingEntries) {
    entry.item.url = entry.generatedUrl;
  }
}

function writeMaterials(data) {
  const body = JSON.stringify(data, null, 2)
    .replace(/"([^"]+)":/g, (match, key) => (/^[A-Za-z0-9 _@.,:+\-()/'!?]+$/.test(key) ? `"${key}":` : match));
  return fs.writeFile(materialPath, `var novelai_materials = ${body};\n`, "utf8");
}

async function findMissingMaterialPreviews(limit = Infinity) {
  const loaded = await loadMaterials();
  const tags = walkMaterialTags(loaded.data);
  const missing = [];
  for (const entry of tags) {
    if (!(await materialUrlExists(entry.url))) {
      const category = slugify(entry.parents.join("-") || "general");
      const filename = `${slugify(entry.alias || entry.tag)}.png`;
      const relUrl = `03_images/imgPromptHelper/novelai/${category}/${filename}`;
      entry.generatedUrl = relUrl;
      entry.outputPath = path.join(rootDir, relUrl.replace(/\//g, path.sep));
      missing.push(entry);
      if (missing.length >= limit) break;
    }
  }
  return { data: loaded.data, tags, missing };
}

async function getSavedLocalSettings() {
  const candidates = [
    path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "User Data", "Default", "Local Storage", "leveldb"),
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "Edge Dev", "User Data", "Default", "Local Storage", "leveldb"),
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "Edge", "User Data", "Default", "Local Storage", "leveldb")
  ];
  for (const dir of candidates) {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (!/\.(log|ldb)$/i.test(file)) continue;
        const buffer = await fs.readFile(path.join(dir, file));
        const text = buffer.toString("utf8");
        const index = text.indexOf("localSettingsData");
        if (index === -1) continue;
        const slice = text.slice(index, index + 12000);
        const jsonStart = slice.indexOf("{");
        const jsonEnd = slice.lastIndexOf("}");
        if (jsonStart === -1 || jsonEnd === -1) continue;
        try {
          const raw = slice.slice(jsonStart, jsonEnd + 1).replace(/\u0000/g, "");
          return JSON.parse(raw);
        } catch {
          // LevelDB values often include binary framing; keep searching.
        }
      }
    } catch {
      // Browser profile may not exist or may be locked.
    }
  }
  return null;
}

async function resolveNovelAiToken() {
  await loadDotEnv();
  if (process.env.NOVELAI_API_KEY) return process.env.NOVELAI_API_KEY.trim();
  if (process.env.NAI_API_KEY) return process.env.NAI_API_KEY.trim();
  const localSettings = await getSavedLocalSettings();
  if (localSettings && localSettings.novelaiApiKey) return localSettings.novelaiApiKey.trim();
  return "";
}

async function loadDotEnv() {
  const envPath = path.join(rootDir, ".env");
  try {
    const text = await fs.readFile(envPath, "utf8");
    text.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index === -1) return;
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = value;
    });
  } catch {
    // .env is optional.
  }
}

async function generateMaterialPreviews({ limit = Infinity, dryRun = false, steps, scale } = {}) {
  const token = await resolveNovelAiToken();
  const { data, missing } = await findMissingMaterialPreviews(limit);
  console.log(`Missing material previews: ${missing.length}`);
  if (dryRun || missing.length === 0) return { missing };
  if (!token) throw new Error("Missing NovelAI token. Set NOVELAI_API_KEY/NAI_API_KEY or save it in the app settings first.");

  const endpoint = "http://127.0.0.1:8000/nai-proxy/generate-image";
  const model = process.env.NOVELAI_MODEL || "nai-diffusion-4-5-full";
  let index = 0;
  for (const entry of missing) {
    index += 1;
    if (await materialUrlExists(entry.generatedUrl)) {
      console.log(`[${index}/${missing.length}] exists ${entry.generatedUrl}`);
      continue;
    }
    const prompt = buildPreviewPrompt(entry);
    console.log(`[${index}/${missing.length}] ${entry.alias} -> ${entry.generatedUrl}`);
    await generateImageWithRetry({
      token,
      endpoint,
      model,
      prompt,
      negativePrompt: DEFAULT_NEGATIVE,
      outputPath: entry.outputPath,
      width: 512,
      height: 512,
      steps: Number(steps || process.env.NAI_PREVIEW_STEPS || 28),
      scale: Number(scale || process.env.NAI_PREVIEW_SCALE || 7),
      seed: stableSeed(`${entry.parents.join("/")}:${entry.tag}`)
    });
    entry.item.url = entry.generatedUrl;
    await writeMaterials(data);
  }
  assignMaterialUrls(data, missing);
  await writeMaterials(data);
  return { missing };
}

const DEFAULT_COMIC_PAGES = [
  {
    file: "page-01.png",
    prompt: "manga page, full page comic layout, 4 panels, rain at night, neon city street, a young adult shrine maiden with white kimono and red hakama notices a blue paper talisman floating in wet reflections, cinematic lighting, thick black panel borders, dramatic atmosphere, clean lineart, anime coloring"
  },
  {
    file: "page-02.png",
    prompt: "manga page, 5 panels, close-up eyes, hand reaching for glowing talisman, sudden wind, umbrellas in background, dutch angle, speed lines, rain streaks, ominous atmosphere, high contrast, readable panel flow, thick black borders, clean manga page"
  },
  {
    file: "page-03.png",
    prompt: "manga page, 4 panels, shrine maiden runs through neon alley, torii gate appears between buildings, magic circle reflected on wet pavement, dynamic pose, low-angle view, rim light, cinematic rain, manga screentone accents, clean panel layout"
  },
  {
    file: "page-04.png",
    prompt: "manga page, 5 panels, confrontation under a streetlight, mysterious silhouette made of ink and rain, shrine maiden raises ofuda talisman, dramatic lighting, diagonal composition, impact lines, expressive face close-up, thick black manga borders"
  },
  {
    file: "page-05.png",
    prompt: "manga page, 4 panels, dawn after rain, neon lights fading, shrine maiden seals the talisman into a small shrine box, quiet atmosphere, warm sunlight through clouds, final wide shot of empty wet street, emotional ending, polished anime manga page"
  }
];

// Named story presets for NAI_COMIC_STORY. The two fan-fiction presets that only a
// personal .bat selected were removed; unknown names fall back to the default pages.
const COMIC_STORY_PRESETS = {};

function getComicPreset() {
  const key = requestedComicStory.trim().toLowerCase();
  if (key && COMIC_STORY_PRESETS[key]) return COMIC_STORY_PRESETS[key];
  return {
    outputDir: "",
    title: "Default NovelAI manga demo",
    seriesPrompt: "consistent character design, young adult, readable manga composition, no speech text",
    pages: DEFAULT_COMIC_PAGES
  };
}

async function generateComicDemo() {
  const token = await resolveNovelAiToken();
  if (!token) throw new Error("Missing NovelAI token. Set NOVELAI_API_KEY/NAI_API_KEY or save it in the app settings first.");
  const endpoint = "http://127.0.0.1:8000/nai-proxy/generate-image";
  const model = process.env.NOVELAI_MODEL || "nai-diffusion-4-5-full";
  const preset = getComicPreset();
  const targetRoot = preset.outputDir ? path.join(comicOutputRoot, preset.outputDir) : comicOutputRoot;
  await fs.mkdir(targetRoot, { recursive: true });
  const manifest = [];
  for (let i = 0; i < preset.pages.length; i += 1) {
    const page = preset.pages[i];
    const outputPath = path.join(targetRoot, page.file);
    if (await materialUrlExists(path.relative(rootDir, outputPath).replace(/\\/g, "/"))) {
      console.log(`[comic ${i + 1}/${preset.pages.length}] exists ${page.file}`);
      manifest.push({ ...page, path: outputPath });
      continue;
    }
    const prompt = [
      DEFAULT_QUALITY,
      preset.seriesPrompt,
      page.prompt,
      "strong storyboard, complete story beat, dynamic composition, manga page layout"
    ].join(", ");
    console.log(`[comic ${i + 1}/${preset.pages.length}] generating ${page.file}`);
    // 灵活尺寸：原预设每页可不同，模拟日漫不同页构图需求 + NAI clamp
    const pageSizes = [
      {w:1024, h:1024}, // page1 establishing square
      {w:1024, h:1152}, // page2 vertical kiss
      {w:1024, h:1024}, // page3
      {w:960, h:1280},  // page4 tall aftermath
      {w:1280, h:960}   // page5 wide resolution (flexible!)
    ];
    const ps = pageSizes[i] || {w:1024,h:1024};
    const generated = await generateImageWithRetry({
      token,
      endpoint,
      model,
      prompt,
      negativePrompt: DEFAULT_NEGATIVE,
      outputPath,
      width: Number(process.env.NAI_COMIC_WIDTH || ps.w),
      height: Number(process.env.NAI_COMIC_HEIGHT || ps.h),
      steps: Number(process.env.NAI_COMIC_STEPS || 28),
      scale: Number(process.env.NAI_COMIC_SCALE || 5),
      seed: 17024001 + i
    });
    manifest.push({ ...page, path: outputPath, seed: generated.seed });
  }
  await fs.writeFile(path.join(targetRoot, "manifest.json"), JSON.stringify({
    title: preset.title,
    story: requestedComicStory || "default",
    model,
    maxPixels: NAI_MAX_PIXELS,
    pages: manifest
  }, null, 2), "utf8");
  return manifest;
}

async function main() {
  const command = process.argv[2] || "missing";
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
  const stepsArg = process.argv.find((arg) => arg.startsWith("--steps="));
  const scaleArg = process.argv.find((arg) => arg.startsWith("--scale="));
  const steps = stepsArg ? Number(stepsArg.split("=")[1]) : undefined;
  const scale = scaleArg ? Number(scaleArg.split("=")[1]) : undefined;
  if (command === "missing") {
    const { tags, missing } = await findMissingMaterialPreviews(limit);
    console.log(JSON.stringify({ total: tags.length, missing: missing.length, sample: missing.slice(0, 20).map((entry) => ({ tag: entry.tag, alias: entry.alias, url: entry.generatedUrl })) }, null, 2));
    return;
  }
  if (command === "previews") {
    await generateMaterialPreviews({ limit, steps, scale });
    return;
  }
  if (command === "comic") {
    const manifest = await generateComicDemo();
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
