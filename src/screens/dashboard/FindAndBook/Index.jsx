import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import GlassButton from "../../../components/GlassButton";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  Image,
  Linking,
  Share,
  Switch,
} from "react-native";
import { Calendar } from "react-native-calendars";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import {
  searchDoctorsQuery,
  clearSearchResults,
  getDoctorById,
  getDoctorClinicSchedules,
  clearById,
  clearDoctorClinicSchedule,
  fetchFavoriteDoctors,
  addFavoriteDoctor,
  removeFavoriteDoctor,
} from "../../../redux/doctorSlice";
import {
  fetchPatientAvailableDates,
  fetchPatientAvailableTimes,
  createPatientAppointment,
  clearBookingAvailability,
  getPatientUpcomingAppointments,
  joinWaitlist,
} from "../../../redux/appointmentsSlice";
import STRINGS from "../../../constants/strings";
import { getSpecialtyIcon } from "../../../constants/specialtyIcons";
import { getMainSpecialtyDisplay } from "../../../utils/helpers";
import {
  COLORS,
  ICONS,
  SIZES,
  FONT_SIZES,
  FONT_WEIGHT,
  PADDINGS,
} from "../../../styles/theme";
import styles from "./styles";
import appointmentStyles from "../Appointments/styles";
import PropTypes from "prop-types";
import TopBanner from "../components/TopBanner/Index";
import WaitlistConfigModal from "../../../components/WaitlistConfigModal";
import { AppointmentConfirmedView } from "../AppointmentConfirmed/Index";
import { BASE_URL, WEB_APP_URL } from "../../../../config";

const DEBOUNCE_MS = 350;
const MIN_SEARCH_LEN = 2;

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const expandAnimation = {
  duration: 280,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

/** Format slot time in the user's local timezone (from UTC `start`). */
function formatSlotTime(iso) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Local hour (0–23) for a slot start, for grouping. */
function getLocalHour(iso) {
  return new Date(iso).getHours();
}

/** Slots with availability; then group by hour for two-step picker. */
function getAvailableSlots(slots) {
  if (!Array.isArray(slots)) return [];
  return slots.filter((s) => s.available !== false && s.start);
}

/** Unique local hours that have at least one slot, sorted (e.g. [8, 9, 10, 14]). */
function getUniqueHours(slots) {
  const hours = new Set();
  getAvailableSlots(slots).forEach((s) => {
    hours.add(getLocalHour(s.start));
  });
  return [...hours].sort((a, b) => a - b);
}

/** Slots that fall in the given local hour, deduplicated by start time and sorted (backend may return duplicates). */
function getSlotsForHour(slots, hour) {
  const available = getAvailableSlots(slots).filter(
    (s) => getLocalHour(s.start) === hour,
  );
  const byStart = new Map();
  available.forEach((s) => {
    const startKey = s.start ?? String(new Date(s.start).getTime());
    if (!byStart.has(startKey)) byStart.set(startKey, s);
  });
  return [...byStart.values()].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
}

function getSpecialtyLabel(doctor, language) {
  return getMainSpecialtyDisplay(doctor, language);
}

function getSpecialtyDisplay(doctor, language) {
  return getMainSpecialtyDisplay(doctor, language);
}

/** Doctor profile picture URL for the patient to see. API returns profileImageUrl (e.g. /api/files/profile-photo/<id>). Full URL = BASE_URL + path. */
function getDoctorPhotoUri(doctor) {
  const url = doctor?.profileImageUrl ?? doctor?.profileImage ?? null;
  if (!url || typeof url !== "string" || !url.trim()) return null;
  const trimmed = url.trim();
  return trimmed.startsWith("http")
    ? trimmed
    : `${BASE_URL.replace(/\/$/, "")}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

/**
 * Formats a doctor's `nextAvailable` ({ start ISO, tz }) into the search-card
 * line: "Disponible hoy, 16:30 hrs" / "mañana" / a short date, in the CLINIC's
 * timezone. Returns { available:false } when there's no upcoming slot.
 */
function formatAvailability(nextAvailable, language) {
  const es = language !== "en";
  if (!nextAvailable || !nextAvailable.start) return { available: false };
  const start = new Date(nextAvailable.start);
  if (Number.isNaN(start.getTime())) return { available: false };
  const tz = nextAvailable.tz || undefined;
  try {
    const time = new Intl.DateTimeFormat(es ? "es-ES" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    }).format(start);
    const dayKey = (d) =>
      new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: tz,
      }).format(d);
    const now = new Date();
    const slotDay = dayKey(start);
    let dayLabel;
    if (slotDay === dayKey(now)) dayLabel = es ? "hoy" : "today";
    else if (slotDay === dayKey(new Date(now.getTime() + 86400000)))
      dayLabel = es ? "mañana" : "tomorrow";
    else
      dayLabel = new Intl.DateTimeFormat(es ? "es-ES" : "en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: tz,
      }).format(start);
    return {
      available: true,
      text: es ? `Disponible ${dayLabel}, ${time} hrs` : `Available ${dayLabel}, ${time}`,
    };
  } catch {
    return { available: true, text: es ? "Disponible próximamente" : "Available soon" };
  }
}

function getDoctorInitials(doctor) {
  const name = doctor?.fullName ?? doctor?.name ?? "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return "?";
}

const screenHeight = Dimensions.get("window").height;

const FindAndBookScreen = ({ route, navigation }) => {
  const language = useSelector((state) => state.language.language);
  const dispatch = useDispatch();
  const t =
    STRINGS?.[language]?.bookAppointment ?? STRINGS?.es?.bookAppointment ?? {};
  const tDocProfile =
    STRINGS?.[language]?.doctorProfile ?? STRINGS?.es?.doctorProfile ?? {};
  const tApt =
    STRINGS?.[language]?.appointments ?? STRINGS?.es?.appointments ?? {};
  const initialDoctor = route.params?.doctor ?? null;

  const {
    doctorsSearchResults,
    loading: doctorLoading,
    error: doctorError,
    appointmentTypesForDoctor,
    doctor: doctorFromApi,
    doctorClinicSchedule,
    favoriteDoctorIds,
  } = useSelector((state) => state.doctor);
  const {
    patientAvailableDates,
    patientAvailableDatesRange,
    patientAvailableSlots,
    loading: appointmentsLoading,
    error: appointmentsError,
  } = useSelector((state) => state.appointments);

  const [searchText, setSearchText] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // M13: doctor search filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterModality, setFilterModality] = useState("both"); // "both" | "in_person" | "video_call"
  const [filterAcceptsInsurance, setFilterAcceptsInsurance] = useState(false);
  const [filterLanguage, setFilterLanguage] = useState(null);
  const [filterAvailableToday, setFilterAvailableToday] = useState(false);
  const [filterDistanceEnabled, setFilterDistanceEnabled] = useState(false);
  const [filterMaxDistanceKm, setFilterMaxDistanceKm] = useState(20);
  const [userCoords, setUserCoords] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const hasActiveFilters =
    filterModality !== "both" ||
    filterAcceptsInsurance ||
    !!filterLanguage ||
    filterAvailableToday ||
    filterDistanceEnabled;

  const requestUserLocation = useCallback(async () => {
    setLocatingUser(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(
          language === "es"
            ? "Permiso de ubicación denegado."
            : "Location permission denied.",
        );
        setFilterDistanceEnabled(false);
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setUserCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch {
      setLocationError(
        language === "es"
          ? "No se pudo obtener tu ubicación."
          : "Could not get your location.",
      );
      setFilterDistanceEnabled(false);
    } finally {
      setLocatingUser(false);
    }
  }, [language]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorModalVisible, setDoctorModalVisible] = useState(false);
  const [doctorModalDoctor, setDoctorModalDoctor] = useState(null);
  const [doctorModalSelectedClinic, setDoctorModalSelectedClinic] =
    useState(null);
  const [doctorModalPhotoLoadFailed, setDoctorModalPhotoLoadFailed] =
    useState(false);
  const hasOpenedDoctorModalFromParams = useRef(false);
  const doctorSheetAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();
  const [selectedClinic, setSelectedClinic] = useState(null);

  const selectedDoctorId = selectedDoctor?._id;
  const clinics = (() => {
    if (
      !doctorFromApi ||
      !selectedDoctorId ||
      doctorFromApi._id !== selectedDoctorId
    )
      return [];
    const c = doctorFromApi.clinics;
    return Array.isArray(c) ? c.filter((x) => x && x._id) : [];
  })();
  const doctorForModal =
    doctorModalDoctor &&
    doctorFromApi &&
    doctorFromApi._id === doctorModalDoctor._id
      ? doctorFromApi
      : doctorModalDoctor;
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedModality, setSelectedModality] = useState(null);
  const [waitlistJoinedKey, setWaitlistJoinedKey] = useState(null); // M19: `${doctorId}|${date}` once joined
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  // Booking confirmation shown as an overlay Modal (not a stacked screen, so it
  // never lingers in a tab's navigation stack). null = hidden.
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  // "YYYY-MM" of the month currently shown in the calendar, to disable the "<"
  // arrow once we're back at the current month (no booking in past months).
  const [calendarMonth, setCalendarMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  // Family booking: "self" (default) or "other" (book for a family member/
  // third party as a guest patient — name + phone).
  const [bookingFor, setBookingFor] = useState("self");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestRelation, setGuestRelation] = useState("");
  const [banner, setBanner] = useState({
    visible: false,
    type: "",
    message: "",
  });
  const debounceRef = useRef(null);
  const fetchDatesAbortRef = useRef(null);
  const lastFetchedDatesKeyRef = useRef(null);
  // Accumulates every available date we've seen for the current doctor/clinic,
  // so paging the calendar forward never drops the earlier months even if the
  // redux array gets replaced by a racing fetch. Reset on doctor/clinic change.
  const seenAvailableDatesRef = useRef(new Set());
  const seenAvailableThroughRef = useRef(null);
  const seenAvailableKeyRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchText.trim().length < MIN_SEARCH_LEN) {
      dispatch(clearSearchResults());
      setShowDropdown(false);
      return;
    }
    // Distance filter needs the user's coordinates before it can be applied —
    // skip dispatching (and re-fire once requestUserLocation resolves) rather
    // than silently searching without the filter the patient just enabled.
    if (filterDistanceEnabled && !userCoords) return;
    debounceRef.current = setTimeout(() => {
      dispatch(
        searchDoctorsQuery({
          q: searchText.trim(),
          limit: 20,
          modality: filterModality,
          acceptsInsurance: filterAcceptsInsurance,
          language: filterLanguage,
          availableToday: filterAvailableToday,
          ...(filterDistanceEnabled && userCoords
            ? { lat: userCoords.lat, lng: userCoords.lng, maxDistanceKm: filterMaxDistanceKm }
            : {}),
        }),
      );
      setShowDropdown(true);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    searchText,
    dispatch,
    filterModality,
    filterAcceptsInsurance,
    filterLanguage,
    filterAvailableToday,
    filterDistanceEnabled,
    filterMaxDistanceKm,
    userCoords,
  ]);

  // M14: load favorite-doctor IDs once so the modal's heart toggle knows its state.
  useEffect(() => {
    dispatch(fetchFavoriteDoctors());
  }, [dispatch]);

  useEffect(() => {
    if (!initialDoctor?._id || hasOpenedDoctorModalFromParams.current) return;
    hasOpenedDoctorModalFromParams.current = true;
    const fromDoctorProfile = route.params?.fromDoctorProfile;
    if (fromDoctorProfile) {
      setSelectedDoctor(initialDoctor);
      dispatch(getDoctorById({ id: initialDoctor._id }));
      const clinics = initialDoctor?.clinics;
      if (Array.isArray(clinics) && clinics.length === 1)
        setSelectedClinic(clinics[0]);
      return;
    }
    setDoctorModalDoctor(initialDoctor);
    setDoctorModalVisible(true);
    dispatch(getDoctorById({ id: initialDoctor._id }));
    const clinics = initialDoctor?.clinics;
    if (Array.isArray(clinics) && clinics.length === 1)
      setDoctorModalSelectedClinic(clinics[0]);
    else setDoctorModalSelectedClinic(null);
    doctorSheetAnim.setValue(1);
    requestAnimationFrame(() => {
      Animated.timing(doctorSheetAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  }, [initialDoctor?._id, route.params?.fromDoctorProfile, dispatch, doctorSheetAnim]);

  useEffect(() => {
    if (!selectedDoctor?._id) return;
    dispatch(getDoctorById({ id: selectedDoctor._id }));
    return () => {
      dispatch(clearBookingAvailability());
      dispatch(clearById());
    };
  }, [selectedDoctor?._id, dispatch]);

  useEffect(() => {
    if (!selectedDoctor?._id) return;
    // Slots (and thus available dates) depend on the chosen service's duration,
    // so the patient must pick a type before the calendar loads.
    if (!selectedType?._id) return;
    if (clinics.length > 1 && !selectedClinic) return;
    const clinicId = selectedClinic?._id ?? undefined;
    const key = `${selectedDoctor._id}|${clinicId ?? ""}|${selectedType._id}`;
    if (
      lastFetchedDatesKeyRef.current === key &&
      Array.isArray(patientAvailableDates) &&
      patientAvailableDates.length > 0
    ) {
      return;
    }
    lastFetchedDatesKeyRef.current = key;
    const promise = dispatch(
      fetchPatientAvailableDates({
        doctorId: selectedDoctor._id,
        clinicId,
        appointmentTypeId: selectedType._id,
      }),
    );
    if (promise?.abort) fetchDatesAbortRef.current = promise.abort;
    return () => {
      if (typeof fetchDatesAbortRef.current === "function") {
        fetchDatesAbortRef.current();
        fetchDatesAbortRef.current = null;
      }
    };
    // NOTE: intentionally NOT depending on `patientAvailableDates` — otherwise
    // every paging append re-ran this effect (and its cleanup aborted the
    // in-flight fetch), which could wipe the already-loaded near-term dates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctor?._id, selectedClinic?._id, selectedType?._id, dispatch]);

  useEffect(() => {
    if (!selectedDoctor?._id || !selectedDate || !selectedType?._id) return;
    const clinicId = selectedClinic?._id ?? undefined;
    dispatch(
      fetchPatientAvailableTimes({
        doctorId: selectedDoctor._id,
        date: selectedDate,
        clinicId,
        appointmentTypeId: selectedType._id,
      }),
    );
  }, [selectedDoctor?._id, selectedDate, selectedClinic?._id, selectedType?._id, dispatch]);

  useEffect(() => {
    if (clinics.length === 1 && clinics[0]) {
      setSelectedClinic(clinics[0]);
    } else if (clinics.length === 0) {
      setSelectedClinic(null);
    }
  }, [clinics.length, clinics[0]?._id]);

  useEffect(() => {
    const types = appointmentTypesForDoctor;
    if (Array.isArray(types) && types.length === 1 && !selectedType) {
      setSelectedType(types[0]);
    }
  }, [appointmentTypesForDoctor, selectedType]);

  // Modality choice is specific to each appointment type, so reset it whenever
  // the selected type changes (including auto-select above). The date/slot are
  // also cleared because slot lengths (and which dates have room) depend on the
  // type's duration — a selection made under a different type is no longer valid.
  useEffect(() => {
    setSelectedModality(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSelectedHour(null);
  }, [selectedType?._id]);

  useEffect(() => {
    if (!doctorModalVisible || !doctorModalDoctor) return;
    const doc =
      doctorFromApi && doctorFromApi._id === doctorModalDoctor._id
        ? doctorFromApi
        : doctorModalDoctor;
    const clinics = doc?.clinics;
    if (
      Array.isArray(clinics) &&
      clinics.length === 1 &&
      !doctorModalSelectedClinic
    ) {
      setDoctorModalSelectedClinic(clinics[0]);
    }
  }, [
    doctorModalVisible,
    doctorModalDoctor,
    doctorFromApi,
    doctorModalSelectedClinic,
  ]);

  useEffect(() => {
    const doctorId = doctorForModal?._id;
    const clinicId = doctorModalSelectedClinic?._id;
    if (!doctorId || !clinicId) return;
    dispatch(getDoctorClinicSchedules({ doctorId, clinicId }));
  }, [doctorModalSelectedClinic?._id, doctorForModal?._id, dispatch]);

  useEffect(() => {
    if (
      appointmentsError?.patientDates &&
      appointmentsError.patientDates !== "Cancelled"
    )
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message: t.errorDataDates,
      }));
    if (appointmentsError?.patientSlots)
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message: t.errorDataTimes,
      }));
    if (appointmentsError?.create)
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message: t.bookingError,
      }));
    if (appointmentsError?.waitlistJoin)
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message: appointmentsError.waitlistJoin,
      }));
  }, [
    appointmentsError?.patientDates,
    appointmentsError?.patientSlots,
    appointmentsError?.create,
    appointmentsError?.waitlistJoin,
    t.bookingError,
    t.errorDataDates,
    t.errorDataTimes,
  ]);

  // M19: reset the "joined" indicator whenever the doctor or date selection
  // changes, so the button doesn't show a stale "already joined" state.
  useEffect(() => {
    setWaitlistJoinedKey(null);
  }, [selectedDoctor?._id]);

  // Join with advanced criteria from the config modal. Works with NO date
  // selected — the modal supplies dateFrom/dateTo (defaulting to today), so the
  // waitlist is always available. `criteria` = { dateFrom, dateTo, timeFrom, timeTo }.
  const handleJoinWaitlist = useCallback(
    (criteria = {}) => {
      if (!selectedDoctor?._id) return;
      const dateFrom = criteria.dateFrom ?? selectedDate;
      if (!dateFrom) return;
      dispatch(
        joinWaitlist({
          doctorId: selectedDoctor._id,
          date: dateFrom,
          dateFrom,
          dateTo: criteria.dateTo ?? dateFrom,
          timeFrom: criteria.timeFrom ?? undefined,
          timeTo: criteria.timeTo ?? undefined,
          clinicId: selectedClinic?._id,
          appointmentTypeId: selectedType?._id,
        }),
      )
        .unwrap()
        .then(() => {
          setWaitlistJoinedKey(selectedDoctor._id);
          setWaitlistModalOpen(false);
          setBanner({
            visible: true,
            type: "success",
            message: t.waitlistJoined,
          });
        })
        .catch(() => {});
    },
    [selectedDoctor?._id, selectedDate, selectedClinic?._id, selectedType?._id, dispatch, t.waitlistJoined],
  );

  const openDoctorModal = useCallback(
    (doctor) => {
      if (!doctor?._id) return;
      setDoctorModalDoctor(doctor);
      setDoctorModalPhotoLoadFailed(false);
      setDoctorModalVisible(true);
      dispatch(getDoctorById({ id: doctor._id }));
      const clinics = doctor?.clinics;
      if (Array.isArray(clinics) && clinics.length === 1)
        setDoctorModalSelectedClinic(clinics[0]);
      else setDoctorModalSelectedClinic(null);
      setSearchText("");
      setShowDropdown(false);
      setSelectedClinic(null);
      setSelectedDate(null);
      setSelectedSlot(null);
      setSelectedHour(null);
      setSelectedType(null);
      setSelectedModality(null);
      Keyboard.dismiss();
      doctorSheetAnim.setValue(1);
      requestAnimationFrame(() => {
        Animated.timing(doctorSheetAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    },
    [dispatch, doctorSheetAnim],
  );

  const closeDoctorModal = useCallback(() => {
    Animated.timing(doctorSheetAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setDoctorModalVisible(false);
        setDoctorModalDoctor(null);
        setDoctorModalSelectedClinic(null);
        dispatch(clearDoctorClinicSchedule());
      }
    });
  }, [doctorSheetAnim, dispatch]);

  const handleSelectDoctor = (doctor) => {
    openDoctorModal(doctor);
  };

  const handleDoctorModalBookAppointment = useCallback(() => {
    const doctorToSelect =
      doctorFromApi &&
      doctorModalDoctor &&
      doctorFromApi._id === doctorModalDoctor._id
        ? doctorFromApi
        : doctorModalDoctor;
    const clinics = doctorToSelect?.clinics;
    const clinicToSelect =
      doctorModalSelectedClinic ??
      (Array.isArray(clinics) && clinics.length === 1 ? clinics[0] : null);
    if (doctorToSelect) setSelectedDoctor(doctorToSelect);
    setSelectedClinic(clinicToSelect);
    closeDoctorModal();
  }, [
    doctorFromApi,
    doctorModalDoctor,
    doctorModalSelectedClinic,
    closeDoctorModal,
  ]);

  const handleDateSelect = (day) => {
    const dateStr = day?.dateString;
    if (!dateStr || !patientAvailableDates.includes(dateStr)) return;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setSelectedHour(null);
  };

  const handleSelectHour = (hour) => {
    LayoutAnimation.configureNext(expandAnimation);
    setSelectedHour(hour);
    setSelectedSlot(null);
  };

  const handleClearHour = () => {
    LayoutAnimation.configureNext(expandAnimation);
    setSelectedHour(null);
    setSelectedSlot(null);
  };

  // Effective modality for THIS booking. Declared BEFORE handleConfirm (and
  // listed in its deps) so that picking a modality actually recreates the
  // callback — otherwise handleConfirm captured a stale (null) modality and the
  // first "Agendar" tap failed until something else forced a re-render.
  const typeAllowsInPerson = selectedType ? selectedType.allowsInPerson !== false : true;
  const typeAllowsVideoCall = selectedType ? !!selectedType.allowsVideoCall : false;
  const typeAllowsBothModalities = typeAllowsInPerson && typeAllowsVideoCall;
  const effectiveModality = typeAllowsBothModalities
    ? selectedModality
    : typeAllowsVideoCall
      ? "video_call"
      : "in_person";

  const handleConfirm = useCallback(async () => {
    const hasDoctor = !!selectedDoctor?._id;
    const hasType = !!selectedType?._id;
    const hasSlotStart = !!selectedSlot?.start;
    const hasSlotEnd = !!selectedSlot?.end;
    const hasModality = !!effectiveModality;
    if (!hasDoctor || !hasType || !hasSlotStart || !hasSlotEnd || !hasModality) {
      // eslint-disable-next-line no-console
      console.warn(
        "[FindAndBook] handleConfirm early return: missing required field(s)",
      );
      if (!hasModality) {
        setBanner((b) => ({
          ...b,
          visible: true,
          type: "error",
          message:
            language === "es"
              ? "Elige si prefieres la cita en consultorio o por video llamada."
              : "Choose whether you'd like an in-person or video call appointment.",
        }));
      }
      return;
    }
    // Family booking: when booking for someone else, require a name + phone
    // and route through the guest-patient path.
    let guestPatient;
    if (bookingFor === "other") {
      if (!guestName.trim() || !guestPhone.trim()) {
        setBanner((b) => ({
          ...b,
          visible: true,
          type: "error",
          message:
            language === "es"
              ? "Ingresa el nombre y teléfono de la persona."
              : "Enter the person's name and phone.",
        }));
        return;
      }
      guestPatient = {
        fullName: guestName.trim(),
        phone: guestPhone.trim(),
        relationship: guestRelation.trim() || undefined,
      };
    }
    const clinicId = selectedClinic?._id ?? undefined;
    const result = await dispatch(
      createPatientAppointment({
        doctorId: selectedDoctor._id,
        appointmentTypeId: selectedType._id,
        start: selectedSlot.start,
        end: selectedSlot.end,
        clinicId,
        modality: effectiveModality,
        guestPatient,
      }),
    );
    if (createPatientAppointment.fulfilled.match(result)) {
      // Capture booking details for the confirmation screen before resetting.
      const confirmedParams = {
        doctor: selectedDoctor,
        start: selectedSlot.start,
        clinic: selectedClinic,
        modality: effectiveModality,
        appointmentType: selectedType,
      };
      // Reset the family-booking fields so the next booking defaults to self.
      setBookingFor("self");
      setGuestName("");
      setGuestPhone("");
      setGuestRelation("");
      dispatch(getPatientUpcomingAppointments());
      setConfirmedBooking(confirmedParams);
    }
  }, [
    selectedDoctor,
    selectedType,
    selectedSlot,
    selectedClinic,
    effectiveModality,
    bookingFor,
    guestName,
    guestPhone,
    guestRelation,
    language,
    dispatch,
    navigation,
    t.bookingSuccess,
  ]);

  // Dismiss the confirmation overlay and jump to the Citas tab. Resetting this
  // booking stack first ensures nothing is left behind when returning to it.
  const handleConfirmedOk = useCallback(() => {
    setConfirmedBooking(null);
    navigation.popToTop?.();
    navigation.getParent()?.navigate("Appointments", { screen: "AppointmentsMain" });
  }, [navigation]);

  const handleBack = () => navigation.goBack();

  const markedDates = useMemo(() => {
    // Reset the accumulator whenever the doctor/clinic/type changes (fresh set) —
    // available dates depend on the selected service's duration.
    const accumKey = `${selectedDoctor?._id ?? ""}|${selectedClinic?._id ?? ""}|${selectedType?._id ?? ""}`;
    if (seenAvailableKeyRef.current !== accumKey) {
      seenAvailableKeyRef.current = accumKey;
      seenAvailableDatesRef.current = new Set();
      seenAvailableThroughRef.current = null;
    }
    // Accumulate: fold whatever the latest fetch returned into the running set,
    // so earlier months stay marked even if a racing fetch replaced the array.
    (patientAvailableDates || []).forEach((dt) => seenAvailableDatesRef.current.add(dt));
    const rangeTo = patientAvailableDatesRange?.to ?? null;
    if (rangeTo && (!seenAvailableThroughRef.current || rangeTo > seenAvailableThroughRef.current)) {
      seenAvailableThroughRef.current = rangeTo;
    }
    const availableSet = seenAvailableDatesRef.current;
    const fetchedThrough = seenAvailableThroughRef.current;

    const out = {};
    const today = new Date();
    // An available day is selectable; any OTHER day up to the furthest window we
    // have fetched is disabled. Days beyond that window stay enabled so paging
    // forward can still load them.
    for (let i = 0; i < 180; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      if (availableSet.has(dateStr)) {
        out[dateStr] = {
          selected: selectedDate === dateStr,
          selectedColor: COLORS.secondary,
          selectedTextColor: COLORS.white,
        };
      } else if (fetchedThrough && dateStr <= fetchedThrough) {
        out[dateStr] = { disabled: true, disableTouchEvent: true };
      }
    }
    return out;
  }, [patientAvailableDates, patientAvailableDatesRange, selectedDate]);

  /** Calendar paged to a new month: if it goes past what we've fetched, reload
   *  the WHOLE window from today up to the visible month (append:false). Fetching
   *  from today every time — instead of appending only the far slice — guarantees
   *  the near-term dates are always in the result, so paging back never shows an
   *  empty (all-greyed) calendar even if requests resolve out of order. The
   *  backend allows up to ~183 days, which covers the calendar's 180-day range in
   *  a single query. */
  const handleCalendarMonthChange = useCallback(
    (month) => {
      // Track the visible month so we can disable the "<" arrow on the current
      // month (booking in already-elapsed months makes no sense).
      const ym = `${month.year}-${String(month.month).padStart(2, "0")}`;
      setCalendarMonth(ym);
      if (!selectedDoctor?._id || !selectedType?._id) return;
      const fetchedThrough = patientAvailableDatesRange?.to;

      // Last day of the month the user just scrolled to (+ a week of lookahead).
      const visibleMonthEnd = new Date(month.year, month.month, 0);
      const visibleEndStr = visibleMonthEnd.toISOString().split("T")[0];
      if (fetchedThrough && visibleEndStr <= fetchedThrough) return; // already loaded

      const today = new Date();
      const toDate = new Date(visibleMonthEnd);
      toDate.setDate(toDate.getDate() + 7);

      dispatch(
        fetchPatientAvailableDates({
          doctorId: selectedDoctor._id,
          clinicId: selectedClinic?._id ?? undefined,
          appointmentTypeId: selectedType._id,
          from: today.toISOString().split("T")[0],
          to: toDate.toISOString().split("T")[0],
          append: false,
        }),
      );
    },
    [
      dispatch,
      selectedDoctor?._id,
      selectedClinic?._id,
      selectedType?._id,
      patientAvailableDatesRange,
    ],
  );

  const allSlots = patientAvailableSlots || [];
  const uniqueHours = getUniqueHours(allSlots);
  const slotsForSelectedHour =
    selectedHour !== null ? getSlotsForHour(allSlots, selectedHour) : [];
  const hasSlots = uniqueHours.length > 0;
  const types = appointmentTypesForDoctor || [];
  const canConfirm =
    selectedDoctor?._id &&
    selectedType?._id &&
    selectedSlot?.start &&
    selectedSlot?.end &&
    !!effectiveModality;
  const isCreating = useSelector((state) => state.appointments.loading.create);

  const DAY_NAMES =
    language === "es"
      ? [
          "Domingo",
          "Lunes",
          "Martes",
          "Miércoles",
          "Jueves",
          "Viernes",
          "Sábado",
        ]
      : [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];

  const scheduleForSelectedClinic = React.useMemo(() => {
    if (!doctorForModal || !doctorModalSelectedClinic) return [];
    const clinicId = doctorModalSelectedClinic?._id;
    const clinicName = (
      doctorModalSelectedClinic?.name ??
      doctorModalSelectedClinic?._id ??
      ""
    )
      .trim()
      .toLowerCase();

    const dayMap = new Map();

    const addSlot = (dayKey, from, to) => {
      const dayStr =
        typeof dayKey === "number"
          ? (DAY_NAMES[dayKey] ?? String(dayKey))
          : String(dayKey ?? "");
      if (!dayStr) return;
      if (!dayMap.has(dayStr)) dayMap.set(dayStr, []);
      dayMap.get(dayStr).push({ from: from ?? "", to: to ?? "" });
    };

    const selectedClinicFromDoctor = Array.isArray(doctorForModal.clinics)
      ? doctorForModal.clinics.find(
          (c) =>
            c._id === clinicId ||
            (c.name ?? "").trim().toLowerCase() === clinicName,
        )
      : null;
    const clinicSchedule =
      selectedClinicFromDoctor?.schedule ??
      selectedClinicFromDoctor?.schedules ??
      selectedClinicFromDoctor?.availability;

    if (Array.isArray(clinicSchedule)) {
      for (const entry of clinicSchedule) {
        const day = entry.dayOfWeek ?? entry.day ?? entry.dayOfWeekNumber;
        const slots =
          entry.slots ??
          entry.timeSlots ??
          (entry.startTime
            ? [{ from: entry.startTime, to: entry.endTime }]
            : []);
        for (const slot of slots) {
          const from = slot.from ?? slot.startTime ?? slot.start;
          const to = slot.to ?? slot.endTime ?? slot.end;
          if (from != null || to != null) addSlot(day, from, to);
        }
      }
    }

    const availability =
      doctorForModal?.profile?.availability ??
      doctorForModal?.availability ??
      [];
    for (const entry of availability) {
      const slots = entry?.timeSlots ?? entry?.slots ?? [];
      for (const slot of slots) {
        const loc = (slot?.location ?? "").trim().toLowerCase();
        if (
          !clinicName ||
          loc === clinicName ||
          loc.includes(clinicName) ||
          clinicName.includes(loc)
        ) {
          addSlot(
            entry.day,
            slot.from ?? slot.startTime,
            slot.to ?? slot.endTime,
          );
        }
      }
    }

    let result = Array.from(dayMap, ([day, slots]) => ({ day, slots })).filter(
      (e) => e.slots.length > 0,
    );
    const fetchedSchedule = doctorClinicSchedule?.schedule;
    if (
      result.length === 0 &&
      doctorClinicSchedule?.clinicId === doctorModalSelectedClinic?._id &&
      Array.isArray(fetchedSchedule) &&
      fetchedSchedule.length > 0
    ) {
      const enToLocale = {
        Sunday: DAY_NAMES[0],
        Monday: DAY_NAMES[1],
        Tuesday: DAY_NAMES[2],
        Wednesday: DAY_NAMES[3],
        Thursday: DAY_NAMES[4],
        Friday: DAY_NAMES[5],
        Saturday: DAY_NAMES[6],
      };
      result = fetchedSchedule.map((e) => ({
        day: enToLocale[e.day] ?? e.day,
        slots: Array.isArray(e.slots) ? e.slots : [],
      }));
    }
    return result;
  }, [
    doctorForModal,
    doctorModalSelectedClinic,
    doctorClinicSchedule,
    language,
  ]);

  return (
    <View style={styles.container}>
      <TopBanner
        visible={banner.visible}
        type={banner.type}
        message={banner.message}
        onHide={() => setBanner((b) => ({ ...b, visible: false }))}
      />
      <Modal
        visible={doctorModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeDoctorModal}
      >
        <View
          style={[
            appointmentStyles.modalOverlay,
            Platform.OS === "web" && {
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            },
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={closeDoctorModal} />
          <Animated.View
            style={[
              styles.doctorModalSheet,
              {
                top: PADDINGS.screenEdge + insets.top,
                transform: [
                  {
                    translateY: doctorSheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, screenHeight],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.doctorModalHandleWrap}>
              <View style={appointmentStyles.modalSheetHandle} />
            </View>
            {doctorForModal && (
              <ScrollView
                style={styles.doctorModalScroll}
                contentContainerStyle={styles.doctorModalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.doctorModalProfileWrap}>
                  {getDoctorPhotoUri(doctorForModal) &&
                  !doctorModalPhotoLoadFailed ? (
                    <Image
                      source={{ uri: getDoctorPhotoUri(doctorForModal) }}
                      style={styles.doctorModalAvatar}
                      onError={() => setDoctorModalPhotoLoadFailed(true)}
                    />
                  ) : (
                    <View style={styles.doctorModalAvatarPlaceholder}>
                      <Text
                        style={{
                          fontSize: 28,
                          fontWeight: FONT_WEIGHT.boldFont,
                          color: COLORS.whiteText,
                        }}
                      >
                        {getDoctorInitials(doctorForModal)}
                      </Text>
                    </View>
                  )}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={styles.doctorModalName}>
                      {doctorForModal.fullName ?? doctorForModal.name ?? ""}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        const id = doctorForModal._id;
                        if (!id) return;
                        if (favoriteDoctorIds.includes(id)) dispatch(removeFavoriteDoctor(id));
                        else dispatch(addFavoriteDoctor(id));
                      }}
                      accessibilityLabel={
                        favoriteDoctorIds.includes(doctorForModal._id)
                          ? (language === "es" ? "Quitar de favoritos" : "Remove from favorites")
                          : (language === "es" ? "Agregar a favoritos" : "Add to favorites")
                      }
                    >
                      <Ionicons
                        name={favoriteDoctorIds.includes(doctorForModal._id) ? "heart" : "heart-outline"}
                        size={22}
                        color={favoriteDoctorIds.includes(doctorForModal._id) ? "#EF4444" : COLORS.greyText}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const id = doctorForModal._id;
                        if (!id) return;
                        const name = doctorForModal.fullName ?? doctorForModal.name ?? "";
                        const url = `${WEB_APP_URL}/doctor/${id}`;
                        const message =
                          language === "es"
                            ? `Te comparto el perfil de ${name || "este médico"} en HeiDoctor: ${url}`
                            : `Check out ${name || "this doctor"}'s profile on HeiDoctor: ${url}`;
                        Share.share({ message, url });
                      }}
                      accessibilityLabel={language === "es" ? "Compartir médico" : "Share doctor"}
                    >
                      <Ionicons
                        name={Platform.OS === "ios" ? "share-outline" : "share-social-outline"}
                        size={22}
                        color={COLORS.greyText}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.doctorModalSpecialty}>
                    {getSpecialtyDisplay(doctorForModal, language) || "-"}
                  </Text>
                </View>

                <View style={styles.doctorModalDivider} />

                <View style={styles.doctorModalSection}>
                  <View style={styles.doctorModalSectionHeader}>
                    <Ionicons
                      name="location"
                      size={20}
                      color={COLORS.secondary}
                      style={styles.doctorModalSectionIcon}
                    />
                    <Text style={styles.doctorModalSectionTitle}>
                      {tDocProfile.clinics}
                    </Text>
                  </View>
                  {Array.isArray(doctorForModal.clinics) &&
                    doctorForModal.clinics.length > 0 && (
                      <>
                        <Text
                          style={[
                            styles.doctorModalContactLabel,
                            { marginBottom: 8 },
                          ]}
                        >
                          {tDocProfile.selectLocation}
                        </Text>
                        <View style={styles.doctorModalClinicList}>
                          {doctorForModal.clinics.map((clinic, idx) => {
                            const isSelected =
                              doctorModalSelectedClinic?._id === clinic._id;
                            const mapsLink =
                              clinic?.googleMapsLink ??
                              clinic?.googleMaps ??
                              null;
                            return (
                              <TouchableOpacity
                                key={clinic._id}
                                style={[
                                  styles.doctorModalClinicRow,
                                  idx === doctorForModal.clinics.length - 1 &&
                                    styles.doctorModalClinicRowLast,
                                  isSelected &&
                                    styles.doctorModalClinicRowSelected,
                                ]}
                                onPress={() =>
                                  setDoctorModalSelectedClinic(clinic)
                                }
                                activeOpacity={0.7}
                              >
                                <View
                                  style={[
                                    styles.clinicRadioOuter,
                                    isSelected && styles.clinicRadioOuterSelected,
                                  ]}
                                >
                                  {isSelected && <View style={styles.clinicRadioInner} />}
                                </View>
                                <View style={styles.clinicNameWrap}>
                                  <Text style={styles.clinicName} numberOfLines={2}>
                                    {clinic.name ?? clinic._id}
                                  </Text>
                                  {clinic.locationReference ? (
                                    <Text style={styles.clinicLocationReference} numberOfLines={2}>
                                      {clinic.locationReference}
                                    </Text>
                                  ) : null}
                                </View>
                                {mapsLink ? (
                                  <GlassButton
                                    variant="secondary"
                                    style={styles.clinicMapsButton}
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      Linking.openURL(mapsLink);
                                    }}
                                    accessibilityLabel={
                                      language === "es"
                                        ? "Ver en Google Maps"
                                        : "View on Google Maps"
                                    }
                                  >
                                    <Ionicons
                                      name="location"
                                      size={22}
                                      color={COLORS.secondary}
                                    />
                                  </GlassButton>
                                ) : null}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    )}
                  <View style={styles.doctorModalContactRow}>
                    <Text style={styles.doctorModalContactLabel}>
                      {tDocProfile.phone}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        doctorForModal.phone &&
                        Linking.openURL(`tel:${doctorForModal.phone}`)
                      }
                    >
                      <Text style={styles.doctorModalContactValue}>
                        {doctorForModal.phone ?? "-"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.doctorModalContactRow}>
                    <Text style={styles.doctorModalContactLabel}>
                      {tDocProfile.email}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        doctorForModal.email &&
                        Linking.openURL(`mailto:${doctorForModal.email}`)
                      }
                    >
                      <Text style={styles.doctorModalContactValue}>
                        {doctorForModal.email ?? "-"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.doctorModalDivider} />

                <View style={styles.doctorModalSection}>
                  <View style={styles.doctorModalSectionHeader}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={COLORS.secondary}
                      style={styles.doctorModalSectionIcon}
                    />
                    <Text style={styles.doctorModalSectionTitle}>
                      {tDocProfile.profile}
                    </Text>
                  </View>
                  {(doctorForModal.biography || doctorForModal.profession) && (
                    <Text style={styles.doctorModalBio}>
                      {doctorForModal.biography ??
                        `${getMainSpecialtyDisplay(doctorForModal, language)}${language === "es" ? " con experiencia." : " with experience."}`}
                    </Text>
                  )}
                  {((Array.isArray(doctorForModal.subSpecialties) &&
                    doctorForModal.subSpecialties.length > 0) ||
                    (Array.isArray(doctorForModal.treatments) &&
                      doctorForModal.treatments.length > 0)) && (
                    <View style={styles.doctorModalChips}>
                      {(doctorForModal.subSpecialties ?? []).map((s, i) => (
                        <View key={`ss-${i}`} style={styles.doctorModalChip}>
                          <Text style={styles.doctorModalChipText}>
                            {typeof s === "string" ? s : (s?.name ?? "")}
                          </Text>
                        </View>
                      ))}
                      {(doctorForModal.treatments ?? []).map((treat, i) => (
                        <View key={`t-${i}`} style={styles.doctorModalChip}>
                          <Text style={styles.doctorModalChipText}>
                            {typeof treat === "string"
                              ? treat
                              : (treat?.treatmentName ?? treat?.name ?? "")}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.doctorModalDivider} />

                <View style={styles.doctorModalSection}>
                  <View style={styles.doctorModalSectionHeader}>
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color={COLORS.secondary}
                      style={styles.doctorModalSectionIcon}
                    />
                    <Text style={styles.doctorModalSectionTitle}>
                      {tDocProfile.schedule}
                    </Text>
                  </View>
                  {!doctorModalSelectedClinic ? (
                    <Text style={styles.doctorModalScheduleNote}>
                      {language === "es"
                        ? "Selecciona una clínica para ver los horarios."
                        : "Select a clinic to see schedule."}
                    </Text>
                  ) : scheduleForSelectedClinic.length > 0 ? (
                    <>
                      {scheduleForSelectedClinic.map(({ day, slots }, i) => (
                        <View
                          key={`${day}-${i}`}
                          style={styles.doctorModalScheduleCard}
                        >
                          <Text style={styles.doctorModalScheduleDay}>
                            {day}
                          </Text>
                          <View
                            style={{
                              flex: 1,
                              marginLeft: 12,
                              alignItems: "flex-end",
                            }}
                          >
                            {slots.map((slot, j) => (
                              <View
                                key={`${slot.from}-${j}`}
                                style={[
                                  styles.doctorModalScheduleTimeRow,
                                  j > 0 && { marginTop: 8 },
                                ]}
                              >
                                <Ionicons
                                  name="time-outline"
                                  size={18}
                                  color={COLORS.secondary}
                                />
                                <Text
                                  style={styles.doctorModalScheduleTimeText}
                                >
                                  {slot.from} - {slot.to}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ))}
                      <Text
                        style={[
                          styles.doctorModalScheduleNote,
                          { marginTop: 8 },
                        ]}
                      >
                        {language === "es"
                          ? "Al agendar verás las fechas y horarios disponibles para esta clínica."
                          : "When you book, you'll see available dates and times for this clinic."}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.doctorModalScheduleNote}>
                      {language === "es"
                        ? `Al agendar verás las fechas y horarios disponibles para ${doctorModalSelectedClinic.name ?? doctorModalSelectedClinic._id}.`
                        : `When you book, you'll see available dates and times for ${doctorModalSelectedClinic.name ?? doctorModalSelectedClinic._id}.`}
                    </Text>
                  )}
                </View>

                <View style={styles.doctorModalCtaWrap}>
                  <TouchableOpacity
                    style={styles.doctorModalCta}
                    onPress={handleDoctorModalBookAppointment}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.doctorModalCtaText}>
                      {t.createAppointmentWithDoctor ??
                        (language === "es"
                          ? "Agendar cita con este médico"
                          : "Create appointment with this doctor")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={ICONS.backArrow} size={SIZES.icon20} color={COLORS.secondary} />
          </TouchableOpacity>
          {selectedDoctor ? (
            <Text style={styles.headerTitle} numberOfLines={1}>
              {language === "es" ? "Agendar Cita" : "Book Appointment"}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {selectedDoctor && getDoctorPhotoUri(selectedDoctor) ? (
            <Image source={{ uri: getDoctorPhotoUri(selectedDoctor) }} style={styles.headerAvatar} />
          ) : selectedDoctor ? (
            <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
              <Ionicons name="person" size={18} color={COLORS.whiteText} />
            </View>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        {!selectedDoctor && (
          <View style={styles.searchWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder={t.searchPlaceholder}
              placeholderTextColor={COLORS.ligthGreyText}
              value={searchText}
              onChangeText={setSearchText}
              onFocus={() =>
                searchText.length >= MIN_SEARCH_LEN && setShowDropdown(true)
              }
            />
            {showDropdown && (
              <View style={styles.dropdown}>
                {doctorLoading.searchQuery ? (
                  <View style={styles.loader}>
                    <ActivityIndicator size="small" color={COLORS.secondary} />
                  </View>
                ) : doctorError?.searchQuery ? (
                  <Text style={[styles.emptyText, { color: COLORS.error }]}>
                    {doctorError.searchQuery}
                  </Text>
                ) : !Array.isArray(doctorsSearchResults) ||
                  doctorsSearchResults.length === 0 ? (
                  <Text style={styles.emptyText}>{t.noResults ?? ""}</Text>
                ) : (
                  <ScrollView
                    style={styles.resultsScroll}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {doctorsSearchResults
                      .filter((doc) => doc && doc._id)
                      .map((doc) => {
                        const avail = formatAvailability(doc.nextAvailable, language);
                        const clinic =
                          Array.isArray(doc.clinics) && doc.clinics[0] ? doc.clinics[0] : null;
                        const mods = Array.isArray(doc.modalities) ? doc.modalities : [];
                        const inPerson = mods.includes("in_person");
                        const video = mods.includes("video_call");
                        const photo = getDoctorPhotoUri(doc);
                        return (
                          <View key={doc._id} style={styles.resultCard}>
                            <View
                              style={[
                                styles.resultAccent,
                                { backgroundColor: avail.available ? "#22C55E" : "#F87171" },
                              ]}
                            />
                            <View style={styles.resultBody}>
                              <View style={styles.resultTopRow}>
                                {photo ? (
                                  <Image source={{ uri: photo }} style={styles.resultAvatar} />
                                ) : (
                                  <View style={[styles.resultAvatar, styles.resultAvatarPlaceholder]}>
                                    <Text style={styles.resultAvatarInitials}>
                                      {getDoctorInitials(doc)}
                                    </Text>
                                  </View>
                                )}
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.resultName} numberOfLines={1}>
                                    {doc.fullName ?? doc.name ?? ""}
                                  </Text>
                                  <View style={styles.resultChip}>
                                    {getSpecialtyIcon(doc.profession) ? (
                                      <Image
                                        source={getSpecialtyIcon(doc.profession)}
                                        style={styles.resultChipIcon}
                                        resizeMode="contain"
                                      />
                                    ) : (
                                      <Ionicons name="medkit" size={12} color={COLORS.secondary} />
                                    )}
                                    <Text style={styles.resultChipText} numberOfLines={1}>
                                      {getMainSpecialtyDisplay(doc, language) ||
                                        getSpecialtyLabel(doc, language)}
                                    </Text>
                                  </View>
                                </View>
                              </View>

                              <View style={styles.resultInfoBox}>
                                {clinic ? (
                                  <View style={styles.resultInfoRow}>
                                    <Ionicons name="location-outline" size={16} color={COLORS.greyText} />
                                    <Text style={styles.resultInfoText} numberOfLines={1}>
                                      {[clinic.name, clinic.locationReference].filter(Boolean).join(", ")}
                                    </Text>
                                  </View>
                                ) : null}
                                <View style={styles.resultInfoRow}>
                                  {avail.available ? (
                                    <>
                                      <Ionicons name="calendar-outline" size={16} color="#16A34A" />
                                      <Text
                                        style={[styles.resultInfoText, { color: "#16A34A", fontWeight: "600" }]}
                                        numberOfLines={2}
                                      >
                                        {avail.text}
                                      </Text>
                                    </>
                                  ) : (
                                    <>
                                      <Ionicons name="hourglass-outline" size={16} color="#DC2626" />
                                      <Text
                                        style={[styles.resultInfoText, { color: "#DC2626" }]}
                                        numberOfLines={2}
                                      >
                                        {language === "es"
                                          ? "No tiene citas disponibles pero puedes solicitar lista de espera"
                                          : "No appointments available, but you can join the waitlist"}
                                      </Text>
                                    </>
                                  )}
                                </View>
                                {inPerson || video ? (
                                  <View style={styles.resultModRow}>
                                    {inPerson ? (
                                      <View style={styles.resultMod}>
                                        <Ionicons name="person-outline" size={14} color={COLORS.secondary} />
                                        <Text style={styles.resultModText}>
                                          {language === "es" ? "Presencial" : "In-person"}
                                        </Text>
                                      </View>
                                    ) : null}
                                    {video ? (
                                      <View style={styles.resultMod}>
                                        <Ionicons name="videocam-outline" size={14} color={COLORS.secondary} />
                                        <Text style={styles.resultModText}>
                                          {language === "es" ? "Videollamada" : "Video call"}
                                        </Text>
                                      </View>
                                    ) : null}
                                  </View>
                                ) : null}
                              </View>

                              <View style={styles.resultBtnRow}>
                                <TouchableOpacity
                                  style={styles.resultBtnOutline}
                                  onPress={() => handleSelectDoctor(doc)}
                                >
                                  <Text style={styles.resultBtnOutlineText}>
                                    {language === "es" ? "Ver perfil" : "View profile"}
                                  </Text>
                                </TouchableOpacity>
                                {avail.available ? (
                                  <TouchableOpacity
                                    style={styles.resultBtnPrimary}
                                    onPress={() => handleSelectDoctor(doc)}
                                  >
                                    <Text style={styles.resultBtnPrimaryText}>
                                      {language === "es" ? "Agendar" : "Book"}
                                    </Text>
                                  </TouchableOpacity>
                                ) : (
                                  <TouchableOpacity
                                    style={styles.resultBtnMuted}
                                    onPress={() => handleSelectDoctor(doc)}
                                  >
                                    <Ionicons name="notifications-outline" size={14} color={COLORS.blackText} />
                                    <Text style={styles.resultBtnMutedText}>
                                      {language === "es" ? "Avisarme" : "Notify me"}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                  </ScrollView>
                )}
              </View>
            )}

            <GlassButton
              variant="secondary"
              style={[
                styles.filterToggleButton,
                hasActiveFilters && styles.filterToggleButtonActive,
              ]}
              onPress={() => setFiltersOpen((v) => !v)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="options-outline"
                size={SIZES.icon20 ?? 18}
                color={COLORS.blackText}
              />
              <Text style={styles.filterToggleButtonText}>
                {language === "es" ? "Filtros" : "Filters"}
                {hasActiveFilters ? " •" : ""}
              </Text>
            </GlassButton>

            {filtersOpen && (
              <View style={styles.filterPanel}>
                <Text style={styles.filterSectionLabel}>
                  {language === "es" ? "Modalidad" : "Modality"}
                </Text>
                <View style={styles.filterOptionRow}>
                  {[
                    { key: "both", label: language === "es" ? "Ambas" : "Both" },
                    { key: "in_person", label: language === "es" ? "Presencial" : "In-person" },
                    { key: "video_call", label: language === "es" ? "Virtual" : "Virtual" },
                  ].map((opt) => {
                    const selected = filterModality === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[styles.filterOption, selected && styles.filterOptionSelected]}
                        onPress={() => setFilterModality(opt.key)}
                      >
                        <Text style={[styles.filterOptionText, selected && styles.filterOptionTextSelected]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.filterSectionLabel}>
                  {language === "es" ? "Idioma de atención" : "Preferred language"}
                </Text>
                <View style={styles.filterOptionRow}>
                  {[
                    { key: null, label: language === "es" ? "Cualquiera" : "Any" },
                    { key: "Espanol", label: "Español" },
                    { key: "Ingles", label: "English" },
                  ].map((opt) => {
                    const selected = filterLanguage === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.label}
                        style={[styles.filterOption, selected && styles.filterOptionSelected]}
                        onPress={() => setFilterLanguage(opt.key)}
                      >
                        <Text style={[styles.filterOptionText, selected && styles.filterOptionTextSelected]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.filterToggleRow}>
                  <Text style={styles.filterToggleLabel}>
                    {language === "es" ? "Acepta seguro privado" : "Accepts private insurance"}
                  </Text>
                  <TouchableOpacity onPress={() => setFilterAcceptsInsurance((v) => !v)}>
                    <Ionicons
                      name={filterAcceptsInsurance ? "checkbox" : "square-outline"}
                      size={22}
                      color={filterAcceptsInsurance ? COLORS.secondary : COLORS.greyText}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.filterToggleRow}>
                  <Text style={styles.filterToggleLabel}>
                    {language === "es" ? "Disponible hoy" : "Available today"}
                  </Text>
                  <TouchableOpacity onPress={() => setFilterAvailableToday((v) => !v)}>
                    <Ionicons
                      name={filterAvailableToday ? "checkbox" : "square-outline"}
                      size={22}
                      color={filterAvailableToday ? COLORS.secondary : COLORS.greyText}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.filterToggleRow}>
                  <Text style={styles.filterToggleLabel}>
                    {language === "es" ? "Distancia máxima" : "Maximum distance"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const next = !filterDistanceEnabled;
                      setFilterDistanceEnabled(next);
                      if (next && !userCoords) requestUserLocation();
                    }}
                  >
                    <Ionicons
                      name={filterDistanceEnabled ? "checkbox" : "square-outline"}
                      size={22}
                      color={filterDistanceEnabled ? COLORS.secondary : COLORS.greyText}
                    />
                  </TouchableOpacity>
                </View>

                {filterDistanceEnabled && (
                  <>
                    {locatingUser ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <ActivityIndicator size="small" color={COLORS.secondary} />
                        <Text style={styles.filterLocationHint}>
                          {language === "es" ? "Obteniendo tu ubicación…" : "Getting your location…"}
                        </Text>
                      </View>
                    ) : locationError ? (
                      <Text style={[styles.filterLocationHint, { color: COLORS.error }]}>
                        {locationError}
                      </Text>
                    ) : userCoords ? (
                      <View style={styles.filterDistanceRow}>
                        <View style={styles.filterDistanceStepper}>
                          <TouchableOpacity
                            style={styles.filterDistanceStepperButton}
                            onPress={() => setFilterMaxDistanceKm((v) => Math.max(1, v - 5))}
                          >
                            <Text style={styles.filterDistanceStepperText}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.filterDistanceValue}>{filterMaxDistanceKm} km</Text>
                          <TouchableOpacity
                            style={styles.filterDistanceStepperButton}
                            onPress={() => setFilterMaxDistanceKm((v) => Math.min(200, v + 5))}
                          >
                            <Text style={styles.filterDistanceStepperText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                  </>
                )}

                {hasActiveFilters && (
                  <TouchableOpacity
                    style={styles.filterClearButton}
                    onPress={() => {
                      setFilterModality("both");
                      setFilterAcceptsInsurance(false);
                      setFilterLanguage(null);
                      setFilterAvailableToday(false);
                      setFilterDistanceEnabled(false);
                      setLocationError(null);
                    }}
                  >
                    <Text style={styles.filterClearButtonText}>
                      {language === "es" ? "Limpiar filtros" : "Clear filters"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {selectedDoctor && (
          <>
            {clinics.length > 0 && (
              <View style={[styles.section, { marginTop: 16 }]}>
                <Text style={styles.sectionTitle}>{t.selectClinic}</Text>
                <View style={styles.clinicList}>
                  {clinics.map((clinic, index) => {
                    const isSelected = selectedClinic?._id === clinic._id;
                    const mapsLink =
                      clinic?.googleMapsLink ?? clinic?.googleMaps ?? null;
                    return (
                      <View
                        key={clinic._id}
                        style={[
                          styles.clinicListItem,
                          index === 0 && styles.clinicListItemFirst,
                          isSelected && styles.clinicListItemSelected,
                        ]}
                      >
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            paddingRight: 8,
                          }}
                          onPress={() => {
                            setSelectedClinic(clinic);
                            setSelectedDate(null);
                            setSelectedSlot(null);
                            setSelectedHour(null);
                            dispatch(clearBookingAvailability());
                          }}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.clinicRadioOuter,
                              isSelected && styles.clinicRadioOuterSelected,
                            ]}
                          >
                            {isSelected && <View style={styles.clinicRadioInner} />}
                          </View>
                          <View style={styles.clinicNameWrap}>
                            <Text style={styles.clinicName} numberOfLines={2}>
                              {clinic.name ?? clinic._id}
                            </Text>
                            {clinic.locationReference ? (
                              <Text style={styles.clinicLocationReference} numberOfLines={2}>
                                {clinic.locationReference}
                              </Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                        {mapsLink ? (
                          <GlassButton
                            variant="secondary"
                            style={styles.clinicMapsButton}
                            onPress={() => Linking.openURL(mapsLink)}
                            activeOpacity={0.7}
                            accessibilityLabel={
                              language === "es"
                                ? "Ver en Google Maps"
                                : "View on Google Maps"
                            }
                          >
                            <Ionicons
                              name="location"
                              size={22}
                              color={COLORS.secondary}
                            />
                          </GlassButton>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
                {clinics.length > 1 && !selectedClinic && (
                  <Text style={styles.emptyText}>
                    {language === "es"
                      ? "Elija una clínica para ver fechas"
                      : "Choose a clinic to see available dates"}
                  </Text>
                )}
              </View>
            )}

            {(clinics.length === 0 ||
              clinics.length === 1 ||
              selectedClinic) && (
              <>
                {/* Choose the service FIRST — slot lengths and which dates have
                    room depend on the selected type's duration. */}
                {types.length > 1 && (
                  <View style={[styles.section, { marginTop: 16 }]}>
                    <Text style={styles.sectionTitle}>{t.selectType}</Text>
                    <View style={styles.typeRow}>
                      {types.map((type) => {
                        const isSelected = selectedType?._id === type._id;
                        return (
                          <TouchableOpacity
                            key={type._id}
                            style={[
                              styles.timeChip,
                              styles.typeChip,
                              isSelected && styles.timeChipSelected,
                            ]}
                            onPress={() => setSelectedType(type)}
                          >
                            <Text
                              style={[
                                styles.timeChipText,
                                isSelected && styles.timeChipTextSelected,
                              ]}
                              numberOfLines={1}
                            >
                              {type.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {!selectedType?._id ? (
                  <View style={[styles.section, { marginTop: 16 }]}>
                    <Text style={styles.emptyText}>
                      {language === "es"
                        ? "Selecciona un tipo de consulta para ver las fechas disponibles."
                        : "Select an appointment type to see available dates."}
                    </Text>
                  </View>
                ) : (
                <View style={[styles.section, { marginTop: 16 }]}>
                  <Text style={styles.sectionTitle}>
                    {language === "es" ? "Selecciona Fecha y Hora" : "Select Date & Time"}
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    {language === "es"
                      ? "Elige el momento que mejor se adapte a tu agenda para tu consulta médica."
                      : "Pick the time that best fits your schedule for your appointment."}
                  </Text>
                  {appointmentsLoading.patientDates ? (
                    <View style={styles.loader}>
                      <ActivityIndicator
                        size="small"
                        color={COLORS.secondary}
                      />
                    </View>
                  ) : appointmentsError?.patientDates &&
                    appointmentsError.patientDates !== "Cancelled" ? (
                    <View style={styles.dateErrorWrap}>
                      <Text style={styles.emptyText}>
                        {t.errorDataDates ??
                          (language === "es"
                            ? "No se pudieron cargar las fechas."
                            : "Failed to load dates.")}
                      </Text>
                      <GlassButton
                        variant="primary"
                        style={styles.retryButton}
                        onPress={() => {
                          const clinicId = selectedClinic?._id ?? undefined;
                          dispatch(
                            fetchPatientAvailableDates({
                              doctorId: selectedDoctor._id,
                              clinicId,
                              appointmentTypeId: selectedType?._id,
                            }),
                          );
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.retryButtonText}>
                          {language === "es" ? "Reintentar" : "Retry"}
                        </Text>
                      </GlassButton>
                    </View>
                  ) : (patientAvailableDates || []).length === 0 ? (
                    <Text style={styles.emptyText}>
                      {t.noAvailableDates ??
                        (language === "es"
                          ? "No hay fechas disponibles"
                          : "No available dates")}
                    </Text>
                  ) : (
                    <Calendar
                      onDayPress={handleDateSelect}
                      onMonthChange={handleCalendarMonthChange}
                      markedDates={markedDates}
                      enableSwipeMonths
                      disableArrowLeft={
                        calendarMonth <= new Date().toISOString().slice(0, 7)
                      }
                      minDate={new Date().toISOString().split("T")[0]}
                      maxDate={
                        new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
                          .toISOString()
                          .split("T")[0]
                      }
                      theme={{
                        selectedDayBackgroundColor: COLORS.secondary,
                        selectedDayTextColor: COLORS.white,
                        todayTextColor: COLORS.secondary,
                      }}
                      style={styles.calendarWrap}
                    />
                  )}
                </View>
                )}

                {selectedDate && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t.timeSlots}</Text>
                    {appointmentsLoading.patientSlots ? (
                      <View style={styles.loader}>
                        <ActivityIndicator
                          size="small"
                          color={COLORS.secondary}
                        />
                      </View>
                    ) : !hasSlots ? (
                      <View>
                        <Text style={styles.emptyText}>{t.noSlots}</Text>
                        <Text style={[styles.emptyText, { marginTop: 4 }]}>
                          {language === "es"
                            ? "Activa la lista de espera abajo y te avisamos si se libera un cupo."
                            : "Turn on the waitlist below and we'll notify you if a slot opens up."}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.timeRow}>
                          {uniqueHours.map((hour) => {
                            const isHourSelected = selectedHour === hour;
                            return (
                              <TouchableOpacity
                                key={hour}
                                style={[
                                  styles.timeChip,
                                  isHourSelected && styles.timeChipSelected,
                                ]}
                                onPress={() => handleSelectHour(hour)}
                              >
                                <Text
                                  style={[
                                    styles.timeChipText,
                                    isHourSelected &&
                                      styles.timeChipTextSelected,
                                  ]}
                                >
                                  {String(hour).padStart(2, "0")}:00
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        {selectedHour !== null && (
                          <View style={styles.timeQuarterBlock}>
                            <View style={styles.timeQuarterHeader}>
                              <Text style={styles.timeGroupTitle}>
                                {String(selectedHour).padStart(2, "0")}:00
                              </Text>
                              <TouchableOpacity onPress={handleClearHour}>
                                <Text style={styles.changeHourLink}>
                                  {t.changeHour}
                                </Text>
                              </TouchableOpacity>
                            </View>
                            <View style={styles.timeRow}>
                              {slotsForSelectedHour
                                .filter(
                                  (slot) =>
                                    selectedHour !== null &&
                                    getLocalHour(slot.start) === selectedHour,
                                )
                                .map((slot, index) => {
                                  const startKey = slot.start ?? "";
                                  const isSelected =
                                    selectedSlot?.start === slot.start &&
                                    selectedSlot?.end === slot.end;
                                  return (
                                    <TouchableOpacity
                                      key={`${startKey}-${slot.end ?? ""}-${index}`}
                                      style={[
                                        styles.timeChip,
                                        isSelected && styles.timeChipSelected,
                                      ]}
                                      onPress={() => setSelectedSlot(slot)}
                                    >
                                      <Text
                                        style={[
                                          styles.timeChipText,
                                          isSelected &&
                                            styles.timeChipTextSelected,
                                        ]}
                                      >
                                        {formatSlotTime(slot.start)}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                            </View>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                )}

                {/* Waitlist is ALWAYS available — even before a date is chosen.
                    The config modal lets the patient pick a date/range + time. */}
                <View style={styles.waitlistCard}>
                  <View style={styles.waitlistIconWrap}>
                    <Ionicons name="notifications" size={18} color={COLORS.white} />
                  </View>
                  <View style={styles.waitlistTextWrap}>
                    <Text style={styles.waitlistTitle}>
                      {language === "es" ? "Lista de espera automática" : "Automatic waitlist"}
                    </Text>
                    <Text style={styles.waitlistSub}>
                      {language === "es"
                        ? "Avísame (push y correo) si se libera un cupo con este médico según la fecha y hora que elija."
                        : "Notify me (push and email) if a slot opens up with this doctor for the date and time I pick."}
                    </Text>
                  </View>
                  <Switch
                    value={waitlistJoinedKey === selectedDoctor?._id}
                    onValueChange={(on) => {
                      if (on && waitlistJoinedKey !== selectedDoctor?._id) {
                        setWaitlistModalOpen(true);
                      }
                    }}
                    disabled={appointmentsLoading.waitlistJoin}
                    trackColor={{ false: "#D5DBE3", true: COLORS.secondary }}
                    thumbColor={COLORS.white}
                  />
                </View>


                {selectedType && selectedDate && (
                  <View style={styles.section}>
                    {typeAllowsBothModalities ? (
                      <>
                        <Text style={styles.sectionTitle}>
                          {language === "es" ? "Modo de Consulta" : "Consultation mode"}
                        </Text>
                        {[
                          {
                            key: "in_person",
                            icon: "location",
                            label: language === "es" ? "Visita Presencial" : "In-person visit",
                            sub: language === "es" ? "Visita nuestra clínica" : "Visit our clinic",
                          },
                          {
                            key: "video_call",
                            icon: "videocam",
                            label: language === "es" ? "Consulta Online" : "Online consultation",
                            sub: language === "es" ? "Videollamada con doctor" : "Video call with the doctor",
                          },
                        ].map((opt) => {
                          const sel = selectedModality === opt.key;
                          return (
                            <TouchableOpacity
                              key={opt.key}
                              activeOpacity={0.85}
                              onPress={() => setSelectedModality(opt.key)}
                              style={[styles.choiceCard, sel && styles.choiceCardSelected]}
                            >
                              <View style={styles.choiceIconWrap}>
                                <Ionicons name={opt.icon} size={18} color={COLORS.secondary} />
                              </View>
                              <View style={styles.choiceTextWrap}>
                                <Text style={styles.choiceLabel}>{opt.label}</Text>
                                <Text style={styles.choiceSub}>{opt.sub}</Text>
                              </View>
                              <View style={[styles.choiceRadioOuter, sel && styles.choiceRadioOuterSelected]}>
                                {sel && <View style={styles.choiceRadioInner} />}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </>
                    ) : typeAllowsVideoCall ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: COLORS.lightBackground ?? "#EAF6FB",
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        <Ionicons
                          name="videocam"
                          size={20}
                          color={COLORS.secondary}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={{ flex: 1, color: COLORS.blackText }}>
                          {language === "es"
                            ? "Esta cita solo está disponible por video llamada. Podrás unirte desde 5 minutos antes de la hora agendada."
                            : "This appointment is only available via video call. You'll be able to join starting 5 minutes before the scheduled time."}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {selectedSlot && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      {language === "es" ? "Gestión Familiar" : "Family booking"}
                    </Text>
                    {[
                      {
                        key: "self",
                        icon: "person",
                        label: language === "es" ? "Para mí" : "For me",
                      },
                      {
                        key: "other",
                        icon: "people",
                        label: language === "es" ? "Para un familiar" : "For a family member",
                      },
                    ].map((opt) => {
                      const sel = bookingFor === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          activeOpacity={0.85}
                          onPress={() => setBookingFor(opt.key)}
                          style={[styles.choiceCard, sel && styles.choiceCardSelected]}
                        >
                          <View style={styles.choiceIconWrap}>
                            <Ionicons name={opt.icon} size={18} color={COLORS.secondary} />
                          </View>
                          <View style={styles.choiceTextWrap}>
                            <Text style={styles.choiceLabel}>{opt.label}</Text>
                          </View>
                          <View style={[styles.choiceRadioOuter, sel && styles.choiceRadioOuterSelected]}>
                            {sel && <View style={styles.choiceRadioInner} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {bookingFor === "other" && (
                      <>
                        <TextInput
                          style={styles.guestInput}
                          placeholder={
                            language === "es" ? "Nombre completo" : "Full name"
                          }
                          placeholderTextColor={COLORS.ligthGreyText}
                          value={guestName}
                          onChangeText={setGuestName}
                        />
                        <TextInput
                          style={styles.guestInput}
                          placeholder={language === "es" ? "Teléfono" : "Phone"}
                          placeholderTextColor={COLORS.ligthGreyText}
                          value={guestPhone}
                          onChangeText={setGuestPhone}
                          keyboardType="phone-pad"
                        />
                        <TextInput
                          style={styles.guestInput}
                          placeholder={
                            language === "es"
                              ? "Parentesco (ej. hijo/a, madre, pareja)"
                              : "Relationship (e.g. child, mother, partner)"
                          }
                          placeholderTextColor={COLORS.ligthGreyText}
                          value={guestRelation}
                          onChangeText={setGuestRelation}
                        />
                      </>
                    )}
                  </View>
                )}
              </>
            )}
          </>
        )}

        {selectedDoctor && (
          <GlassButton
            variant="primary"
            style={[
              styles.confirmButton,
              (!canConfirm || isCreating) && styles.confirmButtonDisabled,
            ]}
            onPress={() => {
              if (canConfirm && !isCreating) handleConfirm();
            }}
            disabled={!canConfirm || isCreating}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color={COLORS.selectedItem} />
            ) : (
              <>
                <Text style={styles.confirmButtonText}>
                  {t.confirmAppointment}
                </Text>
                <Ionicons
                  name="arrow-forward-circle"
                  size={20}
                  color={COLORS.selectedItem}
                  style={{ marginLeft: 8 }}
                />
              </>
            )}
          </GlassButton>
        )}
      </ScrollView>

      <WaitlistConfigModal
        visible={waitlistModalOpen}
        defaultDate={selectedDate}
        language={language}
        loading={appointmentsLoading.waitlistJoin}
        onClose={() => setWaitlistModalOpen(false)}
        onConfirm={(criteria) => handleJoinWaitlist(criteria)}
      />

      {/* Booking confirmation — overlay Modal so it can be dismissed and never
          lingers in a tab's navigation stack. */}
      <Modal
        visible={!!confirmedBooking}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleConfirmedOk}
      >
        {confirmedBooking ? (
          <AppointmentConfirmedView
            doctor={confirmedBooking.doctor}
            start={confirmedBooking.start}
            clinic={confirmedBooking.clinic}
            modality={confirmedBooking.modality}
            appointmentType={confirmedBooking.appointmentType}
            onOk={handleConfirmedOk}
          />
        ) : null}
      </Modal>
    </View>
  );
};

FindAndBookScreen.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      doctor: PropTypes.object,
    }),
  }),
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    getParent: PropTypes.func,
  }).isRequired,
};

export default FindAndBookScreen;
