const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  test = require("node:test");
let payload,
  calls = 0,
  ctx = {
    console,
    JSON,
    AbortController,
    setTimeout,
    clearTimeout,
    AIProvider: class {},
    AI_ROLES: {
      Text2Image: "Text2Image",
      Image2Image: "Image2Image",
      Inpaint: "Inpaint",
    },
    location: { protocol: "http:", origin: "http://127.0.0.1:8000" },
    document: { addEventListener() {} },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
    },
    fetch: async (url, opt) => {
      calls++;
      payload = JSON.parse(opt.body);
      return {
        ok: true,
        json: async () => ({
          images: [{ dataUrl: "data:image/png;base64,AA==" }],
          provider: "official",
        }),
      };
    },
  };
ctx.window = ctx;
test("GPT adapter exists", () => {
  assert.ok(
    fs.existsSync("js/ai/provider/gpt-image-provider.js"),
    "missing actual API adapter",
  );
  vm.runInNewContext(
    fs.readFileSync("js/ai/provider/gpt-image-provider.js", "utf8"),
    ctx,
  );
});
test("reference purposes compiled without dropping user instructions; one request and no auto retries", async () => {
  const p = new ctx.GptImageProvider();
  ctx.NaiGptConfig.set({
    apiKey: "test-secret",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-image-1.5",
  });
  const result = await p.request({
    operation: "edit",
    prompt: "太阳眼镜必须保留。",
    size: "1024x1024",
    images: ["target", "identity-ref", "style-ref"],
    mask: "alpha-mask",
    references: [
      { purpose: "identity", label: "少女" },
      { purpose: "style", label: "漫画" },
    ],
  });
  assert.equal(calls, 1);
  assert.equal(payload.images[0], "target");
  assert.equal(payload.images[1], "identity-ref");
  assert.ok(payload.prompt.includes("太阳眼镜必须保留。"));
  assert.ok(payload.prompt.includes("identity"));
  assert.equal(result.images.length, 1);
});
test("failed paid request is never retried or leaked in error", async () => {
  ctx.fetch = async () => {
    calls++;
    return {
      ok: false,
      status: 502,
      json: async () => ({ error: "contains test-secret" }),
    };
  };
  await assert.rejects(
    () =>
      new ctx.GptImageProvider().request({
        operation: "generate",
        prompt: "test",
      }),
    /\[redacted\]/,
  );
  assert.equal(calls, 2);
});
test("configuration persistence excludes API key", () => {
  let persisted;
  ctx.localStorage.setItem = (k, v) => (persisted = v);
  ctx.NaiGptConfig.set({ apiKey: "test-secret", model: "gpt-image-1.5" });
  assert.ok(!persisted.includes("test-secret"));
});
test("reference-assisted generation uses editable blank target then ordered references", async () => {
  ctx.NaiGptEditor = {
    makeCanvas: (w, h) => ({
      toDataURL: () => "blank-png",
      getContext: () => ({ fillRect() {}, fillStyle: "" }),
    }),
  };
  const p = new ctx.GptImageProvider();
  let task;
  p.request = async (input) => {
    task = input;
    return { images: [] };
  };
  await p.generateImage({
    size: "1024x1024",
    prompt: "保留金色太阳眼镜",
    background: "transparent",
    references: [
      { dataUrl: "identity", purpose: "identity" },
      { dataUrl: "style", purpose: "style" },
    ],
  });
  assert.equal(task.operation, "edit");
  assert.deepEqual(Array.from(task.images), ["blank-png", "identity", "style"]);
  assert.equal(task.background, "transparent");
  assert.equal(task.mask, "blank-png");
});
