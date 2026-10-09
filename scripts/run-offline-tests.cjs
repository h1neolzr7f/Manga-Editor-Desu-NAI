// Deterministic regressions only. Never discover credentials or call paid APIs.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const browserTests = new Set([
  "gpt-editor-browser-test.cjs",
  "subtitle-editor-browser-test.cjs",
]);
const scripts = fs
  .readdirSync(__dirname)
  .filter(
    (name) =>
      name.endsWith(".cjs") &&
      /(?:smoke|regression|integration|core|provider|result)-test\.cjs$/.test(
        name,
      ) &&
      !browserTests.has(name),
  )
  .sort();
for (const name of scripts) {
  console.log("\nRunning " + name);
  const result = spawnSync(process.execPath, [path.join(__dirname, name)], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
for (const name of ["proxy-guard-smoke-test.py", "gpt-images-proxy-test.py"]) {
  console.log("\nRunning " + name);
  const result = spawnSync(
    process.env.PYTHON || "python",
    [path.join(__dirname, name)],
    { cwd: root, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(
  "\nOffline regressions passed; paid API compatibility is not checked by this suite.",
);
