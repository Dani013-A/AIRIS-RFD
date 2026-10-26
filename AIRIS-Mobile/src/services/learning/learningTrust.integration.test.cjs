const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
let writes=0;const storage=new Map(),original=Module._load;
Module._load=function(n,p,...a){if(n==='@react-native-async-storage/async-storage')return {getItem:async k=>storage.get(k)||null,setItem:async(k,v)=>storage.set(k,v),removeItem:async k=>storage.delete(k)};if(n==='firebase/firestore')return {collection:()=>({}),doc:()=>({}),getDocs:async()=>({empty:true,forEach:()=>{}}),writeBatch:()=>({set:()=>writes++,commit:async()=>writes++})};if(n.endsWith('/config/firebase'))return {db:{}};return original.call(this,n,p,...a);};
const engine=require('./learningCatalogService.ts'),validator=require('./catalogValidator.ts'),catalog=require('../../data/verifiedLearningCatalog.ts').VERIFIED_LEARNING_CATALOG;
const make=(i,extra={})=>({id:`synthetic-${i}`,title:`Synthetic SQL resource ${i}`,provider:`Synthetic provider ${i%4}`,description:'Synthetic fixture only',type:i%2?'course':'documentation',category:'for_you',careerPaths:['data analyst'],skills:['sql'],tags:['sql'],url:`https://learn.microsoft.com/training/modules/synthetic-${i}/`,isVerified:true,isActive:true,priority:80,verificationStatus:'verified',verification:{status:'verified',checkedAt:new Date().toISOString(),verificationMethod:'manual',sourceUrl:`https://learn.microsoft.com/training/modules/synthetic-${i}/`,contentReviewed:true,reviewedTitle:`Synthetic SQL resource ${i}`,reviewedProvider:`Synthetic provider ${i%4}`},...extra});
test('pipeline caps and deterministically diversifies more than ten matches',()=>{const p={targetPosition:'Data Analyst',skillGaps:[{skill:'SQL'}],customCatalog:Array.from({length:25},(_,i)=>make(i))};const a=engine.matchLearningRecommendations(p);assert.equal(a.length,10);assert.deepEqual(a.map(x=>x.id),engine.matchLearningRecommendations(p).map(x=>x.id));assert.ok(new Set(a.map(x=>x.provider)).size>1);});
test('incomplete and unrelated non-IT profiles never receive an IT filler feed',()=>{assert.equal(engine.matchLearningRecommendations({customCatalog:[make(1)]}).length,0);assert.equal(engine.matchLearningRecommendations({degreeProgram:'Bachelor of Arts in Psychology',targetPosition:'Psychometrician',customCatalog:[make(1)]}).length,0);});
test('verification requires affirmative current reviewed provenance',()=>{for(const o of [{isVerified:undefined},{verification:undefined},{verificationStatus:'review_required'},{verification:{status:'verified',checkedAt:'2020-01-01',verificationMethod:'http'}},{verification:{status:'verified',checkedAt:new Date().toISOString(),contentReviewed:false}}])assert.equal(validator.validateLearningResource(make(1,o)),false,JSON.stringify(o));});
test('canonical duplicate URLs and invalid destinations are excluded',()=>{const a=make(1),b=make(2,{url:a.url+'?utm_source=test#section'});assert.equal(engine.matchLearningRecommendations({targetPosition:'Data Analyst',customCatalog:[a,b]}).length,1);for(const url of ['javascript:alert(1)','http://localhost/x','https://user:password@host.example/x','https://127.0.0.1/x'])assert.equal(validator.isValidUrl(url),false);});
test('catalog refresh is read-only for student clients',async()=>{await engine.refreshCatalog();assert.equal(writes,0);});
test('published catalog has reviewed provenance and intentional thumbnail fallback',()=>{const active=catalog.filter(x=>x.isActive);assert.ok(active.length>10);for(const x of active){assert.ok(validator.validateLearningResource(x),x.id);assert.ok(x.verification.contentReviewed,x.id);assert.ok(!x.thumbnailUrl||x.thumbnailVerification?.status==='verified',x.id);}});
module.exports={engine,storage};
test('actual non-IT profiles have no unrelated IT feed across personalized surfaces',()=>{
 for(const [targetPosition,degreeProgram] of [['Accountant','BS Accountancy'],['Psychometrician','Bachelor of Arts in Psychology'],['Marketing Specialist','BS Business Administration major in Marketing Management']]){
  for(const categoryId of ['for_you','certifications','courses','practice']){
   const result=engine.matchLearningRecommendations({targetPosition,degreeProgram,categoryId});
   assert.ok(result.every(item=>!['doc_python_tutorial','doc_google_cloud_bigquery','doc_pandas_user_guide'].includes(item.id)),`${targetPosition}:${categoryId}`);
  }
 }
});
test('every verified academic program has a relevant pool without fabricated quota filler',()=>{
 const {tipManilaCollegePrograms}=require('../../data/tipManilaPrograms.ts');
 for(const college of tipManilaCollegePrograms)for(const program of college.programs){
  const items=engine.matchLearningRecommendations({degreeProgram:program.name,targetPosition:program.suggestedPositions[0]});
  assert.ok(items.length>0,program.name);assert.ok(items.length<=10);assert.ok(items.every(item=>item.verification.contentReviewed));
 }
});
test('ratings persist per account and never claim ownership of legacy unscoped values',async()=>{
 const service=require('../resume/selfAssessmentService.ts');storage.set('@airis_skill_self_assessments_v1',JSON.stringify({sql:'WEAK'}));
 assert.deepEqual(await service.getStoredSelfAssessments('synthetic-b'),{});
 await service.saveSelfAssessments({sql:'WEAK'},'synthetic-a');await service.saveSelfAssessments({accounting:'STRONG'},'synthetic-b');
 assert.deepEqual(await service.getStoredSelfAssessments('synthetic-a'),{sql:'WEAK'});assert.deepEqual(await service.getStoredSelfAssessments('synthetic-b'),{accounting:'STRONG'});assert.deepEqual(await service.getStoredSelfAssessments(),{});
});

test('optimization without a database subject never manufactures a SQL remediation gap',()=>{
 for(const raw of ['Web Performance Optimization','Network Performance Optimization','Memory tuning','Process Optimization']){
  const gap=engine.normalizeGap(raw);
  assert.ok(!gap.substantiveConcepts.includes('sql performance tuning'),raw);
  const sql=catalog.find(item=>item.title==='SQL Performance Explained: Annotated Contents');
  assert.equal(engine.evaluateGapMatch(gap,sql,null).isMatch,false,raw);
 }
 for(const raw of ['SQL performance tuning','Query optimization','Database indexing']){
  const sql=catalog.find(item=>item.title==='SQL Performance Explained: Annotated Contents');
  assert.equal(engine.evaluateGapMatch(engine.normalizeGap(raw),sql,null).isMatch,true,raw);
 }
});


test('database subject aliases normalize without claiming generic guides cover specialized tools',()=>{
 for(const raw of ['Postgres performance tuning','Databases performance tuning']){
  assert.ok(engine.normalizeGap(raw).substantiveConcepts.includes('sql performance tuning'),raw);
 }
});


test('each general career tab offers at least three distinct reviewed free resources across disciplines',()=>{
 const profiles=[{}, {degreeProgram:'BS Accountancy',targetPosition:'Accountant'}, {degreeProgram:'BS Information Technology',targetPosition:'Frontend Developer'}, {degreeProgram:'BS Civil Engineering',targetPosition:'Civil Engineer'}, {degreeProgram:'Bachelor of Arts in English',targetPosition:'Content Writer'}, {degreeProgram:'Bachelor of Secondary Education',targetPosition:'Teacher'}];
 for(const profile of profiles)for(const categoryId of ['interviews','resume','communication']){
  const items=engine.matchLearningRecommendations({...profile,categoryId,customCatalog:catalog});
  assert.ok(items.length>=3,`${JSON.stringify(profile)}:${categoryId} has ${items.length}`);
  assert.equal(new Set(items.map(x=>x.id)).size,items.length);
  assert.equal(new Set(items.map(x=>validator.canonicalResourceUrl(x.url))).size,items.length);
  for(const item of items){
   assert.equal(item.category,categoryId);assert.ok(validator.validateLearningResource(item));
   assert.ok(item.reviewNotes.includes('Free public guide; no account required'),item.id);
   assert.equal(item.thumbnailUrl,undefined);assert.ok(item.skills.length>0);
   assert.equal(item.isPersonalizedGap,undefined);
  }
 }
});
test('general tabs exclude unreviewed, failed and canonical duplicate destinations',()=>{
 const approved=catalog.find(x=>x.isActive&&x.category==='interviews');
 const candidates=[approved,{...approved,id:'synthetic-unverified',verificationStatus:'unverified'}, {...approved,id:'synthetic-broken',verification:{...approved.verification,status:'broken'}}, {...approved,id:'synthetic-duplicate',url:approved.url+'?utm_source=synthetic#top'}];
 const items=engine.matchLearningRecommendations({categoryId:'interviews',customCatalog:candidates});
 assert.deepEqual(items.map(x=>x.id),[approved.id]);
});
test('reviewed data mirrors backend and has globally distinct IDs and destinations',()=>{
 const reviewed=require('../../data/reviewedLearningResources.json');
 const backend=JSON.parse(fs.readFileSync(require.resolve('../../../../AIRIS-Backend/data/learning_resources.json'),'utf8'));
 assert.deepEqual(reviewed,backend);
 assert.equal(new Set(reviewed.map(x=>x.id)).size,reviewed.length);
 assert.equal(new Set(reviewed.map(x=>validator.canonicalResourceUrl(x.url))).size,reviewed.length);
});
test('cold launch and stale-version offline cache retain current general-tab coverage',async()=>{
 storage.set('@airis_learning_catalog_v6',JSON.stringify({version:6,resources:catalog.filter(x=>x.isActive).slice(0,3),categories:[]}));
 engine.clearLearningMemoryCache();
 const cached=await engine.loadCachedCatalog();
 for(const categoryId of ['interviews','resume','communication']){
  const items=engine.matchLearningRecommendations({categoryId,customCatalog:cached.resources});
  assert.ok(items.length>=3,`${categoryId}: ${items.length}`);
 }
});
