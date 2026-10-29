"use client";

import React, { useState } from "react";
import Link from "next/link";
import { sendAdminPasswordReset } from "../../services/firebase/authService";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { OwlMascot } from "../../components/ui/OwlMascot";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!trimmedEmail.endsWith("@tip.edu.ph")) {
      setError("Only T.I.P. institutional email addresses are allowed.");
      return;
    }

    setLoading(true);
    try {
      await sendAdminPasswordReset(trimmedEmail);
      setMessage("A password reset link has been dispatched to your email address.");
      setEmail("");
    } catch (err) {
      setError((err && typeof err === "object" && "message" in err ? String(err.message || "") : "") || "Failed to submit password reset request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
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

      {/* Right panel: curved light-blue console */}
      <div className="w-full md:w-2/5 lg:w-1/3 h-full flex flex-col justify-center px-8 md:px-12 bg-sidebar-bg md:rounded-l-[48px] shadow-2xl relative z-10">
        <div className="w-full max-w-sm mx-auto space-y-8">

          {/* Owl mascot header */}
          <div className="flex flex-col items-center">
            <OwlMascot size={80} />
            <h2 className="text-sm font-black text-brand-slate uppercase tracking-wider mt-4">
              Reset Password
            </h2>
          </div>

          {/* Validation display */}
          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-2xl bg-teal-50 border border-[#14b8a6] p-4 text-xs font-semibold text-teal-700">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

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
              />
            </div>

            {/* Reset button */}
            <button
              type="submit"
              disabled={loading}
              className="figma-btn w-full text-sm py-4 mt-2"
            >
              {loading ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                "Send Reset Link"
              )}
            </button>

            <div className="flex items-center justify-center pt-2">
              <Link
                href="/login"
                className="text-xs font-bold text-brand-slate hover:text-brand-primary transition-all"
              >
                Back to Log In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
