import { NextRequest, NextResponse } from "next/server";
import { verifyOtpSessionToken, COOKIE_NAME } from "../../../../../lib/otpAuth";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    let token = req.cookies.get(COOKIE_NAME)?.value;
    const authHeader = req.headers.get("authorization") || "";
    if (!token && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }

    const session = verifyOtpSessionToken(token);

    if (!session) {
      return NextResponse.json({ isVerified: false }, { headers: corsHeaders });
    }

    return NextResponse.json({
      isVerified: true,
      uid: session.uid,
      email: session.email,
      role: session.role,
      expiresAt: session.exp,
    }, { headers: corsHeaders });
  } catch {
    return NextResponse.json({ isVerified: false }, { headers: corsHeaders });
  }
}
