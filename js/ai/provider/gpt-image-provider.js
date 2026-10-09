(function (root) {
  "use strict";
  var config = {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-image-1.5",
    quality: "high",
    apiKey: "",
  };
  try {
    var stored = JSON.parse(localStorage.getItem("nai_gpt_config_v1") || "{}");
    ["baseUrl", "model", "quality"].forEach(function (k) {
      if (stored[k]) config[k] = stored[k];
    });
  } catch (error) {
    /* Optional browser preference storage. */
  }
  root.NaiGptConfig = {
    get: function () {
      return Object.assign({}, config);
    },
    set: function (input) {
      ["baseUrl", "model", "quality", "apiKey"].forEach(function (k) {
        if (input[k] !== undefined) config[k] = String(input[k]);
      });
      try {
        localStorage.setItem(
          "nai_gpt_config_v1",
          JSON.stringify({
            baseUrl: config.baseUrl,
            model: config.model,
            quality: config.quality,
          }),
        );
      } catch (error) {
        /* Session remains usable when storage is disabled. */
      }
    },
  };
  function instruction(task) {
    var parts = [task.prompt || ""];
    if (task.operation === "edit")
      parts.push(
        "Edit only the transparent mask area of image 1. Keep composition, camera, resolution and non-selected content. The editor will composite the result locally. Do not insert text unless explicitly requested.",
      );
    (task.references || []).forEach(function (ref, i) {
      parts.push(
        "Reference image " +
          (i + 2) +
          " purpose: " +
          ref.purpose +
          ". " +
          (ref.label || "") +
          ". Use it only for that purpose; do not copy its background.",
      );
    });
    if (task.character)
      parts.push("Character identity constraints: " + task.character);
    return parts.join("\n");
  }
  class GptImageProvider extends AIProvider {
    constructor() {
      super("gpt-image", "GPT Image");
    }
    getSupportedRoles() {
      return [AI_ROLES.Text2Image, AI_ROLES.Image2Image, AI_ROLES.Inpaint];
    }
    needsApiKey() {
      return true;
    }
    getApiKey() {
      return config.apiKey;
    }
    getEndpointUrl() {
      return config.baseUrl;
    }
    async heartbeat() {
      return !!config.apiKey;
    }
    async generateImage(task, signal) {
      var refs = task.references || [];
      if (!refs.length)
        return this.request(
          Object.assign({}, task, { operation: "generate" }),
          signal,
        );
      var size = (task.size || "1024x1024").split("x").map(Number);
      var blank = root.NaiGptEditor.makeCanvas(size[0], size[1]);
      // References are an Images edits capability. A blank, fully editable target
      // makes reference-assisted generation possible without inventing a JSON API.
      var mask = blank.toDataURL("image/png"),
        ctx = blank.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size[0], size[1]);
      return this.request(
        Object.assign({}, task, {
          operation: "edit",
          images: [blank.toDataURL("image/png")].concat(
            refs.map(function (r) {
              return r.dataUrl;
            }),
          ),
          mask: mask,
          prompt:
            "Create a new image in the blank target, using the following references for their specified purposes.\n" +
            task.prompt,
        }),
        signal,
      );
    }
    async request(task, signal) {
      var local = new AbortController(),
        timeout = setTimeout(function () {
          local.abort();
        }, 300000);
      var onAbort = function () {
        local.abort();
      };
      if (signal) {
        if (signal.aborted) local.abort();
        else signal.addEventListener("abort", onAbort, { once: true });
      }
      var key = config.apiKey;
      try {
        var base =
          root.location.protocol === "file:"
            ? "http://127.0.0.1:8000"
            : root.location.origin;
        var response = await root.fetch(base + "/api/gpt-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: local.signal,
          body: JSON.stringify({
            apiKey: key,
            baseUrl: config.baseUrl,
            model: config.model,
            operation: task.operation,
            prompt: instruction(task),
            size: task.size || "1024x1024",
            quality: config.quality,
            background: task.background || "opaque",
            images: task.images || [],
            mask: task.mask || undefined,
          }),
        });
        var data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "GPT Images HTTP " + response.status);
        if (!data.images || !data.images[0] || !data.images[0].dataUrl)
          throw new Error("GPT 未返回可保存的图片。");
        return data;
      } catch (error) {
        if (error.name === "AbortError")
          throw new Error(
            "任务已停止或超时；供应商可能仍在处理，请检查账单后决定是否重试。",
          );
        var message = String(error.message || "GPT Images 请求失败。");
        if (key) message = message.split(key).join("[redacted]");
        throw new Error(message);
      } finally {
        clearTimeout(timeout);
        if (signal) signal.removeEventListener("abort", onAbort);
      }
    }
    async executeT2I(layer, spinnerId) {
      try {
        return root.NaiGptEditor.openGeneration(layer);
      } finally {
        if (typeof removeSpinner === "function") removeSpinner(spinnerId);
      }
    }
    async executeI2I(layer, spinnerId) {
      try {
        return root.NaiGptEditor.openForTarget(layer);
      } finally {
        if (typeof removeSpinner === "function") removeSpinner(spinnerId);
      }
    }
    async executeInpaint(layer, spinnerId) {
      return this.executeI2I(layer, spinnerId);
    }
  }
  root.GptImageProvider = GptImageProvider;
  root.NaiGptCompileInstruction = instruction;
  document.addEventListener("DOMContentLoaded", function () {
    providerRegistry.register(new GptImageProvider());
    if (root.NaiImage2ProviderRegistry)
      root.NaiImage2ProviderRegistry.register({
        id: "gpt-image",
        name: "GPT Image",
        generate: async function (job) {
          var result = await providerRegistry
            .get("gpt-image")
            .generateImage({
              prompt: job.prompt,
              size: root.NaiGptEditCore.requestSize(job.width, job.height).api,
              background: job.transparent ? "transparent" : "opaque",
            });
          return { image: result.images[0].dataUrl };
        },
      });
  });
})(typeof window !== "undefined" ? window : globalThis);
