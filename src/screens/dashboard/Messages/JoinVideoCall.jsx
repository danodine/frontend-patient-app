import React, { useState } from "react";
import GlassButton from "../../../components/GlassButton";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { LinearGradient } from "expo-linear-gradient";
import STRINGS from "../../../constants/strings";
import { COLORS, FONT_FAMILY, FONT_SIZES, GRADIENT_COLORS, ICONS, SIZES, getGlassStyle } from "../../../styles/theme";
import axiosInstance from "../../../utils/axiosInstance";
import { useBottomBarSearch } from "../../../contexts/BottomBarSearchContext";
import { getPatientUpcomingAppointments } from "../../../redux/appointmentsSlice";
import { getUserFacingErrorMessage } from "../../../utils/errorMessages";
import TopBanner from "../components/TopBanner/Index";

const CANCELLED_STATUSES = [
  "completed",
  "cancelled_by_patient",
  "cancelled_by_doctor",
  "cancelled_by_secretary",
  "cancelled_by_clinic",
  "no_show",
];

function formatApptTime(iso, language) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(language === "es" ? "es-ES" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.greyBorder,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZES.headerTitle,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.semiBold,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  label: {
    fontSize: FONT_SIZES.inputTitle,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.semiBold,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.inputBackgeound,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: FONT_SIZES.inputText,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.regular,
    borderWidth: 1,
    borderColor: COLORS.greyBorder,
  },
  button: {
    ...getGlassStyle("primary"),
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: FONT_SIZES.bigButtonText,
    color: COLORS.selectedItem,
    fontFamily: FONT_FAMILY.semiBold,
  },
  hint: {
    marginTop: 12,
    fontSize: FONT_SIZES.inputText,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.greyBorder,
    marginVertical: 28,
  },
  upcomingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.greyBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  upcomingName: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.semiBold,
  },
  upcomingMeta: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  joinSmallButton: {
    ...getGlassStyle("primary"),
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 10,
  },
  joinSmallButtonDisabled: {
    backgroundColor: COLORS.ligthGreyText,
  },
  joinSmallButtonText: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.selectedItem,
    fontFamily: FONT_FAMILY.semiBold,
  },
});

export default function JoinVideoCallScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const language = useSelector((state) => state.language.language);
  const upcomingPatientList = useSelector(
    (state) => state.appointments.upcomingPatientList,
  );
  const { setSearchConfig } = useBottomBarSearch();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joiningApptId, setJoiningApptId] = useState(null);
  const [banner, setBanner] = useState({ visible: false, type: "", message: "" });

  const t = STRINGS[language]?.messages ?? STRINGS.es.messages ?? {};
  const showError = (message) => setBanner({ visible: true, type: "error", message });

  useFocusEffect(
    React.useCallback(() => {
      setSearchConfig({ visible: false });
      dispatch(getPatientUpcomingAppointments());
      return () => {};
    }, [setSearchConfig, dispatch])
  );

  const upcomingVideoCalls = (upcomingPatientList || [])
    .filter((a) => a.isOnline && !CANCELLED_STATUSES.includes(a.status))
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  const handleJoinAppointment = async (appointment) => {
    const appointmentId = appointment?._id;
    if (!appointmentId || joiningApptId) return;

    // Already ended → the call is over, nothing to join.
    const endTime = appointment?.end
      ? new Date(appointment.end)
      : appointment?.start
        ? new Date(
            new Date(appointment.start).getTime() +
              (appointment?.appointmentType?.defaultDurationMinutes || 30) * 60000,
          )
        : null;
    if (endTime && new Date() > endTime) {
      showError(t.videoCallEnded);
      return;
    }

    if (appointment?.start) {
      const joinOpensAt = new Date(new Date(appointment.start).getTime() - 5 * 60 * 1000);
      if (new Date() < joinOpensAt) {
        showError(t.videoCallTooEarly);
        return;
      }
    }

    setJoiningApptId(appointmentId);
    try {
      const response = await axiosInstance.get(
        `/api/appointments/${appointmentId}/video-token`,
      );
      const body = response.data ?? {};
      const data = body.data ?? body;
      if (data?.token && data?.roomUrl) {
        navigation.navigate("VideoCall", { roomUrl: data.roomUrl, token: data.token });
      } else {
        showError(t.videoCallRoomNotFound);
      }
    } catch (err) {
      const status = err.response?.status;
      const message =
        status === 404
          ? t.videoCallRoomNotFound
          : status === 410
            ? t.videoCallRoomExpired
            : getUserFacingErrorMessage(err, language, t.videoCallError);
      showError(message);
    } finally {
      setJoiningApptId(null);
    }
  };

  const handleJoin = async () => {
    const roomId = (code || "").trim();
    if (!roomId) {
      showError(t.videoCallCodeRequired);
      return;
    }

    setJoining(true);
    try {
      const response = await axiosInstance.get(`/api/video-rooms/${encodeURIComponent(roomId)}/token`);
      const body = response.data ?? {};
      const data = body.data ?? body;
      if (data?.token && data?.roomUrl) {
        navigation.navigate("VideoCall", { roomUrl: data.roomUrl, token: data.token });
      } else {
        showError(t.videoCallRoomNotFound);
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        showError(t.videoCallRoomNotFound);
      } else if (status === 410) {
        showError(t.videoCallRoomExpired);
      } else {
        showError(getUserFacingErrorMessage(err, language, t.videoCallRoomNotFound));
      }
    } finally {
      setJoining(false);
    }
  };

  const headerPadding = { paddingTop: Math.max(insets.top, 14) + 14 };

  return (
    <LinearGradient colors={GRADIENT_COLORS} style={{ flex: 1 }} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}>
      <TopBanner
        visible={banner.visible}
        type={banner.type}
        message={banner.message}
        onHide={() => setBanner((b) => ({ ...b, visible: false }))}
      />
      <View style={[styles.container]}>
        <View style={[styles.header, headerPadding]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name={ICONS.backArrow} size={SIZES.icon20} color={COLORS.blackText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t.joinVideoCallTitle}
          </Text>
        </View>

        <View style={[styles.content, { paddingTop: 32 + Math.max(insets.top, 0) * 0 }]}>
          {upcomingVideoCalls.length > 0 && (
            <>
              <Text style={styles.label}>
                {language === "es"
                  ? "Próximas video llamadas"
                  : "Upcoming video calls"}
              </Text>
              {upcomingVideoCalls.map((appt) => {
                const joinOpensAt = appt.start
                  ? new Date(new Date(appt.start).getTime() - 5 * 60 * 1000)
                  : null;
                const tooEarly = joinOpensAt ? new Date() < joinOpensAt : false;
                const endTime = appt.end
                  ? new Date(appt.end)
                  : appt.start
                    ? new Date(
                        new Date(appt.start).getTime() +
                          (appt.appointmentType?.defaultDurationMinutes || 30) * 60000,
                      )
                    : null;
                const isPastCall = endTime ? new Date() > endTime : false;
                const isJoiningThis = joiningApptId === appt._id;
                return (
                  <View key={appt._id} style={styles.upcomingCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.upcomingName} numberOfLines={1}>
                        {appt.doctor?.fullName ?? appt.appointmentType?.name ?? "—"}
                      </Text>
                      <Text style={styles.upcomingMeta} numberOfLines={1}>
                        {formatApptTime(appt.start, language)}
                      </Text>
                    </View>
                    <GlassButton
                      variant="primary"
                      style={[
                        styles.joinSmallButton,
                        (tooEarly || isPastCall || (joiningApptId && !isJoiningThis)) &&
                          styles.joinSmallButtonDisabled,
                      ]}
                      onPress={() => handleJoinAppointment(appt)}
                      disabled={tooEarly || isPastCall || !!joiningApptId}
                    >
                      {isJoiningThis ? (
                        <ActivityIndicator size="small" color={COLORS.whiteText} />
                      ) : (
                        <Text style={styles.joinSmallButtonText}>
                          {isPastCall
                            ? t.videoCallEnded
                            : tooEarly
                              ? t.videoCallTooEarly
                              : t.join}
                        </Text>
                      )}
                    </GlassButton>
                  </View>
                );
              })}
              <View style={styles.divider} />
            </>
          )}

          <Text style={styles.label}>{t.videoCallCodePlaceholder}</Text>
          <TextInput
            style={styles.input}
            placeholder={t.videoCallCodePlaceholder}
            placeholderTextColor={COLORS.ligthGreyText}
            value={code}
            onChangeText={setCode}
            editable={!joining}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <GlassButton
            variant="primary"
            style={[styles.button, joining && styles.buttonDisabled]}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator size="small" color={COLORS.whiteText} />
            ) : (
              <Text style={styles.buttonText}>{t.join}</Text>
            )}
          </GlassButton>
          <Text style={styles.hint}>
            {language === "es"
              ? "Pega el código que te envió tu médico para unirte a la videollamada."
              : "Paste the code your doctor sent you to join the video call."}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
