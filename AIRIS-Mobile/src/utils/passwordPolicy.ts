export interface PasswordRequirementRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirementRule[] = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (pwd: string) => pwd.length >= 8,
  },
  {
    id: "uppercase",
    label: "At least 1 uppercase letter (A-Z)",
    test: (pwd: string) => /[A-Z]/.test(pwd),
  },
  {
    id: "lowercase",
    label: "At least 1 lowercase letter (a-z)",
    test: (pwd: string) => /[a-z]/.test(pwd),
  },
  {
    id: "number",
    label: "At least 1 number (0-9)",
    test: (pwd: string) => /[0-9]/.test(pwd),
  },
  {
    id: "special",
    label: "At least 1 special character (!@#$%^&*)",
    test: (pwd: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
  },
];

export interface PasswordValidationResult {
  isValid: boolean;
  failedRules: string[];
  message?: string;
}

/**
 * Validates a password against the single canonical AIRIS security standard.
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (!password) {
    return {
      isValid: false,
      failedRules: PASSWORD_REQUIREMENTS.map((r) => r.label),
      message: "Password is required.",
    };
  }

  const failedRules: string[] = [];
  for (const rule of PASSWORD_REQUIREMENTS) {
    if (!rule.test(password)) {
      failedRules.push(rule.label);
    }
  }

  if (failedRules.length > 0) {
    return {
      isValid: false,
      failedRules,
      message: `Password does not meet requirements: ${failedRules.join(", ")}`,
    };
  }

  return { isValid: true, failedRules: [] };
}
