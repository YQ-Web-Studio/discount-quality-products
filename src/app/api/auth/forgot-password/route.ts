import { NextResponse } from "next/server";
import { lostPasswordWordPress } from "@/lib/wordpress-auth.server";

interface ForgotPasswordRequestBody {
  email?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ForgotPasswordRequestBody;
    const email = String(body.email || "").trim();

    if (!email) {
      return NextResponse.json(
        { error: "Email or username is required." },
        { status: 400 }
      );
    }

    await lostPasswordWordPress(email);

    return NextResponse.json({
      success: true,
      message: "Password reset link has been sent to your email address.",
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "Failed to send password reset email.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
