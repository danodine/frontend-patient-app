import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { BASE_URL } from "../../config";
import * as secureStorage from "../utils/secureStorage";
import {
  appendProfileFields,
  appendSimpleFields,
  appendPhoto,
} from "../utils/formDataHelpers";
import axiosInstance from "../utils/axiosInstance";
import { getUserFacingErrorMessage } from "../utils/errorMessages";

// New backend: type-specific profile. Patient app uses /api/patients/me.

function getProfileImageUri(payload) {
  if (!payload) return null;
  if (payload.profileImageUrl) {
    const path = payload.profileImageUrl.startsWith("/")
      ? payload.profileImageUrl
      : `/${payload.profileImageUrl}`;
    return `${BASE_URL}${path}`;
  }
  if (payload.profile?.photo) {
    return `${BASE_URL}/img/users/${payload.profile.photo}`;
  }
  return null;
}

/** Normalize API response: backend may return { data: { patient: {...} } } or { data: {...} } */
function normalizeMePayload(payload) {
  if (payload == null || typeof payload !== "object") return payload ?? {};
  const inner = payload.patient ?? payload.user ?? payload;
  return typeof inner === "object" && inner !== null ? inner : payload;
}

export const getCurrentUser = createAsyncThunk(
  "users/getCurrentUser",
  async (_, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const type = (await secureStorage.getItemAsync("type")) || "patient";
      const path = `/api/${type}s/me`;
      const response = await axiosInstance.get(path);
      const raw =
        response.data?.data != null ? response.data.data : response.data;
      return normalizeMePayload(raw);
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudo cargar el perfil." : "Could not load the profile.",
        ),
      );
    }
  },
);

export const updateUser = createAsyncThunk(
  "users/updateUser",
  async (userData, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const type = (await secureStorage.getItemAsync("type")) || "patient";
      const path = `/api/${type}s/me`;
      const formData = new FormData();
      appendSimpleFields(formData, userData);
      if (userData.profile) {
        appendProfileFields(formData, userData.profile);
      }
      appendPhoto(formData, userData.profileImageUri);

      const response = await axiosInstance.patch(path, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const raw =
        response.data?.data != null ? response.data.data : response.data;
      return normalizeMePayload(raw);
    } catch (err) {
      const message = getUserFacingErrorMessage(
        err,
        language,
        language === "es" ? "No se pudo actualizar el perfil." : "Could not update the profile.",
      );
      const status = err.response?.status;
      const data = err.response?.data;
      // eslint-disable-next-line no-console
      console.error("[updateUser] Error updating profile:", {
        message,
        status,
        responseData: data,
        fullError: err,
      });
      return rejectWithValue(message);
    }
  },
);

/**
 * M19: register this device's Expo push token so the backend can send real
 * push notifications (e.g. waitlist "a slot opened up" alerts). Patient-only
 * for now — the type-agnostic /api/${type}s/me path is kept for consistency
 * with the other thunks here, but only patientController.updateMe currently
 * allows this field.
 */
export const registerPushToken = createAsyncThunk(
  "users/registerPushToken",
  async (expoPushToken, { rejectWithValue }) => {
    if (!expoPushToken) return null;
    try {
      const type = (await secureStorage.getItemAsync("type")) || "patient";
      const path = `/api/${type}s/me`;
      await axiosInstance.patch(path, { expoPushToken });
      return expoPushToken;
    } catch (err) {
      // Silent failure: push-token registration is a background best-effort
      // step, not something that should surface an error to the patient.
      return rejectWithValue(err?.message || "Failed to register push token");
    }
  },
);

// Persist the selected UI language to the patient's account so the backend can
// localize notifications and emails to it (the Accept-Language header only
// covers live requests, not events triggered by others). Best-effort, silent.
export const syncPreferredLanguage = createAsyncThunk(
  "users/syncPreferredLanguage",
  async (code) => {
    if (code !== "es" && code !== "en") return null;
    try {
      const token = await secureStorage.getItemAsync("token");
      if (!token) return null; // not logged in
      const type = (await secureStorage.getItemAsync("type")) || "patient";
      await axiosInstance.patch(`/api/${type}s/me`, { preferredLanguage: code });
      return code;
    } catch (_) {
      // Non-fatal — the toggle already applied locally; resync next time.
      return null;
    }
  },
);

export const deleteMe = createAsyncThunk(
  "users/deleteMe",
  async (arg, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    // Password confirmation is required by the backend (unless Google-only).
    const password = typeof arg === "string" ? arg : arg?.password;
    // Optional "why are you leaving?" captured for the admin closure log.
    const reasonCode = typeof arg === "object" ? arg?.reasonCode : undefined;
    const reasonText = typeof arg === "object" ? arg?.reasonText : undefined;
    try {
      const type = (await secureStorage.getItemAsync("type")) || "patient";
      const path = `/api/${type}s/me`;
      await axiosInstance.delete(path, {
        data: {
          password,
          reasonCode: reasonCode || undefined,
          reasonText: (reasonText || "").trim() || undefined,
        },
      });
      await secureStorage.deleteItemAsync("token");
      await secureStorage.deleteItemAsync("type");
      await secureStorage.deleteItemAsync("refreshToken");
      return true;
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudo eliminar la cuenta." : "Could not delete the account.",
        ),
      );
    }
  },
);

const userSlice = createSlice({
  name: "users",
  initialState: {
    currentUser: {},
    cachedProfileImageUri: null,
    loading: {
      get: false,
      update: false,
      delete: false,
    },
    error: {
      get: null,
      update: null,
      delete: null,
    },
    userBanner: {
      type: null,
      message: null,
    },
  },
  reducers: {
    clearUserError: (state) => {
      state.error = { get: null, update: null, delete: null };
    },
    clearCurrentUser: (state) => {
      state.currentUser = {};
      state.cachedProfileImageUri = null;
    },
    setCachedProfileImageUri: (state, action) => {
      state.cachedProfileImageUri = action.payload;
    },
    clearUserBanner: (state) => {
      state.userBanner = { type: null, message: null };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCurrentUser.pending, (state) => {
        state.loading.get = true;
        state.error.get = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading.get = false;
        state.currentUser = action.payload ?? {};
        state.cachedProfileImageUri = getProfileImageUri(action.payload);
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading.get = false;
        state.error.get = action.payload;
      })
      .addCase(updateUser.pending, (state) => {
        state.loading.update = true;
        state.error.update = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading.update = false;
        state.currentUser = action.payload ?? state.currentUser;
        state.cachedProfileImageUri =
          getProfileImageUri(action.payload) ?? state.cachedProfileImageUri;
        state.userBanner = { type: "success", message: "banerSuccess" };
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update = action.payload;
        state.userBanner = {
          type: "error",
          message: action.payload ?? "banerError",
        };
        // eslint-disable-next-line no-console
        console.warn("[updateUser] Rejected:", action.payload, action.error);
      })
      .addCase(deleteMe.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
      })
      .addCase(deleteMe.fulfilled, (state) => {
        state.loading.delete = false;
        state.currentUser = {};
        state.cachedProfileImageUri = null;
      })
      .addCase(deleteMe.rejected, (state, action) => {
        state.loading.delete = false;
        state.error.delete = action.payload;
      });
  },
});

export const { clearUserError, clearCurrentUser, clearUserBanner } =
  userSlice.actions;
export default userSlice.reducer;
