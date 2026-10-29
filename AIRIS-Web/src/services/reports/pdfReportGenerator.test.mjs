import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const loadModule = createRequire(import.meta.url);
loadModule.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename);
const { PdfDocumentLayout } = loadModule('./pdfReportGenerator.ts');
const metadata = { reportTitle: 'Synthetic report', scopeDescription: 'Synthetic records only', generatedAt: '2026-10-29', generatedBy: 'Synthetic administrator', actorRole: 'Administrator' };

for (const rows of [[], [['Synthetic record', 0]]]) {
  test(`PDF ${rows.length ? 'zero-score row' : 'empty table'} preserves table placement and page footer output`, () => {
    const layout = new PdfDocumentLayout(metadata);
    layout.currentY = 30;
    layout.renderDataTable(['Record', 'Score'], rows);
    assert.ok(Number.isFinite(layout.doc.lastAutoTable.finalY));
    assert.equal(layout.currentY, layout.doc.lastAutoTable.finalY + 3.5);
    let saved;
    layout.doc.save = filename => { saved = filename; return layout.doc; };
    layout.finalize('synthetic-report.pdf');
    assert.equal(saved, 'synthetic-report.pdf');
    const output = layout.doc.output();
    assert.match(output, /Page 1 of 1/);
    assert.match(output, rows.length ? /Synthetic record/ : /No records found matching/);
  });
}
