/**
 * NAI-only pipeline smoke test (NovelAI + Director proxy).
 * Uses .env, env vars, or browser localSettingsData (same as novelai-batch-tools).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const baseUrl = process.env.NAI_TEST_BASE_URL || "http://127.0.0.1:8000";

const SHORT_JSON_RULES = [
  "【导演输出规则】只返回 JSON，不要 Markdown。",
  '{"prompt":"英文正向","negative_prompt":"英文反向","camera":"","composition":"","lighting":"","atmosphere":"","border":"","notes":""}',
  "必须保留 character_cards 与 mandatory_positive_tags；禁止拒绝或政策说明。"
].join("\n");

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
    // optional
  }
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
        const slice = text.slice(index, index + 20000);
        const jsonStart = slice.indexOf("{");
        const jsonEnd = slice.lastIndexOf("}");
        if (jsonStart === -1 || jsonEnd === -1) continue;
        try {
          const raw = slice.slice(jsonStart, jsonEnd + 1).replace(/\u0000/g, "");
          return JSON.parse(raw);
        } catch {
          // continue
        }
      }
    } catch {
      // continue
    }
  }
  return null;
}

async function resolveCredentials() {
  await loadDotEnv();
  const local = await getSavedLocalSettings();
  const nai =
    process.env.NOVELAI_API_KEY?.trim() ||
    process.env.NAI_API_KEY?.trim() ||
    local?.novelaiApiKey?.trim() ||
    "";
  const director =
    process.env.TOKENDANCE_API_KEY?.trim() ||
    process.env.DIRECTOR_API_KEY?.trim() ||
    local?.naiDirectorApiKey?.trim() ||
    nai;
  const directorUrl =
    process.env.DIRECTOR_API_URL?.trim() ||
    local?.naiDirectorApiUrl?.trim() ||
    "https://tokendance.space/gateway/v1/chat/completions";
  const directorModel =
    process.env.DIRECTOR_MODEL?.trim() ||
    local?.naiDirectorModel?.trim() ||
    "deepseek-v4-flash";
  return { nai, director, directorUrl, directorModel, local };
}

function mask(value) {
  if (!value) return "(missing)";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}…${value.slice(-4)} (${value.length} chars)`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { ok: response.ok, status: response.status, json, text };
}

function extractDirectorPrompt(json) {
  const choice = json?.choices?.[0];
  const content = choice?.message?.content || choice?.text || "";
  if (!content) return null;
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function testServerReachable() {
  const res = await fetch(`${baseUrl}/index.html`, { method: "GET" });
  if (!res.ok) throw new Error(`index.html HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes("Manga Editor")) throw new Error("index.html unexpected content");
  return true;
}

async function testNaiHealth(naiToken) {
  const headers = { Authorization: naiToken.startsWith("Bearer ") ? naiToken : `Bearer ${naiToken}` };
  const res = await fetchJson(`${baseUrl}/nai-proxy/health`, { headers });
  if (!res.ok) throw new Error(`NAI health ${res.status}: ${res.text.slice(0, 200)}`);
  if (!res.json?.ok) throw new Error(`NAI health not ok: ${JSON.stringify(res.json)}`);
  return res.json;
}

async function testDirectorArmorFirst(creds) {
  const cardSystem = process.env.NAI_TEST_CARD_SYSTEM || [
    "You are a Danbooru tag compiler for NovelAI image prompts.",
    "Translate the user scene into concise English tags for one manga panel.",
    "Keep character identity consistent; do not refuse explicit tags already listed in character_cards."
  ].join("\n");
  const characterCards = [
    {
      name: "Test OC",
      role: "protagonist",
      card_system: cardSystem,
      positive_tags: ["1girl", "long hair", "masterpiece", "best quality"],
      negative_tags: ["lowres", "bad anatomy"],
      material_anchors: []
    }
  ];
  const userPayload = {
    user_story: "雨夜神社，白发巫女，压抑但漂亮，漫画分镜边框，特写与全身交替",
    character_cards: characterCards,
    mandatory_positive_tags: characterCards[0].positive_tags,
    panel: { page: 1, panel: 1, rough_prompt: "establishing shot, rain, shrine" }
  };
  const messages = [
    {
      role: "system",
      content: `${cardSystem}\n\n${SHORT_JSON_RULES}`
    },
    {
      role: "user",
      content: `请为下列分镜返回 JSON。\n${JSON.stringify(userPayload, null, 2)}`
    }
  ];
  const upstream = creds.directorUrl.replace(/\/chat\/completions$/i, "") + "/chat/completions";
  const body = {
    model: creds.directorModel.toLowerCase(),
    messages,
    temperature: 0.5,
    response_format: { type: "json_object" }
  };
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: creds.director.startsWith("Bearer ") ? creds.director : `Bearer ${creds.director}`,
    "X-Director-Api-Url": upstream
  };
  const res = await fetchJson(`${baseUrl}/director-proxy/chat-completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Director ${res.status}: ${res.text.slice(0, 400)}`);
  const parsed = extractDirectorPrompt(res.json);
  if (!parsed?.prompt) throw new Error(`Director missing prompt: ${JSON.stringify(res.json).slice(0, 400)}`);
  if (/[\u3400-\u9fff]/.test(parsed.prompt)) throw new Error("Director prompt contains CJK");
  if (/cannot help|抱歉|无法|policy/i.test(JSON.stringify(parsed))) {
    throw new Error("Director refusal detected");
  }
  return parsed;
}

async function testNaiGenerateSmall(naiToken, prompt, negativePrompt) {
  const model = process.env.NOVELAI_MODEL || "nai-diffusion-4-5-full";
  const quality = "masterpiece, best quality, amazing quality, very aesthetic, highres, clean lineart";
  const payload = {
    input: `${quality}, ${prompt}`,
    model,
    action: "generate",
    parameters: {
      width: 832,
      height: 1216,
      scale: 6,
      sampler: "k_euler_ancestral",
      steps: 28,
      seed: 424242,
      n_samples: 1,
      ucPreset: 0,
      qualityToggle: true,
      negative_prompt: negativePrompt || DEFAULT_NEGATIVE,
      v4_prompt: {
        caption: { base_caption: `${quality}, ${prompt}`, char_captions: [] },
        use_coords: false,
        use_order: true
      },
      v4_negative_prompt: {
        caption: { base_caption: negativePrompt || DEFAULT_NEGATIVE, char_captions: [] },
        legacy_uc: false
      }
    }
  };
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/zip, application/json",
    Authorization: naiToken.startsWith("Bearer ") ? naiToken : `Bearer ${naiToken}`
  };
  const res = await fetch(`${baseUrl}/nai-proxy/generate-image`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NAI generate ${res.status}: ${errText.slice(0, 300)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error(`NAI response too small (${buf.length} bytes)`);
  const outDir = path.join(rootDir, "outputs", "nai-pipeline-test");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `smoke-${Date.now()}.zip`);
  await fs.writeFile(outPath, buf);
  return { bytes: buf.length, outPath };
}

const DEFAULT_NEGATIVE =
  "lowres, bad anatomy, bad hands, extra digits, missing fingers, text, watermark, signature, blurry";

const results = [];

async function runStep(name, fn) {
  const started = Date.now();
  try {
    const data = await fn();
    results.push({ name, ok: true, ms: Date.now() - started, data });
    console.log(`[PASS] ${name} (${Date.now() - started}ms)`);
  } catch (error) {
    results.push({ name, ok: false, ms: Date.now() - started, error: error.message || String(error) });
    console.error(`[FAIL] ${name}: ${error.message || error}`);
  }
}

console.log("NAI pipeline smoke test");
console.log("Base URL:", baseUrl);

await runStep("local server /index.html", testServerReachable);

const creds = await resolveCredentials();
console.log("NovelAI token:", mask(creds.nai));
console.log("Director token:", mask(creds.director));
console.log("Director model:", creds.directorModel);

if (!creds.nai) {
  console.error("No NovelAI token. Save novelaiApiKey in app settings or set NOVELAI_API_KEY.");
  process.exit(1);
}

await runStep("NAI subscription health", () => testNaiHealth(creds.nai));

let directorPrompt = null;
await runStep("Director armor-first JSON", async () => {
  if (!creds.director) throw new Error("No director token");
  directorPrompt = await testDirectorArmorFirst(creds);
  return {
    promptPreview: directorPrompt.prompt.slice(0, 160),
    negativePreview: (directorPrompt.negative_prompt || "").slice(0, 80)
  };
});

if (process.env.NAI_SMOKE_SKIP_GENERATE !== "1" && directorPrompt) {
  await runStep("NAI generate one panel", () =>
    testNaiGenerateSmall(creds.nai, directorPrompt.prompt, directorPrompt.negative_prompt)
  );
} else {
  console.log("[SKIP] NAI generate (NAI_SMOKE_SKIP_GENERATE=1 or no director prompt)");
}

const failed = results.filter((item) => !item.ok);
console.log("\nSummary:", results.map((r) => `${r.ok ? "OK" : "FAIL"} ${r.name}`).join(" | "));
if (failed.length) {
  process.exit(1);
}
console.log("All tests passed.");