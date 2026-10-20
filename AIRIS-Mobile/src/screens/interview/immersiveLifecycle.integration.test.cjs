const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function compile(source) { return ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText; }
const guardModule = { exports: {} };
vm.runInNewContext(compile(fs.readFileSync(path.join(__dirname, 'audioHandoffGuard.ts'), 'utf8')), { exports: guardModule.exports });
const { AudioHandoffGuard } = guardModule.exports;
const screen = fs.readFileSync(path.join(__dirname, 'ImmersiveInterviewScreen.tsx'), 'utf8');
const begin = screen.indexOf('    async (event:', screen.indexOf('const onUnityMessage'));
const end = screen.indexOf('\n    },\n    [', begin);
assert.ok(begin > 0 && end > begin);
const code = compile('exports.handler = '+ screen.slice(begin, end)+'\n    };');
function harness(kind='introductory') {
 const events=[], timers=new Map(); let nextTimer=0, evaluations=0, advances=0, captureId=0;
 const session={sessionId:'synthetic-session',currentQuestion:'Tell me about yourself.',currentQuestionType:kind,questionsAsked:kind==='closing'?10:1,history:[],totalQuestions:10};
 const ref=current=>({current});
 const ctx={ exports:{}, console:{log(){},warn(){},error(){}}, Date, JSON,
  currentUser:{uid:'synthetic-user'},sceneName:'SampleScene',
  stateRef:ref('INTERVIEWER_SPEAKING'),isExitingRef:ref(false),isProcessingAnswerRef:ref(false),
  audioHandoffRef:ref(new AudioHandoffGuard()),activeSessionIdRef:ref(session.sessionId),
  sceneLoadedRef:ref(true),listeningSafetyTimerRef:ref(null),watchdogTimerRef:ref(null),sceneLoadingTimerRef:ref(null),feedbackTimeoutRef:ref(null),recordingStoppedTimeRef:ref(null),activeAbortControllerRef:ref(null),pendingNextQuestionRef:ref(null),currentSpeakerRef:ref({index:1,name:'Interviewer'}),
  confirmUnityRuntimeReady(){},setSceneLoadingState(){},setSceneLoaded(){},setUnityReady(){},
  setTimeout(fn,ms){const id=++nextTimer;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);},
  postToUnity(type,payload){events.push({type,payload});},
  useInterviewStore:{getState:()=>({session,completeClosing(){events.push({type:'CLOSE'});}})},
  AirisOrientation:{lockPortrait(){}},router:{replace(){events.push({type:'SUMMARY'});},push(){}},
  parseVRVoiceCommand(){return null;},getParsedResumeDict(){return {};},
  transcribeAudio:async()=>({transcription:'Synthetic test answer about coursework and career goals.'}),
  withTimeout:promise=>promise,
  submitInterviewAnswer:async()=>{evaluations++;return {evaluation:{overall:73},nextQuestion:{question:'Why this role?',questionType:'motivation'},isComplete:false};},
  submitAnswer(){advances++;session.questionsAsked++;session.currentQuestion='Why this role?';session.currentQuestionType='motivation';},
  getSpeakerForQuestion(){return {index:2,name:'Interviewer'};},AbortController,
 };
 vm.runInNewContext(code,ctx);
 return {ctx,session,events,timers,counts:()=>({evaluations,advances}),send:async(type,payload={})=>{
  const before=events.filter(event=>event.type==='START_RECORDING').length;
  await ctx.exports.handler({nativeEvent:{message:JSON.stringify({type,payload:JSON.stringify({captureId,...payload})})}});
  if(events.filter(event=>event.type==='START_RECORDING').length>before) {
   captureId++;
   await ctx.exports.handler({nativeEvent:{message:JSON.stringify({type:'RECORDING_STARTED',payload:JSON.stringify({captureId})})}});
  }
 }};
}
test('duplicate QUESTION_SPOKEN starts only one recording and respects native 60s limit',async()=>{
 const h=harness();await h.send('QUESTION_SPOKEN');await h.send('QUESTION_SPOKEN');
 assert.equal(h.events.filter(e=>e.type==='START_RECORDING').length,1);
 assert.ok([...h.timers.values()].some(timer=>timer.ms>60000));
});
test('Q10 speech completion closes once; no recording, transcription, scoring, or eleventh turn',async()=>{
 const h=harness('closing');await h.send('QUESTION_SPOKEN');await h.send('QUESTION_SPOKEN');
 await h.send('TRANSCRIPT_READY',{transcript:'/late.wav'});
 assert.deepEqual(h.events.map(e=>e.type),['CLOSE','SUMMARY']);
 assert.deepEqual(h.counts(),{evaluations:0,advances:0});
});
test('duplicate saved recording advances exactly once, including after next-question delivery',async()=>{
 const h=harness();await h.send('QUESTION_SPOKEN');await h.send('RECORDING_STOPPED');
 await h.send('TRANSCRIPT_READY',{transcript:'/first.wav'});
 await h.send('TRANSCRIPT_READY',{transcript:'/first.wav'});
 assert.deepEqual(h.counts(),{evaluations:1,advances:1});
 // Execute the scheduled SHOW_QUESTION, then let the next question finish speaking.
 for(const {fn,ms} of [...h.timers.values()])if(ms===350)fn();
 await h.send('QUESTION_SPOKEN');
 await h.send('TRANSCRIPT_READY',{transcript:'file:///first.wav'});
 assert.deepEqual(h.counts(),{evaluations:1,advances:1});
});
test('transcription failure repeats same question without scoring or advancing',async()=>{
 const h=harness();h.ctx.transcribeAudio=async()=>{throw new Error('timeout');};
 await h.send('QUESTION_SPOKEN');await h.send('TRANSCRIPT_READY',{transcript:'/failed.wav'});
 assert.deepEqual(h.counts(),{evaluations:0,advances:0});
 assert.equal(h.events.at(-1).type,'SHOW_QUESTION');
 assert.equal(h.events.at(-1).payload.questionText,'Tell me about yourself.');
 assert.equal(h.ctx.stateRef.current,'INTERVIEWER_SPEAKING');
});
test('stop during delayed transcription discards its result',async()=>{
 const h=harness();let resolve;
 h.ctx.transcribeAudio=()=>new Promise(done=>{resolve=done;});
 await h.send('QUESTION_SPOKEN');const pending=h.send('TRANSCRIPT_READY',{transcript:'/delayed.wav'});
 h.ctx.isExitingRef.current=true;h.ctx.audioHandoffRef.current.cancel();
 resolve({transcription:'Synthetic delayed answer.'});await pending;
 assert.deepEqual(h.counts(),{evaluations:0,advances:0});
});
test('missing next question is a retryable error and does not commit an answer',async()=>{
 const h=harness();h.ctx.submitInterviewAnswer=async()=>({evaluation:{overall:73},isComplete:false});
 await h.send('QUESTION_SPOKEN');await h.send('TRANSCRIPT_READY',{transcript:'/missing-next.wav'});
 assert.equal(h.counts().advances,0);assert.equal(h.events.at(-1).type,'SHOW_QUESTION');
});

test('empty transcript retries without evaluation; old completion events cannot consume new capture',async()=>{
 const h=harness();h.ctx.transcribeAudio=async()=>({transcription:''});
 await h.send('QUESTION_SPOKEN');await h.send('TRANSCRIPT_READY',{transcript:'/empty.wav'});
 assert.deepEqual(h.counts(),{evaluations:0,advances:0});
 await h.send('TRANSCRIPT_READY',{transcript:'/stale.wav',captureId:1});
 assert.deepEqual(h.counts(),{evaluations:0,advances:0});
});
