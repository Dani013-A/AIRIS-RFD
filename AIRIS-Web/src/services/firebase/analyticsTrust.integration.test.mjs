import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';
const loadModule = createRequire(import.meta.url);
loadModule.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
const original=Module._load;let fail=false;let interviewRows=[];
const now=new Date(),old=new Date(now);old.setFullYear(now.getFullYear()-1);
const docs=[{id:'real',data:()=>({role:'student',degreeProgram:'BS Information Technology',createdAt:now.toISOString()})},{id:'old',data:()=>({role:'student',createdAt:old.toISOString()})},{id:'unknown',data:()=>({role:'student'})},{id:'demo',data:()=>({role:'student',isDefenseDemo:true,createdAt:now.toISOString()})},{id:'test',data:()=>({role:'student',isSyntheticUat:true,createdAt:now.toISOString()})}];
Module._load=function(n,p,...a){
 if(n==='firebase/firestore')return {collection:(_,...path)=>path.join('/'),query:(path,...clauses)=>({path,clauses}),where:(field,op,value)=>({field,op,value}),getDocs:async path=>{if(typeof path==='object')return {docs:docs.filter(d=>path.clauses.every(c=>d.data()[c.field]===c.value))};if(path==='users')return {docs};if(path==='users/real/interviews')return {size:interviewRows.length,empty:!interviewRows.length,forEach:fn=>interviewRows.forEach((row,index)=>fn({id:'session-'+index,data:()=>row}))};if(fail)throw Error('unavailable');return {size:0,empty:true,forEach:()=>{}}}};
 if(n.endsWith('/config/firebase'))return {db:{}};
 if(n.endsWith('/config/api'))return {getAdminApiBaseUrl:()=> 'https://api.example.org'};
 return original.call(this,n,p,...a);
};
const {fetchStudentsList,isCompletedStoredInterview}=loadModule('./userService.ts'),{fetchDashboardAnalytics}=loadModule('./analyticsService.ts');
global.fetch=async()=>({ok:false});
const {fetchReportPayload}=loadModule('./reportService.ts');
test('actual roster supports explicit genuine/demo scopes without modifying records',async()=>{
 assert.equal((await fetchStudentsList({datasetScope:'all'})).length,5);
 assert.deepEqual((await fetchStudentsList({datasetScope:'genuine'})).map(x=>x.uid||x.id||x.studentId),['real','old','unknown']);
 assert.equal((await fetchStudentsList({datasetScope:'demo'})).length,2);
});
test('unknown dates remain unknown and historical same-month years do not inflate growth',async()=>{
 const roster=await fetchStudentsList({datasetScope:'genuine'});assert.equal(roster.find(x=>(x.uid||x.id||x.studentId)==='unknown').createdAt,'');
 const result=await fetchDashboardAnalytics({datasetScope:'genuine'});assert.equal(result.metrics.growthData.reduce((sum,x)=>sum+x.count,0),1);
 const institutional=await fetchDashboardAnalytics();assert.equal(institutional.metrics.growthData.reduce((sum,x)=>sum+x.count,0),3);
 assert.equal(result.health.aiServiceStatus,'degraded');assert.equal(result.health.serverStatus,'unavailable');
});
test('unavailable subcollections reject aggregate generation instead of successful zero results',async()=>{fail=true;try{await assert.rejects(()=>fetchDashboardAnalytics(),/unavailable/)}finally{fail=false}});
test('shared report payload distinguishes session records, completed evaluations and point-in-time health',async()=>{
 const admin={uid:'synthetic-admin',fullName:'Synthetic test administrator',role:'career_center'};
 const usage=await fetchReportPayload('interview_usage',admin);
 assert.ok(usage.tableData.rows.some(row=>row[0]==='Total Stored Interview Sessions'));
 assert.ok(!JSON.stringify(usage).includes('reflects strong technical grounding'));
 assert.match(usage.metadata.scopeDescription,/(?:including marked demo\/test|Excludes marked demo\/test)/);
 const health=await fetchReportPayload('system_health',admin);
 assert.ok(!JSON.stringify(health.executiveSummary).includes('real-time snapshot listeners active'));
 assert.match(JSON.stringify(health.executiveSummary),/reachability only/);
});
test('actual EPS helper preserves genuine zero and rejects unavailable or invalid inputs',()=>{
 const {calculateEmployabilityScore}=loadModule('./userService.ts');
 assert.equal(calculateEmployabilityScore(0,0,'completed'),0);
 assert.equal(calculateEmployabilityScore(0,100,'completed'),60);
 assert.equal(calculateEmployabilityScore(90,80,'completed'),84);
 for(const [resume,interview,status] of [[undefined,80,'completed'],[80,undefined,'completed'],[NaN,80,'completed'],[80,Infinity,'completed'],[-1,80,'completed'],[80,101,'completed'],[80,80,'in_progress']]){
  assert.equal(calculateEmployabilityScore(resume,interview,status),undefined);
 }
});
test('explicit dataset scopes agree between analytics and report population labels',async()=>{
 const admin={uid:'synthetic-admin',fullName:'Synthetic test administrator',role:'career_center'};
 for(const [scope,total] of [['all',5],['genuine',3],['demo',2]]){
  const analytics=await fetchDashboardAnalytics({datasetScope:scope});
  assert.equal(analytics.metrics.registeredStudentsCount,total);
  const profiles=await fetchReportPayload('student_profiles',admin,{datasetScope:scope});
  assert.equal(profiles.tableData.rows.length,total);
  const funnel=await fetchReportPayload('completion_funnel',admin,{datasetScope:scope});
  assert.equal(funnel.summaryStats.find(row=>row.label==='Eligible Participants').value,total);
  if(scope==='all') assert.match(profiles.metadata.scopeDescription,/including marked demo\/test/);
  if(scope==='genuine') assert.match(profiles.metadata.scopeDescription,/Excludes marked demo\/test/);
 }
});
test('coordinator queries constrain the program before reading roster records',async()=>{
 const result=await fetchStudentsList({userRole:'ojt_coordinator',assignedProgram:'BS Information Technology',program:'BS Civil Engineering'});
 assert.deepEqual(result.map(row=>row.uid),['real']);
 await assert.rejects(()=>fetchStudentsList({userRole:'ojt_coordinator'}),/assignment/);
});
test('cancelled or pending evaluations with completedAt cannot become completed scores',async()=>{
 for(const status of ['cancelled','in_progress','pending','failed']){
  interviewRows=[{completedAt:now.toISOString(),status,finalReport:{status,overallPerformance:95}}];
  const student=(await fetchStudentsList({datasetScope:'genuine'})).find(row=>row.uid==='real');
  assert.equal(student.interviewScore,undefined);assert.notEqual(student.interviewStatus,'completed');
 }
 interviewRows=[{completedAt:now.toISOString(),finalReport:{status:'completed',overallPerformance:0}}];
 assert.equal((await fetchStudentsList()).find(row=>row.uid==='real').interviewScore,0);
 assert.equal(isCompletedStoredInterview({completedAt:'invalid',status:'completed'}),false);
 assert.equal(isCompletedStoredInterview({completedAt:now.toISOString()}),true);
 interviewRows=[];
});

test('coordinator analytics and reports preserve the authenticated assignment',async()=>{
 const admin={uid:'synthetic-coordinator',fullName:'Synthetic coordinator',role:'ojt_coordinator',assignedProgram:'BS Information Technology'};
 const result=await fetchDashboardAnalytics({datasetScope:'all'},admin.role,admin.assignedProgram);
 assert.equal(result.metrics.registeredStudentsCount,1);
 const profiles=await fetchReportPayload('student_profiles',admin,{datasetScope:'all'});
 assert.equal(profiles.tableData.rows.length,1);
 const funnel=await fetchReportPayload('completion_funnel',admin,{datasetScope:'all'});
 assert.equal(funnel.summaryStats.find(row=>row.label==='Eligible Participants').value,1);
 await assert.rejects(()=>fetchReportPayload('student_profiles',{...admin,assignedProgram:undefined}),/assignment/);
});

test('conflicting session and report statuses cannot finalize an incomplete interview',async()=>{
 for(const status of ['cancelled','pending','failed','in_progress']){
  for(const [sessionStatus,reportStatus] of [[status,'completed'],['completed',status]]){
   const record={completedAt:now.toISOString(),status:sessionStatus,finalReport:{status:reportStatus,overallPerformance:95}};
   assert.equal(isCompletedStoredInterview(record),false);
   interviewRows=[record];
   const student=(await fetchStudentsList({datasetScope:'genuine'})).find(row=>row.uid==='real');
   assert.equal(student.interviewScore,undefined);
  }
 }
 interviewRows=[];
});
