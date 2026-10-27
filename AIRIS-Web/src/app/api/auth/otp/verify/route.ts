import { isManilaStudentEmail, MANILA_EMAIL_MESSAGE } from "../../../../../lib/institutionalEmail.mjs";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../../../lib/firebaseAdmin";
import { createOtpSessionToken, verifyOtpHash, assertOtpSecretConfigured, COOKIE_NAME } from "../../../../../lib/otpAuth";
import { evaluateOtpChallenge } from "../../../../../lib/otpChallenge";

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
    const authHeader = req.headers.get("authorization") || "";
    let idToken = "";
    if (authHeader.startsWith("Bearer ")) {
      idToken = authHeader.substring(7).trim();
    }

    const body = await req.json().catch(() => ({}));
    if (!idToken && body.idToken) {
      idToken = body.idToken;
    }

    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!idToken || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Authentication token and 6-digit code are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Verify Firebase ID Token
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
    assertOtpSecretConfigured();

    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    const role = userData?.role;
    if (!userDoc.exists || userData?.isDisabled === true || !["student", "admin", "career_center", "ojt_coordinator"].includes(role)) {
      return NextResponse.json({ error: "Access Denied: Account is not found or has been disabled." }, { status: 403, headers: corsHeaders });
    }

    if (role === "student" && !isManilaStudentEmail(decodedToken.email)) {
      return NextResponse.json({ error: MANILA_EMAIL_MESSAGE }, { status: 403, headers: corsHeaders });
    }

    const challengeRef = adminDb.collection(role === "student" ? "student_otp_challenges" : "admin_otp_challenges").doc(uid);
    const result = await adminDb.runTransaction(async (transaction) => {
      const [freshUser, challengeSnap] = await Promise.all([transaction.get(userRef), transaction.get(challengeRef)]);
      const freshData = freshUser.data();
      if (!freshUser.exists || freshData?.isDisabled === true || freshData?.role !== role) return { code: "ACCOUNT_DENIED" } as const;
      const decision = evaluateOtpChallenge(challengeSnap.data(), { uid, email: freshData?.email, role }, code, Date.now(), verifyOtpHash);
      if (decision.update) transaction.update(challengeRef, decision.update);
      return decision;
    });

    if (result.code !== "VERIFIED") {
      const remaining = "remainingAttempts" in result ? result.remainingAttempts : 0;
      const message = {
        ACCOUNT_DENIED: "Access Denied: Account is not found or has been disabled.",
        NOT_FOUND: "No active verification challenge found. Please request a new code.",
        ALREADY_USED: "This verification code has already been used. Please sign in again.",
        EXPIRED: "Verification code has expired. Please request a new code.",
        MAX_ATTEMPTS: "Maximum verification attempts exceeded. Please request a new code.",
        INCORRECT: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      }[result.code];
      return NextResponse.json({ error: message, code: result.code, ...("remainingAttempts" in result ? { remainingAttempts: result.remainingAttempts } : {}) },
        { status: result.code === "ACCOUNT_DENIED" ? 403 : result.code === "NOT_FOUND" ? 404 : 400, headers: corsHeaders });
    }

    // 8. Generate signed session token
    const sessionToken = createOtpSessionToken(uid, result.email, role);

    // 9. Return JSON with sessionToken for mobile/API clients
    const response = NextResponse.json({
      success: true,
      message: "Two-factor verification successful.",
      sessionToken,
      user: {
        uid,
        email: result.email,
        role,
      },
    }, { headers: corsHeaders });

    // 10. For administrative browser sessions, also set secure HTTP-only cookie
    if (role !== "student") {
      response.cookies.set({
        name: COOKIE_NAME,
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 8 * 3600, // 8 hours
      });
    }

    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[OTP Verify Error]:", errorMsg);
    return NextResponse.json(
      { error: "An unexpected error occurred during verification." },
      { status: 500, headers: corsHeaders }
    );
  }
}
