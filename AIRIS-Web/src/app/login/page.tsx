"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "../../store/authStore";
import { auth } from "../../config/firebase";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { OwlMascot } from "../../components/ui/OwlMascot";
import { Mail, Lock, ArrowLeft, RefreshCw, KeyRound, ClipboardCopy } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { currentAdmin, isOtpVerified, login, sendOtp, verifyOtp, logout, error, clearError, loading } = useAuthStore();

  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // OTP State
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [maskedEmail, setMaskedEmail] = useState<string>("");
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [expiryRemaining, setExpiryRemaining] = useState<number>(300); // 5 minutes
  const [cachedIdToken, setCachedIdToken] = useState<string>("");
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  // If already fully authenticated and 2FA verified, direct to dashboard
  useEffect(() => {
    if (currentAdmin && isOtpVerified) {
      router.replace("/dashboard");
    }
  }, [currentAdmin, isOtpVerified, router]);

  // Countdown timer for code expiry
  useEffect(() => {
    if (step !== "otp") return;

    const timer = setInterval(() => {
      setExpiryRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  // Cooldown timer for resending code
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const cooldownTimer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(cooldownTimer);
  }, [cooldownRemaining]);

  // Focus first OTP input when transitioning to OTP step
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => {
        digitInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Step 1: Submit Credentials
  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setFormError("All fields are required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    try {
      await login(trimmedEmail, password);

      // Successfully authenticated with Firebase - now trigger Step 2 OTP
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setFormError("Unable to establish secure authentication token.");
        return;
      }

      setCachedIdToken(idToken);
      const res = await sendOtp(idToken);
      setMaskedEmail(res.maskedEmail || trimmedEmail);
      setCooldownRemaining(res.cooldownSeconds || 60);
      setExpiryRemaining(300);
      setStep("otp");
    } catch {
      // Handled by authStore error state
    }
  };

  // Step 2: Handle Individual OTP Input
  const handleDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, ""); // Digits only

    if (!cleanVal) {
      const next = [...otpDigits];
      next[index] = "";
      setOtpDigits(next);
      return;
    }

    // Single digit input
    const char = cleanVal.slice(-1);
    const next = [...otpDigits];
    next[index] = char;
    setOtpDigits(next);

    // Auto advance focus
    if (index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const next = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtpDigits(next);

    const focusIdx = Math.min(pasted.length, 5);
    digitInputRefs.current[focusIdx]?.focus();
  };

  const handlePasteClipboard = async () => {
    setFormError(null);
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
        setFormError("Clipboard reading is not supported by your browser. Please type or paste directly into the boxes.");
        return;
      }
      const text = await navigator.clipboard.readText();
      const clean = text.replace(/\D/g, "").slice(0, 6);
      if (!clean) {
        setFormError("No numeric verification code found in clipboard.");
        return;
      }
      const next = ["", "", "", "", "", ""];
      for (let i = 0; i < clean.length; i++) {
        next[i] = clean[i];
      }
      setOtpDigits(next);
      const focusIdx = Math.min(clean.length, 5);
      digitInputRefs.current[focusIdx]?.focus();
    } catch {
      setFormError("Clipboard access was blocked. You can paste using keyboard shortcut (Cmd+V or Ctrl+V).");
    }
  };

  // Step 2: Submit OTP Verification
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const fullCode = otpDigits.join("");
    if (fullCode.length !== 6) {
      setFormError("Please enter all 6 digits of the verification code.");
      return;
    }

    if (expiryRemaining <= 0) {
      setFormError("Verification code has expired. Please request a new code.");
      return;
    }

    try {
      const token = cachedIdToken || (await auth.currentUser?.getIdToken()) || "";
      await verifyOtp(token, fullCode);
      router.replace("/dashboard");
    } catch {
      // Handled by authStore error state
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldownRemaining > 0 || loading) return;
    setFormError(null);

    try {
      const token = cachedIdToken || (await auth.currentUser?.getIdToken()) || "";
      const res = await sendOtp(token);
      setCooldownRemaining(res.cooldownSeconds || 60);
      setExpiryRemaining(300);
      setOtpDigits(["", "", "", "", "", ""]);
      digitInputRefs.current[0]?.focus();
    } catch {
      // Handled by authStore error state
    }
  };

  // Cancel OTP / Switch Account
  const handleCancelOtp = async () => {
    await logout();
    setStep("credentials");
    setOtpDigits(["", "", "", "", "", ""]);
    setPassword("");
    setFormError(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-sidebar-bg">
      {/* Left panel: campus background image with warm tint overlay */}
      <div className="relative hidden md:block md:w-3/5 lg:w-2/3 h-full overflow-hidden">
        <img
          src="/TIPMNL.jpg"
          alt="Technological Institute of the Philippines Campus"
          className="w-full h-full object-cover object-[0%_center] scale-110 blur-[2px]"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-slate-900/25" />
      </div>

      {/* Right panel: clean light-blue console running top-to-bottom edge flush with left image */}
      <div className="w-full md:w-2/5 lg:w-1/3 h-full flex flex-col justify-center px-8 md:px-12 bg-sidebar-bg shadow-2xl relative z-10">
        {/* Back Navigation to Public Landing Page */}
        <div className="absolute top-6 left-6 md:top-8 md:left-10 z-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-brand-slate hover:text-brand-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg py-1.5 px-2 group"
            aria-label="Back to Public Landing Page"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            <span>Back to Home</span>
          </Link>
        </div>

        <div className="w-full max-w-sm mx-auto space-y-6">
          {/* Owl mascot header */}
          <div className="flex flex-col items-center">
            <OwlMascot size={80} />
          </div>

          {/* Validation & Error display */}
          {(formError || error) && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-semibold text-red-700">
              {formError || error}
            </div>
          )}

          {step === "credentials" ? (
            /* STEP 1: CREDENTIALS FORM */
            <form onSubmit={handleCredentialSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <h1 className="text-lg font-bold text-brand-primary">Administrator Sign In</h1>
                <p className="text-xs text-brand-slate">Institutional & Authorized Accounts</p>
              </div>

              {/* Email input */}
              <div className="figma-input-container">
                <Mail className="text-brand-slate mr-3 shrink-0" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="Email Address"
                  className="w-full text-sm font-semibold bg-transparent border-none outline-none text-brand-primary placeholder-brand-slate/60"
                  autoComplete="email"
                />
              </div>

              {/* Password input */}
              <div className="figma-input-container">
                <Lock className="text-brand-slate mr-3 shrink-0" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Password"
                  className="w-full text-sm font-semibold bg-transparent border-none outline-none text-brand-primary placeholder-brand-slate/60"
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center justify-end px-1">
                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-brand-slate hover:text-brand-primary transition-all"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Log In button */}
              <button
                type="submit"
                disabled={loading}
                className="figma-btn w-full text-sm py-4 mt-2"
              >
                {loading ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  <>Continue to Verification</>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: EMAIL OTP 2FA VERIFICATION FORM */
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="text-center space-y-1 mb-1">
                <h1 className="text-lg font-bold text-brand-primary">Two-Factor Authentication</h1>
                <p className="text-xs text-brand-slate leading-relaxed">
                  Enter the 6-digit verification code sent to{" "}
                  <span className="font-semibold text-slate-800">{maskedEmail}</span>
                </p>
              </div>

              {/* 6-Digit OTP Input Boxes */}
              <div className="flex justify-between gap-2 my-3" onPaste={handlePaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      digitInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    disabled={loading || expiryRemaining <= 0}
                    className="w-11 h-13 text-center text-xl font-bold bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-colors shadow-sm"
                  />
                ))}
              </div>

              {/* Paste helper action */}
              <div className="flex items-center justify-between text-xs px-1 text-slate-500">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  disabled={loading || expiryRemaining <= 0}
                  className="inline-flex items-center gap-1.5 font-semibold text-brand-slate hover:text-brand-primary transition-colors cursor-pointer"
                >
                  <ClipboardCopy size={13} />
                  <span>Paste code</span>
                </button>
                <span className="text-[11px] text-slate-400">or type 6 digits</span>
              </div>

              {/* Countdown & Expiry State */}
              <div className="flex items-center justify-between text-xs px-1 font-semibold text-slate-600">
                <span>
                  {expiryRemaining > 0 ? (
                    <>Expires in <span className="font-mono text-brand-primary">{formatTime(expiryRemaining)}</span></>
                  ) : (
                    <span className="text-red-600 font-bold">Code expired</span>
                  )}
                </span>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldownRemaining > 0 || loading}
                  className={`inline-flex items-center gap-1 ${
                    cooldownRemaining > 0
                      ? "text-slate-400 cursor-not-allowed"
                      : "text-brand-primary hover:underline font-bold"
                  }`}
                >
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                  {cooldownRemaining > 0 ? `Resend (${cooldownRemaining}s)` : "Resend Code"}
                </button>
              </div>

              {/* Verify OTP Button */}
              <button
                type="submit"
                disabled={loading || otpDigits.join("").length !== 6 || expiryRemaining <= 0}
                className="figma-btn w-full text-sm py-4 mt-2"
              >
                {loading ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  <>Verify & Enter Console</>
                )}
              </button>

              {/* Switch account link */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleCancelOtp}
                  className="text-xs font-semibold text-brand-slate hover:text-brand-primary transition-colors inline-flex items-center gap-1"
                >
                  <KeyRound size={12} />
                  <span>Use a different account</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
