import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';
const loadModule = createRequire(import.meta.url);
loadModule.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename);
let failure;
const fail = async () => { throw failure; };
const original = Module._load;
Module._load = function(name, parent, ...args) {
  if (name.endsWith('/firebase/authService')) return { signInAdmin: fail };
  if (name.endsWith('/firebase/userService')) return { fetchStudentsList: fail, fetchStudentDetails: fail, toggleStudentAccountState: fail, deleteStudentAccount: fail };
  if (name.endsWith('/firebase/auditService')) return { fetchAuditLogs: fail };
  return original.call(this, name, parent, ...args);
};
const { useAuthStore } = loadModule('./authStore.ts');
const { useStudentStore } = loadModule('./studentStore.ts');
const { useAuditStore } = loadModule('./auditStore.ts');

for (const error of [new Error('Synthetic failure'), { message: 'Synthetic failure' }]) {
  test(`stores retain message and clear loading for ${error instanceof Error ? 'Error' : 'message-bearing'} failures`, async () => {
    failure = error;
    await assert.rejects(useAuthStore.getState().login('synthetic@example.test', 'synthetic'), value => value === error);
    assert.equal(useAuthStore.getState().error, 'Synthetic failure');
    assert.equal(useAuthStore.getState().loading, false);
    assert.equal(useAuthStore.getState().currentAdmin, null);
    await useStudentStore.getState().loadStudents();
    assert.equal(useStudentStore.getState().error, 'Synthetic failure');
    assert.equal(useStudentStore.getState().loading, false);
    await useStudentStore.getState().loadStudentProfile('synthetic-profile');
    assert.equal(useStudentStore.getState().selectedStudent, null);
    assert.equal(useStudentStore.getState().error, 'Synthetic failure');
    const actor = { uid: 'synthetic-admin', name: 'Synthetic administrator', role: 'admin' };
    await assert.rejects(useStudentStore.getState().toggleAccountStatus('synthetic-profile', true, actor), value => value === error);
    await assert.rejects(useStudentStore.getState().deleteStudent('synthetic-profile', actor), value => value === error);
    assert.equal(useStudentStore.getState().actionLoading, false);
    await useAuditStore.getState().loadAuditLogs();
    assert.equal(useAuditStore.getState().error, 'Synthetic failure');
    assert.equal(useAuditStore.getState().loading, false);
  });
}

test('OTP error responses preserve rejection and never mark verification successful', async () => {
  global.fetch = async () => ({ ok: false, json: async () => ({ error: 'Synthetic OTP failure' }) });
  for (const action of [() => useAuthStore.getState().sendOtp('synthetic-token'), () => useAuthStore.getState().verifyOtp('synthetic-token', '000000')]) {
    await assert.rejects(action, /Synthetic OTP failure/);
    assert.equal(useAuthStore.getState().loading, false);
    assert.equal(useAuthStore.getState().error, 'Synthetic OTP failure');
    assert.equal(useAuthStore.getState().isOtpVerified, false);
  }
});
