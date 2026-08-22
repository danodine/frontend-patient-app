import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../utils/axiosInstance";
import { getUserFacingErrorMessage } from "../utils/errorMessages";

/** New API: GET /api/patients/me/appointments/upcoming. Response: { status, results, data: { appointments } }. */
export const getPatientUpcomingAppointments = createAsyncThunk(
  "appointments/getPatientUpcoming",
  async ({ limit } = {}, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const params = limit != null ? `?limit=${limit}` : "";
      const response = await axiosInstance.get(`/api/patients/me/appointments/upcoming${params}`);
      const body = response.data ?? {};
      const data = body.data ?? body;
      const list = data?.appointments ?? (Array.isArray(data) ? data : []);
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudieron cargar las próximas citas." : "Could not load upcoming appointments.",
        ),
      );
    }
  }
);

/** New API: GET /api/patients/me/appointments/past. Response: { status, results, total, data: { appointments } }. Supports page, limit. */
export const getPatientPastAppointments = createAsyncThunk(
  "appointments/getPatientPast",
  async ({ page = 1, limit = 10 } = {}, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const response = await axiosInstance.get(`/api/patients/me/appointments/past?${params}`);
      const body = response.data ?? {};
      const data = body.data ?? body;
      const list = data?.appointments ?? (Array.isArray(data) ? data : []);
      const total = body.total ?? (Array.isArray(list) ? list.length : 0);
      return { appointments: Array.isArray(list) ? list : [], total };
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudieron cargar las citas pasadas." : "Could not load past appointments.",
        ),
      );
    }
  }
);

/** New API: DELETE /api/appointments/:id. Optional body: { cancellationReason }. */
export const cancelAppointment = createAsyncThunk(
  "appointments/cancel",
  async ({ appointmentId, cancellationReason }, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      await axiosInstance.delete(`/api/appointments/${appointmentId}`, {
        data: cancellationReason != null ? { cancellationReason } : undefined,
      });
      return appointmentId;
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudo cancelar la cita." : "Could not cancel the appointment.",
        ),
      );
    }
  }
);

const AVAILABLE_DATES_TIMEOUT_MS = 30000;
const AVAILABLE_DATES_RETRY_DELAY_MS = 2000;

/** Normalize to array of YYYY-MM-DD strings. Handles data.dates, data as array, data.results. */
function normalizeDatesPayload(body) {
  const data = body?.data ?? body;
  if (!data || typeof data !== "object") return [];
  let raw =
    data.dates ?? data.results ?? (Array.isArray(data) ? data : []);
  if (!Array.isArray(raw)) return [];
  return raw.map((d) => {
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
    if (d && typeof d === "object" && (d.date ?? d.day ?? d.iso)) {
      const str = String(d.date ?? d.day ?? d.iso ?? "");
      return str.slice(0, 10);
    }
    return null;
  }).filter(Boolean);
}

function isRetryableDatesError(err) {
  return err?.code === "ECONNABORTED" || err?.message === "Network Error" || !err?.response;
}

/** New API: GET /api/appointments/available-dates/:doctorId.
 *  Optional query: clinicId, from, to (YYYY-MM-DD).
 *  The server answers a 60-day window when no range is given, so the calendar
 *  asks for the span it actually paints and fetches more as the user pages
 *  forward (see `append`). */
export const fetchPatientAvailableDates = createAsyncThunk(
  "appointments/fetchPatientAvailableDates",
  async ({ doctorId, clinicId, from, to, append, appointmentTypeId }, { rejectWithValue, signal, getState }) => {
    const language = getState()?.language?.language || "es";
    const query = new URLSearchParams();
    if (typeof clinicId === "string" && clinicId) query.set("clinicId", clinicId);
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    // Slots (and therefore available dates) are as long as the chosen type.
    if (typeof appointmentTypeId === "string" && appointmentTypeId)
      query.set("appointmentTypeId", appointmentTypeId);
    const params = query.toString() ? `?${query.toString()}` : "";
    const url = `/api/appointments/available-dates/${doctorId}${params}`;
    const requestConfig = { timeout: AVAILABLE_DATES_TIMEOUT_MS, signal };

    const doRequest = async () => {
      const response = await axiosInstance.get(url, requestConfig);
      const body = response.data ?? {};
      return {
        dates: normalizeDatesPayload(body),
        // The server echoes the window it actually answered (it clamps), so the
        // screen knows how far it may paint without lying about later months.
        range: body?.range ?? null,
        append: Boolean(append),
      };
    };

    try {
      return await doRequest();
    } catch (err) {
      if (signal?.aborted) {
        return rejectWithValue("Cancelled");
      }
      if (isRetryableDatesError(err)) {
        await new Promise((resolve) => setTimeout(resolve, AVAILABLE_DATES_RETRY_DELAY_MS));
        if (signal?.aborted) {
          return rejectWithValue("Cancelled");
        }
        try {
          return await doRequest();
        } catch (retryErr) {
          if (retryErr?.code === "ECONNABORTED" || retryErr?.code === "ERR_CANCELED") {
            return rejectWithValue(
              language === "es" ? "La solicitud tardó demasiado. Intenta nuevamente." : "Request timed out. Please try again.",
            );
          }
          return rejectWithValue(
            getUserFacingErrorMessage(
              retryErr,
              language,
              language === "es" ? "No se pudieron cargar las fechas disponibles." : "Could not load available dates.",
            ),
          );
        }
      }
      const message =
        err.code === "ECONNABORTED"
          ? (language === "es" ? "La solicitud tardó demasiado. Intenta nuevamente." : "Request timed out. Please try again.")
          : getUserFacingErrorMessage(
              err,
              language,
              language === "es" ? "No se pudieron cargar las fechas disponibles." : "Could not load available dates.",
            );
      return rejectWithValue(message);
    }
  }
);

/** New API: GET /api/appointments/available-times/:doctorId/:date. Optional query: clinicId. */
export const fetchPatientAvailableTimes = createAsyncThunk(
  "appointments/fetchPatientAvailableTimes",
  async ({ doctorId, date, clinicId, appointmentTypeId }, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    const query = new URLSearchParams();
    if (typeof clinicId === "string" && clinicId) query.set("clinicId", clinicId);
    if (typeof appointmentTypeId === "string" && appointmentTypeId)
      query.set("appointmentTypeId", appointmentTypeId);
    const params = query.toString() ? `?${query.toString()}` : "";
    try {
      const response = await axiosInstance.get(`/api/appointments/available-times/${doctorId}/${date}${params}`);
      const body = response.data ?? {};
      const data = body.data ?? body;
      const slots = data?.slots ?? (Array.isArray(data) ? data : []);
      return Array.isArray(slots) ? slots : [];
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudieron cargar los horarios disponibles." : "Could not load available times.",
        ),
      );
    }
  }
);

/** New API: POST /api/appointments. Body: doctorId, appointmentTypeId, start, end, patientId (self). Optional: clinicId. */
export const createPatientAppointment = createAsyncThunk(
  "appointments/createPatient",
  async ({ doctorId, appointmentTypeId, start, end, clinicId, modality, guestPatient }, { getState, rejectWithValue }) => {
    const state = getState();
    const language = state?.language?.language || "es";
    const patientId = state?.users?.currentUser?._id ?? state?.auth?.user?._id;
    // Family booking: when a guestPatient (name + phone) is supplied, the
    // appointment is booked FOR that person via the backend's
    // createdByPatient guest path — patientId is omitted (the backend
    // requires exactly one of patientId / guestPatient).
    const bookingForGuest = !!(guestPatient && guestPatient.fullName);
    if (!bookingForGuest && !patientId) {
      return rejectWithValue(
        language === "es"
          ? "Abre tu perfil primero para poder vincular la cita."
          : "Please open your profile first so we can link the appointment.",
      );
    }
    try {
      const body = { doctorId, appointmentTypeId, start, end };
      if (bookingForGuest) {
        body.guestPatient = {
          fullName: guestPatient.fullName,
          phone: guestPatient.phone,
          relationship: guestPatient.relationship,
        };
      } else {
        body.patientId = patientId;
      }
      if (typeof clinicId === "string" && clinicId) body.clinicId = clinicId;
      if (modality === "in_person" || modality === "video_call") body.modality = modality;
      const response = await axiosInstance.post("/api/appointments", body);
      return response.data?.data ?? response.data;
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudo agendar la cita." : "Could not book the appointment.",
        ),
      );
    }
  }
);

/** M19: join the waitlist for a doctor on a given date. POST /api/patients/me/waitlist */
export const joinWaitlist = createAsyncThunk(
  "appointments/joinWaitlist",
  async (
    { doctorId, date, dateFrom, dateTo, timeFrom, timeTo, clinicId, appointmentTypeId },
    { rejectWithValue, getState },
  ) => {
    const language = getState()?.language?.language || "es";
    try {
      // Advanced criteria: dateFrom/dateTo (range) + optional timeFrom/timeTo
      // ("HH:MM"). Falls back to the legacy single `date` when no range given.
      const body = { doctorId };
      // Send both `date` (legacy backend requires it) and `dateFrom` (new
      // backend) so the waitlist works whether or not the advanced-waitlist
      // backend is deployed yet.
      body.date = dateFrom ?? date;
      body.dateFrom = dateFrom ?? date;
      if (dateTo) body.dateTo = dateTo;
      if (timeFrom) body.timeFrom = timeFrom;
      if (timeTo) body.timeTo = timeTo;
      if (clinicId) body.clinicId = clinicId;
      if (appointmentTypeId) body.appointmentTypeId = appointmentTypeId;
      const response = await axiosInstance.post("/api/patients/me/waitlist", body);
      const data = response.data?.data ?? response.data;
      return data?.waitlistEntry ?? data;
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudo unir a la lista de espera." : "Could not join the waitlist.",
        ),
      );
    }
  }
);

/** M19: list the patient's own waitlist entries. GET /api/patients/me/waitlist */
export const fetchMyWaitlist = createAsyncThunk(
  "appointments/fetchMyWaitlist",
  async (_, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const response = await axiosInstance.get("/api/patients/me/waitlist");
      const data = response.data?.data ?? response.data;
      const entries = data?.waitlistEntries ?? [];
      return Array.isArray(entries) ? entries : [];
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudo cargar tu lista de espera." : "Could not load your waitlist.",
        ),
      );
    }
  }
);

/** M19: leave a waitlist entry. DELETE /api/patients/me/waitlist/:id */
export const leaveWaitlist = createAsyncThunk(
  "appointments/leaveWaitlist",
  async (waitlistId, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      await axiosInstance.delete(`/api/patients/me/waitlist/${waitlistId}`);
      return waitlistId;
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudo salir de la lista de espera." : "Could not leave the waitlist.",
        ),
      );
    }
  }
);

const appointmentsSlice = createSlice({
  name: "appointments",
  initialState: {
    upcomingPatientList: [],
    pastPatientList: [],
    pastTotal: 0,
    patientAvailableDates: [],
    // Window the server has actually answered for, so the calendar only
    // disables days it has data for (it pages forward as the user scrolls).
    patientAvailableDatesRange: null,
    patientAvailableSlots: [],
    myWaitlist: [], // M19
    loading: {
      patientUpcoming: false,
      patientPast: false,
      booking: false,
      patientDates: false,
      patientSlots: false,
      create: false,
      waitlist: false, // M19
      waitlistJoin: false, // M19
    },
    error: {
      patientUpcoming: null,
      patientPast: null,
      booking: null,
      patientDates: null,
      patientSlots: null,
      create: null,
      waitlist: null, // M19
      waitlistJoin: null, // M19
    },
  },
  reducers: {
    clearAppointmentsState: (state) => {
      state.upcomingPatientList = [];
      state.pastPatientList = [];
      state.pastTotal = 0;
      state.patientAvailableDates = [];
      state.patientAvailableDatesRange = null;
      state.patientAvailableSlots = [];
      state.myWaitlist = [];
      state.loading = {
        patientUpcoming: false,
        patientPast: false,
        booking: false,
        patientDates: false,
        patientSlots: false,
        create: false,
        waitlist: false,
        waitlistJoin: false,
      };
      state.error = {
        patientUpcoming: null,
        patientPast: null,
        booking: null,
        patientDates: null,
        patientSlots: null,
        create: null,
        waitlist: null,
        waitlistJoin: null,
      };
    },
    clearBookingAvailability: (state) => {
      state.patientAvailableDates = [];
      state.patientAvailableDatesRange = null;
      state.patientAvailableSlots = [];
      state.loading.patientDates = false;
      state.loading.patientSlots = false;
      state.error.patientDates = null;
      state.error.patientSlots = null;
    },
    clearAppointmentsErrors: (state) => {
      state.error = {
        patientUpcoming: null,
        patientPast: null,
        booking: null,
        patientDates: null,
        patientSlots: null,
        create: null,
        waitlist: null,
        waitlistJoin: null,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getPatientUpcomingAppointments.pending, (state) => {
        state.loading.patientUpcoming = true;
        state.error.patientUpcoming = null;
      })
      .addCase(getPatientUpcomingAppointments.fulfilled, (state, action) => {
        state.loading.patientUpcoming = false;
        state.upcomingPatientList = action.payload ?? [];
      })
      .addCase(getPatientUpcomingAppointments.rejected, (state, action) => {
        state.loading.patientUpcoming = false;
        state.error.patientUpcoming = action.payload;
      })
      .addCase(getPatientPastAppointments.pending, (state) => {
        state.loading.patientPast = true;
        state.error.patientPast = null;
      })
      .addCase(getPatientPastAppointments.fulfilled, (state, action) => {
        state.loading.patientPast = false;
        state.pastPatientList = action.payload?.appointments ?? [];
        state.pastTotal = action.payload?.total ?? 0;
      })
      .addCase(getPatientPastAppointments.rejected, (state, action) => {
        state.loading.patientPast = false;
        state.error.patientPast = action.payload;
      })
      .addCase(cancelAppointment.pending, (state) => {
        state.loading.booking = true;
        state.error.booking = null;
      })
      .addCase(cancelAppointment.fulfilled, (state, action) => {
        state.loading.booking = false;
        state.upcomingPatientList = state.upcomingPatientList.filter(
          (a) => a._id !== action.payload
        );
      })
      .addCase(cancelAppointment.rejected, (state, action) => {
        state.loading.booking = false;
        state.error.booking = action.payload;
      })
      .addCase(fetchPatientAvailableDates.pending, (state) => {
        state.loading.patientDates = true;
        state.error.patientDates = null;
      })
      .addCase(fetchPatientAvailableDates.fulfilled, (state, action) => {
        state.loading.patientDates = false;
        const { dates = [], range = null, append = false } = action.payload ?? {};
        if (append) {
          // Paging forward: keep what we already painted and add the new window.
          const merged = new Set([...(state.patientAvailableDates ?? []), ...dates]);
          state.patientAvailableDates = Array.from(merged).sort();
        } else {
          state.patientAvailableDates = dates;
        }
        // Track how far we have actually asked about, so the calendar only
        // disables days it has real data for.
        if (range?.to) {
          const previousTo = state.patientAvailableDatesRange?.to;
          state.patientAvailableDatesRange = {
            from: append ? (state.patientAvailableDatesRange?.from ?? range.from) : range.from,
            to: append && previousTo && previousTo > range.to ? previousTo : range.to,
          };
        }
      })
      .addCase(fetchPatientAvailableDates.rejected, (state, action) => {
        state.loading.patientDates = false;
        state.error.patientDates = action.payload;
      })
      .addCase(fetchPatientAvailableTimes.pending, (state) => {
        state.loading.patientSlots = true;
        state.error.patientSlots = null;
      })
      .addCase(fetchPatientAvailableTimes.fulfilled, (state, action) => {
        state.loading.patientSlots = false;
        state.patientAvailableSlots = action.payload ?? [];
      })
      .addCase(fetchPatientAvailableTimes.rejected, (state, action) => {
        state.loading.patientSlots = false;
        state.error.patientSlots = action.payload;
      })
      .addCase(createPatientAppointment.pending, (state) => {
        state.loading.create = true;
        state.error.create = null;
      })
      .addCase(createPatientAppointment.fulfilled, (state) => {
        state.loading.create = false;
      })
      .addCase(createPatientAppointment.rejected, (state, action) => {
        state.loading.create = false;
        state.error.create = action.payload;
      })
      .addCase(joinWaitlist.pending, (state) => {
        state.loading.waitlistJoin = true;
        state.error.waitlistJoin = null;
      })
      .addCase(joinWaitlist.fulfilled, (state, action) => {
        state.loading.waitlistJoin = false;
        const exists = state.myWaitlist.some((e) => e._id === action.payload?._id);
        if (!exists && action.payload) state.myWaitlist.push(action.payload);
      })
      .addCase(joinWaitlist.rejected, (state, action) => {
        state.loading.waitlistJoin = false;
        state.error.waitlistJoin = action.payload;
      })
      .addCase(fetchMyWaitlist.pending, (state) => {
        state.loading.waitlist = true;
        state.error.waitlist = null;
      })
      .addCase(fetchMyWaitlist.fulfilled, (state, action) => {
        state.loading.waitlist = false;
        state.myWaitlist = action.payload ?? [];
      })
      .addCase(fetchMyWaitlist.rejected, (state, action) => {
        state.loading.waitlist = false;
        state.error.waitlist = action.payload;
      })
      .addCase(leaveWaitlist.fulfilled, (state, action) => {
        state.myWaitlist = state.myWaitlist.filter((e) => e._id !== action.payload);
      });
  },
});

export const { clearAppointmentsState, clearBookingAvailability, clearAppointmentsErrors } =
  appointmentsSlice.actions;
export default appointmentsSlice.reducer;
