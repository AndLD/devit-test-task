import type { AxiosInstance, AxiosResponse } from "axios";
import { httpClient } from "@/server/lib/http-client";
import { ShopifyClientError } from "./types";

// Shopify deprecated static Admin API access tokens for newly-created
// custom apps on 2026-01-01 — apps created via the Dev Dashboard only
// expose a Client ID/Secret, exchanged for a short-lived (~24h) token via
// the client credentials grant. See:
// https://shopify.dev/docs/apps/build/dev-dashboard/get-api-access-tokens
export interface ShopifyTokenProvider {
  getAccessToken(): Promise<string>;
}

// Wraps a fixed token (a pre-2026 legacy custom app's static Admin API
// access token, or one obtained by some other means) — no expiry, no
// network call.
export class StaticTokenProvider implements ShopifyTokenProvider {
  constructor(private readonly token: string) {}

  async getAccessToken(): Promise<string> {
    return this.token;
  }
}

// Refreshes 60s before the token's reported expiry rather than waiting for
// a request to actually fail on an expired token — Shopify's own docs
// recommend refreshing ahead of expiry over a token-per-call approach.
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

export class ClientCredentialsTokenProvider implements ShopifyTokenProvider {
  private cached: { token: string; expiresAt: number } | null = null;

  constructor(
    private readonly storeDomain: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
    // Injectable for testing (see AGENTS.md's testability principle) —
    // defaults to the shared server-side axios instance.
    private readonly http: AxiosInstance = httpClient,
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.cached && this.cached.expiresAt > Date.now()) {
      return this.cached.token;
    }

    let response: AxiosResponse;
    try {
      response = await this.http.post(
        `https://${this.storeDomain}/admin/oauth/access_token`,
        new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
    } catch {
      throw new ShopifyClientError("Could not reach Shopify to obtain an access token.");
    }

    if (response.status < 200 || response.status >= 300) {
      throw new ShopifyClientError(
        `Shopify token exchange failed with status ${response.status}. Confirm the app is installed on this store and both are in the same Shopify organization.`,
      );
    }

    const payload = response.data;
    if (
      typeof payload?.access_token !== "string" ||
      typeof payload?.expires_in !== "number"
    ) {
      throw new ShopifyClientError("Shopify token exchange returned an unexpected response.");
    }

    this.cached = {
      token: payload.access_token,
      expiresAt: Date.now() + payload.expires_in * 1000 - EXPIRY_SAFETY_MARGIN_MS,
    };
    return this.cached.token;
  }
}
