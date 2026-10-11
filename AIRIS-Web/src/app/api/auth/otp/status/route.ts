import { NextRequest, NextResponse } from "next/server";
import { verifyOtpSessionToken, COOKIE_NAME } from "../../../../../lib/otpAuth";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const session = verifyOtpSessionToken(token);

    if (!session) {
      return NextResponse.json({ isVerified: false });
    }

    return NextResponse.json({
      isVerified: true,
      uid: session.uid,
      email: session.email,
      role: session.role,
      expiresAt: session.exp,
    });
  } catch {
    return NextResponse.json({ isVerified: false });
  }
}
