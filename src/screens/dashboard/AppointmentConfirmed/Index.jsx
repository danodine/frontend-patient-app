import React, { useCallback, useEffect, useState } from "react";
import GlassButton from "../../../components/GlassButton";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Switch,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { useFocusEffect } from "@react-navigation/native";
import { BASE_URL } from "../../../../config";
import { getMainSpecialtyDisplay } from "../../../utils/helpers";
import { COLORS, FONT_FAMILY, getGlassStyle } from "../../../styles/theme";

const MONTHS = {
  es: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const WEEKDAYS = {
  es: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

function photoUriOf(doctor) {
  const url = doctor?.profileImageUrl ?? doctor?.profileImage ?? null;
  if (!url || typeof url !== "string" || !url.trim()) return null;
  const t = url.trim();
  return t.startsWith("http") ? t : `${BASE_URL.replace(/\/$/, "")}${t.startsWith("/") ? "" : "/"}${t}`;
}

/**
 * Presentational confirmation UI. Rendered inside a Modal by the booking screen
 * (so it never lingers in a tab's navigation stack) — `onOk` closes it.
 */
export const AppointmentConfirmedView = ({ doctor, start, clinic, modality, onOk }) => {
  const insets = useSafeAreaInsets();
  const language = useSelector((s) => s.language.language);
  const es = language === "es";
  const [reminderOn, setReminderOn] = useState(true);

  const displayName = doctor?.fullName ?? doctor?.name ?? "";
  const specialty = getMainSpecialtyDisplay(doctor, language) || "";
  const photo = photoUriOf(doctor);
  const initials = (displayName || "?").split(" ").map((n) => n[0]).join("").slice(0, 2);

  let dateStr = "-";
  let weekdayStr = "";
  let timeStr = "-";
  if (start) {
    const d = new Date(start);
    if (!isNaN(d.getTime())) {
      const months = MONTHS[es ? "es" : "en"];
      dateStr = es
        ? `${d.getDate()} de ${months[d.getMonth()]}, ${d.getFullYear()}`
        : `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      weekdayStr = WEEKDAYS[es ? "es" : "en"][d.getDay()];
      let h = d.getHours();
      const m = d.getMinutes();
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      timeStr = `${h}:${String(m).padStart(2, "0")} ${ampm}`;
    }
  }

  const locationName = modality === "video_call"
    ? (es ? "Videollamada" : "Video call")
    : clinic?.name ?? (es ? "Consultorio" : "Office");
  const locationSub = modality === "video_call"
    ? ""
    : clinic?.address ?? clinic?.locationReference ?? [clinic?.city, clinic?.country].filter(Boolean).join(", ");
  const consultType = modality === "video_call"
    ? (es ? "Consulta Online" : "Online consultation")
    : (es ? "Visita en Clínica" : "In-clinic visit");

  const Row = ({ icon, label, value, sub }) => (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={COLORS.secondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Header (no back button) */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>{es ? "Cita Confirmada" : "Appointment Confirmed"}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={40} color={COLORS.white} />
          </View>
          <Text style={styles.heroTitle}>{es ? "¡Cita Reservada!" : "Appointment Booked!"}</Text>
          <Text style={styles.heroSub}>
            {es ? "Tu cita ha sido confirmada correctamente." : "Your appointment has been successfully confirmed."}
          </Text>
        </View>

        <Text style={styles.summaryLabel}>{es ? "Resumen de la Cita" : "Appointment Summary"}</Text>

        <View style={styles.card}>
          <View style={styles.accent} />
          <View style={styles.cardInner}>
            <View style={styles.doctorRow}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.doctorName}>{displayName}</Text>
                {specialty ? <Text style={styles.doctorSpecialty}>{specialty}</Text> : null}
              </View>
            </View>

            <Row icon="calendar" label={es ? "Fecha" : "Date"} value={dateStr} sub={weekdayStr} />
            <Row icon="time" label={es ? "Hora" : "Time"} value={timeStr} />
            <Row icon="location" label={es ? "Ubicación" : "Location"} value={locationName} sub={locationSub} />
            <Row icon="medkit" label={es ? "Tipo de Consulta" : "Consultation type"} value={consultType} />
          </View>
        </View>

        <View style={styles.reminderCard}>
          <View style={styles.reminderIcon}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTitle}>{es ? "Recordatorio de Cita" : "Appointment reminder"}</Text>
            <Text style={styles.reminderSub}>{es ? "Recibe un aviso antes de tu cita" : "Get a reminder before your appointment"}</Text>
          </View>
          <Switch
            value={reminderOn}
            onValueChange={setReminderOn}
            trackColor={{ false: "#D5DBE3", true: COLORS.secondary }}
            thumbColor={COLORS.white}
          />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <GlassButton
          variant="primary" style={styles.okButton} onPress={onOk} activeOpacity={0.85}>
          <Text style={styles.okButtonText}>{es ? "Ok" : "Ok"}</Text>
        </GlassButton>
      </View>
    </View>
  );
};

AppointmentConfirmedView.propTypes = {
  doctor: PropTypes.object,
  start: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
  clinic: PropTypes.object,
  modality: PropTypes.string,
  onOk: PropTypes.func.isRequired,
};

/**
 * Legacy stack-screen wrapper (kept for backward compatibility with the
 * registered route). The booking flow now shows AppointmentConfirmedView in a
 * Modal instead, so it can't linger in a tab's stack.
 */
const AppointmentConfirmedScreen = ({ route, navigation }) => {
  const { doctor, start, clinic, modality, appointmentType } = route.params ?? {};

  const goToAppointments = useCallback(() => {
    navigation.popToTop?.();
    navigation.getParent()?.navigate("Appointments", { screen: "AppointmentsMain" });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        goToAppointments();
        return true;
      });
      return () => sub.remove();
    }, [goToAppointments]),
  );

  return (
    <AppointmentConfirmedView
      doctor={doctor}
      start={start}
      clinic={clinic}
      modality={modality}
      appointmentType={appointmentType}
      onOk={goToAppointments}
    />
  );
};

AppointmentConfirmedScreen.propTypes = {
  route: PropTypes.shape({ params: PropTypes.object }),
  navigation: PropTypes.shape({
    getParent: PropTypes.func,
    popToTop: PropTypes.func,
  }).isRequired,
};

import { StyleSheet } from "react-native";
const CARD_BG = "#FFFFFF";
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F6FB" },
  header: {
    paddingBottom: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.blackText,
  },
  heroWrap: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 24,
  },
  checkCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.blackText,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 14,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.semiBold,
    marginBottom: 10,
  },
  card: {
    flexDirection: "row",
    backgroundColor: CARD_BG,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
  },
  accent: {
    width: 5,
    backgroundColor: "#34B233",
  },
  cardInner: {
    flex: 1,
    padding: 16,
  },
  doctorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 14,
    backgroundColor: "#E4E9F0",
  },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: COLORS.secondary },
  avatarInitials: { fontSize: 18, color: COLORS.whiteText, fontFamily: FONT_FAMILY.bold },
  doctorName: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.blackText,
  },
  doctorSpecialty: {
    fontSize: 13,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 14,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EAF3FB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowLabel: {
    fontSize: 13,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
  },
  rowValue: {
    fontSize: 15,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.semiBold,
    marginTop: 1,
  },
  rowSub: {
    fontSize: 13,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 1,
  },
  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
  },
  reminderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EAF3FB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  reminderTitle: {
    fontSize: 15,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.semiBold,
  },
  reminderSub: {
    fontSize: 13,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#F3F6FB",
  },
  okButton: {
    ...getGlassStyle("primary"),
    height: 54,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  okButtonText: {
    fontSize: 16,
    color: COLORS.selectedItem,
    fontFamily: FONT_FAMILY.bold,
  },
});

export default AppointmentConfirmedScreen;
