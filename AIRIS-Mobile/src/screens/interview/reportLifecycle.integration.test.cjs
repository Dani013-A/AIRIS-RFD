const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const source = fs.readFileSync(__dirname + '/InterviewSummaryScreen.tsx', 'utf8');
const body = source.slice(source.indexOf('  const generateReport = async'), source.indexOf('  const handleReturnToDashboard'));
function harness(provider) {
  const session = {sessionId:'synthetic-test', targetRole:'Role', program:'Program', history:[], evaluations:Array(9).fill({overall:73})};
  let state = session;
  const calls = [];
  const ctx = { session, generatingRef:{current:false}, mountedRef:{current:true},
    setReportError: value=>calls.push(['error',value]), setLoading:value=>calls.push(['loading',value]),
    generateInterviewReport: provider, withTimeout: promise=>promise,
    useInterviewStore:{getState:()=>({session:state})},
    setFinalReport: value=>{state={...state,finalReport:value};calls.push(['report',value]);},
    useAuthStore:{getState:()=>({currentUser:null})}, console:{error:()=>{}}, Number };
  vm.runInNewContext(ts.transpileModule(body+'\nglobalThis.run=generateReport;', {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText, ctx);
  return {ctx,calls,getState:()=>state,replaceSession:()=>{state={...state,sessionId:'another-session'};}};
}
test('failed report remains unavailable and can be retried successfully',async()=>{
  let attempt=0;
  const h=harness(async()=>{if(++attempt===1)throw new Error('503');return {overallPerformance:73};});
  await h.ctx.run();assert.equal(h.getState().finalReport,undefined);
  assert.equal(h.calls.filter(x=>x[0]==='report').length,0);
  await h.ctx.run();assert.equal(h.getState().finalReport.overallPerformance,73);
});
test('report is unavailable while pending and a stale session cannot receive it',async()=>{
  let resolve; const h=harness(()=>new Promise(done=>{resolve=done;}));
  const pending=h.ctx.run(); assert.equal(h.getState().finalReport,undefined);
  h.replaceSession();resolve({overallPerformance:73});await pending;
  assert.equal(h.calls.filter(x=>x[0]==='report').length,0);
});
test('malformed report never becomes ready',async()=>{
  for(const response of [{},{overallPerformance:101},{overallPerformance:NaN}]) {
    const h=harness(async()=>response);await h.ctx.run();assert.equal(h.getState().finalReport,undefined);
  }
});
