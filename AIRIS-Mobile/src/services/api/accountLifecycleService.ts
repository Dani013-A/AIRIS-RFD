import { MANILA_EMAIL_MESSAGE } from "../../utils/institutionalEmail";
import { auth } from '../../config/firebase';
import { getOtpBaseUrl } from './otpService';
import { ACCOUNT_PAUSED_MSG, ACCOUNT_REMOVED_MSG } from '../../utils/accountLifecycle';
import type { AppUser } from '../../types/user.types';

export async function accountLifecycleRequest(action: 'register' | 'self_delete', fullName?: string): Promise<{ profile?: AppUser }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in again.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${getOtpBaseUrl()}/api/accounts/lifecycle`, {
      method: 'POST', headers: { Authorization: `Bearer ${await user.getIdToken(true)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...(fullName ? { fullName } : {}) }), signal: controller.signal,
    });
    const rawText = await response.text();
    let result: any = null;
    try {
      result = rawText ? JSON.parse(rawText) : {};
    } catch {
      result = null;
    }
    if (!response.ok) {
      const messages: Record<string, string> = {
        MANILA_INSTITUTION_REQUIRED: MANILA_EMAIL_MESSAGE,
        ACCOUNT_REMOVED: ACCOUNT_REMOVED_MSG, ACCOUNT_DISABLED: ACCOUNT_PAUSED_MSG,
        LEGACY_REVIEW_REQUIRED: 'Account registration requires administrator review of historical account restrictions. Please contact the administrator.',
        RECENT_LOGIN_REQUIRED: 'Please sign in again before deleting your account.',
        DUPLICATE_ACCOUNT: 'An account already exists for this email. Please sign in.',
      };
      const errorMsg = (result && result.code && messages[result.code]) ||
        (result && result.error) ||
        `The account lifecycle service is currently unavailable (HTTP ${response.status}). Please try again or contact the administrator.`;
      const err = new Error(errorMsg);
      (err as any).code = result?.code || `HTTP_${response.status}`;
      (err as any).status = response.status;
      throw err;
    }
    if (action === 'register' && (!result || !result.profile || result.profile.uid !== user.uid || result.profile.role !== 'student')) throw new Error('Account profile is unavailable. Please try again.');
    return result;
  } finally { clearTimeout(timer); }
}
