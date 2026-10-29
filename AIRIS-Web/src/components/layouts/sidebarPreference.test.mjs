import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function renderLayout(server, saved) {
  const values = new Map(saved === null ? [] : [['airis_sidebar_collapsed', saved]]);
  const events = new EventTarget(), buttons = [];
  let subscription;
  const admin = { uid: 'synthetic', fullName: 'Synthetic administrator', role: 'admin', email: 'synthetic@example.test' };
  const modules = {
    react: {
      useState: initial => [initial, () => {}], useEffect() {},
      useSyncExternalStore: (subscribe, snapshot, serverSnapshot) => {
        subscription = { subscribe, snapshot, serverSnapshot };
        return server ? serverSnapshot() : snapshot();
      },
    },
    'react/jsx-runtime': {
      jsx: (type, props) => { if (type === 'button') buttons.push(props); return { type, props }; },
      jsxs: (type, props) => ({ type, props }),
    },
    'next/navigation': { useRouter: () => ({ replace() {} }), usePathname: () => '/dashboard' },
    '../../store/authStore': { useAuthStore: () => ({ currentAdmin: admin, initialized: true, isOtpVerified: true }) },
    '../../types/auth.types': { formatAdminRoleLabel: () => 'Administrator' },
  };
  const source = fs.readFileSync(new URL('./DashboardLayout.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, require: name => modules[name] ?? {}, Event,
    window: events,
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
  });
  exports.DashboardLayout({ children: null });
  return { buttons, subscription, values, events };
}

test('sidebar server snapshot stays expanded and client reads saved collapsed preference', () => {
  const server = renderLayout(true, 'true');
  assert.ok(server.buttons.some(button => button['aria-label'] === 'Collapse Sidebar'));
  const client = renderLayout(false, 'true');
  assert.ok(client.buttons.some(button => button['aria-label'] === 'Expand Sidebar'));
  assert.equal(client.subscription.snapshot(), true);
  assert.equal(client.subscription.serverSnapshot(), false);
});

test('sidebar toggle persists its preference, notifies its subscriber and cleans up', () => {
  const page = renderLayout(false, null);
  let updates = 0;
  const unsubscribe = page.subscription.subscribe(() => updates++);
  page.buttons.find(button => button['aria-label'] === 'Collapse Sidebar').onClick();
  assert.equal(page.values.get('airis_sidebar_collapsed'), 'true');
  assert.equal(page.subscription.snapshot(), true);
  assert.equal(updates, 1);
  unsubscribe();
  page.events.dispatchEvent(new Event('airis-sidebar-preference'));
  assert.equal(updates, 1);
});
