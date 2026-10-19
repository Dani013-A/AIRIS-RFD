const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (module, path) => module._compile(
  ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText,
  path
);

const { withTimeout, TimeoutError } = require("./promiseTimeout.ts");

test("resolves fast work before the timeout", async () => {
  assert.equal(await withTimeout(Promise.resolve("done"), 1000), "done");
});

test("rejects stuck work so loading flags can reset", async () => {
  const stuck = new Promise(() => {});
  await assert.rejects(() => withTimeout(stuck, 20), TimeoutError);
  await assert.rejects(
    () => withTimeout(stuck, 20, "Custom wait message."),
    /Custom wait message/
  );
});
