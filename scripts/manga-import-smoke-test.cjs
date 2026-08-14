const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function bootstrapImporter() {
  const source = read("js/ai/manga-importer.js").replace(
    /return \{\s*\npickFiles:/,
    "return {\n__test:{safePanelSize:safePanelSize,buildNaiPreflight:buildNaiPreflight,normalizeTags:normalizeTags,getAspectTags:getAspectTags,refineDetectedPanels:refineDetectedPanels,findContentBox:findContentBox,analyzeMangaTemplate:analyzeMangaTemplate},\npickFiles:"
  );
  const context = {
    console,
    window: { NovelAICompositionDirector: null },
    document: {
      addEventListener() {},
      getElementById() {
        return null;
      }
    },
    Map,
    setTimeout,
    clearTimeout,
    requestAnimationFrame(callback) {
      return setTimeout(callback, 0);
    }
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: "manga-importer.js" });
  return context.window.MangaImporter || context.MangaImporter;
}

function testUiSurface() {
  const html = read("index.html");
  [
    "mangaImportPickButton",
    "mangaImportRetagButton",
    "mangaImportSelectNextPanelButton",
    "mangaImportSelectPlaceholderButton",
    "mangaImportDirectorButton",
    "mangaImportPreflightButton",
    "mangaImportGenerateButton",
    "mangaImportCharacterReferences",
    "js/ai/manga-importer.js?v=8.17"
  ].forEach((needle) => assert(html.includes(needle), `index.html missing ${needle}`));
}

function testImporterContract(importer) {
  [
    "importFile",
    "analyzeMangaTemplate",
    "retagCurrentPage",
    "writeDirectorPromptsForCurrentPage",
    "showNaiPreflightForCurrentPage",
    "selectNextImportPanel",
    "selectNextCharacterPlaceholder",
    "generateCurrentPageWithNai"
  ].forEach((key) => assert(typeof importer[key] === "function", `MangaImporter missing ${key}`));
}

function testSafeAspectSizing(importer) {
  const { safePanelSize, buildNaiPreflight } = importer.__test;
  const portrait = safePanelSize(450, 1800);
  const wide = safePanelSize(1800, 450);
  const square = safePanelSize(1024, 1024);

  [portrait, wide, square].forEach((size) => {
    assert(size.width * size.height <= 1024 * 1024, `unsafe pixel count ${size.width}x${size.height}`);
    assert(size.width <= 1536 && size.height <= 1536, `edge too large ${size.width}x${size.height}`);
    assert(size.width % 64 === 0 && size.height % 64 === 0, `size must be rounded to 64: ${size.width}x${size.height}`);
  });
  assert(portrait.height > portrait.width, "portrait panel lost portrait aspect");
  assert(wide.width > wide.height, "wide panel lost wide aspect");

  const panels = [
    { mangaImportPanelIndex: 1, mangaImportSourceBox: { x: 0, y: 0, w: 450, h: 1800 } },
    { mangaImportPanelIndex: 2, mangaImportSourceBox: { x: 0, y: 0, w: 1800, h: 450 } },
    { mangaImportPanelIndex: 3, mangaImportSourceBox: { x: 0, y: 0, w: 1024, h: 1024 } }
  ];
  const preflight = buildNaiPreflight(panels);
  assert(preflight.ok, "safe panels should pass preflight");
  assert(preflight.samples === 1, "preflight must lock samples=1");
  assert(preflight.concurrency === 1, "preflight must lock concurrency=1");
  assert(panels.every((panel) => panel.text2img_width > 0 && panel.text2img_height > 0), "preflight should write safe sizes");
}

function testPanelRefinement(importer) {
  const { refineDetectedPanels } = importer.__test;
  const rawMask = new Uint8Array(1000 * 1400);
  for (let y = 80; y < 1320; y++) {
    for (let x = 80; x < 920; x++) rawMask[y * 1000 + x] = 1;
  }
  const contentBox = { x: 70, y: 70, w: 860, h: 1260, source: "single-page-content" };
  const noisy = refineDetectedPanels({
    frameBoxes: [],
    openFrameBoxes: [
      { x: 70, y: 420, w: 700, h: 18, source: "open-frame-lines", edgeBonus: 1 },
      { x: 70, y: 760, w: 720, h: 20, source: "open-frame-lines", edgeBonus: 1 }
    ],
    gutterBoxes: [],
    connectedBoxes: []
  }, rawMask, 1000, 1400, contentBox);
  assert(noisy.length === 1, "single illustration/noisy lines should collapse to one full-page panel");

  const realPanels = refineDetectedPanels({
    frameBoxes: [
      { x: 80, y: 80, w: 400, h: 520, source: "frame-lines" },
      { x: 520, y: 80, w: 400, h: 520, source: "frame-lines" },
      { x: 80, y: 640, w: 840, h: 560, source: "frame-lines" }
    ],
    openFrameBoxes: [],
    gutterBoxes: [],
    connectedBoxes: []
  }, rawMask, 1000, 1400, contentBox);
  assert(realPanels.length === 3, `reliable frame boxes should be preserved, got ${realPanels.length}`);

  const speechBubbleNoise = refineDetectedPanels({
    frameBoxes: [],
    separatorBoxes: [
      { x: 70, y: 70, w: 430, h: 600, source: "frame-separator" },
      { x: 530, y: 70, w: 400, h: 600, source: "frame-separator" },
      { x: 70, y: 700, w: 860, h: 520, source: "frame-separator" }
    ],
    openFrameBoxes: [],
    gutterBoxes: [
      { x: 90, y: 730, w: 95, h: 360, source: "gutter-split" },
      { x: 250, y: 730, w: 92, h: 360, source: "gutter-split" }
    ],
    connectedBoxes: []
  }, rawMask, 1000, 1400, contentBox);
  assert(speechBubbleNoise.length === 3, `structural separators should ignore speech-bubble strips, got ${speechBubbleNoise.length}`);
}

function testStaticSafetyHooks() {
  const source = read("js/ai/manga-importer.js");
  [
    "addCharacterReferenceImage",
    "hideImportTemplateLayers",
    "writeDirectorPromptsForCurrentPage",
    "buildImportedBatchContext",
    "async function generateCurrentPageWithNai",
    "n_samples"
  ].forEach((needle) => {
    if (needle === "n_samples") return;
    assert(source.includes(needle), `manga-importer missing ${needle}`);
  });
  const provider = read("js/ai/provider/novelai-provider.js");
  assert(provider.includes("n_samples:1") || provider.includes("params.n_samples=1"), "NovelAI provider must lock n_samples=1");
}

function main() {
  testUiSurface();
  const importer = bootstrapImporter();
  testImporterContract(importer);
  testSafeAspectSizing(importer);
  testPanelRefinement(importer);
  testStaticSafetyHooks();
  console.log("manga import smoke test passed");
}

main();
