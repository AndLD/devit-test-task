import { prisma } from "@/server/db/client";
import { POST as login } from "@/app/api/admin/auth/login/route";
import { POST as refresh } from "@/app/api/admin/auth/refresh/route";
import { POST as logout } from "@/app/api/admin/auth/logout/route";
import { resetDatabase, seedAdmin } from "./support/db";
import { buildRequest } from "./support/request";

describe("admin auth API", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("rejects a wrong password", async () => {
    await seedAdmin({ email: "admin@test.local", password: "correct-password" });

    const response = await login(
      buildRequest("http://localhost/api/admin/auth/login", {
        method: "POST",
        body: { email: "admin@test.local", password: "wrong-password" },
      }),
    );

    expect(response.status).toBe(401);
    expect(response.cookies.get("access_token")).toBeUndefined();
  });

  it("logs in with correct credentials and sets both cookies", async () => {
    const admin = await seedAdmin({
      email: "admin@test.local",
      password: "correct-password",
    });

    const response = await login(
      buildRequest("http://localhost/api/admin/auth/login", {
        method: "POST",
        body: { email: admin.email, password: admin.password },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get("access_token")?.value).toBeTruthy();
    expect(response.cookies.get("refresh_token")?.value).toBeTruthy();
  });

  it("rotates the refresh token and rejects reuse of the old one (replay protection)", async () => {
    const admin = await seedAdmin();
    const loginResponse = await login(
      buildRequest("http://localhost/api/admin/auth/login", {
        method: "POST",
        body: { email: admin.email, password: admin.password },
      }),
    );
    const originalRefreshToken =
      loginResponse.cookies.get("refresh_token")!.value;

    const refreshResponse = await refresh(
      buildRequest("http://localhost/api/admin/auth/refresh", {
        method: "POST",
        cookies: { refresh_token: originalRefreshToken },
      }),
    );
    expect(refreshResponse.status).toBe(200);
    const newRefreshToken = refreshResponse.cookies.get("refresh_token")!.value;
    expect(newRefreshToken).not.toBe(originalRefreshToken);

    // The rotated-out token must not work a second time.
    const replayResponse = await refresh(
      buildRequest("http://localhost/api/admin/auth/refresh", {
        method: "POST",
        cookies: { refresh_token: originalRefreshToken },
      }),
    );
    expect(replayResponse.status).toBe(401);

    // But the newly issued one still does.
    const secondRefreshResponse = await refresh(
      buildRequest("http://localhost/api/admin/auth/refresh", {
        method: "POST",
        cookies: { refresh_token: newRefreshToken },
      }),
    );
    expect(secondRefreshResponse.status).toBe(200);
  });

  it("revokes the refresh token on logout so it can no longer refresh", async () => {
    const admin = await seedAdmin();
    const loginResponse = await login(
      buildRequest("http://localhost/api/admin/auth/login", {
        method: "POST",
        body: { email: admin.email, password: admin.password },
      }),
    );
    const refreshToken = loginResponse.cookies.get("refresh_token")!.value;

    const logoutResponse = await logout(
      buildRequest("http://localhost/api/admin/auth/logout", {
        method: "POST",
        cookies: { refresh_token: refreshToken },
      }),
    );
    expect(logoutResponse.status).toBe(200);

    const refreshAfterLogout = await refresh(
      buildRequest("http://localhost/api/admin/auth/refresh", {
        method: "POST",
        cookies: { refresh_token: refreshToken },
      }),
    );
    expect(refreshAfterLogout.status).toBe(401);
  });
});
