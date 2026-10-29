import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual page's asynchronous effects with controlled request ordering.
function pageHarness() {
  const states = [], effects = [], requests = [];
  let stateIndex = 0, effectIndex = 0, reportKey = 'student_profiles';
  const admin = { uid: 'synthetic-admin', role: 'career_center' };
  const search = new URLSearchParams();
  const react = {
    useState(initial) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useEffect(callback, dependencies) {
      const index = effectIndex++;
      const previous = effects[index];
      if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
        previous?.cleanup?.();
        effects[index] = { dependencies, callback };
      }
    },
    useMemo: callback => callback(),
  };
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ replace() {} }), useParams: () => ({ id: reportKey }), useSearchParams: () => search },
    '../../../store/authStore': { useAuthStore: () => ({ currentAdmin: admin }) },
    '../../../config/tipManilaAcademic': { TIP_MANILA_COORDINATORS: [], getCoordinatorById: () => undefined },
    '../../../services/firebase/reportService': {
      fetchReportPayload: (...args) => new Promise((resolve, reject) => requests.push({ args, resolve, reject })),
    },
  };
  const source = fs.readFileSync(new URL('./[id]/page.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source + '\nexport { ReportDetailContent };', {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: name => modules[name] ?? {}, URLSearchParams, Error });
  return {
    states, requests,
    render(key = reportKey) {
      reportKey = key;
      stateIndex = effectIndex = 0;
      const tree = exports.ReportDetailContent();
      for (const effect of effects) {
        if (effect.callback) {
          effect.cleanup = effect.callback();
          delete effect.callback;
        }
      }
      return tree;
    },
    unmount() { for (const effect of effects) effect.cleanup?.(); },
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('report navigation ignores stale results and uses institutional scope', async () => {
  const page = pageHarness();
  page.render();
  assert.equal(page.requests[0].args[2].datasetScope, 'all');
  page.render('interview_usage');
  page.requests[0].resolve({ title: 'Obsolete report' });
  await flush();
  assert.equal(page.states[0], null);
  page.requests[1].resolve({ title: 'Current report' });
  await flush();
  assert.equal(page.states[0].title, 'Current report');
});

test('report failure clears prior data and unmount prevents late updates', async () => {
  const page = pageHarness();
  page.render();
  page.requests[0].reject(new Error('Synthetic unavailable report'));
  await flush();
  assert.match(page.states[2], /unavailable/);
  assert.equal(page.states[0], null);
  page.render('completion_funnel');
  const before = page.states[0];
  page.unmount();
  page.requests[1].resolve({ title: 'Late result' });
  await flush();
  assert.equal(page.states[0], before);
});
