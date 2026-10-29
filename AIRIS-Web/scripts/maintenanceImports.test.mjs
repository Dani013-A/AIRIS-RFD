import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

for (const script of ['dump_doc.js', 'sync-users.js', 'refine_uat_participants.js', 'seed_uat_participants.js']) {
  test(`${script} loads synthetic JSON credentials through its existing CLI path without database access`, async () => {
    const url = new URL(script, import.meta.url);
    const filename = fileURLToPath(url);
    const source = fs.readFileSync(url, 'utf8').replaceAll('import.meta.url', JSON.stringify(url.href));
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
    const credential = { project_id: 'airis-development', testOnly: true };
    let certificateInput, initialized = false;
    const stop = new Error('Synthetic bootstrap boundary');
    const mockFs = {
      existsSync: () => true,
      readdirSync: () => ['synthetic-firebase-adminsdk.json'],
      readFileSync: filename => JSON.stringify(filename.includes("uat_participants_roster") ? Array.from({ length: 50 }, (_, i) => ({ fullName: `Synthetic ${i}`, email: `msynthetic${i}@tip.edu.ph` })) : credential),
    };
    const modules = {
      'node:fs': mockFs, 'node:path': path, 'node:url': { fileURLToPath },
      'firebase-admin/app': {
        cert: value => { certificateInput = value; return 'synthetic-credential'; },
        initializeApp: () => { initialized = true; throw stop; },
        getApps: () => [],
      },
      'firebase-admin/firestore': { getFirestore: () => { assert.fail('Database access must not occur'); } },
      'firebase-admin/auth': { getAuth: () => { assert.fail('Auth access must not occur'); } },
    };
    const context = {
      exports: {}, console: { log() {}, error() {} },
      process: { argv: ['node', filename, '--service-account', '/synthetic.json'], env: {}, exit() {} },
      require: name => { assert.ok(name in modules, `Unexpected import: ${name}`); return modules[name]; },
    };
    try { vm.runInNewContext(code, context); } catch (error) { assert.equal(error, stop); }
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(initialized, true);
    assert.equal(JSON.stringify(certificateInput), JSON.stringify(credential));
  });
}
