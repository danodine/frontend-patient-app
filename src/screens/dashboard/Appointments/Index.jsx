import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  View,
  ActivityIndicator,
  TextInput,
  Keyboard,
  Animated,
  RefreshControl,
  Modal,
  FlatList,
  Linking,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentUser } from "../../../redux/userSlice";
import {
  getPatientUpcomingAppointments,
  getPatientPastAppointments,
  clearAppointmentsState,
  cancelAppointment,
  clearAppointmentsErrors,
} from "../../../redux/appointmentsSlice";
import {
  searchDoctorsQuery,
  clearSearchResults,
  clearDoctorError,
} from "../../../redux/doctorSlice";
import {
  fetchConversations,
  getOrCreateConversation,
} from "../../../redux/chatSlice";
import { useActionSheet } from "@expo/react-native-action-sheet";
import PropTypes from "prop-types";
import { Ionicons } from "@expo/vector-icons";
import styles from "../Home/styles";
import appointmentStyles from "./styles";
import STRINGS from "../../../constants/strings";
import { COLORS, ICONS, SIZES, GRADIENT_COLORS } from "../../../styles/theme";
import {
  formatDateText,
  formatDateTextShort,
  formatTime,
  sendEmail,
  callPhone,
  getMainSpecialtyDisplay,
  getTimeRemainingUntil,
} from "../../../utils/helpers";
import TopBanner from "../components/TopBanner/Index";
import axiosInstance from "../../../utils/axiosInstance";
import { BASE_URL } from "../../../../config";
import { useBottomBarSearch } from "../../../contexts/BottomBarSearchContext";
import useDoctorSearchFilters from "../../../hooks/useDoctorSearchFilters";
import DoctorSearchFilters from "../../../components/DoctorSearchFilters";
import GlassButton from "../../../components/GlassButton";
import { getSpecialtyIcon } from "../../../constants/specialtyIcons";
import { LinearGradient } from "expo-linear-gradient";

const DEBOUNCE_MS = 350;

const gradientStyleWeb = {
  background:
    "linear-gradient(135deg, rgba(81, 232, 239, 0.66), rgba(67, 144, 246, 0.2), rgba(108, 166, 244, 0.66))",
};

function ScreenGradient({ style, children }) {
  if (Platform.OS === "web") {
    return <View style={[style, gradientStyleWeb]}>{children}</View>;
  }
  return (
    <LinearGradient
      colors={GRADIENT_COLORS}
      style={style}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
    >
      {children}
    </LinearGradient>
  );
}
const MIN_SEARCH_LEN = 2;

function formatAppointmentDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDoctorName(apt) {
  const doc = apt?.doctor;
  if (!doc) return "";
  return doc.fullName ?? doc.name ?? "";
}

function getAppointmentTypeName(apt) {
  const type = apt?.appointmentType;
  if (!type) return "";
  return typeof type === "string" ? type : (type.name ?? "");
}

function getSpecialtyLabel(doctor, language) {
  return getMainSpecialtyDisplay(doctor, language);
}

function getSpecialtyDisplay(apt, language) {
  return getMainSpecialtyDisplay(apt?.doctor, language);
}

// S10: derive the visible status. Order matters — a cancelled or pending
// appointment shows that state; a confirmed one that was moved shows
// "Reprogramada" (rescheduledAt set), otherwise "Agendada".
function getStatusKey(apt) {
  const s = String(apt?.status || "").toLowerCase();
  if (s.startsWith("cancelled") || s === "no_show") return "cancelled";
  if (s === "pending") return "pending";
  if (apt?.rescheduledAt) return "rescheduled";
  return "scheduled";
}

function getPhotoUri(apt) {
  const d = apt?.doctor;
  const url = d?.profileImageUrl;
  if (!url) return null;
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

function getInitials(apt) {
  const name = getDoctorName(apt);
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

const patientIdSelector = (state) =>
  state?.auth?.user?._id ??
  state?.auth?.user?.id ??
  state?.users?.currentUser?._id ??
  state?.users?.currentUser?.id;

function getPatientFirstName(user) {
  const name = user?.fullName ?? user?.name ?? user?.profile?.firstName ?? "";
  if (typeof name !== "string" || !name.trim()) return "";
  return name.trim().split(/\s+/)[0] ?? "";
}

function getPatientInitials(user) {
  const name = user?.fullName ?? user?.name ?? "";
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

// Search results are raw doctor objects (not appointment wrappers), so these
// read the doctor directly (unlike getDoctorName/getPhotoUri above).
function getSearchDoctorName(doc) {
  return doc?.fullName ?? doc?.name ?? "";
}

function getSearchDoctorPhoto(doc) {
  const url = doc?.profileImageUrl;
  if (!url) return null;
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

function getSearchDoctorInitials(doc) {
  const name = getSearchDoctorName(doc);
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

/**
 * Formats a doctor's `nextAvailable` ({ start ISO, tz }) into the search-card
 * availability line, in the clinic's timezone. Mirrors Home's rich search card.
 * Returns { available:false } when there's no upcoming slot.
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

const AppointmentsTabScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const language = useSelector((state) => state.language.language);
  const dispatch = useDispatch();
  const patientId = useSelector(patientIdSelector);
  const currentUser = useSelector((state) => state.users.currentUser) ?? {};
  const profileImageUri = useSelector(
    (state) => state.users.cachedProfileImageUri,
  );
  const {
    upcomingPatientList,
    pastPatientList,
    loading,
    error: appointmentsError,
  } = useSelector((state) => state.appointments);
  const {
    doctorsSearchResults,
    loading: doctorLoading,
    error: doctorError,
  } = useSelector((state) => state.doctor);
  const chatList = useSelector((state) => state.chat.conversations) ?? [];
  const chatListLoading = useSelector(
    (state) => state.chat.loading.conversations,
  );
  const tips =
    STRINGS[language]?.home?.welfareTips ?? STRINGS.es.home.welfareTips ?? [];
  const [tipIndex, setTipIndex] = useState(0);
  const [displayedTipIndex, setDisplayedTipIndex] = useState(0);
  const welfareMessageOpacity = useRef(new Animated.Value(1)).current;
  const [searchText, setSearchText] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filters = useDoctorSearchFilters();
  const debounceRef = useRef(null);
  const tabFade = useRef(new Animated.Value(1)).current;
  const { setSearchConfig, searchBarAtTopHeight } = useBottomBarSearch();

  const [appointmentsTab, setAppointmentsTab] = useState(0);
  const [hasFetchedPast, setHasFetchedPast] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [modalDateError, setModalDateError] = useState(false);
  const [cancelReasonText, setCancelReasonText] = useState("");
  const [confirmCancelAppointment, setConfirmCancelAppointment] =
    useState(false);
  const [joiningVideoCall, setJoiningVideoCall] = useState(false);
  const [banner, setBanner] = useState({
    visible: false,
    type: "",
    message: "",
  });
  const sheetAnim = useRef(new Animated.Value(1)).current;

  const appointmentsList = useMemo(
    () =>
      appointmentsTab === 0
        ? (upcomingPatientList ?? [])
        : (pastPatientList ?? []),
    [appointmentsTab, upcomingPatientList, pastPatientList],
  );
  const isUpcoming = appointmentsTab === 0;

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(getPatientUpcomingAppointments()),
      dispatch(getCurrentUser()),
    ]);
    if (hasFetchedPast) {
      await dispatch(getPatientPastAppointments({ page: 1, limit: 20 }));
    }
    setRefreshing(false);
  }, [dispatch, hasFetchedPast]);

  useEffect(() => {
    if (appointmentsError?.patientUpcoming || appointmentsError?.patientPast) {
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message: STRINGS[language].doctorProfile.errorLoadingData,
      }));
    }
    if (appointmentsError?.booking) {
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message: STRINGS[language].doctorProfile.errorBooking,
      }));
    }
  }, [
    appointmentsError?.patientUpcoming,
    appointmentsError?.patientPast,
    appointmentsError?.booking,
    language,
  ]);

  useEffect(() => {
    if (doctorError?.getById) {
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message: STRINGS[language].doctorProfile.errorLoadingData,
      }));
    }
  }, [doctorError?.getById, language]);

  useEffect(() => {
    if (modalVisible && modalData?.doctor?._id) {
      dispatch(fetchConversations());
    }
  }, [modalVisible, modalData?.doctor?._id, dispatch]);

  const handleCloseBanner = useCallback(() => {
    setBanner((b) => ({ ...b, visible: false }));
    dispatch(clearAppointmentsErrors());
    dispatch(clearDoctorError());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      setAppointmentsTab(0);
      setHasFetchedPast(false);
      dispatch(getPatientUpcomingAppointments());
      return () => dispatch(clearAppointmentsState());
    }, [dispatch]),
  );

  const handleUpcomingTab = () => {
    setAppointmentsTab(0);
  };

  const handlePastTab = () => {
    setAppointmentsTab(1);
    if (!hasFetchedPast) {
      dispatch(getPatientPastAppointments({ page: 1, limit: 20 }));
      setHasFetchedPast(true);
    }
  };

  const handleAppointmentPress = (item, withCancelIntent = false) => {
    setModalData(item);
    setConfirmCancelAppointment(withCancelIntent);
    setModalVisible(true);
    sheetAnim.setValue(1);
    requestAnimationFrame(() => {
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleConfirmCancelAppointment = async () => {
    if (!modalData?._id) return;
    await dispatch(
      cancelAppointment({
        appointmentId: modalData._id,
        cancellationReason: cancelReasonText.trim(),
      }),
    );
    setCancelReasonText("");
    await dispatch(getPatientUpcomingAppointments());
    handleCloseModal();
  };

  const handleCancelAppointment = () => {
    const start = modalData?.start;
    if (!start) {
      setModalDateError(false);
      setConfirmCancelAppointment(true);
      return;
    }
    const now = new Date();
    const aptDate = new Date(start);
    const diffInHours = (aptDate - now) / (1000 * 60 * 60);
    if (diffInHours < 12 && diffInHours > 0) {
      setModalDateError(true);
    } else {
      setModalDateError(false);
      setConfirmCancelAppointment(true);
    }
  };

  const handleBookAgain = () => {
    const doctor = modalData?.doctor;
    if (doctor) {
      navigation.navigate("FindAndBook", {
        doctor: { ...doctor, _id: doctor._id },
      });
    }
    handleCloseModal();
  };

  const handleMessageDoctor = async () => {
    const doctor = modalData?.doctor;
    const doctorId = doctor?._id;
    const doctorName = getDoctorName(modalData);
    const patientIdFromAppointment =
      modalData?.patient?._id ?? modalData?.patient;
    handleCloseModal();
    if (!doctorId) return;
    const parentNav = navigation.getParent();
    if (!parentNav) return;

    const openConversation = (conversationId, title) => {
      parentNav.navigate("Messages", {
        screen: "Conversation",
        params: { conversationId, title: title || doctorName },
      });
    };
    const openWithDoctorId = () => {
      parentNav.navigate("Messages", {
        screen: "Conversation",
        params: { doctorId, title: doctorName },
      });
    };

    const list = Array.isArray(chatList) ? chatList : [];
    const existing = list.find((c) => {
      const cDoctorId = c?.doctor?._id ?? c?.doctor;
      return String(cDoctorId) === String(doctorId);
    });
    if (existing?._id) {
      openConversation(
        existing._id,
        existing?.doctor?.fullName ?? existing?.doctor?.name ?? doctorName,
      );
      return;
    }

    try {
      const resolvedPatientId =
        patientId ??
        patientIdFromAppointment ??
        list[0]?.patient?._id ??
        list[0]?.patient;
      if (!resolvedPatientId) {
        setBanner((b) => ({
          ...b,
          visible: true,
          type: "error",
          message:
            STRINGS[language]?.messages?.errorConversation ??
            STRINGS.es.messages.errorConversation,
        }));
        return;
      }
      const conversation = await dispatch(
        getOrCreateConversation({ doctorId, patientId: resolvedPatientId }),
      ).unwrap();
      const conversationId = conversation?._id;
      if (conversationId) {
        openConversation(conversationId, doctorName);
        return;
      }
    } catch (err) {
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message:
          STRINGS[language]?.messages?.errorConversation ??
          STRINGS.es.messages.errorConversation,
      }));
      return;
    }
    openWithDoctorId();
  };

  const handleJoinVideoCall = async () => {
    const appointmentId = modalData?._id;
    if (!appointmentId || joiningVideoCall) return;

    const tMsg = STRINGS[language]?.messages ?? STRINGS.es.messages;

    // The appointment already ended → the call is over, nothing to join.
    const endTime = modalData?.end
      ? new Date(modalData.end)
      : modalData?.start
        ? new Date(
            new Date(modalData.start).getTime() +
              (modalData?.appointmentType?.defaultDurationMinutes || 30) * 60000,
          )
        : null;
    if (endTime && new Date() > endTime) {
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message: tMsg.videoCallEnded,
      }));
      return;
    }

    // Mirrors the backend's join window (5 minutes before appointment start,
    // enforced authoritatively there via Daily.co's nbf + a pre-check) so we
    // avoid an unnecessary round-trip that would just 403.
    if (modalData?.start) {
      const joinOpensAt = new Date(new Date(modalData.start).getTime() - 5 * 60 * 1000);
      if (new Date() < joinOpensAt) {
        setBanner((b) => ({
          ...b,
          visible: true,
          type: "error",
          message: tMsg.videoCallTooEarly,
        }));
        return;
      }
    }

    setJoiningVideoCall(true);
    try {
      const response = await axiosInstance.get(
        `/api/appointments/${appointmentId}/video-token`,
      );
      const body = response.data ?? {};
      const data = body.data ?? body;
      if (data?.token && data?.roomUrl) {
        const parentNav = navigation.getParent();
        handleCloseModal();
        parentNav?.navigate("Messages", {
          screen: "VideoCall",
          params: { roomUrl: data.roomUrl, token: data.token },
        });
      } else {
        setBanner((b) => ({
          ...b,
          visible: true,
          type: "error",
          message: tMsg.videoCallRoomNotFound,
        }));
      }
    } catch (err) {
      const status = err.response?.status;
      const message =
        status === 404
          ? tMsg.videoCallRoomNotFound
          : status === 410
            ? tMsg.videoCallRoomExpired
            : (err.response?.data?.message ?? tMsg.videoCallError);
      setBanner((b) => ({ ...b, visible: true, type: "error", message }));
    } finally {
      setJoiningVideoCall(false);
    }
  };

  const handleCloseModal = () => {
    Animated.timing(sheetAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setModalVisible(false);
        setModalDateError(false);
        setConfirmCancelAppointment(false);
        setCancelReasonText("");
        setModalData(null);
      }
    });
  };

  const { showActionSheetWithOptions } = useActionSheet();
  const openMapPrompt = (addressOrUrl) => {
    const isUrl = addressOrUrl && String(addressOrUrl).startsWith("http");
    const query = isUrl ? addressOrUrl : encodeURIComponent(addressOrUrl || "");
    const options = [
      STRINGS[language].maps.openGoogleMaps,
      STRINGS[language].maps.openWays,
    ];
    if (Platform.OS === "ios")
      options.push(STRINGS[language].maps.openAppleMaps);
    options.push(STRINGS[language].appointments.cancel);
    const cancelButtonIndex = options.length - 1;
    showActionSheetWithOptions(
      { options, cancelButtonIndex },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          Linking.openURL(
            isUrl
              ? addressOrUrl
              : `https://www.google.com/maps/search/?api=1&query=${query}`,
          );
        } else if (buttonIndex === 1) {
          Linking.openURL(`https://waze.com/ul?q=${query}&navigate=yes`);
        } else if (Platform.OS === "ios" && buttonIndex === 2) {
          Linking.openURL(`http://maps.apple.com/?q=${query}`);
        }
      },
    );
  };

  const statusLabel = (apt) => {
    const key = getStatusKey(apt);
    const sub = isUpcoming ? "cero" : "uno";
    return STRINGS[language]?.appointments?.[key]?.[sub] ?? apt?.status ?? "";
  };

  const suggestion =
    STRINGS[language]?.home?.suggestion ?? STRINGS.es?.home?.suggestion;
  const t = STRINGS[language]?.home ?? STRINGS.es?.home ?? {};
  const tBook =
    STRINGS[language]?.bookAppointment ?? STRINGS.es?.bookAppointment ?? {};

  useFocusEffect(
    React.useCallback(() => {
      setSearchConfig({
        visible: true,
        placeholder: tBook?.searchPlaceholder ?? t?.search ?? "",
        value: searchText,
        onChange: setSearchText,
        onFilter: () => setFiltersOpen((v) => !v),
        filtersActive: filters.hasActiveFilters,
      });
    }, [setSearchConfig, searchText, tBook?.searchPlaceholder, t?.search, filters.hasActiveFilters]),
  );

  useEffect(() => {
    if (tipIndex === displayedTipIndex) return;
    Animated.timing(welfareMessageOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setDisplayedTipIndex(tipIndex);
      Animated.timing(welfareMessageOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    });
  }, [tipIndex, displayedTipIndex, welfareMessageOpacity]);

  useEffect(() => {
    dispatch(getCurrentUser());
    dispatch(getPatientUpcomingAppointments());
  }, [dispatch]);

  useEffect(() => {
    if (tips.length <= 1) return;
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 6000);
    return () => clearInterval(id);
  }, [tips.length]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchText.trim();
    const shouldSearch = q.length >= MIN_SEARCH_LEN || filters.hasActiveFilters;
    if (!shouldSearch) {
      dispatch(clearSearchResults());
      setSearchActive(false);
      return;
    }
    if (filters.distancePending) return;
    setSearchActive(true);
    debounceRef.current = setTimeout(() => {
      dispatch(searchDoctorsQuery({ ...filters.buildParams(q), limit: 100 }));
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, dispatch, filters.filtersKey, filters.distancePending]);

  const handleClearSearch = () => {
    setSearchText("");
    setSearchActive(false);
    setFiltersOpen(false);
    filters.reset();
    dispatch(clearSearchResults());
    Keyboard.dismiss();
  };

  // Leaving the screen closes the search: wipe the typed text + results so it
  // never lingers and the screen returns to normal next time it's opened.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setSearchText("");
        setSearchActive(false);
        setFiltersOpen(false);
        dispatch(clearSearchResults());
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]),
  );

  const handleSelectDoctor = (doctor) => {
    navigation.navigate("DoctorProfile", { doctor });
  };

  // The search bar floats to the top only while focused (keyboard open).
  const searchFocused = searchBarAtTopHeight > 0;
  const showSearchContent =
    searchFocused ||
    searchText.trim().length >= MIN_SEARCH_LEN ||
    filtersOpen ||
    filters.hasActiveFilters;

  const renderAppointmentsList = () => {
    if (appointmentsList?.length > 0) {
      return (
        <FlatList
          data={appointmentsList}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const statusKey = getStatusKey(item);
            const isCancelled = statusKey === "cancelled";
            const canCancel = isUpcoming && !isCancelled;
            return (
              <View
                style={[appointmentStyles.cardItem, styles.homeAppointmentCard]}
              >
                <View
                  style={[
                    appointmentStyles.cardHeaderRow,
                    styles.homeCardHeaderRow,
                  ]}
                >
                  {getPhotoUri(item) ? (
                    <Image
                      source={{ uri: getPhotoUri(item) }}
                      style={appointmentStyles.avatar}
                    />
                  ) : (
                    <View style={appointmentStyles.avatarPlaceholder}>
                      <Text style={appointmentStyles.avatarInitials}>
                        {getInitials(item)}
                      </Text>
                    </View>
                  )}
                  <View style={appointmentStyles.cardDoctorBlock}>
                    <Text
                      style={appointmentStyles.cardDoctorName}
                      numberOfLines={1}
                    >
                      {getDoctorName(item)}
                    </Text>
                    {getSpecialtyDisplay(item, language) ? (
                      <Text
                        style={[
                          appointmentStyles.cardSpecialty,
                          styles.homeCardDoctorSpecialty,
                        ]}
                        numberOfLines={1}
                      >
                        {getSpecialtyDisplay(item, language)}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      appointmentStyles.statusPill,
                      statusKey === "cancelled" && appointmentStyles.statusPillCancelled,
                      statusKey === "pending" && appointmentStyles.statusPillPending,
                      statusKey === "rescheduled" && appointmentStyles.statusPillRescheduled,
                    ]}
                  >
                    {statusKey === "scheduled" && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={COLORS.green}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text
                      style={[
                        appointmentStyles.statusPillText,
                        statusKey === "cancelled" && appointmentStyles.statusPillTextCancelled,
                        statusKey === "pending" && appointmentStyles.statusPillTextPending,
                        statusKey === "rescheduled" && appointmentStyles.statusPillTextRescheduled,
                      ]}
                    >
                      {statusLabel(item)}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    appointmentStyles.cardDateRow,
                    styles.homeCardDateRow,
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={COLORS.greyText}
                    style={appointmentStyles.cardDetailIcon}
                  />
                  <Text style={appointmentStyles.cardDetailText}>
                    {formatDateTextShort(item.start, language)}
                  </Text>
                </View>
                <View
                  style={[
                    appointmentStyles.cardTimeRow,
                    styles.homeCardTimeRow,
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={COLORS.greyText}
                    style={appointmentStyles.cardDetailIcon}
                  />
                  <Text style={appointmentStyles.cardDetailText}>
                    {formatTime(item.start)} - {formatTime(item.end)}
                  </Text>
                </View>
                {item.guestPatient?.fullName ? (
                  <View
                    style={[
                      appointmentStyles.cardDateRow,
                      styles.homeCardTimeRow,
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={COLORS.greyText}
                      style={appointmentStyles.cardDetailIcon}
                    />
                    <Text style={appointmentStyles.cardDetailText}>
                      {language === "es" ? "Para: " : "For: "}
                      {item.guestPatient.fullName}
                      {item.guestPatient.relationship
                        ? ` (${item.guestPatient.relationship})`
                        : ""}
                    </Text>
                  </View>
                ) : null}
                {isUpcoming &&
                !isCancelled &&
                getTimeRemainingUntil(item.start, language) ? (
                  <View
                    style={[
                      appointmentStyles.cardDateRow,
                      styles.homeCardTimeRemaining,
                    ]}
                  >
                    <Ionicons
                      name="hourglass-outline"
                      size={18}
                      color={COLORS.greyText}
                      style={appointmentStyles.cardDetailIcon}
                    />
                    <Text style={appointmentStyles.cardDetailText}>
                      {getTimeRemainingUntil(item.start, language)}
                    </Text>
                  </View>
                ) : null}
                <View
                  style={[
                    appointmentStyles.cardActionsRow,
                    styles.homeCardActionsRow,
                  ]}
                >
                  <GlassButton
                    variant="secondary"
                    style={appointmentStyles.buttonVerDetalles}
                    onPress={() => handleAppointmentPress(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={COLORS.secondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={appointmentStyles.buttonVerDetallesText}>
                      {STRINGS[language].appointments.viewDetails}
                    </Text>
                  </GlassButton>
                  {isUpcoming && (
                    <GlassButton
                      variant="danger"
                      style={[
                        appointmentStyles.buttonCancelar,
                        !canCancel && appointmentStyles.buttonCancelarDisabled,
                      ]}
                      onPress={() =>
                        canCancel
                          ? handleAppointmentPress(item, true)
                          : handleAppointmentPress(item)
                      }
                      activeOpacity={0.8}
                      disabled={!canCancel}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={16}
                        color={canCancel ? COLORS.error : COLORS.greyText}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          appointmentStyles.buttonCancelarText,
                          !canCancel &&
                            appointmentStyles.buttonCancelarTextDisabled,
                        ]}
                      >
                        {STRINGS[language].appointments.cancel}
                      </Text>
                    </GlassButton>
                  )}
                </View>
              </View>
            );
          }}
        />
      );
    }
    if (loading?.patientUpcoming || loading?.patientPast) {
      return (
        <View style={appointmentStyles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </View>
      );
    }
    return (
      <View style={appointmentStyles.noDataContainer}>
        <Image
          source={require("../../../assets/noAppointmentsData.png")}
          style={appointmentStyles.nodataImage}
          resizeMode="contain"
        />
        <Text>
          {isUpcoming
            ? STRINGS[language].appointments.noCurrent
            : STRINGS[language].appointments.noPasst}
        </Text>
      </View>
    );
  };

  useFocusEffect(
    React.useCallback(() => {
      tabFade.setValue(1);
    }, [tabFade]),
  );

  const clinic = modalData?.clinic;
  const clinicAddress =
    clinic?.locationReference ||
    clinic?.name ||
    (clinic?.googleMapsLink ? STRINGS[language].doctorProfile.seeLocation : "");
  const doctorPhone = modalData?.doctor?.phone || clinic?.phone;
  const doctorEmail = modalData?.doctor?.email;
  const tApt = STRINGS[language]?.appointments ?? STRINGS.es.appointments;
  const isTooEarlyToJoinVideoCall = modalData?.start
    ? new Date() < new Date(new Date(modalData.start).getTime() - 5 * 60 * 1000)
    : false;
  // A video appointment whose end time has already passed can't be joined.
  const videoCallEndTime = modalData?.end
    ? new Date(modalData.end)
    : modalData?.start
      ? new Date(
          new Date(modalData.start).getTime() +
            (modalData?.appointmentType?.defaultDurationMinutes || 30) * 60000,
        )
      : null;
  const isPastVideoCall = videoCallEndTime ? new Date() > videoCallEndTime : false;

  return (
    <ScreenGradient style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <TopBanner
          visible={banner.visible}
          type={banner.type}
          message={banner.message}
          onHide={handleCloseBanner}
        />
        <Modal
          visible={modalVisible}
          animationType="slide"
          onRequestClose={handleCloseModal}
        >
          <ScreenGradient style={{ flex: 1 }}>
            <View
              style={{ flex: 1, paddingTop: Math.max(insets?.top ?? 0, 20) }}
            >
              {/* Header */}
              <View style={appointmentStyles.detailHeader}>
                <GlassButton
                  variant="neutral"
                  style={appointmentStyles.detailBackBtn}
                  onPress={handleCloseModal}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="arrow-back"
                    size={24}
                    color={COLORS.blackText}
                  />
                </GlassButton>
                <Text style={appointmentStyles.detailHeaderTitle}>
                  {tApt.detailsTitle}
                </Text>
                <View style={{ width: 44 }} />
              </View>

              {modalData && (
                <ScrollView
                  style={appointmentStyles.detailScroll}
                  contentContainerStyle={{ paddingBottom: 16 }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Doctor card */}
                  <View style={appointmentStyles.detailDoctorCard}>
                    <View style={{ position: "absolute", top: 14, right: 14 }}>
                      <View
                        style={[
                          appointmentStyles.statusPill,
                          getStatusKey(modalData) === "cancelled" &&
                            appointmentStyles.statusPillCancelled,
                          getStatusKey(modalData) === "pending" &&
                            appointmentStyles.statusPillPending,
                          getStatusKey(modalData) === "rescheduled" &&
                            appointmentStyles.statusPillRescheduled,
                        ]}
                      >
                        {getStatusKey(modalData) === "scheduled" && (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={COLORS.green}
                            style={{ marginRight: 4 }}
                          />
                        )}
                        <Text
                          style={[
                            appointmentStyles.statusPillText,
                            getStatusKey(modalData) === "cancelled" &&
                              appointmentStyles.statusPillTextCancelled,
                            getStatusKey(modalData) === "pending" &&
                              appointmentStyles.statusPillTextPending,
                            getStatusKey(modalData) === "rescheduled" &&
                              appointmentStyles.statusPillTextRescheduled,
                          ]}
                        >
                          {statusLabel(modalData)}
                        </Text>
                      </View>
                    </View>

                    {getPhotoUri(modalData) ? (
                      <Image
                        source={{ uri: getPhotoUri(modalData) }}
                        style={appointmentStyles.detailAvatar}
                      />
                    ) : (
                      <View style={appointmentStyles.detailAvatarPlaceholder}>
                        <Text style={appointmentStyles.detailAvatarInitials}>
                          {getInitials(modalData)}
                        </Text>
                      </View>
                    )}

                    <Text style={appointmentStyles.detailDoctorName}>
                      {getDoctorName(modalData)}
                    </Text>

                    {getSpecialtyDisplay(modalData, language) ? (
                      <View style={appointmentStyles.detailSpecialtyChip}>
                        {getSpecialtyIcon(
                          modalData?.doctor?.profession ??
                            modalData?.doctor?.profile?.specialtyId,
                        ) ? (
                          <Image
                            source={getSpecialtyIcon(
                              modalData?.doctor?.profession ??
                                modalData?.doctor?.profile?.specialtyId,
                            )}
                            style={appointmentStyles.detailSpecialtyChipIcon}
                          />
                        ) : (
                          <Ionicons name="heart" size={16} color="#EF4444" />
                        )}
                        <Text style={appointmentStyles.detailSpecialtyChipText}>
                          {getSpecialtyDisplay(modalData, language)}
                        </Text>
                      </View>
                    ) : null}

                    <View style={appointmentStyles.detailActionIconsRow}>
                      {doctorPhone ? (
                        <GlassButton
                          variant="neutral"
                          style={appointmentStyles.detailActionIcon}
                          onPress={() => callPhone(doctorPhone)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="call-outline"
                            size={22}
                            color={COLORS.blackText}
                          />
                        </GlassButton>
                      ) : null}
                      <GlassButton
                        variant="neutral"
                        style={appointmentStyles.detailActionIcon}
                        onPress={handleMessageDoctor}
                        disabled={chatListLoading}
                        activeOpacity={0.8}
                      >
                        {chatListLoading ? (
                          <ActivityIndicator
                            size="small"
                            color={COLORS.selectedItem}
                          />
                        ) : (
                          <Ionicons
                            name="chatbubbles-outline"
                            size={22}
                            color={COLORS.blackText}
                          />
                        )}
                      </GlassButton>
                      {doctorEmail ? (
                        <GlassButton
                          variant="neutral"
                          style={appointmentStyles.detailActionIcon}
                          onPress={() => sendEmail(doctorEmail)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="mail-outline"
                            size={22}
                            color={COLORS.blackText}
                          />
                        </GlassButton>
                      ) : null}
                    </View>
                  </View>

                  {/* Section title */}
                  <Text style={appointmentStyles.detailSectionTitle}>
                    {(tApt.appointmentInfo || "").toUpperCase()}
                  </Text>

                  {/* Fecha / Hora */}
                  <View style={appointmentStyles.detailHalfRow}>
                    <View style={appointmentStyles.detailHalfCard}>
                      <View style={appointmentStyles.detailCardIconCircle}>
                        <Ionicons
                          name="calendar-outline"
                          size={20}
                          color={COLORS.blackText}
                        />
                      </View>
                      <Text style={appointmentStyles.detailCardLabel}>
                        {(tApt.date || "").replace(":", "").trim()}
                      </Text>
                      <Text style={appointmentStyles.detailCardValue}>
                        {formatDateTextShort(modalData.start, language)}
                      </Text>
                    </View>
                    <View style={appointmentStyles.detailHalfCard}>
                      <View style={appointmentStyles.detailCardIconCircle}>
                        <Ionicons
                          name="time-outline"
                          size={20}
                          color={COLORS.blackText}
                        />
                      </View>
                      <Text style={appointmentStyles.detailCardLabel}>
                        {(tApt.time || "").replace(":", "").trim()}
                      </Text>
                      <Text style={appointmentStyles.detailCardValue}>
                        {formatTime(modalData.start)}
                      </Text>
                    </View>
                  </View>

                  {/* Ubicación */}
                  {clinic?.name || clinic?.googleMapsLink || clinicAddress ? (
                    <TouchableOpacity
                      style={appointmentStyles.detailInfoRow}
                      onPress={() =>
                        openMapPrompt(clinic?.googleMapsLink || clinicAddress)
                      }
                      activeOpacity={0.8}
                    >
                      <View style={appointmentStyles.detailInfoIconCircle}>
                        <Ionicons
                          name="location-outline"
                          size={22}
                          color={COLORS.greyText}
                        />
                      </View>
                      <View style={appointmentStyles.detailInfoTextWrap}>
                        <Text style={appointmentStyles.detailInfoLabel}>
                          {(tApt.location || "").replace(":", "").trim()}
                        </Text>
                        <Text style={appointmentStyles.detailInfoValue}>
                          {clinic?.name || clinicAddress}
                        </Text>
                      </View>
                      <Ionicons
                        name="navigate"
                        size={20}
                        color={COLORS.selectedItem}
                      />
                    </TouchableOpacity>
                  ) : null}

                  {/* Tipo de consulta */}
                  {getAppointmentTypeName(modalData) ? (
                    <View style={appointmentStyles.detailInfoRow}>
                      <View style={appointmentStyles.detailInfoIconCircle}>
                        <Ionicons
                          name="medkit-outline"
                          size={22}
                          color={COLORS.greyText}
                        />
                      </View>
                      <View style={appointmentStyles.detailInfoTextWrap}>
                        <Text style={appointmentStyles.detailInfoLabel}>
                          {tApt.consultationType}
                        </Text>
                        <Text style={appointmentStyles.detailInfoValue}>
                          {getAppointmentTypeName(modalData)}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Modo de consulta */}
                  <View style={appointmentStyles.detailInfoRow}>
                    <View style={appointmentStyles.detailInfoIconCircle}>
                      <Ionicons
                        name={
                          modalData?.modality === "video_call" ||
                          modalData?.videoRoom?.roomName
                            ? "videocam-outline"
                            : "business-outline"
                        }
                        size={22}
                        color={COLORS.greyText}
                      />
                    </View>
                    <View style={appointmentStyles.detailInfoTextWrap}>
                      <Text style={appointmentStyles.detailInfoLabel}>
                        {tApt.consultationMode}
                      </Text>
                      <Text style={appointmentStyles.detailInfoValue}>
                        {modalData?.modality === "video_call" ||
                        modalData?.videoRoom?.roomName
                          ? tApt.modeVideo
                          : tApt.modeInPerson}
                      </Text>
                    </View>
                  </View>

                  {/* Guest patient */}
                  {modalData.guestPatient?.fullName ? (
                    <View style={appointmentStyles.detailInfoRow}>
                      <View style={appointmentStyles.detailInfoIconCircle}>
                        <Ionicons
                          name="person-outline"
                          size={22}
                          color={COLORS.greyText}
                        />
                      </View>
                      <View style={appointmentStyles.detailInfoTextWrap}>
                        <Text style={appointmentStyles.detailInfoLabel}>
                          {language === "es" ? "Paciente" : "Patient"}
                        </Text>
                        <Text style={appointmentStyles.detailInfoValue}>
                          {modalData.guestPatient.fullName}
                          {modalData.guestPatient.relationship
                            ? ` (${modalData.guestPatient.relationship})`
                            : ""}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Cancellation reason */}
                  {getStatusKey(modalData) === "cancelled" &&
                  !!modalData?.cancellationReason ? (
                    <View style={appointmentStyles.detailInfoRow}>
                      <View style={appointmentStyles.detailInfoIconCircle}>
                        <Ionicons
                          name="information-circle-outline"
                          size={22}
                          color={COLORS.error}
                        />
                      </View>
                      <View style={appointmentStyles.detailInfoTextWrap}>
                        <Text style={appointmentStyles.detailInfoLabel}>
                          {tApt.cancellationReasonLabel}
                        </Text>
                        <Text style={appointmentStyles.detailInfoValue}>
                          {modalData.cancellationReason}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {modalDateError ? (
                    <Text
                      style={[
                        appointmentStyles.detailInfoLabel,
                        {
                          color: COLORS.error,
                          marginTop: 10,
                          paddingHorizontal: 4,
                        },
                      ]}
                    >
                      {tApt.dateError}
                    </Text>
                  ) : null}
                </ScrollView>
              )}

              {/* Cancel-reason input (shown while confirming a cancellation) */}
              {modalData && confirmCancelAppointment && isUpcoming ? (
                <TextInput
                  value={cancelReasonText}
                  onChangeText={setCancelReasonText}
                  placeholder={
                    tApt.cancelReasonPlaceholder ??
                    "Motivo de la cancelación (opcional)"
                  }
                  placeholderTextColor={COLORS.greyText}
                  multiline
                  maxLength={300}
                  style={appointmentStyles.detailReasonInput}
                />
              ) : null}

              {/* Bottom action bar */}
              {modalData ? (
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingTop: 10,
                    paddingBottom: Math.max(insets?.bottom ?? 0, 14),
                  }}
                >
                  {confirmCancelAppointment && isUpcoming ? (
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <GlassButton
                        variant="secondary"
                        style={[
                          appointmentStyles.detailBtn,
                          appointmentStyles.detailBtnSecondary,
                        ]}
                        onPress={() => setConfirmCancelAppointment(false)}
                        activeOpacity={0.85}
                      >
                        <Text style={appointmentStyles.detailBtnSecondaryText}>
                          {tApt.closeModal}
                        </Text>
                      </GlassButton>
                      <GlassButton
                        variant="danger"
                        style={[
                          appointmentStyles.detailBtn,
                          appointmentStyles.detailBtnDanger,
                          loading.booking && appointmentStyles.detailBtnDisabled,
                        ]}
                        onPress={handleConfirmCancelAppointment}
                        disabled={loading.booking}
                        activeOpacity={0.85}
                      >
                        {loading.booking ? (
                          <ActivityIndicator size="small" color={COLORS.error} />
                        ) : (
                          <Text style={appointmentStyles.detailBtnDangerText}>
                            {tApt.confirmButton}
                          </Text>
                        )}
                      </GlassButton>
                    </View>
                  ) : isUpcoming &&
                    getStatusKey(modalData) !== "cancelled" ? (
                    <>
                      {(modalData?.modality === "video_call" ||
                        modalData?.videoRoom?.roomName) && (
                        <GlassButton
                          variant="primary"
                          style={[
                            appointmentStyles.detailBtn,
                            appointmentStyles.detailBtnPrimary,
                            { flex: 0, width: "100%", marginBottom: 12 },
                            (joiningVideoCall ||
                              isTooEarlyToJoinVideoCall ||
                              isPastVideoCall) &&
                              appointmentStyles.detailBtnDisabled,
                          ]}
                          onPress={handleJoinVideoCall}
                          disabled={
                            joiningVideoCall ||
                            isTooEarlyToJoinVideoCall ||
                            isPastVideoCall
                          }
                          activeOpacity={0.85}
                        >
                          {joiningVideoCall ? (
                            <ActivityIndicator
                              size="small"
                              color={COLORS.selectedItem}
                            />
                          ) : (
                            <>
                              <Ionicons
                                name="videocam"
                                size={20}
                                color={COLORS.selectedItem}
                                style={{ marginRight: 8 }}
                              />
                              <Text
                                style={appointmentStyles.detailBtnPrimaryText}
                              >
                                {isPastVideoCall
                                  ? STRINGS[language]?.messages?.videoCallEnded
                                  : isTooEarlyToJoinVideoCall
                                    ? STRINGS[language]?.messages
                                        ?.videoCallTooEarly
                                    : STRINGS[language]?.messages?.videoCall}
                              </Text>
                            </>
                          )}
                        </GlassButton>
                      )}
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <GlassButton
                          variant="danger"
                          style={[
                            appointmentStyles.detailBtn,
                            appointmentStyles.detailBtnDanger,
                          ]}
                          onPress={handleCancelAppointment}
                          disabled={loading.booking}
                          activeOpacity={0.85}
                        >
                          <Ionicons
                            name="close-circle-outline"
                            size={18}
                            color={COLORS.error}
                            style={{ marginRight: 6 }}
                          />
                          <Text style={appointmentStyles.detailBtnDangerText}>
                            {tApt.cancel}
                          </Text>
                        </GlassButton>
                      </View>
                    </>
                  ) : (
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <GlassButton
                        variant="secondary"
                        style={[
                          appointmentStyles.detailBtn,
                          appointmentStyles.detailBtnSecondary,
                        ]}
                        onPress={handleBookAgain}
                        activeOpacity={0.85}
                      >
                        <Text style={appointmentStyles.detailBtnSecondaryText}>
                          {tApt.bookAgain}
                        </Text>
                      </GlassButton>
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          </ScreenGradient>
        </Modal>

        {showSearchContent ? (
          <ScrollView
            style={[styles.keyboardView, { backgroundColor: COLORS.white }]}
            contentContainerStyle={[styles.container, { flexGrow: 1, backgroundColor: COLORS.white }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.secondary]}
                tintColor={COLORS.secondary}
              />
            }
          >
            <View
              style={[
                styles.content,
                {
                  paddingTop:
                    searchBarAtTopHeight > 0
                      ? searchBarAtTopHeight
                      : Math.max(insets?.top ?? 0, 48),
                },
              ]}
            >
              <>
                {filtersOpen && <DoctorSearchFilters filters={filters} />}
                <View style={styles.searchModeBar}>
                  <Text style={styles.searchModeTitle}>{t.findDoctor}</Text>
                  <TouchableOpacity onPress={handleClearSearch}>
                    <Text style={styles.clearSearchText}>
                      {tBook.clearSearch}
                    </Text>
                  </TouchableOpacity>
                </View>
                {doctorLoading.searchQuery ? (
                  <View style={styles.loader}>
                    <ActivityIndicator size="small" color={COLORS.secondary} />
                  </View>
                ) : !searchActive ? null : doctorError?.searchQuery ? (
                  <Text style={styles.emptyText}>
                    {doctorError.searchQuery}
                  </Text>
                ) : doctorsSearchResults.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {tBook.noResults ?? "No results"}
                  </Text>
                ) : (
                  <View style={styles.doctorList}>
                    {doctorsSearchResults.map((doc) => {
                      const avail = formatAvailability(doc.nextAvailable, language);
                      const clinic =
                        Array.isArray(doc.clinics) && doc.clinics[0] ? doc.clinics[0] : null;
                      const mods = Array.isArray(doc.modalities) ? doc.modalities : [];
                      const inPerson = mods.includes("in_person");
                      const video = mods.includes("video_call");
                      const photo = getSearchDoctorPhoto(doc);
                      return (
                        <View key={doc._id} style={styles.srCard}>
                          <View
                            style={[
                              styles.srAccent,
                              { backgroundColor: avail.available ? "#22C55E" : "#F87171" },
                            ]}
                          />
                          <View style={styles.srBody}>
                            <View style={styles.srTopRow}>
                              {photo ? (
                                <Image source={{ uri: photo }} style={styles.srAvatar} />
                              ) : (
                                <View style={[styles.srAvatar, styles.srAvatarPlaceholder]}>
                                  <Text style={styles.srAvatarInitials}>
                                    {getSearchDoctorInitials(doc)}
                                  </Text>
                                </View>
                              )}
                              <View style={{ flex: 1 }}>
                                <Text style={styles.srName} numberOfLines={1}>
                                  {getSearchDoctorName(doc)}
                                </Text>
                                <View style={styles.srChip}>
                                  {getSpecialtyIcon(doc.profession) ? (
                                    <Image
                                      source={getSpecialtyIcon(doc.profession)}
                                      style={styles.srChipIcon}
                                      resizeMode="contain"
                                    />
                                  ) : (
                                    <Ionicons name="medkit" size={12} color={COLORS.secondary} />
                                  )}
                                  <Text style={styles.srChipText} numberOfLines={1}>
                                    {getSpecialtyLabel(doc, language)}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            <View style={styles.srInfoBox}>
                              {clinic ? (
                                <View style={styles.srInfoRow}>
                                  <Ionicons name="location-outline" size={16} color={COLORS.greyText} />
                                  <Text style={styles.srInfoText} numberOfLines={1}>
                                    {[clinic.name, clinic.locationReference].filter(Boolean).join(", ")}
                                  </Text>
                                </View>
                              ) : null}
                              <View style={styles.srInfoRow}>
                                {avail.available ? (
                                  <>
                                    <Ionicons name="calendar-outline" size={16} color="#16A34A" />
                                    <Text
                                      style={[styles.srInfoText, { color: "#16A34A", fontWeight: "600" }]}
                                      numberOfLines={2}
                                    >
                                      {avail.text}
                                    </Text>
                                  </>
                                ) : (
                                  <>
                                    <Ionicons name="hourglass-outline" size={16} color="#DC2626" />
                                    <Text
                                      style={[styles.srInfoText, { color: "#DC2626" }]}
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
                                <View style={styles.srModRow}>
                                  {inPerson ? (
                                    <View style={styles.srMod}>
                                      <Ionicons name="person-outline" size={14} color={COLORS.secondary} />
                                      <Text style={styles.srModText}>
                                        {language === "es" ? "Presencial" : "In-person"}
                                      </Text>
                                    </View>
                                  ) : null}
                                  {video ? (
                                    <View style={styles.srMod}>
                                      <Ionicons name="videocam-outline" size={14} color={COLORS.secondary} />
                                      <Text style={styles.srModText}>
                                        {language === "es" ? "Videollamada" : "Video call"}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                              ) : null}
                            </View>

                            <View style={styles.srBtnRow}>
                              <TouchableOpacity
                                style={styles.srBtnOutline}
                                onPress={() => handleSelectDoctor(doc)}
                              >
                                <Text style={styles.srBtnOutlineText}>
                                  {language === "es" ? "Ver perfil" : "View profile"}
                                </Text>
                              </TouchableOpacity>
                              {avail.available ? (
                                <TouchableOpacity
                                  style={styles.srBtnPrimary}
                                  onPress={() => navigation.navigate("FindAndBook", { doctor: doc })}
                                >
                                  <Text style={styles.srBtnPrimaryText}>
                                    {language === "es" ? "Agendar" : "Book"}
                                  </Text>
                                </TouchableOpacity>
                              ) : (
                                <TouchableOpacity
                                  style={styles.srBtnMuted}
                                  onPress={() => navigation.navigate("FindAndBook", { doctor: doc })}
                                >
                                  <Ionicons name="notifications-outline" size={14} color={COLORS.blackText} />
                                  <Text style={styles.srBtnMutedText}>
                                    {language === "es" ? "Avisarme" : "Notify me"}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            </View>
          </ScrollView>
        ) : (
          <View style={[styles.keyboardView, { flex: 1 }]}>
            <View
              style={[
                styles.content,
                { paddingTop: Math.max(insets?.top ?? 0, 48), flex: 1 },
              ]}
            >
              {loading.patientUpcoming && (
                <View style={styles.loader}>
                  <ActivityIndicator size="small" color={COLORS.secondary} />
                </View>
              )}

              <View style={[styles.contentStack, { flex: 1 }]}>
                <View style={styles.greetingCard}>
                  <View style={styles.greetingTextWrap}>
                    <Text style={styles.greetingTitle}>
                      {(t.greetingHello ?? "¡Hola, {name}!").replace(
                        "{name}",
                        getPatientFirstName(currentUser) ||
                          (language === "es" ? "Usuario" : "User"),
                      )}
                    </Text>
                    <Text style={styles.greetingSubtitle} numberOfLines={2}>
                      {t.greetingMessage ?? tips[0] ?? suggestion}
                    </Text>
                  </View>
                  {profileImageUri ? (
                    <Image
                      source={{ uri: profileImageUri }}
                      style={styles.greetingAvatar}
                    />
                  ) : (
                    <View style={styles.greetingAvatarPlaceholder}>
                      <Text style={styles.greetingAvatarInitials}>
                        {getPatientInitials(currentUser)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={[styles.appointmentsSection, { flex: 1 }]}>
                  <View style={appointmentStyles.tabRowCard}>
                    <View style={appointmentStyles.tabRow}>
                      <TouchableOpacity
                        style={appointmentStyles.tab}
                        onPress={handleUpcomingTab}
                      >
                        <Text
                          style={[
                            appointmentStyles.tabText,
                            appointmentsTab === 0 &&
                              appointmentStyles.activeTabText,
                          ]}
                        >
                          {tApt.nextAppointments}
                        </Text>
                        {appointmentsTab === 0 && (
                          <View style={appointmentStyles.underline} />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={appointmentStyles.tabSecondary}
                        onPress={handlePastTab}
                      >
                        <Text
                          style={[
                            appointmentStyles.tabTextSecondary,
                            appointmentsTab === 1 &&
                              appointmentStyles.activeTabTextSecondary,
                          ]}
                        >
                          {tApt.pastAppointments}
                        </Text>
                        {appointmentsTab === 1 && (
                          <View style={appointmentStyles.underlineSecondary} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={
                      appointmentsList?.length > 0
                        ? // Clear the floating tab bar + search bar so the last
                          // cards aren't hidden behind them.
                          { paddingBottom: Math.max(insets?.bottom ?? 0, 16) + 130 }
                        : { flexGrow: 1 }
                    }
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                      <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[COLORS.secondary]}
                        tintColor={COLORS.secondary}
                      />
                    }
                  >
                    {renderAppointmentsList()}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </ScreenGradient>
  );
};

AppointmentsTabScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    getParent: PropTypes.func,
  }).isRequired,
  route: PropTypes.shape({
    params: PropTypes.shape({
      type: PropTypes.string,
      role: PropTypes.string,
    }),
  }),
};

export default AppointmentsTabScreen;
