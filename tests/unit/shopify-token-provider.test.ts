import { jest } from "@jest/globals";
import {
  ClientCredentialsTokenProvider,
  StaticTokenProvider,
} from "@/server/services/shopify/token-provider";
import { ShopifyClientError } from "@/server/services/shopify/types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("StaticTokenProvider", () => {
  it("always returns the fixed token, with no network calls", async () => {
    const provider = new StaticTokenProvider("shpat_fixed-token");
    expect(await provider.getAccessToken()).toBe("shpat_fixed-token");
    expect(await provider.getAccessToken()).toBe("shpat_fixed-token");
  });
});

describe("ClientCredentialsTokenProvider", () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("exchanges client id/secret for a token via the documented grant", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ access_token: "fresh-token", expires_in: 86399 }),
    );
    const provider = new ClientCredentialsTokenProvider(
      "test-shop.myshopify.com",
      "client-id",
      "client-secret",
    );

    const token = await provider.getAccessToken();

    expect(token).toBe("fresh-token");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://test-shop.myshopify.com/admin/oauth/access_token",
      expect.objectContaining({ method: "POST" }),
    );
    const [, init] = fetchSpy.mock.calls[0];
    const body = init?.body as URLSearchParams;
    expect(body.get("grant_type")).toBe("client_credentials");
    expect(body.get("client_id")).toBe("client-id");
    expect(body.get("client_secret")).toBe("client-secret");
  });

  it("caches the token and doesn't re-request while still valid", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ access_token: "fresh-token", expires_in: 86399 }),
    );
    const provider = new ClientCredentialsTokenProvider(
      "test-shop.myshopify.com",
      "client-id",
      "client-secret",
    );

    await provider.getAccessToken();
    await provider.getAccessToken();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("re-requests once the cached token is past its expiry", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ access_token: "first-token", expires_in: 1 }))
      .mockResolvedValueOnce(jsonResponse({ access_token: "second-token", expires_in: 86399 }));
    const provider = new ClientCredentialsTokenProvider(
      "test-shop.myshopify.com",
      "client-id",
      "client-secret",
    );

    const first = await provider.getAccessToken();
    // expires_in: 1 second minus the 60s safety margin is already in the
    // past by the time this runs, so the next call must re-fetch.
    const second = await provider.getAccessToken();

    expect(first).toBe("first-token");
    expect(second).toBe("second-token");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("throws ShopifyClientError when the exchange fails", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ error: "invalid_client" }, 401));
    const provider = new ClientCredentialsTokenProvider(
      "test-shop.myshopify.com",
      "client-id",
      "wrong-secret",
    );

    await expect(provider.getAccessToken()).rejects.toBeInstanceOf(ShopifyClientError);
  });

  it("throws ShopifyClientError on a network failure", async () => {
    fetchSpy.mockRejectedValue(new Error("network down"));
    const provider = new ClientCredentialsTokenProvider(
      "test-shop.myshopify.com",
      "client-id",
      "client-secret",
    );

    await expect(provider.getAccessToken()).rejects.toBeInstanceOf(ShopifyClientError);
  });
});
