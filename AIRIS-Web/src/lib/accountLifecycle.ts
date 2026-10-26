import { createHash } from 'node:crypto';

type RecordData = Record<string, unknown>;
export interface LifecycleTransaction {
  get(path: string): Promise<RecordData | undefined>;
  set(path: string, data: RecordData): void;
}
export interface LifecycleDependencies {
  transaction<T>(operation: (tx: LifecycleTransaction) => Promise<T>): Promise<T>;
  deleteHistory(uid: string): Promise<void>;
  deleteAuth(uid: string): Promise<void>;
  now(): number;
}
export class LifecycleError extends Error {
  code: string;
  constructor(code: string) { super(code); this.code = code; }
}
export function institutionalEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@tip\.edu\.ph$/.test(normalized)) throw new LifecycleError('INSTITUTION_REQUIRED');
  return normalized;
}
export function lifecyclePath(email: string): string {
  return `account_lifecycle/${createHash('sha256').update(institutionalEmail(email)).digest('hex')}`;
}
function restriction(state: unknown) {
  if (state === 'ADMIN_DISABLED') throw new LifecycleError('ACCOUNT_DISABLED');
  if (state !== undefined && state !== 'ACTIVE' && state !== 'SELF_DELETED') throw new LifecycleError('ACCOUNT_REMOVED');
}
function active(profile: RecordData | undefined) {
  return profile && profile.isDeleted !== true && profile.isDisabled !== true && !['DELETED', 'DISABLED'].includes(String(profile.accountState));
}

export async function registerAccount(deps: LifecycleDependencies, uid: string, email: string, fullName: string) {
  email = institutionalEmail(email);
  const path = lifecyclePath(email);
  return deps.transaction(async tx => {
    const [entry, own, control] = await Promise.all([tx.get(path), tx.get(`users/${uid}`), tx.get('account_lifecycle_control/migration')]);
    restriction(entry?.state);
    if (own && !active(own)) throw new LifecycleError(own.isDisabled === true && own.isDeleted !== true ? 'ACCOUNT_DISABLED' : 'ACCOUNT_REMOVED');
    if (entry?.state === 'ACTIVE' && entry.uid !== uid) throw new LifecycleError('DUPLICATE_ACCOUNT');
    if (entry?.state === 'SELF_DELETED' && entry.uid === uid) throw new LifecycleError('ACCOUNT_REMOVED');
    // Legacy tombstones removed email and origin. A reviewed backfill is required before unknown identities can enroll.
    if (!entry && !own && control?.legacyReviewComplete !== true) throw new LifecycleError('LEGACY_REVIEW_REQUIRED');
    if (own && (own.uid !== uid || String(own.email ?? '').trim().toLowerCase() !== email || own.role !== 'student')) throw new LifecycleError('IDENTITY_MISMATCH');
    const profile = own ?? {
      uid, email, fullName: fullName.trim().slice(0, 120), role: 'student', accountState: 'ACTIVE',
      isDisabled: false, isDeleted: false, hasCompletedOnboarding: false,
      hasCompletedInitialSetup: false, isProfileComplete: false,
      createdAt: deps.now(), updatedAt: deps.now(),
    };
    tx.set(path, { uid, state: 'ACTIVE', updatedAt: deps.now() });
    if (!own) tx.set(`users/${uid}`, profile);
    return profile;
  });
}

export async function selfDeleteAccount(deps: LifecycleDependencies, uid: string, email: string) {
  const path = lifecyclePath(email);
  await deps.transaction(async tx => {
    const [entry, profile] = await Promise.all([tx.get(path), tx.get(`users/${uid}`)]);
    if (entry?.state === 'SELF_DELETE_PENDING' && entry.uid === uid) return;
    restriction(entry?.state);
    if (!active(profile) || profile?.role !== 'student' || profile.email !== institutionalEmail(email)) throw new LifecycleError('ACCOUNT_REMOVED');
    if (entry && (entry.uid !== uid || entry.state !== 'ACTIVE')) throw new LifecycleError('ACCOUNT_REMOVED');
    tx.set(path, { uid, state: 'SELF_DELETE_PENDING', updatedAt: deps.now() });
    tx.set(`users/${uid}`, { uid, accountState: 'DELETED', isDeleted: true, isDisabled: true, deletionOrigin: 'SELF', updatedAt: deps.now() });
  });
  // Failure leaves a durable protected pending state; never report successful deletion early.
  await deps.deleteHistory(uid);
  await deps.deleteAuth(uid);
  await deps.transaction(async tx => {
    const entry = await tx.get(path);
    if (entry?.uid !== uid || entry.state !== 'SELF_DELETE_PENDING') throw new LifecycleError('ACCOUNT_REMOVED');
    tx.set(path, { uid, state: 'SELF_DELETED', updatedAt: deps.now() });
  });
}

export async function restrictAccount(deps: LifecycleDependencies, uid: string, email: string, action: 'admin_remove' | 'admin_disable' | 'admin_enable') {
  const path = lifecyclePath(email);
  await deps.transaction(async tx => {
    const [entry, profile] = await Promise.all([tx.get(path), tx.get(`users/${uid}`)]);
    if (!profile || (profile.role !== 'student' && profile.deletionOrigin !== 'SELF') || (entry && entry.uid !== uid)) throw new LifecycleError('IDENTITY_MISMATCH');
    if (action === 'admin_enable' && (entry?.state !== 'ADMIN_DISABLED' || profile.isDeleted === true)) throw new LifecycleError('ACCOUNT_REMOVED');
    const state = action === 'admin_remove' ? 'ADMIN_REMOVED' : action === 'admin_disable' ? 'ADMIN_DISABLED' : 'ACTIVE';
    tx.set(path, { uid, state, updatedAt: deps.now() });
    tx.set(`users/${uid}`, action === 'admin_remove'
      ? { uid, accountState: 'DELETED', isDeleted: true, isDisabled: true, deletionOrigin: 'ADMIN', updatedAt: deps.now() }
      : { ...profile, accountState: action === 'admin_disable' ? 'DISABLED' : 'ACTIVE', isDisabled: action === 'admin_disable', updatedAt: deps.now() });
  });
}
