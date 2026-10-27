import { isManilaStudentEmail, MANILA_EMAIL_MESSAGE } from "../../../../../lib/institutionalEmail.mjs";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminAuth, adminDb } from "../../../../../lib/firebaseAdmin";
import { hashOtp } from "../../../../../lib/otpAuth";
import { sendAdminOtpEmail, sendStudentOtpEmail, maskEmail } from "../../../../../services/mail/mailService";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

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
        { status: 401, headers: corsHeaders }
      );
    }

    // 2. Verify Firebase ID Token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired session. Please sign in again." },
        { status: 401, headers: corsHeaders }
      );
    }

    const uid = decodedToken.uid;
    const email = decodedToken.email || "";

    // 3. Verify user exists, active, and has permitted role in Firestore
    const userDocSnap = await adminDb.collection("users").doc(uid).get();
    if (!userDocSnap.exists || userDocSnap.data()?.isDisabled === true) {
      return NextResponse.json(
        { error: "Access Denied: Account is not found or has been disabled." },
        { status: 403, headers: corsHeaders }
      );
    }

    const userData = userDocSnap.data()!;
    const isStudent = userData.role === "student";
    const allowedAdminRoles = ["admin", "career_center", "ojt_coordinator"];
    const isAdmin = allowedAdminRoles.includes(userData.role);

    if (!isStudent && !isAdmin) {
      return NextResponse.json(
        { error: "Access Denied: Role not authorized for two-factor verification." },
        { status: 403, headers: corsHeaders }
      );
    }

    if (isStudent && !isManilaStudentEmail(email)) {
      return NextResponse.json({ error: MANILA_EMAIL_MESSAGE }, { status: 403, headers: corsHeaders });
    }

    const targetEmail = isStudent ? email : userData.email || email;
    if (!targetEmail) {
      return NextResponse.json(
        { error: "No verified email associated with this account." },
        { status: 400, headers: corsHeaders }
      );
    }

    const collectionName = isStudent ? "student_otp_challenges" : "admin_otp_challenges";

    // 4. Rate-limiting & resend cooldown check
    const challengeRef = adminDb.collection(collectionName).doc(uid);
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
          { status: 429, headers: corsHeaders }
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
      role: userData.role,
      hashedOtp: hashed,
      attemptsCount: 0,
      maxAttempts: 5,
      expiresAt,
      resendCooldownUntil,
      verified: false,
      createdAt: now,
      ip: req.headers.get("x-forwarded-for") || "unknown",
    });

    // 7. Dispatch email via mailService with role-appropriate template
    const mailResult = isStudent
      ? await sendStudentOtpEmail(targetEmail, rawOtp, 5)
      : await sendAdminOtpEmail(targetEmail, rawOtp, 5);

    if (!mailResult.success) {
      return NextResponse.json(
        {
          error: "Failed to dispatch verification email. Please check server mail configuration.",
          details: mailResult.error,
        },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      maskedEmail: maskEmail(targetEmail),
      cooldownSeconds: 60,
      expiresAt,
      simulated: mailResult.simulated || false,
    }, { headers: corsHeaders });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[OTP Send Error]:", errorMsg);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing OTP request." },
      { status: 500, headers: corsHeaders }
    );
  }
}
