import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation/auth";
import {
  authService,
  InvalidCredentialsError,
} from "@/server/services/auth-service";
import { setAuthCookies } from "@/server/auth/cookies";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email or password format" },
      { status: 400 },
    );
  }

  try {
    const tokens = await authService.login(
      parsed.data.email,
      parsed.data.password,
    );
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }
    throw error;
  }
}
