import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { apiClient } from "@/lib/api-client";

// Wraps apiClient so a short-lived access token expiring mid-session doesn't
// interrupt the user: on a 401, silently exchanges the refresh-token cookie
// for a new access token (POST /api/admin/auth/refresh) and retries the
// original request exactly once. If the refresh itself fails (the refresh
// token is also expired/revoked — e.g. after logging out elsewhere), the
// original 401 response is returned so the caller can redirect to login.
export async function authenticatedRequest<T = unknown>(
  config: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  const response = await apiClient.request<T>(config);
  if (response.status !== 401) return response;

  const refreshResponse = await apiClient.post("/api/admin/auth/refresh");
  if (refreshResponse.status < 200 || refreshResponse.status >= 300) {
    return response;
  }

  return apiClient.request<T>(config);
}
