const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const test = require("node:test");
const ts = require("typescript");

const saved = new Map();
const storage = {
  getItem: async (key) => saved.get(key) || null,
  setItem: async (key, value) => { saved.set(key, value); },
  removeItem: async (key) => { saved.delete(key); },
};
const originalLoad = Module._load;
Module._load = (id, parent, isMain) => id === "@react-native-async-storage/async-storage"
  ? storage
  : originalLoad(id, parent, isMain);
require.extensions[".ts"] = (module, path) => module._compile(
  ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText,
  path
);

const { useAppearanceStore } = require("./appearanceStore.ts");

test("appearance preference persists and hydrates safely", async () => {
  assert.equal(useAppearanceStore.getState().textSize, "medium");
  useAppearanceStore.getState().setTextSize("large");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(saved.get("airis-appearance"), /"large"/);

  saved.set("airis-appearance", JSON.stringify({ state: { textSize: "small" }, version: 0 }));
  await useAppearanceStore.persist.rehydrate();
  assert.equal(useAppearanceStore.getState().textSize, "small");

  saved.set("airis-appearance", JSON.stringify({ state: { textSize: "invalid" }, version: 0 }));
  await useAppearanceStore.persist.rehydrate();
  assert.equal(useAppearanceStore.getState().textSize, "medium");
});
