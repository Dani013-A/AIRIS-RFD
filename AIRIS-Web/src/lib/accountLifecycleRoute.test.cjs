const {test, beforeEach} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
require.extensions['.ts'] = (module, path) => module._compile(ts.transpileModule(fs.readFileSync(path,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, path);
let token, actor, otp, writes;
const records = new Map();
const auth = {
  verifyIdToken: async () => token,
  getUser: async uid => uid === actor.uid ? actor : { uid, email: 'target@tip.edu.ph', emailVerified: true },
  deleteUser: async () => {},
};
const db = {
  doc: path => ({ path, get: async () => ({ data: () => records.get(path) }) }),
  runTransaction: async operation => operation({ get: async ref => ({ data: () => records.get(ref.path) }), set: (ref, value) => { writes++; records.set(ref.path, value); } }),
  recursiveDelete: async () => {},
};
const original = Module._load;
Module._load = function(id, parent, isMain) {
  if (id.endsWith('/firebaseAdmin')) return { adminAuth: auth, adminDb: db };
  if (id.endsWith('/otpAuth')) return { COOKIE_NAME: 'otp', verifyOtpSessionToken: () => otp };
  if (id === 'next/server') return { NextResponse: { json: (body, options = {}) => ({body, status: options.status || 200}) } };
  return original(id, parent, isMain);
};
const { POST } = require('../app/api/accounts/lifecycle/route.ts');
beforeEach(() => {
  records.clear(); writes = 0;
  token = {uid:'synthetic', email:'msynthetic@tip.edu.ph', auth_time: Date.now()/1000};
  actor = {uid:token.uid, email:token.email, emailVerified:true}; otp = null;
  records.set('account_lifecycle_control/migration', {legacyReviewComplete:true});
});
function request(body, bearer = 'Bearer synthetic') {
  return { headers: { get: () => bearer }, cookies: { get: () => ({value:'synthetic'}) }, text: async () => JSON.stringify(body) };
}
test('client cannot assign deletion origin, identity or privileges', async () => {
  for (const extra of [{deletionOrigin:'SELF'}, {uid:'victim'}, {role:'admin'}, {email:'victim@tip.edu.ph'}]) {
    const result = await POST(request({action:'register',fullName:'Synthetic',...extra}));
    assert.equal(result.status,400); assert.equal(writes,0);
  }
});
test('unsigned callers cannot register or delete', async () => {
  assert.equal((await POST(request({action:'self_delete'},null))).status,401);
  assert.equal(writes,0);
});
test('fresh unverified signup may create a student profile but cannot delete', async () => {
  actor.emailVerified = false;
  assert.equal((await POST(request({action:'register',fullName:'Synthetic'}))).status,200);
  assert.equal(records.get('users/synthetic').role,'student');
  assert.equal((await POST(request({action:'self_delete'}))).status,403);
});
test('self deletion requires recent authoritative login', async () => {
  token.auth_time = Date.now()/1000 - 600;
  assert.equal((await POST(request({action:'self_delete'}))).body.code,'RECENT_LOGIN_REQUIRED');
  assert.equal(writes,0);
});
test('admin action rejects a student and an administrator without OTP', async () => {
  for (const role of ['student','admin']) {
    records.set('users/synthetic',{role});
    assert.equal((await POST(request({action:'admin_remove',targetUid:'target'}))).status,403);
    assert.equal(writes,0);
  }
});
test('disabled authoritative Auth identity cannot recover registration', async () => {
  actor.disabled = true;
  assert.equal((await POST(request({action:'register',fullName:'Synthetic'}))).status,403);
  assert.equal(writes,0);
});

test('verified admin OTP authorizes restriction but staff cannot permanently remove', async () => {
  records.set('users/synthetic',{role:'admin'});
  records.set('users/target',{uid:'target',email:'target@tip.edu.ph',role:'student'});
  otp = {uid:'synthetic',role:'admin',email:actor.email};
  assert.equal((await POST(request({action:'admin_remove',targetUid:'target'}))).status,200);
  assert.equal(records.get('users/target').deletionOrigin,'ADMIN');
  records.set('users/synthetic',{role:'career_center'});
  otp.role = 'career_center';
  assert.equal((await POST(request({action:'admin_remove',targetUid:'target'}))).status,403);
});

test('coordinator restriction respects server-owned assigned program', async () => {
  records.set('users/synthetic',{role:'ojt_coordinator',assignedProgram:'Synthetic Program A'});
  records.set('users/target',{uid:'target',email:'target@tip.edu.ph',role:'student',degreeProgram:'Synthetic Program B'});
  otp = {uid:'synthetic',role:'ojt_coordinator',email:actor.email};
  assert.equal((await POST(request({action:'admin_disable',targetUid:'target'}))).status,403);
  assert.equal(writes,0);
});
test('QC campus signup is rejected before profile writes even when migration review is complete', async () => {
 token.email = actor.email = 'qsynthetic@tip.edu.ph';
 const result = await POST(request({action:'register',fullName:'Synthetic'}));
 assert.equal(result.status,403); assert.equal(result.body.code,'MANILA_INSTITUTION_REQUIRED'); assert.equal(writes,0);
});
