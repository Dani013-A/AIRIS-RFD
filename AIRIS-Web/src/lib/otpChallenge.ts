interface Account {
  uid: string;
  email?: string;
  role: string;
}

interface Challenge {
  uid?: string;
  email?: string;
  role?: string;
  hashedOtp?: string;
  attemptsCount?: number;
  maxAttempts?: number;
  expiresAt?: number;
  verified?: boolean;
  locked?: boolean;
}

export function evaluateOtpChallenge(challenge: Challenge | undefined, account: Account, code: string, now: number, verifyOtpHash: (code: string, hash: string) => boolean) {
  if (!challenge || challenge.uid !== account.uid || challenge.role !== account.role || !challenge.email ||
      (account.email && challenge.email.toLowerCase() !== account.email.toLowerCase())) {
    return { code: "NOT_FOUND" } as const;
  }
  if (challenge.verified === true) return { code: "ALREADY_USED" } as const;
  if (!Number.isFinite(challenge.expiresAt) || now > challenge.expiresAt!) {
    return { code: "EXPIRED", update: { expired: true } } as const;
  }
  const attempts = Number.isInteger(challenge.attemptsCount) && challenge.attemptsCount! >= 0 ? challenge.attemptsCount! : 0;
  const maxAttempts = Number.isInteger(challenge.maxAttempts) && challenge.maxAttempts! > 0 ? challenge.maxAttempts! : 5;
  if (challenge.locked === true || attempts >= maxAttempts) {
    return { code: "MAX_ATTEMPTS", remainingAttempts: 0, update: { locked: true } } as const;
  }
  if (!challenge.hashedOtp || !verifyOtpHash(code, challenge.hashedOtp)) {
    const nextAttempts = attempts + 1;
    return {
      code: nextAttempts >= maxAttempts ? "MAX_ATTEMPTS" : "INCORRECT",
      remainingAttempts: maxAttempts - nextAttempts,
      update: { attemptsCount: nextAttempts, locked: nextAttempts >= maxAttempts, lastFailedAttempt: now },
    } as const;
  }
  return { code: "VERIFIED", email: challenge.email, update: { verified: true, consumedAt: now } } as const;
}
