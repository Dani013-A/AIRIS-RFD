import test from 'node:test';
import assert from 'node:assert/strict';
import { isManilaStudentEmail } from './institutionalEmail.mjs';
import { registerAccount, institutionalEmail, lifecyclePath } from './accountLifecycle.ts';
for (const email of ['m@tip.edu.ph','mdaespela@tip.edu.ph',' M.Student@TIP.EDU.PH ']) test(`Manila accepts ${email}`,()=>assert.equal(isManilaStudentEmail(email),true));
for (const email of ['qstudent@tip.edu.ph','other@tip.edu.ph','m..a@tip.edu.ph','m.@tip.edu.ph','m@evil.edu','m@tip.edu.ph.evil']) test(`rejects ${email}`, async()=>{
 assert.equal(isManilaStudentEmail(email),false);
 await assert.rejects(registerAccount({ transaction(){throw new Error('must not reach database');} },'uid',email,'Synthetic'), /MANILA_INSTITUTION_REQUIRED|INSTITUTION_REQUIRED/);
});
test('legacy identity normalization and restriction paths remain stable',()=>{
 assert.equal(institutionalEmail(' QStudent@TIP.EDU.PH '),'qstudent@tip.edu.ph');
 assert.equal(lifecyclePath(' QStudent@TIP.EDU.PH '),lifecyclePath('qstudent@tip.edu.ph'));
});
