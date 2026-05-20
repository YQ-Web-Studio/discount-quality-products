import { NextResponse } from "next/server";
import {
  WORDPRESS_AUTH_COOKIE,
  clearAuthCookieOptions,
  deleteWordPressAccount,
  getCurrentWordPressSession,
} from "@/lib/wordpress-auth.server";

interface DeleteAccountRequestBody {
  currentPassword?: string;
}

export async function POST(request: Request) {
  const session = await getCurrentWordPressSession();

  if (!session) {
    const response = NextResponse.json(
      { error: "Please sign in to delete your account." },
      { status: 401 }
    );

    response.cookies.set(WORDPRESS_AUTH_COOKIE, "", clearAuthCookieOptions());
    return response;
  }

  try {
    const body = (await request.json()) as DeleteAccountRequestBody;
    const currentPassword = String(body.currentPassword || "");

    if (!currentPassword) {
      return NextResponse.json(
        { error: "Please enter your current password." },
        { status: 400 }
      );
    }

    await deleteWordPressAccount(session.token, currentPassword);

    const response = NextResponse.json({
      success: true,
      message: "Your account has been deleted.",
    });

    response.cookies.set(WORDPRESS_AUTH_COOKIE, "", clearAuthCookieOptions());
    return response;
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "We could not delete your account right now.";

    const status = message.toLowerCase().includes("session") ? 401 : 400;
    const response = NextResponse.json({ error: message }, { status });

    if (status === 401) {
      response.cookies.set(WORDPRESS_AUTH_COOKIE, "", clearAuthCookieOptions());
    }

    return response;
  }
}
