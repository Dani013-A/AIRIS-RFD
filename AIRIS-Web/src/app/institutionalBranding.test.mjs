import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
test('site metadata displays the canonical institutional abbreviation', () => {
  const layout = source('./layout.tsx');
  assert.match(layout, /"T\.I\.P\. Manila"/);
  assert.doesNotMatch(layout, /"TIP Manila"/);
});
test('shared PDF letterhead displays T.I.P. and preserves technical asset names and domains', () => {
  const pdf = source('../services/reports/pdfReportGenerator.ts');
  assert.match(pdf, /this\.doc\.text\("T\.I\.P\. Career Center & OJT Coordination Office"/);
  assert.match(pdf, /TIP_LOGO_BASE64/);
  assert.match(pdf, /www\.tip\.edu\.ph/);
  for (const consumer of ['../services/firebase/reportService.ts', './reports/[id]/page.tsx']) {
    assert.match(source(consumer), /generateProfessionalPdf\(/);
  }
});
