import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../../../lib/firebaseAdmin';
import { COOKIE_NAME, verifyOtpSessionToken } from '../../../../lib/otpAuth';
import { LifecycleError, institutionalEmail, registerAccount, restrictAccount, selfDeleteAccount } from '../../../../lib/accountLifecycle';
import type { LifecycleDependencies } from '../../../../lib/accountLifecycle';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
export function OPTIONS() { return new NextResponse(null, { status: 204, headers }); }
const dependencies: LifecycleDependencies = {
  now: Date.now,
  transaction: operation => adminDb.runTransaction(tx => operation({
    get: async path => (await tx.get(adminDb.doc(path))).data(),
    set: (path, data) => { tx.set(adminDb.doc(path), data); },
  })),
  deleteHistory: async uid => {
    for (const name of ['resumes', 'resumeAnalyses', 'interviews', 'interviewSessions', 'activities']) {
      await adminDb.recursiveDelete(adminDb.collection('users').doc(uid).collection(name));
    }
  },
  deleteAuth: async uid => {
    try { await adminAuth.deleteUser(uid); }
    catch (error) { if ((error as { code?: string }).code !== 'auth/user-not-found') throw error; }
  },
};

export async function POST(req: NextRequest) {
  try {
    const bearer = req.headers.get('authorization');
    if (!bearer?.startsWith('Bearer ')) return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401, headers });
    let token;
    try { token = await adminAuth.verifyIdToken(bearer.slice(7), true); }
    catch { return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401, headers }); }
    const actor = await adminAuth.getUser(token.uid);
    if (actor.disabled || !actor.email || actor.email !== token.email) throw new LifecycleError('UNAUTHORIZED');
    const text = await req.text();
    if (text.length > 2048) return NextResponse.json({ code: 'INVALID_REQUEST' }, { status: 400, headers });
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['action', 'fullName', 'targetUid'].includes(key))) throw new LifecycleError('INVALID_REQUEST');
    if (body.action === 'register') {
      institutionalEmail(actor.email);
      if (typeof body.fullName !== 'string' || !body.fullName.trim() || body.fullName.length > 120) throw new LifecycleError('INVALID_REQUEST');
      const profile = await registerAccount(dependencies, actor.uid, actor.email, body.fullName);
      return NextResponse.json({ profile }, { headers });
    }
    if (body.action === 'self_delete') {
      institutionalEmail(actor.email);
      if (!actor.emailVerified || typeof token.auth_time !== 'number' || Date.now() / 1000 - token.auth_time > 300) throw new LifecycleError('RECENT_LOGIN_REQUIRED');
      await selfDeleteAccount(dependencies, actor.uid, actor.email);
      return NextResponse.json({ success: true }, { headers });
    }
    if (!['admin_remove', 'admin_disable', 'admin_enable'].includes(body.action) || typeof body.targetUid !== 'string' || !/^[\w-]{1,128}$/.test(body.targetUid)) throw new LifecycleError('INVALID_REQUEST');
    const profile = (await adminDb.doc(`users/${actor.uid}`).get()).data();
    const otp = verifyOtpSessionToken(req.cookies.get(COOKIE_NAME)?.value);
    const roles = body.action === 'admin_remove' ? ['admin'] : ['admin', 'career_center', 'ojt_coordinator'];
    if (!actor.emailVerified || !profile || profile.isDisabled === true || profile.isDeleted === true || !roles.includes(profile.role) || otp?.uid !== actor.uid || otp.role !== profile.role || otp.email.toLowerCase() !== actor.email.toLowerCase()) throw new LifecycleError('UNAUTHORIZED');
    if (profile.role === 'ojt_coordinator') {
      const targetProfile = (await adminDb.doc(`users/${body.targetUid}`).get()).data();
      if (!profile.assignedProgram || targetProfile?.degreeProgram !== profile.assignedProgram) throw new LifecycleError('UNAUTHORIZED');
    }
    const target = await adminAuth.getUser(body.targetUid);
    if (!target.email) throw new LifecycleError('IDENTITY_MISMATCH');
    await restrictAccount(dependencies, target.uid, target.email, body.action);
    return NextResponse.json({ success: true }, { headers });
  } catch (error) {
    const code = error instanceof LifecycleError ? error.code : 'ACCOUNT_OPERATION_UNAVAILABLE';
    return NextResponse.json({ code }, { status: code === 'ACCOUNT_OPERATION_UNAVAILABLE' ? 503 : code === 'INVALID_REQUEST' ? 400 : 403, headers });
  }
}
