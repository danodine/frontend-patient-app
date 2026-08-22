import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../utils/axiosInstance";
import { getUserFacingErrorMessage } from "../utils/errorMessages";

/** New API: public search by specialty (and optional q, city). */
export const searchDoctorsBySpecialty = createAsyncThunk(
  "doctors/searchBySpecialty",
  async ({ specialty, q, city, page = 1, limit = 20 }, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const params = new URLSearchParams();
      if (specialty) params.set("specialty", specialty);
      if (q) params.set("q", q);
      if (city) params.set("city", city);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const response = await axiosInstance.get(`/api/doctors/search?${params.toString()}`);
      const body = response.data ?? {};
      const data = body.data ?? body;
      const doctors = data?.doctors ?? (Array.isArray(data) ? data : []) ?? [];
      const total = body.total ?? body.results ?? data?.total ?? doctors.length;
      return { doctors, total };
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudo realizar la búsqueda." : "Could not perform the search.",
        ),
      );
    }
  }
);

/** New API: search doctors by q (name/profession/specialty) and optional filters. For booking search bar. */
export const searchDoctorsQuery = createAsyncThunk(
  "doctors/searchQuery",
  async (
    {
      q, specialty, subspecialty, page = 1, limit = 100,
      // M13 filters: modality ("in_person" | "video_call" | "both"), acceptsInsurance
      // (bool), language (free text, e.g. "Espanol"), availableToday (bool),
      // and lat/lng/maxDistanceKm for a maximum-distance filter.
      modality, acceptsInsurance, language: languageFilter, availableToday,
      lat, lng, maxDistanceKm,
    },
    { rejectWithValue, getState },
  ) => {
    const language = getState()?.language?.language || "es";
    const params = new URLSearchParams();
    if (q && String(q).trim()) params.set("q", String(q).trim());
    if (specialty) params.set("specialty", specialty);
    if (subspecialty) params.set("subspecialty", subspecialty);
    if (modality && modality !== "both") params.set("modality", modality);
    if (acceptsInsurance) params.set("acceptsInsurance", "true");
    if (languageFilter) params.set("language", languageFilter);
    if (availableToday) params.set("availableToday", "true");
    // Ask the backend to attach each doctor's earliest available slot so the
    // search cards can show "Disponible hoy, HH:mm" or offer the waitlist.
    params.set("withAvailability", "true");
    if (lat != null && lng != null && maxDistanceKm) {
      params.set("lat", String(lat));
      params.set("lng", String(lng));
      params.set("maxDistanceKm", String(maxDistanceKm));
    }
    params.set("page", String(page));
    params.set("limit", String(limit));

    const runSearch = async (withAvailability) => {
      const p = new URLSearchParams(params);
      if (!withAvailability) p.delete("withAvailability");
      const response = await axiosInstance.get(`/api/doctors/search?${p.toString()}`);
      const body = response.data ?? {};
      const data = body.data ?? body;
      let doctors = data?.doctors ?? body.doctors;
      if (!Array.isArray(doctors)) {
        if (Array.isArray(data)) doctors = data;
        else if (Array.isArray(body.results)) doctors = body.results;
        else doctors = [];
      }
      return { doctors, total: body.total ?? body.results ?? doctors.length };
    };

    try {
      let result = await runSearch(true);
      // Backend version skew: an OLDER backend that doesn't know
      // `withAvailability` treats it as a filter field and returns nothing.
      // Retry once WITHOUT it so search keeps working (availability data just
      // won't appear until the backend is updated/deployed).
      if (!result.doctors || result.doctors.length === 0) {
        const fallback = await runSearch(false);
        if (fallback.doctors && fallback.doctors.length > 0) result = fallback;
      }
      return result;
    } catch (err) {
      const msg = getUserFacingErrorMessage(
        err,
        language,
        language === "es" ? "No se pudo realizar la búsqueda." : "Could not perform the search.",
      );
      return rejectWithValue(msg);
    }
  }
);

/** New API: get doctor by ID (public). Returns { doctor, appointmentTypes } when present. */
export const getDoctorById = createAsyncThunk(
  "doctors/byId",
  async ({ id }, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const response = await axiosInstance.get(`/api/doctors/${id}`);
      const data = response.data?.data ?? response.data;
      const doctor = data?.doctor ?? data;
      const appointmentTypes = data?.appointmentTypes ?? [];
      return { doctor: doctor ?? {}, appointmentTypes: Array.isArray(appointmentTypes) ? appointmentTypes : [] };
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se encontró el médico." : "Doctor not found.",
        ),
      );
    }
  }
);

/** Public doctor schedules (Horarios). GET /api/doctors/:doctorId/schedules?clinicId= — no auth. Normalize to { clinicId, schedule: [{ day, slots }] }. */
export const getDoctorClinicSchedules = createAsyncThunk(
  "doctors/clinicSchedules",
  async ({ doctorId, clinicId }, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    if (!doctorId) {
      return rejectWithValue(language === "es" ? "Falta el identificador del médico." : "Missing doctor identifier.");
    }
    try {
      const params = new URLSearchParams();
      if (clinicId) params.set("clinicId", clinicId);
      const query = params.toString();
      const url = `/api/doctors/${doctorId}/schedules${query ? `?${query}` : ""}`;
      const response = await axiosInstance.get(url);
      const body = response.data ?? {};
      const data = body.data ?? body;
      const raw = data?.schedules ?? (Array.isArray(data) ? data : []);
      if (!Array.isArray(raw)) return { clinicId: clinicId ?? null, schedule: [] };
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayMap = new Map();
      for (const entry of raw) {
        if (!entry || typeof entry !== "object") continue;
        const weekday = entry.weekday;
        const dayStr = typeof weekday === "number" && weekday >= 0 && weekday <= 6 ? dayNames[weekday] : "";
        const from = entry.startTime ?? "";
        const to = entry.endTime ?? "";
        if (!dayStr) continue;
        if (!dayMap.has(dayStr)) dayMap.set(dayStr, []);
        dayMap.get(dayStr).push({ from, to });
      }
      const schedule = Array.from(dayMap, ([day, slots]) => ({ day, slots })).sort(
        (a, b) => dayNames.indexOf(a.day) - dayNames.indexOf(b.day)
      );
      return { clinicId: clinicId ?? null, schedule };
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se encontró el horario del médico." : "Doctor schedule not found.",
        ),
      );
    }
  }
);

/** M14: list the patient's favorite doctors. GET /api/patients/me/favorites */
export const fetchFavoriteDoctors = createAsyncThunk(
  "doctors/fetchFavorites",
  async (_, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const response = await axiosInstance.get("/api/patients/me/favorites");
      const data = response.data?.data ?? response.data;
      const doctors = data?.doctors ?? [];
      return Array.isArray(doctors) ? doctors : [];
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudieron cargar tus médicos favoritos." : "Could not load your favorite doctors.",
        ),
      );
    }
  }
);

/** M14: add a doctor to favorites. POST /api/patients/me/favorites/:doctorId */
export const addFavoriteDoctor = createAsyncThunk(
  "doctors/addFavorite",
  async (doctorId, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      await axiosInstance.post(`/api/patients/me/favorites/${doctorId}`);
      return doctorId;
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudo agregar a favoritos." : "Could not add to favorites.",
        ),
      );
    }
  }
);

/** M14: remove a doctor from favorites. DELETE /api/patients/me/favorites/:doctorId */
export const removeFavoriteDoctor = createAsyncThunk(
  "doctors/removeFavorite",
  async (doctorId, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      await axiosInstance.delete(`/api/patients/me/favorites/${doctorId}`);
      return doctorId;
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudo quitar de favoritos." : "Could not remove from favorites.",
        ),
      );
    }
  }
);

const doctorSlice = createSlice({
  name: "doctors",
  initialState: {
    doctorsBySpecialty: [],
    doctorsSearchResults: [],
    doctor: {},
    appointmentTypesForDoctor: [],
    doctorClinicSchedule: null,
    favoriteDoctors: [], // M14
    favoriteDoctorIds: [], // M14 — quick-lookup array of _id strings for toggle state
    loading: {
      bySpecialty: false,
      searchQuery: false,
      getById: false,
      clinicSchedules: false,
      favorites: false,
    },
    error: {
      bySpecialty: null,
      searchQuery: null,
      getById: null,
      clinicSchedules: null,
      favorites: null,
    },
  },
  reducers: {
    clearSearchResults: (state) => {
      state.doctorsSearchResults = [];
      state.loading.searchQuery = false;
      state.error.searchQuery = null;
    },
    clearBySpecialty: (state) => {
      state.doctorsBySpecialty = [];
      state.loading.bySpecialty = false;
      state.error.bySpecialty = null;
    },
    clearById: (state) => {
      state.doctor = {};
      state.appointmentTypesForDoctor = [];
      state.doctorClinicSchedule = null;
      state.loading.getById = false;
      state.error.getById = null;
      state.loading.clinicSchedules = false;
      state.error.clinicSchedules = null;
    },
    clearDoctorError: (state) => {
      state.error.getById = null;
      state.error.search = null;
      state.error.bySpecialty = null;
      state.error.searchQuery = null;
    },
    clearDoctorClinicSchedule: (state) => {
      state.doctorClinicSchedule = null;
      state.loading.clinicSchedules = false;
      state.error.clinicSchedules = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchDoctorsQuery.pending, (state) => {
        state.loading.searchQuery = true;
        state.error.searchQuery = null;
      })
      .addCase(searchDoctorsQuery.fulfilled, (state, action) => {
        state.loading.searchQuery = false;
        state.doctorsSearchResults = action.payload?.doctors ?? [];
      })
      .addCase(searchDoctorsQuery.rejected, (state, action) => {
        state.loading.searchQuery = false;
        state.error.searchQuery = action.payload;
      })
      .addCase(searchDoctorsBySpecialty.pending, (state) => {
        state.loading.bySpecialty = true;
        state.error.bySpecialty = null;
      })
      .addCase(searchDoctorsBySpecialty.fulfilled, (state, action) => {
        state.loading.bySpecialty = false;
        state.doctorsBySpecialty = action.payload.doctors ?? [];
      })
      .addCase(searchDoctorsBySpecialty.rejected, (state, action) => {
        state.loading.bySpecialty = false;
        state.error.bySpecialty = action.payload;
      })
      .addCase(getDoctorById.pending, (state) => {
        state.loading.getById = true;
        state.error.getById = null;
      })
      .addCase(getDoctorById.fulfilled, (state, action) => {
        state.loading.getById = false;
        const payload = action.payload ?? {};
        state.doctor = payload.doctor ?? payload;
        state.appointmentTypesForDoctor = payload.appointmentTypes ?? [];
      })
      .addCase(getDoctorById.rejected, (state, action) => {
        state.loading.getById = false;
        state.error.getById = action.payload;
      })
      .addCase(getDoctorClinicSchedules.pending, (state) => {
        state.loading.clinicSchedules = true;
        state.error.clinicSchedules = null;
      })
      .addCase(getDoctorClinicSchedules.fulfilled, (state, action) => {
        state.loading.clinicSchedules = false;
        state.doctorClinicSchedule = action.payload ?? null;
      })
      .addCase(getDoctorClinicSchedules.rejected, (state, action) => {
        state.loading.clinicSchedules = false;
        state.doctorClinicSchedule = null;
        state.error.clinicSchedules = action.payload;
      })
      .addCase(fetchFavoriteDoctors.pending, (state) => {
        state.loading.favorites = true;
        state.error.favorites = null;
      })
      .addCase(fetchFavoriteDoctors.fulfilled, (state, action) => {
        state.loading.favorites = false;
        state.favoriteDoctors = action.payload ?? [];
        state.favoriteDoctorIds = (action.payload ?? []).map((d) => d._id).filter(Boolean);
      })
      .addCase(fetchFavoriteDoctors.rejected, (state, action) => {
        state.loading.favorites = false;
        state.error.favorites = action.payload;
      })
      .addCase(addFavoriteDoctor.fulfilled, (state, action) => {
        if (!state.favoriteDoctorIds.includes(action.payload)) {
          state.favoriteDoctorIds.push(action.payload);
        }
      })
      .addCase(removeFavoriteDoctor.fulfilled, (state, action) => {
        state.favoriteDoctorIds = state.favoriteDoctorIds.filter((id) => id !== action.payload);
        state.favoriteDoctors = state.favoriteDoctors.filter((d) => d._id !== action.payload);
      });
  },
});

export const { clearSearchResults, clearBySpecialty, clearById, clearDoctorError, clearDoctorClinicSchedule } = doctorSlice.actions;
export default doctorSlice.reducer;
