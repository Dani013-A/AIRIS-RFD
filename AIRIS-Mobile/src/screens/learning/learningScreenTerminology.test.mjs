import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';
import ts from 'typescript';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const learning=read('./LearningScreen.tsx');const upload=read('../onboarding/ResumeUploadIntroScreen.tsx');
const source=read('../../data/officialResumeTemplates.ts');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};new Function('exports',compiled)(exports);const templates=exports.OFFICIAL_RESUME_TEMPLATES;
test('only TIP, Harvard and Oxford are offered, without cohort examples',()=>{
 assert.deepEqual(templates.map(t=>t.id),['tip','harvard','oxford']);assert.doesNotMatch(learning,/Business Resume Example|Tech Cohort|JUAN DELA CRUZ|generatePdfFromMarkdown/);
});
test('bundled originals match the verified publisher file hashes',()=>{
 for(const template of templates.filter(t=>t.fileName)){
  const bytes=readFileSync(new URL('../../../assets/resume-templates/'+template.fileName,import.meta.url));assert.ok(bytes.subarray(0,5).equals(Buffer.from('%PDF-')));assert.equal(createHash('sha256').update(bytes).digest('hex'),template.sha256);assert.equal(createHash('md5').update(bytes).digest('hex'),template.md5);assert.ok(template.documentUrl.startsWith('https://'));
 }
});
test('unverified TIP file is explicitly unavailable rather than impersonated',()=>{
 const tip=templates[0];assert.ok(tip.unavailableReason);assert.equal(tip.fileName,undefined);assert.match(learning,/Official template unavailable/);
});
test('onboarding routes to the same official resources instead of generating TIP content',()=>{
 assert.match(upload,/Browse official resume templates/);assert.match(upload,/\/\(student\)\/resume-templates/);assert.doesNotMatch(upload,/downloadAirisResumeTemplate|Download T\.I\.P\. Standard Resume Template/);
});
