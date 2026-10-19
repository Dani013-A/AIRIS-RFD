const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const test = require("node:test");
const ts = require("typescript");

const storage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
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

test("text size is session-only: defaults to medium and resets on logout/login", () => {
  assert.equal(useAppearanceStore.getState().textSize, "medium");

  // Signed-in session can change size.
  useAppearanceStore.getState().setActiveUser("user-a");
  assert.equal(useAppearanceStore.getState().textSize, "medium");
  useAppearanceStore.getState().setTextSize("large");
  assert.equal(useAppearanceStore.getState().textSize, "large");

  // Switching accounts starts at Medium, never inherits.
  useAppearanceStore.getState().setActiveUser("user-b");
  assert.equal(useAppearanceStore.getState().textSize, "medium");

  // Logging out resets to Medium.
  useAppearanceStore.getState().setTextSize("small");
  useAppearanceStore.getState().resetForNewSession();
  assert.equal(useAppearanceStore.getState().textSize, "medium");

  // Logging back in starts at Medium even after a previous Large.
  useAppearanceStore.getState().setActiveUser("user-a");
  useAppearanceStore.getState().setTextSize("large");
  useAppearanceStore.getState().setActiveUser(null);
  assert.equal(useAppearanceStore.getState().textSize, "medium");
  useAppearanceStore.getState().setActiveUser("user-a");
  assert.equal(useAppearanceStore.getState().textSize, "medium");

  // No persistence across sessions.
  assert.equal(useAppearanceStore.persist, undefined);
});
