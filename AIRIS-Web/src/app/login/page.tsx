"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "../../store/authStore";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { OwlMascot } from "../../components/ui/OwlMascot";
import { Mail, Lock, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { currentAdmin, login, error, clearError, loading } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  useEffect(() => {
    if (currentAdmin) {
      router.replace("/dashboard");
    }
  }, [currentAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setFormError("All fields are required.");
      return;
    }

    if (!trimmedEmail.endsWith("@tip.edu.ph")) {
      setFormError("Only TIP institutional email addresses are allowed.");
      return;
    }

    try {
      await login(trimmedEmail, password);
      router.replace("/dashboard");
    } catch {
      // Handled by authStore error state
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      {/* Left panel: campus background image with warm tint overlay */}
      <div className="relative hidden md:block md:w-3/5 lg:w-2/3 h-full overflow-hidden">
        <img
          src="/TIPFront.png"
          alt="Technological Institute of the Philippines Campus"
          className="w-full h-full object-cover scale-110 blur-[2px]"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-slate-900/25" />
      </div>

      {/* Right panel: curved light-blue console */}
      <div className="w-full md:w-2/5 lg:w-1/3 h-full flex flex-col justify-center px-8 md:px-12 bg-sidebar-bg md:rounded-l-[48px] shadow-2xl relative z-10">
        {/* Back Navigation to Public Landing Page - anchored at top-left of blue login panel */}
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

          {/* Validation display */}
          {(formError || error) && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-semibold text-red-700">
              {formError || error}
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
                <>
                  Log In <span className="font-extrabold"></span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
