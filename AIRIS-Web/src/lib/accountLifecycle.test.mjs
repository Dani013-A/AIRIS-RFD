import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAccount, selfDeleteAccount, restrictAccount, lifecyclePath, institutionalEmail } from './accountLifecycle.ts';

const email = 'msynthetic@tip.edu.ph';
function fixture() {
  const records = new Map([['account_lifecycle_control/migration', { legacyReviewComplete: true }]]);
  const histories = new Map();
  let queue = Promise.resolve();
  const deps = {
    now: () => 1234,
    transaction(operation) {
      const result = queue.then(async () => {
        const writes = new Map();
        const value = await operation({ get: async key => structuredClone(records.get(key)), set: (key, data) => writes.set(key, structuredClone(data)) });
        writes.forEach((data, key) => records.set(key, data));
        return value;
      });
      queue = result.catch(() => {});
      return result;
    },
    deleteHistory: async uid => histories.delete(uid), deleteAuth: async () => {},
  };
  return { records, histories, deps };
}
test('voluntary deletion allows fresh UID onboarding with no restored history', async () => {
  const { deps, records, histories } = fixture();
  await registerAccount(deps, 'old', email, 'Synthetic');
  histories.set('old', ['sensitive synthetic record']);
  await selfDeleteAccount(deps, 'old', email);
  const fresh = await registerAccount(deps, 'new', email, 'New Synthetic');
  assert.equal(fresh.hasCompletedOnboarding, false);
  assert.equal(fresh.hasCompletedInitialSetup, false);
  assert.equal(fresh.uid, 'new');
  assert.equal(histories.has('old'), false);
  assert.equal(records.get('users/old').accountState, 'DELETED');
  assert.equal('activeResumeId' in fresh, false);
});
for (const action of ['admin_remove', 'admin_disable']) test(`${action} blocks a replacement Authentication UID`, async () => {
  const { deps } = fixture();
  await registerAccount(deps, 'old', email, 'Synthetic');
  await restrictAccount(deps, 'old', email, action);
  await assert.rejects(registerAccount(deps, 'new', email, 'Synthetic'), /ACCOUNT_(REMOVED|DISABLED)/);
  await assert.rejects(selfDeleteAccount(deps, 'old', email), /ACCOUNT_(REMOVED|DISABLED)/);
});
test('unknown legacy identity remains protected until reviewed migration', async () => {
  const { deps, records } = fixture();
  records.delete('account_lifecycle_control/migration');
  await assert.rejects(registerAccount(deps, 'new', email, 'Synthetic'), /LEGACY_REVIEW_REQUIRED/);
  records.set('users/old', { uid: 'old', accountState: 'DELETED', isDeleted: true });
  await assert.rejects(registerAccount(deps, 'old', email, 'Synthetic'), /ACCOUNT_REMOVED/);
});
test('active accounts recover idempotently without migration or resetting onboarding', async () => {
  const { deps, records } = fixture();
  await registerAccount(deps, 'old', email, 'Synthetic');
  records.delete('account_lifecycle_control/migration');
  records.get('users/old').hasCompletedOnboarding = true;
  assert.equal((await registerAccount(deps, 'old', email, 'Changed')).hasCompletedOnboarding, true);
});
test('orphaned Auth record cannot claim another retained application profile', async () => {
  const { deps } = fixture();
  await registerAccount(deps, 'old', email, 'Synthetic');
  await assert.rejects(registerAccount(deps, 'new', email, 'Synthetic'), /DUPLICATE_ACCOUNT/);
});
test('institutional email normalization rejects foreign or deceptive domains', () => {
  assert.equal(institutionalEmail(' Synthetic@TIP.edu.ph '), 'synthetic@tip.edu.ph');
  for (const invalid of ['x@example.com', 'x@tip.edu.ph.evil.test', 'x@@tip.edu.ph', 'x y@tip.edu.ph']) assert.throws(() => institutionalEmail(invalid));
});
test('concurrent different UIDs cannot both own the same email', async () => {
  const { deps, records } = fixture();
  const results = await Promise.allSettled(['one','two'].map(uid => registerAccount(deps, uid, email, 'Synthetic')));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(records.get(lifecyclePath(email)).state, 'ACTIVE');
});
test('partial Auth failure leaves pending restriction; retry does not expose old data', async () => {
  const { deps, records } = fixture();
  await registerAccount(deps, 'old', email, 'Synthetic');
  deps.deleteAuth = async () => { throw new Error('synthetic failure'); };
  await assert.rejects(selfDeleteAccount(deps, 'old', email), /synthetic failure/);
  assert.equal(records.get(lifecyclePath(email)).state, 'SELF_DELETE_PENDING');
  await assert.rejects(registerAccount(deps, 'new', email, 'Synthetic'), /ACCOUNT_REMOVED/);
  deps.deleteAuth = async () => {};
  await selfDeleteAccount(deps, 'old', email);
  assert.equal(records.get(lifecyclePath(email)).state, 'SELF_DELETED');
});
test('admin restriction wins a deletion race and cannot be cleared by finalization', async () => {
  const { deps, records } = fixture();
  await registerAccount(deps, 'old', email, 'Synthetic');
  deps.deleteAuth = async () => restrictAccount(deps, 'old', email, 'admin_remove');
  await assert.rejects(selfDeleteAccount(deps, 'old', email), /ACCOUNT_REMOVED/);
  assert.equal(records.get(lifecyclePath(email)).state, 'ADMIN_REMOVED');
});
test('failed transaction never writes a success profile', async () => {
  const { deps, records } = fixture();
  deps.transaction = async () => { throw new Error('unavailable'); };
  await assert.rejects(registerAccount(deps, 'new', email, 'Synthetic'), /unavailable/);
  assert.equal(records.has('users/new'), false);
});
