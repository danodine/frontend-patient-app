import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../utils/axiosInstance";
import { getUserFacingErrorMessage } from "../utils/errorMessages";

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async ({ unreadOnly = false } = {}, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const params = unreadOnly ? "?unreadOnly=true" : "";
      const response = await axiosInstance.get(`/api/patients/me/notifications${params}`);
      const body = response.data ?? {};
      const data = body.data ?? body;
      let list = data?.notifications ?? (Array.isArray(data) ? data : []);
      if (!Array.isArray(list) && body.notifications) list = body.notifications;
      if (!Array.isArray(list)) list = [];
      return list;
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudieron cargar las notificaciones." : "Could not load notifications.",
        ),
      );
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markNotificationRead",
  async (notificationId, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      await axiosInstance.patch(`/api/patients/me/notifications/${notificationId}/read`);
      return notificationId;
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudo marcar la notificación como leída." : "Could not mark notification as read.",
        ),
      );
    }
  }
);

/** Mark every unread notification read in one request (S8: clears the tab
 *  badge once the patient opens the notifications screen). */
export const markAllNotificationsRead = createAsyncThunk(
  "notifications/markAllNotificationsRead",
  async (_, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      await axiosInstance.patch(`/api/patients/me/notifications/read-all`);
      return true;
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudieron marcar todas como leídas." : "Could not mark all as read.",
        ),
      );
    }
  }
);

export const deleteNotification = createAsyncThunk(
  "notifications/deleteNotification",
  async (notificationId, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      await axiosInstance.delete(`/api/patients/me/notifications/${notificationId}`);
      return notificationId;
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudo eliminar la notificación." : "Could not delete notification.",
        ),
      );
    }
  }
);

export const approveAppointmentChange = createAsyncThunk(
  "notifications/approveAppointmentChange",
  async (payload, { rejectWithValue }) => {
    const appointmentId = typeof payload === "string" ? payload : payload?.appointmentId;
    if (!appointmentId) return rejectWithValue("Missing appointmentId");
    try {
      const response = await axiosInstance.patch(`/api/appointments/${appointmentId}/patient-approve`);
      const body = response.data ?? {};
      const data = body.data ?? body;
      const appointment = data?.appointment ?? data;
      return { appointment, notificationId: typeof payload === "object" ? payload.notificationId : undefined };
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message ?? "No se pudo aprobar el cambio.";
      const isNotFound = status === 404 || serverMsg === "appointment.notFound";
      if (!isNotFound) {
        // eslint-disable-next-line no-console
        console.error("[approveAppointmentChange] Error:", { status, serverMsg, data: err.response?.data });
      }
      return rejectWithValue(serverMsg);
    }
  }
);

export const rejectAppointmentChange = createAsyncThunk(
  "notifications/rejectAppointmentChange",
  async (payload, { rejectWithValue }) => {
    const appointmentId = typeof payload === "string" ? payload : payload?.appointmentId;
    if (!appointmentId) return rejectWithValue("Missing appointmentId");
    try {
      const response = await axiosInstance.patch(`/api/appointments/${appointmentId}/patient-reject`);
      const body = response.data ?? {};
      const data = body.data ?? body;
      const appointment = data?.appointment ?? data;
      return { appointment, notificationId: typeof payload === "object" ? payload.notificationId : undefined };
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message ?? "No se pudo rechazar el cambio.";
      const isNotFound = status === 404 || serverMsg === "appointment.notFound";
      if (!isNotFound) {
        // eslint-disable-next-line no-console
        console.error("[rejectAppointmentChange] Error:", { status, serverMsg, data: err.response?.data });
      }
      return rejectWithValue(serverMsg);
    }
  }
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    list: [],
    /** Notification _ids the user has approved OR rejected in this session (hide only those, not future ones for same appointment). */
    approvedNotificationIds: [],
    loading: {
      fetch: false,
      approve: null,
      reject: null,
      delete: null,
    },
    error: {
      fetch: null,
      approve: null,
    },
  },
  reducers: {
    clearNotificationsError: (state) => {
      state.error = { fetch: null, approve: null };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading.fetch = true;
        state.error.fetch = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading.fetch = false;
        state.list = action.payload ?? [];
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading.fetch = false;
        state.error.fetch = action.payload;
      })
      // Optimistic: mark read immediately on dispatch, roll back on failure.
      .addCase(markNotificationRead.pending, (state, action) => {
        const idx = state.list.findIndex((n) => n._id === action.meta.arg);
        if (idx >= 0 && !state.list[idx].readAt) {
          state.list[idx].readAt = new Date().toISOString();
        }
      })
      .addCase(markNotificationRead.rejected, (state, action) => {
        const idx = state.list.findIndex((n) => n._id === action.meta.arg);
        if (idx >= 0) state.list[idx].readAt = null;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        const now = new Date().toISOString();
        state.list.forEach((n) => {
          if (!n.readAt) n.readAt = now;
        });
      })
      .addCase(approveAppointmentChange.pending, (state, action) => {
        const arg = action.meta.arg;
        state.loading.approve = typeof arg === "string" ? arg : arg?.appointmentId;
        state.error.approve = null;
      })
      .addCase(approveAppointmentChange.fulfilled, (state, action) => {
        state.loading.approve = null;
        const { notificationId } = action.payload ?? {};
        if (notificationId && !state.approvedNotificationIds.includes(notificationId)) {
          state.approvedNotificationIds.push(notificationId);
        }
      })
      .addCase(approveAppointmentChange.rejected, (state, action) => {
        state.loading.approve = null;
        const payload = action.payload;
        const arg = action.meta.arg;
        const appointmentId = typeof arg === "string" ? arg : arg?.appointmentId;
        const isNotFound =
          payload === "appointment.notFound" ||
          (typeof payload === "string" && payload.toLowerCase().includes("not found"));
        if (isNotFound && appointmentId && Array.isArray(state.list)) {
          state.list = state.list.filter((n) => n.data?.appointmentId !== appointmentId);
          state.error.approve = null;
        } else {
          state.error.approve = payload;
        }
      })
      .addCase(rejectAppointmentChange.pending, (state, action) => {
        const arg = action.meta.arg;
        state.loading.reject = typeof arg === "string" ? arg : arg?.appointmentId;
        state.error.approve = null;
      })
      .addCase(rejectAppointmentChange.fulfilled, (state, action) => {
        state.loading.reject = null;
        const { notificationId } = action.payload ?? {};
        if (notificationId && !state.approvedNotificationIds.includes(notificationId)) {
          state.approvedNotificationIds.push(notificationId);
        }
      })
      .addCase(rejectAppointmentChange.rejected, (state, action) => {
        state.loading.reject = null;
        const payload = action.payload;
        const arg = action.meta.arg;
        const appointmentId = typeof arg === "string" ? arg : arg?.appointmentId;
        const isNotFound =
          payload === "appointment.notFound" ||
          (typeof payload === "string" && payload.toLowerCase().includes("not found"));
        if (isNotFound && appointmentId && Array.isArray(state.list)) {
          state.list = state.list.filter((n) => n.data?.appointmentId !== appointmentId);
          state.error.approve = null;
        } else {
          state.error.approve = payload;
        }
      })
      .addCase(deleteNotification.pending, (state, action) => {
        state.loading.delete = action.meta.arg;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.loading.delete = null;
        const id = action.payload;
        if (id && Array.isArray(state.list)) {
          state.list = state.list.filter((n) => n._id !== id);
        }
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.loading.delete = null;
      });
  },
});

export const { clearNotificationsError } = notificationsSlice.actions;

const APPOINTMENT_DEDUPE_TYPES = ["appointment_change_request", "appointment_cancelled_by_doctor"];

function normType(n) {
  return (n?.type ?? "").toLowerCase();
}

/** Unread count for badge: only notifications that would be displayed (not approved, deduped). */
export const selectUnreadNotificationsCount = (state) => {
  const list = state.notifications?.list;
  const approvedNotificationIds = state.notifications?.approvedNotificationIds ?? [];
  if (!Array.isArray(list)) return 0;
  const approvedSet = new Set(approvedNotificationIds);
  const filtered = list.filter((n) => {
    if (approvedSet.has(n._id) || n._approved) return false;
    return true;
  });
  const byAppointment = new Map();
  filtered.forEach((n) => {
    const type = normType(n);
    const isByAppointment =
      n.data?.appointmentId && APPOINTMENT_DEDUPE_TYPES.includes(type);
    if (isByAppointment) {
      const aid = n.data.appointmentId;
      const key = `${type}-${aid}`;
      const existing = byAppointment.get(key);
      if (!existing || new Date(n.createdAt) > new Date(existing.createdAt)) {
        byAppointment.set(key, n);
      }
    } else {
      byAppointment.set(n._id, n);
    }
  });
  const displayed = Array.from(byAppointment.values());
  return displayed.filter((n) => !n.readAt).length;
};

export default notificationsSlice.reducer;
