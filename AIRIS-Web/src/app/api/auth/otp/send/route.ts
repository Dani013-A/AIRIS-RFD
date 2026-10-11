import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminAuth, adminDb } from "../../../../../lib/firebaseAdmin";
import { hashOtp } from "../../../../../lib/otpAuth";
import { sendAdminOtpEmail, maskEmail } from "../../../../../services/mail/mailService";

export async function POST(req: NextRequest) {
  try {
    // 1. Extract Bearer token
    const authHeader = req.headers.get("authorization") || "";
    let idToken = "";
    if (authHeader.startsWith("Bearer ")) {
      idToken = authHeader.substring(7).trim();
    } else {
      const body = await req.json().catch(() => ({}));
      idToken = body.idToken || "";
    }

    if (!idToken) {
      return NextResponse.json(
        { error: "Authentication token is required." },
        { status: 401 }
      );
    }

    // 2. Verify Firebase ID Token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired session. Please sign in again." },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;
    const email = decodedToken.email || "";

    // 3. Verify user exists, active, and has admin role in Firestore
    const userDocSnap = await adminDb.collection("users").doc(uid).get();
    if (!userDocSnap.exists || userDocSnap.data()?.isDisabled === true) {
      return NextResponse.json(
        { error: "Access Denied: Account is not found or has been disabled." },
        { status: 403 }
      );
    }

    const userData = userDocSnap.data()!;
    const allowedRoles = ["admin", "career_center", "ojt_coordinator"];
    if (!allowedRoles.includes(userData.role)) {
      return NextResponse.json(
        { error: "Access Denied: Administrative privileges required." },
        { status: 403 }
      );
    }

    const targetEmail = userData.email || email;
    if (!targetEmail) {
      return NextResponse.json(
        { error: "No verified email associated with this account." },
        { status: 400 }
      );
    }

    // 4. Rate-limiting & resend cooldown check
    const challengeRef = adminDb.collection("admin_otp_challenges").doc(uid);
    const existingSnap = await challengeRef.get();
    const now = Date.now();

    if (existingSnap.exists) {
      const existing = existingSnap.data()!;
      if (existing.resendCooldownUntil && now < existing.resendCooldownUntil) {
        const cooldownRemaining = Math.ceil((existing.resendCooldownUntil - now) / 1000);
        return NextResponse.json(
          {
            error: `Please wait ${cooldownRemaining} seconds before requesting a new verification code.`,
            cooldownRemaining,
          },
          { status: 429 }
        );
      }
    }

    // 5. Generate cryptographically secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const hashed = hashOtp(rawOtp);
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes
    const resendCooldownUntil = now + 60 * 1000; // 60 seconds

    // 6. Save challenge document (never store plaintext OTP)
    await challengeRef.set({
      uid,
      email: targetEmail,
      hashedOtp: hashed,
      attemptsCount: 0,
      maxAttempts: 5,
      expiresAt,
      resendCooldownUntil,
      verified: false,
      createdAt: now,
      ip: req.headers.get("x-forwarded-for") || "unknown",
    });

    // 7. Dispatch email via mailService
    const mailResult = await sendAdminOtpEmail(targetEmail, rawOtp, 5);
    if (!mailResult.success) {
      return NextResponse.json(
        {
          error: "Failed to dispatch verification email. Please check server mail configuration.",
          details: mailResult.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      maskedEmail: maskEmail(targetEmail),
      cooldownSeconds: 60,
      expiresAt,
      simulated: mailResult.simulated || false,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[OTP Send Error]:", errorMsg);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing OTP request." },
      { status: 500 }
    );
  }
}
