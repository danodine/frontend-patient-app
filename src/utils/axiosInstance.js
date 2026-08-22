import axios from "axios";
import * as secureStorage from "./secureStorage";
import { BASE_URL } from "../../config";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
});

axiosInstance.interceptors.request.use(async (config) => {
  const token = await secureStorage.getItemAsync("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Tell the backend which language to return server-translated messages in
  // (errors, etc.). Lazy-require the store to avoid a circular import (same
  // pattern the response interceptor below uses).
  try {
    const { store } = require("../redux/store");
    const lang = store.getState()?.language?.language;
    config.headers["Accept-Language"] = lang === "en" ? "en" : "es";
  } catch (_) {
    config.headers["Accept-Language"] = "es";
  }
  return config;
});

// Single-flight refresh so simultaneous 401s share one refresh call.
let refreshPromise = null;
async function refreshAccessToken() {
  const rt = await secureStorage.getItemAsync("refreshToken");
  if (!rt) throw new Error("No refresh token");
  // Bare axios so this call isn't itself intercepted.
  const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {
    refreshToken: rt,
  });
  if (!data?.token) throw new Error("Refresh failed");
  await secureStorage.setItemAsync("token", data.token);
  if (data.refreshToken) {
    await secureStorage.setItemAsync("refreshToken", data.refreshToken);
  }
  return data.token;
}

// On a 401 the short-lived access token has likely expired. Refresh it (once)
// and retry the request; only if the refresh itself fails do we clear the
// session and reset auth state (StackNavigator switches back to the auth stack
// off state.auth.token — no imperative navigation needed). store/authSlice are
// required lazily to avoid a circular import (authSlice imports this file).
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;
    const status = error?.response?.status;
    const url = String(original?.url || "");

    // 403 ACCOUNT_BLOCKED → an admin blocked this user mid-session. Clear the
    // stored session and reset auth so the app returns to the login stack; the
    // user can't keep using the app on a stale token. (Auth endpoints exempt so
    // the login screen can show the blocked message itself.)
    if (
      status === 403 &&
      error?.response?.data?.code === "ACCOUNT_BLOCKED" &&
      !url.includes("/auth/")
    ) {
      await secureStorage.deleteItemAsync("token");
      await secureStorage.deleteItemAsync("type");
      await secureStorage.deleteItemAsync("refreshToken");
      const { store } = require("../redux/store");
      const { clearAuth } = require("../redux/authSlice");
      store.dispatch(clearAuth());
      return Promise.reject(error);
    }

    if (status === 401 && original && !original._retryAuth && !url.includes("/auth/")) {
      original._retryAuth = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(original);
      } catch (_refreshErr) {
        await secureStorage.deleteItemAsync("token");
        await secureStorage.deleteItemAsync("type");
        await secureStorage.deleteItemAsync("refreshToken");
        const { store } = require("../redux/store");
        const { clearAuth } = require("../redux/authSlice");
        store.dispatch(clearAuth());
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
