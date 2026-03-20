import axios from "axios";
import { useAuthStore } from "@/store/authStore";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1",
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pft-access-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    const status = error.response?.status as number | undefined;
    const requestUrl = String(originalRequest?.url ?? "");

    if (status !== 401 || originalRequest?._retry || requestUrl.includes("/auth/login") || requestUrl.includes("/auth/register") || requestUrl.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const nextAccessToken = await refreshAccessToken();
      if (!nextAccessToken) {
        throw error;
      }

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
      return api(originalRequest);
    } catch {
      useAuthStore.getState().clearSession();
      if (window.location.pathname !== "/auth") {
        window.location.href = "/auth";
      }

      return Promise.reject(error);
    }
  },
);

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const authState = useAuthStore.getState();
      const refreshToken = authState.refreshToken;

      if (!refreshToken) {
        return null;
      }

      const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
        refreshToken,
      });

      useAuthStore.getState().setSession(data);
      return data.accessToken as string;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}
