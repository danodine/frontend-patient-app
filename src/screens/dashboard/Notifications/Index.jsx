import React, { useCallback, useRef } from "react";
import GlassButton from "../../../components/GlassButton";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  approveAppointmentChange,
  rejectAppointmentChange,
  clearNotificationsError,
  deleteNotification,
} from "../../../redux/notificationsSlice";
import { getPatientUpcomingAppointments } from "../../../redux/appointmentsSlice";
import STRINGS from "../../../constants/strings";
import { COLORS, GRADIENT_COLORS } from "../../../styles/theme";
import styles from "./styles";
import { useBottomBarSearch } from "../../../contexts/BottomBarSearchContext";
import TopBanner from "../components/TopBanner/Index";
import PropTypes from "prop-types";

const NOTIFICATION_TYPE = {
  CHANGE_REQUEST: "appointment_change_request",
  CANCELLED_BY_DOCTOR: "appointment_cancelled_by_doctor",
};

function notificationType(n) {
  return (n?.type ?? "").toLowerCase();
}

function isChangeRequest(n) {
  return notificationType(n) === NOTIFICATION_TYPE.CHANGE_REQUEST;
}

function isCancelledByDoctor(n) {
  return notificationType(n) === NOTIFICATION_TYPE.CANCELLED_BY_DOCTOR;
}

function formatDateTime(iso, language) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso, language) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return language === "es" ? "Justo ahora" : "Just now";
  if (mins < 60) return language === "es" ? `Hace ${mins} min` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return language === "es" ? `Hace ${hours}h` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return language === "es" ? `Hace ${days}d` : `${days}d ago`;
}

function getCardTitle(item, t) {
  if (isChangeRequest(item)) return t.changeRequestTitle;
  if (isCancelledByDoctor(item)) return t.cancelledTitle;
  // Other types (e.g. waitlist slot available) carry a server-localized title.
  return item.title || t.defaultTitle;
}

function getCardBody(item, language, t) {
  if (isChangeRequest(item)) {
    const doctor = item.data?.doctorName ?? "";
    if (doctor) {
      return language === "es"
        ? `${doctor} ha modificado tu cita. Revisa los nuevos datos y confirma.`
        : `${doctor} changed your appointment. Review the new details and confirm.`;
    }
    return language === "es"
      ? "Tu cita ha sido modificada. Revisa los nuevos datos y confirma."
      : "Your appointment was changed. Review the new details and confirm.";
  }
  if (isCancelledByDoctor(item)) {
    const doctorName = item.data?.doctorName ?? (language === "es" ? "el médico" : "the doctor");
    // Account deletion: the doctor left the platform entirely.
    if (item.data?.reason === "doctor_left") {
      const whenStr = formatDateTime(item.data?.whenISO, language);
      const when = whenStr ? (language === "es" ? ` del ${whenStr}` : ` on ${whenStr}`) : "";
      return language === "es"
        ? `Tu cita${when} fue cancelada porque el Dr. ${doctorName} ya no se encuentra en la plataforma.`
        : `Your appointment${when} was cancelled because Dr. ${doctorName} is no longer on the platform.`;
    }
    const template = t?.cancelledBody ?? (language === "es" ? "El Dr. {doctorName} ha cancelado tu cita." : "Dr. {doctorName} has cancelled your appointment.");
    return template.replace(/\{doctorName\}/g, doctorName);
  }
  return item.body ?? "";
}

/** For appointment_change_request and appointment_cancelled_by_doctor, keep latest per (type, appointmentId); others pass through. */
function dedupeByAppointment(list) {
  const byAppointmentItems = list.filter(
    (n) => n.data?.appointmentId && (isChangeRequest(n) || isCancelledByDoctor(n))
  );
  const rest = list.filter(
    (n) => !n.data?.appointmentId || (!isChangeRequest(n) && !isCancelledByDoctor(n))
  );
  const byAppointment = new Map();
  byAppointmentItems.forEach((n) => {
    const aid = n.data.appointmentId;
    const key = `${notificationType(n)}-${aid}`;
    const existing = byAppointment.get(key);
    if (!existing || new Date(n.createdAt) > new Date(existing.createdAt)) {
      byAppointment.set(key, n);
    }
  });
  const deduped = [...byAppointment.values(), ...rest];
  return deduped.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Pick a plain outline icon per notification type (design uses a small icon to
// the left of each card).
function getIcon(item) {
  const type = notificationType(item);
  if (isChangeRequest(item)) return "calendar-outline";
  if (isCancelledByDoctor(item)) return "close-circle-outline";
  if (type.includes("reminder") || type.includes("recordatorio")) return "alarm-outline";
  if (type.includes("message") || type.includes("mensaje") || type.includes("chat")) return "chatbubble-outline";
  if (type.includes("result") || type.includes("lab") || type.includes("analit")) return "flask-outline";
  if (type.includes("prescription") || type.includes("receta") || type.includes("medic")) return "medkit-outline";
  if (type.includes("waitlist")) return "time-outline";
  if (type.includes("confirm")) return "checkmark-circle-outline";
  if (type.includes("video") || type.includes("call")) return "videocam-outline";
  if (type.includes("tip") || type.includes("consejo") || type.includes("health")) return "bulb-outline";
  return "notifications-outline";
}

// Start of the local calendar day for `d`.
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Which section a notification belongs to, based on its calendar day.
function bucketFor(iso) {
  if (!iso) return "anteriores";
  const created = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  const oneDay = 24 * 60 * 60 * 1000;
  if (created === today) return "hoy";
  if (created === today - oneDay) return "ayer";
  return "anteriores";
}

// Right-aligned timestamp: time-of-day for recent items, a short date for older.
function formatStamp(iso, bucket, language) {
  if (!iso) return "";
  const d = new Date(iso);
  const locale = language === "es" ? "es-ES" : "en-US";
  if (bucket === "anteriores") {
    return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  }
  if (bucket === "hoy") {
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 60) return timeAgo(iso, language);
  }
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

// Group the (already deduped) list into HOY / AYER / ANTERIORES sections.
function buildSections(list, language) {
  const groups = { hoy: [], ayer: [], anteriores: [] };
  (list ?? []).forEach((n) => {
    groups[bucketFor(n.createdAt)].push(n);
  });
  const labels =
    language === "es"
      ? { hoy: "HOY", ayer: "AYER", anteriores: "ANTERIORES" }
      : { hoy: "TODAY", ayer: "YESTERDAY", anteriores: "EARLIER" };
  const out = [];
  ["hoy", "ayer", "anteriores"].forEach((key) => {
    if (groups[key].length > 0) {
      out.push({ key, title: labels[key], data: groups[key] });
    }
  });
  return out;
}

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const language = useSelector((state) => state.language.language);
  const dispatch = useDispatch();
  const { setSearchConfig } = useBottomBarSearch();
  const { list, approvedNotificationIds, loading, error } = useSelector((state) => state.notifications);
  const [refreshing, setRefreshing] = React.useState(false);
  const [banner, setBanner] = React.useState({ visible: false, type: "", message: "" });
  const tabFade = useRef(new Animated.Value(1)).current;
  const contentPadding = {
    paddingTop: Math.max(insets.top, 48),
    paddingLeft: Math.max(insets.left, 16),
    paddingRight: Math.max(insets.right, 16),
  };

  const t = STRINGS[language]?.notifications ?? STRINGS.es?.notifications ?? {};

  const approvedNotificationSet = React.useMemo(
    () => new Set(approvedNotificationIds ?? []),
    [approvedNotificationIds]
  );
  const displayedList = React.useMemo(() => {
    const filtered = (list ?? []).filter((n) => {
      if (approvedNotificationSet.has(n._id) || n._approved) return false;
      return true;
    });
    return dedupeByAppointment(filtered);
  }, [list, approvedNotificationSet]);

  const sections = React.useMemo(
    () => buildSections(displayedList, language),
    [displayedList, language]
  );

  React.useEffect(() => {
    if (error?.approve) {
      // eslint-disable-next-line no-console
      console.warn("[Notifications] Approve error:", error.approve);
      dispatch(clearNotificationsError());
    }
  }, [error?.approve, dispatch]);

  useFocusEffect(
    useCallback(() => {
      setSearchConfig({ visible: false, placeholder: "", value: "", onChange: () => {} });
    }, [setSearchConfig])
  );

  // S8: fetch the list, then mark everything read so the tab badge clears once
  // the patient has opened this screen. Chained so the list is in place before
  // read-all flips readAt (which the unread-count selector keys off).
  const load = useCallback(async () => {
    await dispatch(fetchNotifications());
    dispatch(markAllNotificationsRead());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      tabFade.setValue(0);
      Animated.timing(tabFade, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
      load();
    }, [tabFade, load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchNotifications());
    setRefreshing(false);
  }, [dispatch]);

  const handleApprove = useCallback(
    async (notification) => {
      const appointmentId = notification?.data?.appointmentId;
      if (!appointmentId) return;
      if (!notification.readAt) {
        dispatch(markNotificationRead(notification._id));
      }
      const result = await dispatch(
        approveAppointmentChange({ appointmentId, notificationId: notification._id })
      );
      if (approveAppointmentChange.fulfilled.match(result)) {
        dispatch(getPatientUpcomingAppointments());
        setBanner({
          visible: true,
          type: "success",
          message: t.appointmentConfirmed,
        });
      }
      dispatch(fetchNotifications());
    },
    [dispatch, t.appointmentConfirmed]
  );

  const handleReject = useCallback(
    async (notification) => {
      const appointmentId = notification?.data?.appointmentId;
      if (!appointmentId) return;
      if (!notification.readAt) {
        dispatch(markNotificationRead(notification._id));
      }
      const result = await dispatch(
        rejectAppointmentChange({ appointmentId, notificationId: notification._id })
      );
      if (rejectAppointmentChange.fulfilled.match(result)) {
        dispatch(getPatientUpcomingAppointments());
        setBanner({
          visible: true,
          type: "success",
          message: t.changeRejected,
        });
      }
      dispatch(fetchNotifications());
    },
    [dispatch, t.changeRejected]
  );

  const handleCardPress = useCallback(
    (notification) => {
      if (!notification.readAt) {
        dispatch(markNotificationRead(notification._id));
      }
    },
    [dispatch]
  );

  const handleChatWithDoctor = useCallback(
    (doctorId, doctorName) => {
      const parentNav = navigation?.getParent?.();
      if (!parentNav || !doctorId) return;
      parentNav.navigate("Messages", {
        screen: "Conversation",
        params: { doctorId, title: doctorName || (language === "es" ? "Médico" : "Doctor") },
      });
    },
    [navigation, language]
  );

  const handleDismiss = useCallback(
    (notification) => {
      dispatch(deleteNotification(notification._id));
    },
    [dispatch]
  );

  const renderItem = useCallback(
    ({ item, section }) => {
      const isChangeRequestItem = isChangeRequest(item);
      const isCancelledByDoctorItem = isCancelledByDoctor(item);
      const isUnread = !item.readAt;
      const isApproved = item._approved || item.data?.approved;
      const appointmentId = item.data?.appointmentId;
      const doctorId = item.data?.doctorId ?? null;
      const isApproving = loading.approve === appointmentId;
      const isRejecting = loading.reject === appointmentId;
      const isDeleting = loading.delete === item._id;
      const doctorName = item.data?.doctorName ?? "";
      const newStart = item.data?.newStart;
      const newEnd = item.data?.newEnd;

      const iconName = getIcon(item);
      const stamp = formatStamp(item.createdAt, section?.key, language);

      return (
        <TouchableOpacity
          style={[styles.card, isUnread && styles.cardUnread, isApproved && styles.cardApproved]}
          onPress={() => handleCardPress(item)}
          activeOpacity={0.8}
        >
          <View style={styles.cardRow}>
            <Ionicons
              name={iconName}
              size={22}
              color={COLORS.blackText}
              style={styles.cardIcon}
            />
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {getCardTitle(item, t)}
                </Text>
                {stamp ? <Text style={styles.cardStamp}>{stamp}</Text> : null}
              </View>

              <Text style={styles.cardBody}>{getCardBody(item, language, t)}</Text>

              {isChangeRequestItem ? (
            <Text style={styles.cardHint}>{t.communicateWithDoctor}</Text>
          ) : null}
          {isCancelledByDoctorItem ? (
            <Text style={styles.cardHint}>{t.contactDoctorForRescheduling}</Text>
          ) : null}

          {(isChangeRequestItem || isCancelledByDoctorItem) && doctorName ? (
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={16} color={COLORS.greyText} style={styles.detailIcon} />
              <Text style={styles.detailText}>{doctorName}</Text>
            </View>
          ) : null}

          {isChangeRequestItem && newStart ? (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.greyText} style={styles.detailIcon} />
              <Text style={styles.detailText}>
                {formatDateTime(newStart, language)}
                {newEnd ? ` – ${new Date(newEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
              </Text>
            </View>
          ) : null}

          {isChangeRequestItem && !isApproved && (
            <>
              <GlassButton
                variant="primary"
                style={styles.approveButton}
                onPress={() => handleApprove(item)}
                disabled={isApproving}
                activeOpacity={0.85}
              >
                {isApproving ? (
                  <ActivityIndicator size="small" color={COLORS.whiteText} />
                ) : (
                  <Text style={styles.approveButtonText}>{t.approveChange}</Text>
                )}
              </GlassButton>
              <GlassButton
                variant="secondary"
                style={styles.chatButton}
                onPress={() => handleReject(item)}
                disabled={isRejecting || isApproving}
                activeOpacity={0.85}
              >
                {isRejecting ? (
                  <ActivityIndicator size="small" color={COLORS.error} />
                ) : (
                  <Text style={[styles.chatButtonText, { color: COLORS.error }]}>
                    {t.rejectChange}
                  </Text>
                )}
              </GlassButton>
              {doctorId ? (
                <GlassButton
                  variant="secondary"
                  style={styles.chatButton}
                  onPress={() => handleChatWithDoctor(doctorId, doctorName)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chatbubble-outline" size={20} color={COLORS.secondary} />
                  <Text style={styles.chatButtonText}>{t.chatWithDoctor}</Text>
                </GlassButton>
              ) : null}
            </>
          )}

          {isChangeRequestItem && isApproved && (
            <View style={styles.approvedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.green} />
              <Text style={styles.approvedText}>{t.approved}</Text>
            </View>
          )}

          {isCancelledByDoctorItem && (
            <>
              <GlassButton
                variant="secondary"
                style={styles.chatButton}
                onPress={() => handleDismiss(item)}
                disabled={isDeleting}
                activeOpacity={0.85}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={COLORS.secondary} />
                ) : (
                  <Text style={styles.chatButtonText}>{t.dismiss}</Text>
                )}
              </GlassButton>
              {doctorId ? (
                <GlassButton
                  variant="secondary"
                  style={styles.chatButton}
                  onPress={() => handleChatWithDoctor(doctorId, doctorName)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chatbubble-outline" size={20} color={COLORS.secondary} />
                  <Text style={styles.chatButtonText}>{t.chatWithDoctor}</Text>
                </GlassButton>
              ) : null}
            </>
          )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handleApprove, handleReject, handleCardPress, handleChatWithDoctor, handleDismiss, loading.approve, loading.reject, loading.delete, language, t]
  );

  const renderEmpty = () => {
    if (loading.fetch) return null;
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="notifications-off-outline" size={56} color={COLORS.ligthGreyText} />
        <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
        <Text style={styles.emptyHint}>{t.emptyHint}</Text>
      </View>
    );
  };

  return (
    <LinearGradient colors={GRADIENT_COLORS} style={{ flex: 1 }} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}>
      <TopBanner
        visible={banner.visible}
        type={banner.type}
        message={banner.message}
        onHide={() => setBanner((b) => ({ ...b, visible: false }))}
      />
      <Animated.View style={[styles.container, contentPadding, { opacity: tabFade }]}>
        <Text style={styles.title}>{t.title}</Text>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.secondary]}
              tintColor={COLORS.secondary}
            />
          }
          ListHeaderComponent={
            loading.fetch && !refreshing ? (
              <View style={styles.loader}>
                <ActivityIndicator size="small" color={COLORS.secondary} />
              </View>
            ) : null
          }
        />
      </Animated.View>
    </LinearGradient>
  );
}

NotificationsScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    getParent: PropTypes.func,
  }),
};
