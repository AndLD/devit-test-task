import { jest } from "@jest/globals";
import {
  ClientCredentialsTokenProvider,
  StaticTokenProvider,
} from "@/server/services/shopify/token-provider";
import { ShopifyClientError } from "@/server/services/shopify/types";

// A fake satisfying just the shape ClientCredentialsTokenProvider actually
// calls (`post`) — same structural-typing approach used for the
// repository/provider fakes elsewhere in this suite.
function makeFakeHttpClient(post: (...args: unknown[]) => unknown) {
  return { post } as never;
}

describe("StaticTokenProvider", () => {
  it("always returns the fixed token, with no network calls", async () => {
    const provider = new StaticTokenProvider("shpat_fixed-token");
    expect(await provider.getAccessToken()).toBe("shpat_fixed-token");
    expect(await provider.getAccessToken()).toBe("shpat_fixed-token");
  });
});

describe("ClientCredentialsTokenProvider", () => {
  it("exchanges client id/secret for a token via the documented grant", async () => {
    const post = jest.fn(async () => ({
      status: 200,
      data: { access_token: "fresh-token", expires_in: 86399 },
    }));
    const provider = new ClientCredentialsTokenProvider(
      "test-shop.myshopify.com",
      "client-id",
      "client-secret",
      makeFakeHttpClient(post),
    );

    const token = await provider.getAccessToken();

    expect(token).toBe("fresh-token");
    expect(post).toHaveBeenCalledWith(
      "https://test-shop.myshopify.com/admin/oauth/access_token",
      expect.any(URLSearchParams),
      expect.objectContaining({
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    );
    const [, body] = post.mock.calls[0] as unknown as [string, URLSearchParams];
    expect(body.get("grant_type")).toBe("client_credentials");
    expect(body.get("client_id")).toBe("client-id");
    expect(body.get("client_secret")).toBe("client-secret");
  });

  it("caches the token and doesn't re-request while still valid", async () => {
    const post = jest.fn(async () => ({
      status: 200,
      data: { access_token: "fresh-token", expires_in: 86399 },
    }));
    const provider = new ClientCredentialsTokenProvider(
      "test-shop.myshopify.com",
      "client-id",
      "client-secret",
      makeFakeHttpClient(post),
    );

    await provider.getAccessToken();
    await provider.getAccessToken();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it("re-requests once the cached token is past its expiry", async () => {
    const post = jest
      .fn<() => Promise<{ status: number; data: unknown }>>()
      .mockResolvedValueOnce({
        status: 200,
        data: { access_token: "first-token", expires_in: 1 },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { access_token: "second-token", expires_in: 86399 },
      });
    const provider = new ClientCredentialsTokenProvider(
      "test-shop.myshopify.com",
      "client-id",
      "client-secret",
      makeFakeHttpClient(post as never),
    );

    const first = await provider.getAccessToken();
    // expires_in: 1 second minus the 60s safety margin is already in the
    // past by the time this runs, so the next call must re-fetch.
    const second = await provider.getAccessToken();

    expect(first).toBe("first-token");
    expect(second).toBe("second-token");
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("throws ShopifyClientError when the exchange fails", async () => {
    const post = jest.fn(async () => ({ status: 401, data: { error: "invalid_client" } }));
    const provider = new ClientCredentialsTokenProvider(
      "test-shop.myshopify.com",
      "client-id",
      "wrong-secret",
      makeFakeHttpClient(post),
    );

    await expect(provider.getAccessToken()).rejects.toBeInstanceOf(ShopifyClientError);
  });

  it("throws ShopifyClientError on a network failure", async () => {
    const post = jest.fn(async () => {
      throw new Error("network down");
    });
    const provider = new ClientCredentialsTokenProvider(
      "test-shop.myshopify.com",
      "client-id",
      "client-secret",
      makeFakeHttpClient(post),
    );

    await expect(provider.getAccessToken()).rejects.toBeInstanceOf(ShopifyClientError);
  });
});
