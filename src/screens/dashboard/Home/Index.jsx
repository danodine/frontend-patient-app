import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  View,
  ActivityIndicator,
  Keyboard,
  RefreshControl,
  Modal,
  Pressable,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentUser } from "../../../redux/userSlice";
import { getPatientUpcomingAppointments } from "../../../redux/appointmentsSlice";
import {
  searchDoctorsQuery,
  clearSearchResults,
  clearDoctorError,
  fetchFavoriteDoctors,
} from "../../../redux/doctorSlice";
import PropTypes from "prop-types";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles";
import STRINGS from "../../../constants/strings";
import { COLORS, GRADIENT_COLORS } from "../../../styles/theme";
import { getSpecialtyOptions } from "../../../constants/specialties";
import { getSpecialtyIcon } from "../../../constants/specialtyIcons";
import {
  formatDateText,
  formatTime,
  getMainSpecialtyDisplay,
} from "../../../utils/helpers";
import TopBanner from "../components/TopBanner/Index";
import { BASE_URL } from "../../../../config";
import { useBottomBarSearch } from "../../../contexts/BottomBarSearchContext";
import useDoctorSearchFilters from "../../../hooks/useDoctorSearchFilters";
import DoctorSearchFilters from "../../../components/DoctorSearchFilters";
import GlassButton from "../../../components/GlassButton";
import { LinearGradient } from "expo-linear-gradient";

const DEBOUNCE_MS = 350;
const MIN_SEARCH_LEN = 2;

// A small green dot that gently pulses (opacity + scale loop) to hint the
// upcoming appointment is "live". Self-contained so it manages its own loop.
function PulsingDot() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.pulsingDot,
        {
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }),
          transform: [
            {
              scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }),
            },
          ],
        },
      ]}
    />
  );
}

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

// The 4 quick-access specialties on the dashboard. `value` is the canonical
// (English) specialty sent to DoctorList; the visible label is localized.
// `value` is the canonical specialty CODE sent to the doctor search; the label
// is localized from strings.
const SPECIALTY_CHIPS = [
  { value: "pediatrics", labelKey: "chipPediatrics", icon: "happy-outline", color: COLORS.secondary },
  { value: "cardiology", labelKey: "chipCardiology", icon: "heart-outline", color: COLORS.error },
  { value: "dentistry", labelKey: "chipDentistry", icon: "medkit-outline", color: COLORS.secondary },
  { value: "general_medicine", labelKey: "chipGeneral", image: require("../../../assets/medicina_general.png") },
];

const CANCELLED_STATUSES = ["cancelled", "no_show"];

function isActiveAppointment(apt) {
  const s = String(apt?.status || "").toLowerCase();
  return !CANCELLED_STATUSES.some((c) => s.startsWith(c));
}

function getNextAppointment(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const active = list.filter(isActiveAppointment).filter((a) => a.start);
  if (active.length === 0) return null;
  return [...active].sort((a, b) => new Date(a.start) - new Date(b.start))[0];
}

function shortTimeUntil(startIso, language) {
  if (!startIso) return "";
  const diffMs = new Date(startIso) - new Date();
  if (diffMs <= 0) return language === "es" ? "Ahora" : "Now";
  const hours = Math.round(diffMs / 3600000);
  const prefix = language === "es" ? "En " : "In ";
  if (hours < 24) return `${prefix}${hours}h`;
  const days = Math.round(hours / 24);
  return `${prefix}${days}d`;
}

function getDoctorName(doc) {
  if (!doc) return "";
  return doc.fullName ?? doc.name ?? "";
}

function getInitialsFromName(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function getPhotoUri(doc) {
  const url = doc?.profileImageUrl;
  if (!url) return null;
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

function getPatientFirstName(user) {
  const name = user?.fullName ?? user?.name ?? user?.profile?.firstName ?? "";
  if (typeof name !== "string" || !name.trim()) return "";
  return name.trim().split(/\s+/)[0] ?? "";
}

/**
 * Formats a doctor's `nextAvailable` ({ start ISO, tz }) into the search-card
 * line: "Disponible hoy, 16:30 hrs" / "mañana" / a short date, in the clinic's
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

function getClinicLabel(doc) {
  const clinics = doc?.clinics;
  if (Array.isArray(clinics) && clinics.length > 0) {
    return clinics[0]?.name ?? "";
  }
  return "";
}

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const language = useSelector((state) => state.language.language);
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.users.currentUser) ?? {};
  const profileImageUri = useSelector(
    (state) => state.users.cachedProfileImageUri,
  );
  const { upcomingPatientList } = useSelector((state) => state.appointments);
  const {
    doctorsSearchResults,
    loading: doctorLoading,
    error: doctorError,
    favoriteDoctors,
  } = useSelector((state) => state.doctor);

  const t = STRINGS[language]?.home ?? STRINGS.es.home;
  const tBook = STRINGS[language]?.bookAppointment ?? STRINGS.es.bookAppointment;

  const [searchText, setSearchText] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [specialtyModalVisible, setSpecialtyModalVisible] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filters = useDoctorSearchFilters();
  const [banner, setBanner] = useState({ visible: false, type: "", message: "" });
  const debounceRef = useRef(null);
  const { setSearchConfig, searchBarAtTopHeight } = useBottomBarSearch();

  const nextAppointment = getNextAppointment(upcomingPatientList);
  const favoritesToShow = Array.isArray(favoriteDoctors)
    ? favoriteDoctors.slice(0, 2)
    : [];

  const loadData = useCallback(() => {
    dispatch(getCurrentUser());
    dispatch(getPatientUpcomingAppointments());
    dispatch(fetchFavoriteDoctors());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(getCurrentUser()),
      dispatch(getPatientUpcomingAppointments()),
      dispatch(fetchFavoriteDoctors()),
    ]);
    setRefreshing(false);
  }, [dispatch]);

  // Shared bottom-bar search: inline doctor results + a filter toggle (the icon
  // in the search bar) that expands the filter panel.
  useFocusEffect(
    useCallback(() => {
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

  // Fire a doctor search when there's a query (>=2 chars) OR any active filter.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchText.trim();
    const shouldSearch = q.length >= MIN_SEARCH_LEN || filters.hasActiveFilters;
    if (!shouldSearch) {
      dispatch(clearSearchResults());
      setSearchActive(false);
      return;
    }
    // Distance filter needs coordinates first; hold off until they arrive.
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

  useEffect(() => {
    if (doctorError?.getById || doctorError?.searchQuery) {
      setBanner({
        visible: true,
        type: "error",
        message: STRINGS[language].doctorProfile.errorLoadingData,
      });
    }
  }, [doctorError?.getById, doctorError?.searchQuery, language]);

  const handleCloseBanner = useCallback(() => {
    setBanner((b) => ({ ...b, visible: false }));
    dispatch(clearDoctorError());
  }, [dispatch]);

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

  const goToAppointments = () => {
    navigation.getParent()?.navigate("Appointments");
  };

  const openSpecialty = (value, label) => {
    setSpecialtyModalVisible(false);
    navigation.navigate("DoctorList", { specialty: value, specialtyLabel: label });
  };

  const goToFavorites = () => {
    navigation.getParent()?.navigate("Profile", { screen: "Favorites" });
  };

  // The search bar floats to the top only while it's focused (keyboard open),
  // which the context reports as searchBarAtTopHeight > 0.
  const searchFocused = searchBarAtTopHeight > 0;
  const showSearchContent =
    searchFocused ||
    searchText.trim().length >= MIN_SEARCH_LEN ||
    filtersOpen ||
    filters.hasActiveFilters;

  const renderSearchResults = () => (
    <View
      style={[
        styles.content,
        {
          // When the search bar is focused it floats to the top; pad the content
          // below it so the "Buscar médico" title + clear button aren't covered.
          paddingTop:
            searchBarAtTopHeight > 0
              ? searchBarAtTopHeight
              : Math.max(insets?.top ?? 0, 48),
        },
      ]}
    >
      {filtersOpen && <DoctorSearchFilters filters={filters} />}
      <View style={styles.searchModeBar}>
        <Text style={styles.searchModeTitle}>{t.findDoctor}</Text>
        <TouchableOpacity onPress={handleClearSearch}>
          <Text style={styles.clearSearchText}>{tBook.clearSearch}</Text>
        </TouchableOpacity>
      </View>
      {doctorLoading.searchQuery ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={COLORS.secondary} />
        </View>
      ) : !searchActive ? null : doctorsSearchResults.length === 0 ? (
        <Text style={styles.emptyText}>{tBook.noResults ?? "No results"}</Text>
      ) : (
        <ScrollView
          style={styles.srScroll}
          contentContainerStyle={styles.srScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {doctorsSearchResults.map((doc) => {
            const avail = formatAvailability(doc.nextAvailable, language);
            const clinic =
              Array.isArray(doc.clinics) && doc.clinics[0] ? doc.clinics[0] : null;
            const mods = Array.isArray(doc.modalities) ? doc.modalities : [];
            const inPerson = mods.includes("in_person");
            const video = mods.includes("video_call");
            const photo = getPhotoUri(doc);
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
                          {getInitialsFromName(getDoctorName(doc))}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.srName} numberOfLines={1}>
                        {getDoctorName(doc)}
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
                          {getMainSpecialtyDisplay(doc, language)}
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
        </ScrollView>
      )}
    </View>
  );

  const renderNextAppointmentCard = () => {
    if (!nextAppointment) {
      return (
        <View style={styles.dashCard}>
          <Text style={styles.dashCardTitle}>{t.nextAppointment}</Text>
          <Text style={styles.dashEmptyText}>{t.noNextAppointment}</Text>
        </View>
      );
    }
    const doc = nextAppointment.doctor;
    const name = getDoctorName(doc);
    const specialty = getMainSpecialtyDisplay(doc, language);
    return (
      <TouchableOpacity
        style={styles.dashCard}
        activeOpacity={0.85}
        onPress={goToAppointments}
      >
        <View style={styles.dashCardHeader}>
          <Text style={styles.dashCardTitle}>{t.nextAppointment}</Text>
          <View style={styles.dashBadge}>
            <PulsingDot />
            <Text style={styles.dashBadgeText}>
              {shortTimeUntil(nextAppointment.start, language)}
            </Text>
          </View>
        </View>
        <Text style={styles.dashCardDate}>
          {formatDateText(nextAppointment.start, language)}
        </Text>
        <View style={styles.dashInnerRow}>
          {getPhotoUri(doc) ? (
            <Image source={{ uri: getPhotoUri(doc) }} style={styles.dashInnerAvatar} />
          ) : (
            <View style={styles.dashInnerAvatarPlaceholder}>
              <Text style={styles.dashInnerAvatarInitials}>
                {getInitialsFromName(name)}
              </Text>
            </View>
          )}
          <View style={styles.dashInnerTextWrap}>
            <Text style={styles.dashInnerName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.dashInnerSub} numberOfLines={1}>
              {specialty ? `${specialty} · ` : ""}
              {formatTime(nextAppointment.start)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={COLORS.secondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderSpecialties = () => (
    <View style={styles.dashSection}>
      <View style={styles.dashSectionHeader}>
        <Text style={styles.dashSectionTitle}>{t.specialties}</Text>
        <TouchableOpacity onPress={() => setSpecialtyModalVisible(true)}>
          <Text style={styles.dashSeeAll}>{t.seeAll}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.chipRow}>
        {SPECIALTY_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip.value}
            style={styles.chip}
            activeOpacity={0.8}
            onPress={() => openSpecialty(chip.value, t[chip.labelKey])}
          >
            <View style={styles.chipIconWrap}>
              {getSpecialtyIcon(chip.value) ? (
                <Image
                  source={getSpecialtyIcon(chip.value)}
                  style={styles.chipImage}
                  resizeMode="contain"
                />
              ) : chip.image ? (
                <Image source={chip.image} style={styles.chipImage} resizeMode="contain" />
              ) : (
                <Ionicons name={chip.icon} size={26} color={chip.color} />
              )}
            </View>
            <Text style={styles.chipLabel} numberOfLines={1}>
              {t[chip.labelKey]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFavorites = () => {
    if (favoritesToShow.length === 0) return null;
    return (
      <View style={styles.dashSection}>
        <View style={styles.dashSectionHeader}>
          <Text style={styles.dashSectionTitle}>{t.favoriteDoctors}</Text>
          <TouchableOpacity onPress={goToFavorites}>
            <Text style={styles.dashSeeAll}>{t.seeMore}</Text>
          </TouchableOpacity>
        </View>
        {favoritesToShow.map((doc) => {
          const name = getDoctorName(doc);
          const specialty = getMainSpecialtyDisplay(doc, language);
          const clinic = getClinicLabel(doc);
          return (
            <TouchableOpacity
              key={doc._id}
              style={styles.favCard}
              activeOpacity={0.85}
              onPress={() => handleSelectDoctor(doc)}
            >
              {getPhotoUri(doc) ? (
                <Image source={{ uri: getPhotoUri(doc) }} style={styles.favAvatar} />
              ) : (
                <View style={styles.favAvatarPlaceholder}>
                  <Text style={styles.favAvatarInitials}>
                    {getInitialsFromName(name)}
                  </Text>
                </View>
              )}
              <View style={styles.favTextWrap}>
                <Text style={styles.favName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.favSub} numberOfLines={1}>
                  {specialty}
                  {clinic ? ` · ${clinic}` : ""}
                </Text>
              </View>
              <GlassButton
                variant="neutral"
                style={styles.favBookBtn}
                onPress={() => navigation.navigate("FindAndBook", { doctor: doc })}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.blackText} />
              </GlassButton>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

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
          visible={specialtyModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSpecialtyModalVisible(false)}
        >
          <Pressable
            style={styles.specialtyModalOverlay}
            onPress={() => setSpecialtyModalVisible(false)}
          >
            <Pressable style={styles.specialtyModalCard} onPress={() => {}}>
              <View style={styles.specialtyModalHeader}>
                <Text style={styles.specialtyModalTitle}>{t.allSpecialties}</Text>
                <TouchableOpacity onPress={() => setSpecialtyModalVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.blackText} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {getSpecialtyOptions(language).map((spec) => (
                  <TouchableOpacity
                    key={spec.value}
                    style={styles.specialtyModalRow}
                    activeOpacity={0.7}
                    onPress={() => openSpecialty(spec.value, spec.label)}
                  >
                    {getSpecialtyIcon(spec.value) && (
                      <Image
                        source={getSpecialtyIcon(spec.value)}
                        style={styles.specialtyModalRowIcon}
                        resizeMode="contain"
                      />
                    )}
                    <Text style={styles.specialtyModalRowText}>{spec.label}</Text>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.greyText} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {showSearchContent ? (
          <ScrollView
            style={[styles.keyboardView, { backgroundColor: COLORS.white }]}
            contentContainerStyle={[styles.container, { flexGrow: 1, backgroundColor: COLORS.white }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderSearchResults()}
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.keyboardView}
            contentContainerStyle={[
              styles.dashScrollContent,
              { paddingTop: Math.max(insets?.top ?? 0, 48) },
            ]}
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
            <View style={styles.greetingCard}>
              <View style={styles.greetingTextWrap}>
                <Text style={styles.greetingTitle}>
                  {(t.dashHello ?? "Hola, {name}").replace(
                    "{name}",
                    getPatientFirstName(currentUser) ||
                      (language === "es" ? "Usuario" : "User"),
                  )}
                </Text>
                <Text style={styles.greetingSubtitle} numberOfLines={2}>
                  {t.dashHowAreYou}
                </Text>
              </View>
              {profileImageUri ? (
                <Image source={{ uri: profileImageUri }} style={styles.greetingAvatar} />
              ) : (
                <View style={styles.greetingAvatarPlaceholder}>
                  <Text style={styles.greetingAvatarInitials}>
                    {getInitialsFromName(getDoctorName(currentUser) || currentUser?.fullName)}
                  </Text>
                </View>
              )}
            </View>

            {renderNextAppointmentCard()}
            {renderSpecialties()}
            {renderFavorites()}
          </ScrollView>
        )}
      </View>
    </ScreenGradient>
  );
};

HomeScreen.propTypes = {
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

export default HomeScreen;
