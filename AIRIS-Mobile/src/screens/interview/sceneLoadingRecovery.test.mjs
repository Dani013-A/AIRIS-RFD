import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
const source = readFileSync(new URL('./ImmersiveInterviewScreen.tsx', import.meta.url), 'utf8');
function harness(sceneName = 'SampleScene') {
  const sent = [], warnings = [], timers = [];
  const ref = (current = false) => ({ current });
  const c = vm.createContext({
    hasMicPermission: true, sceneName, sceneLoadingState: 'idle',
    isUnityReadyRef: ref(), hasRequestedSceneRef: ref(), sceneLoadedRef: ref(),
    isExitingRef: ref(), sceneLoadAttemptRef: ref(0), sceneLoadingTimerRef: ref(null),
    setSceneLoadingState(v) { c.sceneLoadingState = v; }, setSceneLoaded() {}, setUnityReady() {},
    postToUnity(type, payload) { sent.push({ type, payload }); },
    useCallback: fn => fn, useEffect: fn => fn(),
    setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
    console: { log() {}, warn(...args) { warnings.push(args); } },
  });
  const request = source.slice(source.indexOf('const requestSceneIfReady'), source.indexOf('// ─── Effect: send first question'));
  vm.runInContext(request, c);
  const start = source.slice(source.indexOf('// Initiate'), source.indexOf('const confirmUnityRuntimeReady'));
  vm.runInContext(source.slice(source.indexOf('const confirmUnityRuntimeReady'), source.indexOf('// ─── Unity message handler')), c);
  const cases = source.slice(source.indexOf('case "UNITY_READY"'), source.indexOf('// ── TTS finished'));
  vm.runInContext('this.receive = msg => { if (isExitingRef.current) return; switch(msg.type) {' + cases + '} };', c);
  return { c, sent, warnings, timers, start: () => vm.runInContext(start, c) };
}
for (const sceneName of ['SampleScene', 'OneOnOne']) {
  test(`${sceneName}: reopening probes readiness and loads once`, () => {
    for (let entry = 0; entry < 2; entry++) {
      const h = harness(sceneName); h.start();
      assert.deepEqual(h.sent.map(x => x.type), ['PING']);
      h.c.receive({ type: 'UNITY_READY' }); h.c.receive({ type: 'UNITY_READY' });
      assert.deepEqual(h.sent.map(x => x.type), ['PING', 'LOAD_SCENE']);
      assert.equal(h.sent[1].payload.sceneName, sceneName);
      assert.equal(h.c.sceneLoadingState, 'loading');
      h.c.receive({ type: 'SCENE_LOADED', payload: { sceneName } });
      assert.equal(h.c.sceneLoadingState, 'loaded');
      h.c.receive({ type: 'SCENE_LOADED', payload: { sceneName: 'wrong' } });
      assert.equal(h.sent.length, 2);
    }
  });
}
test('unsolicited, malformed and wrong-scene events never unlock loading or repeat scene loads', () => {
  const h = harness(); h.start();
  h.c.receive({ type: 'SCENE_LOADED', payload: { sceneName: 'SampleScene' } });
  assert.equal(h.c.sceneLoadingState, 'loading');
  for (const payload of ['invalid', {}, { sceneName: 12 }, { sceneName: 'OneOnOne' }]) {
    h.c.receive({ type: 'SCENE_LOADED', payload });
    assert.equal(h.c.sceneLoadingState, 'loading');
  }
  assert.equal(h.sent.filter(x => x.type === 'LOAD_SCENE').length, 1);
  h.c.receive({ type: 'SCENE_LOADED', payload: '{"sceneName":"SampleScene"}' });
  assert.equal(h.c.sceneLoadingState, 'loaded');
});
test('timeout logs failure and keeps waiting for a matching scene', () => {
  const h = harness(); h.start(); h.timers[0]();
  assert.equal(h.c.sceneLoadingState, 'loading'); assert.equal(h.warnings.length, 1);
  h.c.receive({ type: 'UNITY_READY' });
  h.c.receive({ type: 'SCENE_LOADED', payload: { sceneName: 'SampleScene' } });
  assert.equal(h.c.sceneLoadingState, 'loaded');
});
test('exit and obsolete attempts invalidate callbacks', () => {
  const h = harness(); h.start(); h.c.isExitingRef.current = true;
  h.c.receive({ type: 'UNITY_READY' }); h.timers[0]();
  assert.deepEqual(h.sent.map(x => x.type), ['PING']); assert.equal(h.warnings.length, 0);
  const old = harness(); old.start(); old.c.sceneLoadAttemptRef.current++;
  old.timers[0](); assert.equal(old.warnings.length, 0);
});
test('one Unity view and clean loading screen, without recovery controls', () => {
  assert.equal((source.match(/^\s*<UnityView\b/gm) || []).length, 1);
  assert.doesNotMatch(source, /Connecting to Virtual Scene|Retry Connection|handleRetryConnection/);
  assert.match(source, /sceneLoadingState !== "loaded"/);
});
