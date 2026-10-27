export const MANILA_EMAIL_MESSAGE = 'Only T.I.P. Manila institutional email addresses starting with m and ending in @tip.edu.ph are accepted.';

export function isManilaStudentEmail(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const email = value.trim().toLowerCase();
  const local = email.split('@')[0];
  return email.length <= 254 && local.length <= 64 && /^m[a-z0-9!#$%&'*+/=?^_`{|}~-]*(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@tip\.edu\.ph$/.test(email);
}
