const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
const compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const moduleContext={exports:{},Date,Set};
vm.runInNewContext(compile(fs.readFileSync(path.join(__dirname,'speechDelivery.ts'),'utf8')),moduleContext);
const {SpeechDelivery}=moduleContext.exports;
const source=fs.readFileSync(path.join(__dirname,'ImmersiveInterviewScreen.tsx'),'utf8');
const begin=source.indexOf('(type: string, payload:',source.indexOf('const postToUnity'));
const end=source.indexOf('\n  }, []);',begin);
const body=compile('exports.send = '+source.slice(begin,end)+'\n};');
function harness(){
 const events=[],session={sessionId:'test-session',history:[],questionsAsked:1};
 const context={exports:{},JSON,console:{log(){},warn(){}},isExitingRef:{current:false},pausedRef:{current:false},speechDeliveryRef:{current:new SpeechDelivery()},useInterviewStore:{getState:()=>({session})},unityRef:{current:{postMessage(_target,_method,json){events.push(JSON.parse(json));}}}};
 vm.runInNewContext(body,context);
 return {events,session,context,send:(text='Question',attempt=0,revision=session.history.length)=>context.exports.send('SHOW_QUESTION',{questionText:text,sessionId:session.sessionId,questionRevision:revision,speechAttempt:attempt})};
}
for(const kind of ['question','acknowledgment plus next question','clarification'])test(`${kind} is delivered once despite duplicate callbacks`,()=>{
 const h=harness();h.send(kind);h.send(kind);assert.equal(h.events.length,1);
 const payload=JSON.parse(h.events[0].payload);assert.equal(payload.questionText,kind);assert.ok(payload.utteranceId);
});
test('new logical question with identical text speaks once; stale revision cannot speak',()=>{
 const h=harness();h.send();const first=JSON.parse(h.events[0].payload);
 h.session.history.push({});h.send();h.send();h.send('obsolete',0,0);
 assert.equal(h.events.length,2);assert.notEqual(first.utteranceId,JSON.parse(h.events[1].payload).utteranceId);
 assert.equal(h.context.speechDeliveryRef.current.complete(first.utteranceId),false);
});
test('reattachment cannot replay a delivered utterance; explicit new retry can speak once',()=>{
 const h=harness();h.send();h.send();h.send('Please try again',1);h.send('Please try again',1);
 assert.equal(h.events.length,2);
 const id=JSON.parse(h.events[1].payload).utteranceId;
 assert.equal(h.context.speechDeliveryRef.current.complete(id),true);
 assert.equal(h.context.speechDeliveryRef.current.complete(id),false);
 h.context.speechDeliveryRef.current.cancel();h.context.isExitingRef.current=true;h.send('obsolete retry',2);
 assert.equal(h.events.length,2);
 h.context.isExitingRef.current=false;h.session.sessionId='new-mode-session';h.send();h.send();assert.equal(h.events.length,3);
});

test('standard closing effect and repeated completion callbacks speak and finish once',async()=>{
 const screen=fs.readFileSync(path.join(__dirname,'ActiveSimulationScreen.tsx'),'utf8');
 const begin=screen.indexOf('() => {',screen.indexOf('const speakCurrentQuestion'));
 const end=screen.indexOf('\n  }, [session, router]);',begin);
 const events=[],calls=[],session={sessionId:'standard-test',history:[],questionsAsked:10,currentQuestion:'Closing statement',currentQuestionType:'closing'};
 const context={exports:{},console:{log(){}},session,mounted:{current:true},speechAttempt:{current:0},speechDelivery:{current:new SpeechDelivery()},setIsSpeaking(){},setRecordingError(){},rememberInterviewCompletion:async()=>{},withTimeout:promise=>promise,useInterviewStore:{getState:()=>({session,completeClosing(){events.push('complete');}})},router:{replace(){events.push('summary');}},Speech:{stop(){},speak(text,callbacks){calls.push({text,callbacks});}}};
 vm.runInNewContext(compile('exports.speak = '+screen.slice(begin,end)+'\n};'),context);
 context.exports.speak();context.exports.speak();assert.equal(calls.length,1);
 calls[0].callbacks.onDone();calls[0].callbacks.onDone();await new Promise(setImmediate);assert.deepEqual(events,['complete','summary']);
 context.speechAttempt.current++;context.exports.speak();assert.equal(calls.length,2);
 session.history.push({});calls[1].callbacks.onDone();assert.deepEqual(events,['complete','summary']);
});

test('background pause cannot dispatch or replay a question',()=>{
 const h=harness();h.context.pausedRef.current=true;h.send();assert.equal(h.events.length,0);
 h.context.pausedRef.current=false;h.send();assert.equal(h.events.length,1);
});
