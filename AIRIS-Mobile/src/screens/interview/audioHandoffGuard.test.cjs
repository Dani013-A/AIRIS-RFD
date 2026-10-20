const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const Module = require('node:module');
const filename = require.resolve('./audioHandoffGuard.ts');
const mod = new Module(filename);
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { AudioHandoffGuard } = mod.exports;

test('one handoff per recording; a late duplicate cannot consume the next capture', () => {
 const guard = new AudioHandoffGuard(); let capture = 0; const start = () => { guard.start(); guard.confirmStarted(++capture); }; start();
 assert.equal(typeof guard.accept('/recording-1.wav', capture), 'number');
 assert.equal(guard.accept('/recording-1.wav', capture), null);
 start();
 assert.equal(guard.accept('file:///recording-1.wav', capture), null);
 assert.equal(typeof guard.accept('/recording-2.wav', capture), 'number');
});
test('retry or stop invalidates delayed transcription/evaluation; fresh recording can advance', () => {
 const guard = new AudioHandoffGuard(); let capture = 0; const start = () => { guard.start(); guard.confirmStarted(++capture); }; start();
 const first = guard.accept('/first.wav', capture); start();
 assert.equal(guard.isCurrent(first), false);
 const retry = guard.accept('/retry.wav', capture); assert.equal(guard.isCurrent(retry), true);
 guard.cancel(); assert.equal(guard.isCurrent(retry), false);
 assert.equal(guard.accept('/late.wav', capture), null);
});
test('empty handoff does not consume a valid recording', () => {
 const guard = new AudioHandoffGuard(); let capture = 0; const start = () => { guard.start(); guard.confirmStarted(++capture); };start();
 assert.equal(guard.accept('  ', capture), null);
 assert.equal(typeof guard.accept('/valid.wav', capture), 'number');
});

test('a delayed unseen WAV and duplicate start event cannot consume a retry', () => {
  const guard = new AudioHandoffGuard();
  guard.start(); guard.confirmStarted(1);
  guard.start();
  assert.equal(guard.accept('/unseen-old.wav', 1), null);
  guard.confirmStarted(1);
  assert.equal(guard.accept('/unseen-old.wav', 1), null);
  guard.confirmStarted(2);
  assert.equal(guard.accept('/unseen-old.wav', 1), null);
  assert.equal(typeof guard.accept('/fresh.wav', 2), 'number');
});
