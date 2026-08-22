import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as secureStorage from "../utils/secureStorage";
import axios from "axios";
import { BASE_URL } from "../../config";
import axiosInstance from "../utils/axiosInstance";
import { chatSocket } from "../services/chatSocket";
import { syncPreferredLanguage } from "./userSlice";
import { getUserFacingErrorMessage } from "../utils/errorMessages";

// New backend: type-specific auth endpoints. Patient app uses /api/auth/patient/*

function parseAuthResponse(responseData) {
  if (responseData == null) {
    return { token: null, user: null, type: "patient" };
  }
  const data = responseData.data ?? responseData;
  const token =
    responseData.token ??
    data?.token ??
    responseData.accessToken ??
    data?.accessToken;
  const user = data?.patient ?? data?.user ?? (data && !data.token ? data : null);
  const type = data?.type ?? "patient";
  const refreshToken = responseData.refreshToken ?? data?.refreshToken ?? null;
  return { token: token ?? null, user: user ?? null, type, refreshToken };
}

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue, getState, dispatch }) => {
    const language = getState()?.language?.language || "es";
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/patient/login`, {
        email,
        password,
      });
      let token, user, type, refreshToken;
      try {
        const parsed = parseAuthResponse(response?.data);
        token = parsed.token;
        user = parsed.user;
        type = parsed.type;
        refreshToken = parsed.refreshToken;
      } catch (parseErr) {
        console.error("[auth] Login response parse error:", parseErr?.message);
        return rejectWithValue(
          language === "es"
            ? "No se pudo procesar la respuesta del servidor."
            : "Could not process the server response.",
        );
      }
      if (!token) {
        console.warn("[auth] Login response missing token");
        return rejectWithValue(
          language === "es"
            ? "Respuesta inválida: no se recibió el token de acceso."
            : "Invalid response: no token received.",
        );
      }
      try {
        await secureStorage.setItemAsync("token", token);
        await secureStorage.setItemAsync("type", type);
        if (refreshToken) {
          await secureStorage.setItemAsync("refreshToken", refreshToken);
        }
      } catch (storeErr) {
        console.error("[auth] Storage error after login:", storeErr);
        return rejectWithValue(
          language === "es"
            ? "No se pudo guardar la sesión en el dispositivo."
            : "Failed to save session on this device.",
        );
      }
      // Push the app's current language to the account so notifications and
      // emails follow it (best-effort — never blocks login).
      try {
        dispatch(syncPreferredLanguage(language));
      } catch (_) { /* non-fatal */ }
      return { token, user, type };
    } catch (err) {
      // Mandatory email verification (S1): flag this distinctly so the screen
      // can offer a "verify now" path instead of a generic credentials error.
      const serverMsg = err.response?.data?.message || "";
      const serverCode = err.response?.data?.code;
      if (err.response?.status === 403 && /verif(y|ica|ies|ication)/i.test(serverMsg)) {
        return rejectWithValue({ code: "EMAIL_NOT_VERIFIED", message: serverMsg });
      }
      // Blocked account: flag with a code so the login screen can show a modal
      // with app-localized copy (not the raw backend message).
      if (
        err.response?.status === 403 &&
        (serverCode === "ACCOUNT_BLOCKED" || /blocked|bloquea/i.test(serverMsg))
      ) {
        return rejectWithValue({ code: "ACCOUNT_BLOCKED", message: serverMsg });
      }
      const msg = getUserFacingErrorMessage(
        err,
        language,
        language === "es"
          ? "No se pudo iniciar sesión. Verifica tus credenciales."
          : "Could not sign in. Please check your credentials.",
      );
      console.warn("[auth] Login error:", {
        message: msg,
        status: err.response?.status,
      });
      return rejectWithValue(msg);
    }
  },
);

export const signupUser = createAsyncThunk(
  "auth/signupUser",
  async (
    {
      name,
      email,
      password,
      passwordConfirm,
      nationalId,
      nationality,
      birthDate,
      phone,
      street,
      city,
      acceptedTerms,
      acceptedPrivacy,
      acceptedHealthData,
    },
    { rejectWithValue, getState },
  ) => {
    const language = getState()?.language?.language || "es";
    try {
      const body = {
        fullName: name,
        email,
        password,
        passwordConfirm,
        documentId: nationalId,
        nationality: nationality || undefined,
        // Consent (GDPR Art. 7) — required by the backend to register.
        acceptedTerms,
        acceptedPrivacy,
        acceptedHealthData,
      };
      if (phone) body.phone = phone;
      if (birthDate)
        body.birthDate =
          typeof birthDate === "string"
            ? birthDate
            : (birthDate.toISOString?.() ?? birthDate);
      if (street || city)
        body.address = {
          street: street || "",
          city: city || "",
          country: "ecuador",
        };
      const response = await axios.post(
        `${BASE_URL}/api/auth/patient/register`,
        body,
      );
      // Mandatory email verification (S1): no token yet — the account isn't
      // usable until the emailed code is verified.
      return { message: response.data?.message, email };
    } catch (err) {
      // Preserve the "dupKey,email"-shaped backend error (parsed downstream in SignUp screen)
      // and any structured field-validation array before falling back to a generic message.
      const dupOrArrayMsg =
        err.response?.data?.message ??
        (Array.isArray(err.response?.data?.errors)
          ? err.response.data.errors.map((e) => e.msg || e.message).join(", ")
          : null);
      const msg = dupOrArrayMsg ?? getUserFacingErrorMessage(
        err,
        language,
        language === "es"
          ? "No se pudo completar el registro."
          : "Could not complete registration.",
      );
      console.warn("[auth] Signup error:", {
        message: msg,
        status: err.response?.status,
        data: err.response?.data,
      });
      return rejectWithValue(msg);
    }
  },
);

// S1: verify a sign-up email code. Patient always gets a token back (first
// real login) once the code checks out.
export const verifyEmail = createAsyncThunk(
  "auth/verifyEmail",
  async ({ email, code }, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/patient/verify-email`,
        { email, code },
      );
      const { token, user, type, refreshToken } = parseAuthResponse(response.data);
      if (token) {
        await secureStorage.setItemAsync("token", token);
        await secureStorage.setItemAsync("type", type || "patient");
        if (refreshToken) await secureStorage.setItemAsync("refreshToken", refreshToken);
      }
      return { token, user, type: type || "patient", message: response.data?.message };
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es"
            ? "No se pudo verificar el código."
            : "Could not verify the code.",
        ),
      );
    }
  },
);

export const resendVerification = createAsyncThunk(
  "auth/resendVerification",
  async ({ email }, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/patient/resend-verification`,
        { email },
      );
      return response.data?.message || (language === "es" ? "Código reenviado." : "Code resent.");
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es"
            ? "No se pudo reenviar el código."
            : "Could not resend the code.",
        ),
      );
    }
  },
);

// S2 step 1: confirm the current password, get a confirmation code emailed
export const requestPasswordChangeCode = createAsyncThunk(
  "auth/requestPasswordChangeCode",
  async ({ passwordCurrent }, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const response = await axiosInstance.post(
        "/api/auth/patient/updatePassword/request-code",
        { passwordCurrent },
      );
      return response.data?.message || (language === "es" ? "Código enviado." : "Code sent.");
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es"
            ? "No se pudo enviar el código."
            : "Could not send the code.",
        ),
      );
    }
  },
);

// S2 step 2: confirm the code emailed by requestPasswordChangeCode
export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async (
    { code, password, passwordConfirm },
    { rejectWithValue, getState },
  ) => {
    const language = getState()?.language?.language || "es";
    try {
      const response = await axiosInstance.patch(
        "/api/auth/patient/updatePassword",
        {
          code,
          password,
          passwordConfirm,
        },
      );
      const { token: newToken, data } = response.data;
      const user = data?.patient ?? data?.user;
      if (newToken) await secureStorage.setItemAsync("token", newToken);
      return { token: newToken, user };
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es"
            ? "No se pudo cambiar la contraseña."
            : "Could not change the password.",
        ),
      );
    }
  },
);

export const requestPasswordReset = createAsyncThunk(
  "auth/requestPasswordReset",
  async ({ email }, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/patient/forgotPassword`,
        { email },
      );
      return response.data?.message || (language === "es" ? "Código de restablecimiento enviado." : "Reset code sent.");
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es"
            ? "No se pudo enviar el código de restablecimiento."
            : "Could not send the reset code.",
        ),
      );
    }
  },
);

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ resetCode, password, passwordConfirm }, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const response = await axios.patch(
        `${BASE_URL}/api/auth/patient/resetPassword/${resetCode}`,
        { password, passwordConfirm },
      );
      return response.data?.message || (language === "es" ? "La contraseña se ha restablecido." : "Password reset successfully.");
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es"
            ? "No se pudo restablecer la contraseña."
            : "Could not reset the password.",
        ),
      );
    }
  },
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      const token = await secureStorage.getItemAsync("token");
      const type = (await secureStorage.getItemAsync("type")) || "patient";
      const refreshToken = await secureStorage.getItemAsync("refreshToken");
      // Revoke the refresh token server-side so logout truly ends the session.
      if (refreshToken) {
        await axios.post(`${BASE_URL}/api/auth/logout`, { refreshToken });
      }
      if (token) {
        await axios.get(`${BASE_URL}/api/auth/${type}/logout`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (_) {
      // Ignore logout API errors; we still clear local state
    } finally {
      chatSocket.disconnect();
      await secureStorage.deleteItemAsync("token");
      await secureStorage.deleteItemAsync("type");
      await secureStorage.deleteItemAsync("refreshToken");
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: null,
    user: null,
    type: null,
    loading: {
      login: false,
      signup: false,
      changePassword: false,
      requestPasswordChangeCode: false,
      requestPasswordReset: false,
      resetPassword: false,
      verifyEmail: false,
      resendVerification: false,
    },
    error: {
      login: null,
      signup: null,
      changePassword: null,
      requestPasswordChangeCode: null,
      requestPasswordReset: null,
      resetPassword: null,
      verifyEmail: null,
      resendVerification: null,
    },
    authBanner: {
      type: null,
      message: null,
    },
  },
  reducers: {
    clearLoginError: (state) => {
      state.error.login = null;
    },
    clearSignupError: (state) => {
      state.error.signup = null;
    },
    clearChangePasswordError: (state) => {
      state.error.changePassword = null;
      state.error.requestPasswordChangeCode = null;
    },
    clearVerifyEmailError: (state) => {
      state.error.verifyEmail = null;
      state.error.resendVerification = null;
    },
    clearAllErrors: (state) => {
      state.error = {
        login: null,
        signup: null,
        changePassword: null,
        requestPasswordChangeCode: null,
        requestPasswordReset: null,
        resetPassword: null,
        verifyEmail: null,
        resendVerification: null,
      };
    },
    clearAuth: (state) => {
      state.token = null;
      state.user = null;
      state.type = null;
      state.loading = {
        login: false,
        signup: false,
        changePassword: false,
        requestPasswordChangeCode: false,
        requestPasswordReset: false,
        resetPassword: false,
        verifyEmail: false,
        resendVerification: false,
      };
      state.error = {
        login: null,
        signup: null,
        changePassword: null,
        requestPasswordChangeCode: null,
        requestPasswordReset: null,
        resetPassword: null,
        verifyEmail: null,
        resendVerification: null,
      };
    },
    clearAuthBanner: (state) => {
      state.authBanner = {
        type: null,
        message: null,
      };
    },
    setAuthFromStorage: (state, action) => {
      if (action.payload?.token) state.token = action.payload.token;
      if (action.payload?.type) state.type = action.payload.type;
      if (action.payload?.user) state.user = action.payload.user;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading.login = true;
        state.error.login = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading.login = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.type = action.payload.type ?? "patient";
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading.login = false;
        state.error.login = action.payload;
      })
      .addCase(signupUser.pending, (state) => {
        state.loading.signup = true;
        state.error.signup = null;
      })
      .addCase(signupUser.fulfilled, (state) => {
        // No token yet — mandatory email verification (S1) comes first.
        state.loading.signup = false;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading.signup = false;
        state.error.signup = action.payload;
      })
      .addCase(verifyEmail.pending, (state) => {
        state.loading.verifyEmail = true;
        state.error.verifyEmail = null;
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.loading.verifyEmail = false;
        if (action.payload.token) {
          state.token = action.payload.token;
          state.user = action.payload.user;
          state.type = action.payload.type ?? "patient";
        }
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.loading.verifyEmail = false;
        state.error.verifyEmail = action.payload;
      })
      .addCase(resendVerification.pending, (state) => {
        state.loading.resendVerification = true;
        state.error.resendVerification = null;
      })
      .addCase(resendVerification.fulfilled, (state) => {
        state.loading.resendVerification = false;
      })
      .addCase(resendVerification.rejected, (state, action) => {
        state.loading.resendVerification = false;
        state.error.resendVerification = action.payload;
      })
      .addCase(requestPasswordChangeCode.pending, (state) => {
        state.loading.requestPasswordChangeCode = true;
        state.error.requestPasswordChangeCode = null;
      })
      .addCase(requestPasswordChangeCode.fulfilled, (state) => {
        state.loading.requestPasswordChangeCode = false;
      })
      .addCase(requestPasswordChangeCode.rejected, (state, action) => {
        state.loading.requestPasswordChangeCode = false;
        state.error.requestPasswordChangeCode = action.payload;
      })
      .addCase(changePassword.pending, (state) => {
        state.loading.changePassword = true;
        state.error.changePassword = null;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.loading.changePassword = false;
        if (action.payload?.token) state.token = action.payload.token;
        if (action.payload?.user) state.user = action.payload.user;
        state.authBanner = {
          type: "success",
          message: "Contraseña actualizada correctamente.",
        };
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading.changePassword = false;
        state.error.changePassword = action.payload;
        state.authBanner = {
          type: "error",
          message: action.payload || "No se pudo cambiar la contraseña.",
        };
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.token = null;
        state.user = null;
        state.type = null;
        state.loading = {
          login: false,
          signup: false,
          changePassword: false,
          requestPasswordReset: false,
          resetPassword: false,
        };
        state.error = {
          login: null,
          signup: null,
          changePassword: null,
          requestPasswordReset: null,
          resetPassword: null,
        };
      })
      .addCase(requestPasswordReset.pending, (state) => {
        state.loading.requestPasswordReset = true;
        state.error.requestPasswordReset = null;
      })
      .addCase(requestPasswordReset.fulfilled, (state) => {
        state.loading.requestPasswordReset = false;
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.loading.requestPasswordReset = false;
        state.error.requestPasswordReset = action.payload;
      })
      .addCase(resetPassword.pending, (state) => {
        state.loading.resetPassword = true;
        state.error.resetPassword = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading.resetPassword = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading.resetPassword = false;
        state.error.resetPassword = action.payload;
      });
  },
});

export const {
  clearLoginError,
  clearSignupError,
  clearChangePasswordError,
  clearVerifyEmailError,
  clearAllErrors,
  clearAuth,
  clearAuthBanner,
  setAuthFromStorage,
} = authSlice.actions;

export default authSlice.reducer;
