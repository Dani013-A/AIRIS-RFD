import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../../../lib/firebaseAdmin";
import { verifyOtpHash, createOtpSessionToken, COOKIE_NAME } from "../../../../../lib/otpAuth";

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

    const code = (body.code || "").toString().trim();

    if (!idToken || !code) {
      return NextResponse.json(
        { error: "Authentication token and 6-digit code are required." },
        { status: 400 }
      );
    }

    // 1. Verify Firebase ID Token
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

    // 2. Retrieve challenge from Firestore
    const challengeRef = adminDb.collection("admin_otp_challenges").doc(uid);
    const challengeSnap = await challengeRef.get();

    if (!challengeSnap.exists) {
      return NextResponse.json(
        { error: "No active verification challenge found. Please request a new code.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const challenge = challengeSnap.data()!;
    const now = Date.now();

    // 3. Check if challenge already consumed
    if (challenge.verified === true) {
      return NextResponse.json(
        { error: "This verification code has already been used. Please sign in again.", code: "ALREADY_USED" },
        { status: 400 }
      );
    }

    // 4. Check expiration (5 minutes)
    if (now > challenge.expiresAt) {
      await challengeRef.update({ expired: true });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new code.", code: "EXPIRED" },
        { status: 400 }
      );
    }

    // 5. Check maximum attempts (5 attempts limit)
    const currentAttempts = challenge.attemptsCount || 0;
    if (currentAttempts >= 5) {
      await challengeRef.update({ locked: true });
      return NextResponse.json(
        { error: "Maximum verification attempts exceeded. Please request a new code.", code: "MAX_ATTEMPTS" },
        { status: 400 }
      );
    }

    // 6. Verify submitted code using constant-time hash comparison
    const isMatch = verifyOtpHash(code, challenge.hashedOtp);

    if (!isMatch) {
      const newAttempts = currentAttempts + 1;
      const remaining = Math.max(0, 5 - newAttempts);
      await challengeRef.update({
        attemptsCount: newAttempts,
        locked: newAttempts >= 5,
        lastFailedAttempt: now,
      });

      if (remaining === 0) {
        return NextResponse.json(
          { error: "Maximum attempts exceeded. This code has been invalidated.", code: "MAX_ATTEMPTS", remainingAttempts: 0 },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`, remainingAttempts: remaining },
        { status: 400 }
      );
    }

    // 7. Success: Mark challenge as verified and consumed
    await challengeRef.update({
      verified: true,
      consumedAt: now,
    });

    // 8. Fetch user role to include in session
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const role = userDoc.exists ? userDoc.data()?.role || "admin" : "admin";

    // 9. Generate signed session token
    const sessionToken = createOtpSessionToken(uid, challenge.email, role);

    // 10. Set secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: "Two-factor verification successful.",
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 3600, // 8 hours
    });

    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[OTP Verify Error]:", errorMsg);
    return NextResponse.json(
      { error: "An unexpected error occurred during verification." },
      { status: 500 }
    );
  }
}
