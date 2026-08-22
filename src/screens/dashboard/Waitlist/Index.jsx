// M19: dedicated screen to view/leave the automatic waitlist
// ("notify me if a slot opens up"). Reuses the Favorites screen's styles —
// same list/card layout — to avoid duplicating a near-identical stylesheet.
import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import PropTypes from "prop-types";
import {
  fetchMyWaitlist,
  leaveWaitlist,
} from "../../../redux/appointmentsSlice";
import { getMainSpecialtyDisplay } from "../../../utils/helpers";
import { BASE_URL } from "../../../../config";
import { COLORS, ICONS, SIZES } from "../../../styles/theme";
import styles from "../Favorites/styles";

const gradientColors = [
  "rgba(81, 232, 239, 0.25)",
  "rgba(67, 144, 246, 0.15)",
  "rgba(108, 166, 244, 0.25)",
];

/** One waitlisted day (UTC start-of-day) as a short readable date. */
function formatDay(iso, language, withYear) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

/** Minutes-of-day (0-1439) → "HH:MM". */
function formatMinutes(mins) {
  if (mins == null || Number.isNaN(Number(mins))) return "";
  const total = Number(mins);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Human summary of a waitlist entry's criteria: a single day or a date range,
 * optionally with a time-of-day window. Falls back to the legacy `date` field.
 */
function formatWaitlistCriteria(entry, language) {
  const es = language === "es";
  const from = entry?.dateFrom ?? entry?.date ?? null;
  const to = entry?.dateTo ?? entry?.date ?? null;
  let dateStr = "";
  if (from && to) {
    const isRange = new Date(from).getTime() !== new Date(to).getTime();
    dateStr = isRange
      ? `${formatDay(from, language)} – ${formatDay(to, language, true)}`
      : formatDay(from, language, true);
  } else if (from) {
    dateStr = formatDay(from, language, true);
  }

  let timeStr = "";
  const hasFrom = entry?.timeFrom != null;
  const hasTo = entry?.timeTo != null;
  if (hasFrom && hasTo) {
    timeStr = `${formatMinutes(entry.timeFrom)}–${formatMinutes(entry.timeTo)}`;
  } else if (hasFrom) {
    timeStr = `${es ? "desde" : "from"} ${formatMinutes(entry.timeFrom)}`;
  } else if (hasTo) {
    timeStr = `${es ? "hasta" : "until"} ${formatMinutes(entry.timeTo)}`;
  }

  return { dateStr, timeStr };
}

const WaitlistScreen = ({ navigation }) => {
  const language = useSelector((state) => state.language.language);
  const { myWaitlist, loading, error } = useSelector(
    (state) => state.appointments,
  );
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchMyWaitlist());
    }, [dispatch]),
  );

  const handleBack = () => navigation.goBack();

  const handleSelectDoctor = (doctor) => {
    if (!doctor?._id) return;
    // Same cross-tab pattern as Favorites: the booking flow lives in the Home
    // tab's stack, so navigate there rather than duplicating those screens.
    navigation.navigate("Home", { screen: "DoctorProfile", params: { doctor } });
  };

  const handleLeave = (entry) => {
    const name = entry?.doctor?.fullName ?? "";
    Alert.alert(
      language === "es" ? "Salir de la lista de espera" : "Leave the waitlist",
      language === "es"
        ? `¿Dejar de esperar un horario con Dr. ${name}?`
        : `Stop waiting for a slot with Dr. ${name}?`,
      [
        { text: language === "es" ? "Cancelar" : "Cancel", style: "cancel" },
        {
          text: language === "es" ? "Salir" : "Leave",
          style: "destructive",
          onPress: () => dispatch(leaveWaitlist(entry._id)),
        },
      ],
    );
  };

  const getPhotoUri = (d) => {
    const url = d?.profileImageUrl;
    if (url) return url.startsWith("http") ? url : `${BASE_URL}${url}`;
    return null;
  };

  const renderItem = ({ item }) => {
    const doctor = item?.doctor ?? {};
    const photoUri = getPhotoUri(doctor);
    const specialty =
      getMainSpecialtyDisplay(doctor, language) || doctor?.profession || "";
    const { dateStr, timeStr } = formatWaitlistCriteria(item, language);
    return (
      <TouchableOpacity
        style={styles.doctorItem}
        onPress={() => handleSelectDoctor(doctor)}
        activeOpacity={0.7}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name={ICONS.person} size={28} color={COLORS.secondary} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.doctorName} numberOfLines={1}>
            {doctor?.fullName ?? ""}
          </Text>
          <Text style={styles.doctorMeta} numberOfLines={2}>
            {specialty ? `${specialty} · ` : ""}
            {language === "es" ? "Esperando: " : "Waiting for: "}
            {dateStr}
            {timeStr ? (language === "es" ? ` · Hora: ${timeStr}` : ` · Time: ${timeStr}`) : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleLeave(item)}
          accessibilityLabel={
            language === "es" ? "Salir de la lista de espera" : "Leave the waitlist"
          }
        >
          <Ionicons name="close-circle" size={24} color="#EF4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <>
      <Text style={styles.headerTitle}>
        {language === "es" ? "Lista de espera" : "Waitlist"}
      </Text>
      <Text style={styles.headerSubtitle}>
        {myWaitlist.length}{" "}
        {language === "es"
          ? myWaitlist.length === 1
            ? "solicitud activa"
            : "solicitudes activas"
          : myWaitlist.length === 1
            ? "active request"
            : "active requests"}
      </Text>
    </>
  );

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={gradientColors}
        style={[styles.gradient, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.backRow}>
          <TouchableOpacity
            style={styles.backTouch}
            onPress={handleBack}
            accessibilityLabel="Back"
          >
            <Ionicons
              name={ICONS.backArrow}
              size={SIZES.icon20}
              color={COLORS.blackText}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {loading.waitlist ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={COLORS.secondary} />
            </View>
          ) : error.waitlist ? (
            <View style={styles.empty}>
              <Text style={styles.errorText}>{error.waitlist}</Text>
            </View>
          ) : myWaitlist.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {language === "es"
                  ? "No estás en ninguna lista de espera."
                  : "You're not on any waitlist."}
              </Text>
              <Text style={styles.emptyText}>
                {language === "es"
                  ? "Cuando no haya horarios para una fecha, toca \"Notificarme si se libera un horario\" para que te avisemos."
                  : "When no slots are available for a date, tap \"Notify me if a slot opens up\" and we'll alert you."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={myWaitlist}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              ListHeaderComponent={listHeader}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

WaitlistScreen.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

export default WaitlistScreen;
