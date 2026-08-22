import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { LinearGradient } from "expo-linear-gradient";
import Daily, { DailyMediaView } from "@daily-co/react-native-daily-js";
import STRINGS from "../../../constants/strings";
import { COLORS, FONT_FAMILY, FONT_SIZES, GRADIENT_COLORS, ICONS } from "../../../styles/theme";
import { useBottomBarSearch } from "../../../contexts/BottomBarSearchContext";

const FRAME_RADIUS = 20;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  frame: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 16,
    borderRadius: FRAME_RADIUS,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(112, 193, 227, 0.5)",
    backgroundColor: COLORS.blackText,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(112, 193, 227, 0.3)",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    color: COLORS.whiteText,
    fontFamily: FONT_FAMILY.semiBold,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  connectingText: {
    fontSize: FONT_SIZES.subtitle2,
    color: COLORS.whiteText,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 16,
  },
  errorText: {
    fontSize: FONT_SIZES.subtitle2,
    color: COLORS.error,
    fontFamily: FONT_FAMILY.regular,
    textAlign: "center",
  },
  participantGrid: {
    flex: 1,
    padding: 12,
  },
  participantTile: {
    minHeight: 200,
    margin: 6,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.blackText,
  },
  participantLabel: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    fontSize: FONT_SIZES.xsText,
    color: COLORS.whiteText,
    fontFamily: FONT_FAMILY.regular,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(112, 193, 227, 0.25)",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  controlButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 52,
  },
  controlButtonOff: {
    opacity: 0.6,
  },
  controlLabel: {
    fontSize: 10,
    color: COLORS.whiteText,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 4,
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.error,
    marginHorizontal: 24,
    marginVertical: 12,
    paddingVertical: 14,
    borderRadius: 12,
  },
  leaveButtonText: {
    fontSize: FONT_SIZES.bigButtonText,
    color: COLORS.whiteText,
    fontFamily: FONT_FAMILY.semiBold,
  },
  peopleModal: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  peopleSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: "50%",
  },
  peopleTitle: {
    fontSize: FONT_SIZES.subtitle2,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.semiBold,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  peopleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.greyBorder,
  },
});

function updateParticipantsFromCall(call) {
  if (!call) return {};
  try {
    return call.participants() ?? {};
  } catch {
    return {};
  }
}

export default function VideoCallScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const language = useSelector((state) => state.language.language);
  const { setSearchConfig } = useBottomBarSearch();
  const { roomUrl, token } = route.params ?? {};
  const callRef = useRef(null);
  const [participants, setParticipants] = useState({});
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // 'speaker' | 'grid'
  const [localVideo, setLocalVideo] = useState(true);
  const [localAudio, setLocalAudio] = useState(true);
  const [showPeople, setShowPeople] = useState(false);

  const t = STRINGS[language]?.messages ?? STRINGS.es.messages ?? {};

  useFocusEffect(
    React.useCallback(() => {
      setSearchConfig({ visible: false });
      return () => {};
    }, [setSearchConfig])
  );

  useEffect(() => {
    if (!roomUrl || !token) {
      setError(t.videoCallRoomNotFound ?? "Missing room or token");
      return;
    }

    let call;
    try {
      call = Daily.createCallObject();
      callRef.current = call;
    } catch (e) {
      setError(t.videoCallError ?? e?.message ?? "Failed to create call");
      return;
    }

    const onJoined = () => {
      setJoined(true);
      setError(null);
      setParticipants(updateParticipantsFromCall(call));
    };

    const onLeft = () => {
      try {
        if (call && typeof call.destroy === "function") call.destroy();
      } catch (_) {}
      callRef.current = null;
      setLeaving(false);
      navigation.goBack();
    };

    const onErr = (e) => {
      const msg = e?.errorMsg ?? e?.message ?? t.videoCallError;
      setError(msg);
    };

    const updateParticipants = () => {
      const next = updateParticipantsFromCall(call);
      setParticipants(next);
      const local = Object.values(next).find((p) => p.local);
      if (local) {
        setLocalVideo(local.video ?? true);
        setLocalAudio(local.audio ?? true);
      }
    };

    call.on("joined-meeting", onJoined);
    call.on("left-meeting", onLeft);
    call.on("error", onErr);
    call.on("participant-joined", updateParticipants);
    call.on("participant-updated", updateParticipants);
    call.on("participant-left", updateParticipants);

    call.join({ url: roomUrl, token }).catch((err) => {
      setError(err?.message ?? t.videoCallError);
    });

    return () => {
      try {
        call.off("joined-meeting", onJoined);
        call.off("left-meeting", onLeft);
        call.off("error", onErr);
        call.off("participant-joined", updateParticipants);
        call.off("participant-updated", updateParticipants);
        call.off("participant-left", updateParticipants);
        if (call && typeof call.leave === "function") call.leave().catch(() => {});
        if (call && typeof call.destroy === "function") call.destroy();
      } catch (_) {}
      callRef.current = null;
    };
  }, [roomUrl, token]);

  const handleLeave = async () => {
    const call = callRef.current;
    if (!call || leaving) return;
    setLeaving(true);
    try {
      await call.leave();
    } catch (_) {
      setLeaving(false);
      if (callRef.current) navigation.goBack();
    }
  };

  const handleBackWithWarning = () => {
    if (joined) {
      Alert.alert(t.videoCallLeaveTitle, t.videoCallLeaveMessage, [
        { text: t.videoCallCancel, style: "cancel" },
        { text: t.videoCallLeaveConfirm, style: "destructive", onPress: handleLeave },
      ]);
    } else {
      navigation.goBack();
    }
  };

  const toggleCamera = () => {
    const call = callRef.current;
    if (!call) return;
    const next = !localVideo;
    try {
      call.setLocalVideo(next);
      setLocalVideo(next);
    } catch (_) {}
  };

  const toggleMic = () => {
    const call = callRef.current;
    if (!call) return;
    const next = !localAudio;
    try {
      call.setLocalAudio(next);
      setLocalAudio(next);
    } catch (_) {}
  };

  const participantList = Object.values(participants).filter(Boolean);
  const remoteList = participantList.filter((p) => !p.local);

  const headerWithBack = (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={handleBackWithWarning}>
        <Ionicons name={ICONS.backArrow} size={24} color={COLORS.whiteText} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {language === "es" ? "Video llamada" : "Video call"}
      </Text>
    </View>
  );

  const topPadding = Math.max(insets.top, 12);

  if (error && !joined) {
    return (
      <LinearGradient colors={GRADIENT_COLORS} style={[styles.container, { paddingTop: topPadding }]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}>
        <View style={styles.frame}>
          {headerWithBack}
          <View style={styles.center}>
            <Ionicons name="videocam-off" size={48} color={COLORS.error} />
            <Text style={[styles.errorText, { marginTop: 16 }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.leaveButton, { marginTop: 24 }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.leaveButtonText}>{language === "es" ? "Volver" : "Back"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (!joined) {
    return (
      <LinearGradient colors={GRADIENT_COLORS} style={[styles.container, { paddingTop: topPadding }]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}>
        <View style={styles.frame}>
          {headerWithBack}
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.secondary} />
            <Text style={styles.connectingText}>{t.videoCallConnecting}</Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  const renderParticipantTile = (p, tileStyle) => (
    <View key={p.session_id ?? p.user_id ?? String(Math.random())} style={[styles.participantTile, tileStyle]}>
      <DailyMediaView
        videoTrack={p.videoTrack ?? null}
        audioTrack={p.audioTrack ?? null}
        mirror={p.local === true}
        zOrder={p.local ? 1 : 0}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.participantLabel} numberOfLines={1}>
        {p.local ? (language === "es" ? "Tú" : "You") : (p.user_name ?? p.user_id ?? "")}
      </Text>
    </View>
  );

  const isSpeaker = viewMode === "speaker" && participantList.length > 0;
  const mainParticipant = isSpeaker && remoteList.length > 0 ? remoteList[0] : participantList.find((p) => p.local) ?? participantList[0];
  const othersList = isSpeaker && mainParticipant ? participantList.filter((p) => p !== mainParticipant) : [];

  return (
    <LinearGradient colors={GRADIENT_COLORS} style={[styles.container, { paddingTop: topPadding }]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}>
      <View style={styles.frame}>
        {headerWithBack}
        {isSpeaker ? (
          <View style={{ flex: 1 }}>
            {mainParticipant && renderParticipantTile(mainParticipant, { minHeight: 280, margin: 8 })}
            {othersList.length > 0 && (
              <ScrollView
                horizontal
                style={{ maxHeight: 120 }}
                contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8 }}
                showsHorizontalScrollIndicator={false}
              >
                {othersList.map((p) => renderParticipantTile(p, { minHeight: 100, width: 100, margin: 4 }))}
              </ScrollView>
            )}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.participantGrid, { paddingBottom: 12 }]}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {participantList.map((p) => renderParticipantTile(p))}
          </ScrollView>
        )}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.controlButton} onPress={() => setViewMode(viewMode === "speaker" ? "grid" : "speaker")}>
            <Ionicons name={viewMode === "speaker" ? "grid" : "person"} size={24} color={COLORS.secondary} />
            <Text style={styles.controlLabel}>{viewMode === "speaker" ? t.videoCallGridView : t.videoCallSpeakerView}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, !localVideo && styles.controlButtonOff]} onPress={toggleCamera}>
            <Ionicons name={localVideo ? "videocam" : "videocam-off"} size={24} color={COLORS.whiteText} />
            <Text style={styles.controlLabel}>{localVideo ? t.videoCallCameraOff : t.videoCallCameraOn}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, !localAudio && styles.controlButtonOff]} onPress={toggleMic}>
            <Ionicons name={localAudio ? "mic" : "mic-off"} size={24} color={COLORS.whiteText} />
            <Text style={styles.controlLabel}>{localAudio ? t.videoCallMute : t.videoCallMicOn}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={() => setShowPeople(true)}>
            <Ionicons name="people" size={24} color={COLORS.whiteText} />
            <Text style={styles.controlLabel}>{t.videoCallPeople}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={() => Alert.alert(null, t.videoCallChatComingSoon)}>
            <Ionicons name="chatbubble-outline" size={24} color={COLORS.whiteText} />
            <Text style={styles.controlLabel}>{t.videoCallChat}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.leaveButton, { marginBottom: Math.max(insets.bottom, 12) + 8 }]}
          onPress={handleBackWithWarning}
          disabled={leaving}
        >
          {leaving ? (
            <ActivityIndicator size="small" color={COLORS.whiteText} />
          ) : (
            <>
              <View style={{ marginRight: 8 }}>
                <Ionicons name="call" size={22} color={COLORS.whiteText} />
              </View>
              <Text style={styles.leaveButtonText}>{t.videoCallLeave}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      <Modal visible={showPeople} transparent animationType="slide">
        <TouchableOpacity style={styles.peopleModal} activeOpacity={1} onPress={() => setShowPeople(false)}>
          <TouchableOpacity style={styles.peopleSheet} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.peopleTitle}>{t.videoCallPeople}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {participantList.map((p) => (
                <View key={p.session_id ?? p.user_id ?? ""} style={styles.peopleRow}>
                  <Ionicons name={p.local ? "person" : "person-outline"} size={20} color={COLORS.secondary} style={{ marginRight: 10 }} />
                  <Text style={{ fontSize: FONT_SIZES.inputText, color: COLORS.blackText, fontFamily: FONT_FAMILY.regular }}>
                    {p.local ? (language === "es" ? "Tú" : "You") : (p.user_name ?? p.user_id ?? "")}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={{ marginHorizontal: 20, marginTop: 16, paddingVertical: 14, alignItems: "center", borderRadius: 12, backgroundColor: COLORS.greyBorder }}
              onPress={() => setShowPeople(false)}
            >
              <Text style={[styles.leaveButtonText, { color: COLORS.blackText }]}>{t.videoCallCancel}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
}
