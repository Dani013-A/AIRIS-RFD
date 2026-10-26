const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),Module=require('node:module'),ts=require('../../../node_modules/typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
const original=Module._load;let fail=false;
const now=new Date(),old=new Date(now);old.setFullYear(now.getFullYear()-1);
const docs=[{id:'real',data:()=>({role:'student',createdAt:now.toISOString()})},{id:'old',data:()=>({role:'student',createdAt:old.toISOString()})},{id:'unknown',data:()=>({role:'student'})},{id:'demo',data:()=>({role:'student',isDefenseDemo:true,createdAt:now.toISOString()})},{id:'test',data:()=>({role:'student',isSyntheticUat:true,createdAt:now.toISOString()})}];
Module._load=function(n,p,...a){
 if(n==='firebase/firestore')return {collection:(_,...path)=>path.join('/'),getDocs:async path=>{if(path==='users')return {docs};if(fail)throw Error('unavailable');return {size:0,empty:true,forEach:()=>{}}}};
 if(n.endsWith('/config/firebase'))return {db:{}};
 if(n.endsWith('/config/api'))return {getAdminApiBaseUrl:()=> 'https://api.example.org'};
 return original.call(this,n,p,...a);
};
const {fetchStudentsList}=require('./userService.ts'),{fetchDashboardAnalytics}=require('./analyticsService.ts');
global.fetch=async()=>({ok:false});
test('actual roster supports explicit genuine/demo scopes without modifying records',async()=>{
 assert.equal((await fetchStudentsList({datasetScope:'all'})).length,5);
 assert.deepEqual((await fetchStudentsList({datasetScope:'genuine'})).map(x=>x.uid||x.id||x.studentId),['real','old','unknown']);
 assert.equal((await fetchStudentsList({datasetScope:'demo'})).length,2);
});
test('unknown dates remain unknown and historical same-month years do not inflate growth',async()=>{
 const roster=await fetchStudentsList({datasetScope:'genuine'});assert.equal(roster.find(x=>(x.uid||x.id||x.studentId)==='unknown').createdAt,'');
 const result=await fetchDashboardAnalytics();assert.equal(result.metrics.growthData.reduce((sum,x)=>sum+x.count,0),1);
 assert.equal(result.health.aiServiceStatus,'degraded');assert.equal(result.health.serverStatus,'unavailable');
});
test('unavailable subcollections reject aggregate generation instead of successful zero results',async()=>{fail=true;try{await assert.rejects(()=>fetchDashboardAnalytics(),/unavailable/)}finally{fail=false}});
test('shared report payload distinguishes session records, completed evaluations and point-in-time health',async()=>{
 const {fetchReportPayload}=require('./reportService.ts');
 const admin={uid:'synthetic-admin',fullName:'Synthetic test administrator',role:'career_center'};
 const usage=await fetchReportPayload('interview_usage',admin);
 assert.ok(usage.tableData.rows.some(row=>row[0]==='Total Stored Interview Sessions'));
 assert.ok(!JSON.stringify(usage).includes('reflects strong technical grounding'));
 assert.match(usage.metadata.scopeDescription,/Excludes marked demo\/test/);
 const health=await fetchReportPayload('system_health',admin);
 assert.ok(!JSON.stringify(health.executiveSummary).includes('real-time snapshot listeners active'));
 assert.match(JSON.stringify(health.executiveSummary),/reachability only/);
});
test('actual EPS helper preserves genuine zero and rejects unavailable or invalid inputs',()=>{
 const {calculateEmployabilityScore}=require('./userService.ts');
 assert.equal(calculateEmployabilityScore(0,0,'completed'),0);
 assert.equal(calculateEmployabilityScore(0,100,'completed'),60);
 assert.equal(calculateEmployabilityScore(90,80,'completed'),84);
 for(const [resume,interview,status] of [[undefined,80,'completed'],[80,undefined,'completed'],[NaN,80,'completed'],[80,Infinity,'completed'],[-1,80,'completed'],[80,101,'completed'],[80,80,'in_progress']]){
  assert.equal(calculateEmployabilityScore(resume,interview,status),undefined);
 }
});
