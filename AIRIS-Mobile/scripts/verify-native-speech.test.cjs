const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {verifyNativeSpeech}=require('./verify-native-speech.cjs');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const library=Buffer.from('captureId utteranceId [AIRIS][SPEECH_ACCEPTED] [AIRIS][SPEECH_DONE]');
const sources={assembly_sha256:Buffer.from('current assembly'),manifest_sha256:Buffer.from('current compile manifest'),speech_header_sha256:Buffer.from('current speech helper')};
const record={library_sha256:hash(library),...Object.fromEntries(Object.entries(sources).map(([key,value])=>[key,hash(value)]))};
test('rejects the capture-only prebuilt contract that leaves RN waiting for speech identity',()=>assert.throws(()=>verifyNativeSpeech(Buffer.from('captureId'),record,sources),/identity contract/));
test('requires current binary and source provenance',()=>{
 assert.doesNotThrow(()=>verifyNativeSpeech(library,record,sources));
 assert.throws(()=>verifyNativeSpeech(library,{...record,assembly_sha256:'stale'},sources),/provenance/);
 assert.throws(()=>verifyNativeSpeech(library,{...record,library_sha256:'different'},sources),/provenance/);
});
