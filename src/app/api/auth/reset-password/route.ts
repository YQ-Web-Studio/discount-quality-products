import { NextResponse } from "next/server";
import { resetPasswordWordPress } from "@/lib/wordpress-auth.server";

interface ResetPasswordRequestBody {
  key?: string;
  login?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResetPasswordRequestBody;
    const key = String(body.key || "").trim();
    const login = String(body.login || "").trim();
    const password = String(body.password || "");

    if (!key || !login || !password) {
      return NextResponse.json(
        { error: "Missing required password reset fields." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    await resetPasswordWordPress(key, login, password);

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset.",
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "Failed to reset password.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
