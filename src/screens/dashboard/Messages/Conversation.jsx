import React, { useEffect, useCallback, useState, useRef } from "react";
import GlassButton from "../../../components/GlassButton";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import {
  getOrCreateConversation,
  fetchMessages,
  sendMessage,
  clearMessagesError,
  clearSendError,
  markConversationReadAPI,
} from "../../../redux/chatSlice";
import STRINGS from "../../../constants/strings";
import { COLORS, ICONS, SIZES } from "../../../styles/theme";
import { formatTime } from "../../../utils/helpers";
import TopBanner from "../components/TopBanner/Index";
import styles from "./conversationStyles";

function formatMessageTimestamp(createdAt, language) {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  const now = new Date();
  const today = now.toDateString() === d.toDateString();
  const timeStr = formatTime(createdAt);
  if (today) return timeStr;
  const day = d.getDate();
  const shortMonth = d.toLocaleDateString(language === "es" ? "es" : "en", { month: "short" });
  return `${day} ${shortMonth} · ${timeStr}`;
}

const patientIdSelector = (state) =>
  state?.auth?.user?._id ?? state?.auth?.user?.id ?? state?.users?.currentUser?._id ?? state?.users?.currentUser?.id;

export default function ConversationScreen({ route, navigation }) {
  const { conversationId: paramConversationId, doctorId, title } = route.params ?? {};
  const language = useSelector((state) => state.language.language);
  const dispatch = useDispatch();
  const patientId = useSelector(patientIdSelector);
  const { currentConversation, messagesByConversation, loading, error } = useSelector((state) => state.chat);

  const [resolvedConversationId, setResolvedConversationId] = useState(paramConversationId ?? null);
  const [inputText, setInputText] = useState("");
  const [banner, setBanner] = useState({ visible: false, type: "", message: "" });

  const conversationId = resolvedConversationId ?? paramConversationId ?? null;
  const messages = messagesByConversation[conversationId] ?? [];
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);

  const t = STRINGS[language]?.messages ?? STRINGS.es.messages ?? {};

  useEffect(() => {
    if (doctorId && !paramConversationId) {
      const payload = patientId ? { doctorId, patientId } : { doctorId };
      dispatch(getOrCreateConversation(payload));
    }
  }, [doctorId, patientId, paramConversationId, dispatch]);

  useEffect(() => {
    const conv = currentConversation;
    if (!conv?._id || !doctorId || paramConversationId) return;
    const convDoctorId = conv.doctor?._id ?? conv.doctor;
    if (String(convDoctorId) === String(doctorId)) {
      setResolvedConversationId(conv._id);
    }
  }, [currentConversation?._id, currentConversation?.doctor, doctorId, paramConversationId]);

  useEffect(() => {
    if (conversationId) {
      dispatch(fetchMessages({ conversationId, page: 1, limit: 50 }));
    }
    return () => {
      dispatch(clearMessagesError());
      dispatch(clearSendError());
    };
  }, [conversationId, dispatch]);

  useFocusEffect(
    useCallback(() => {
      if (conversationId) {
        dispatch(markConversationReadAPI(conversationId));
      }
      const FALLBACK_POLL_MS = 60000;
      const interval =
        conversationId &&
        setInterval(() => {
          dispatch(fetchMessages({ conversationId, page: 1, limit: 50, merge: true }));
        }, FALLBACK_POLL_MS);
      return () => {
        if (interval) clearInterval(interval);
      };
    }, [conversationId, dispatch])
  );

  const handleSend = useCallback(async () => {
    const text = (inputText || "").trim();
    if (!text || !conversationId || loading.send) return;
    setInputText("");
    const resultAction = await dispatch(sendMessage({ conversationId, body: text }));
    if (sendMessage.rejected.match(resultAction)) {
      setInputText(text);
      setBanner({ visible: true, type: "error", message: resultAction.payload });
    }
  }, [inputText, conversationId, loading.send, dispatch]);

  const displayMessages = [...(messages || [])].sort(
    (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  );

  useEffect(() => {
    if (displayMessages.length > prevMessagesLengthRef.current && listRef.current) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
    prevMessagesLengthRef.current = displayMessages.length;
  }, [displayMessages.length]);

  const renderMessage = ({ item }) => {
    const isPatient = item.senderType === "patient" || item.sender?._id === patientId;
    const timeLabel = formatMessageTimestamp(item.createdAt, language);
    const isNew = item?.isNew === true;
    return (
      <View
        style={[
          styles.messageBubble,
          isPatient ? styles.messageBubblePatient : styles.messageBubbleOther,
          isNew && !isPatient && styles.messageBubbleNew,
        ]}
      >
        <Text
          selectable
          style={[
            styles.messageText,
            isPatient ? styles.messageTextPatient : styles.messageTextOther,
          ]}
        >
          {item.body}
        </Text>
        {timeLabel ? (
          <Text style={[styles.messageTime, isPatient ? styles.messageTimePatient : styles.messageTimeOther]}>
            {timeLabel}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TopBanner
        visible={banner.visible}
        type={banner.type}
        message={banner.message}
        onHide={() => setBanner((b) => ({ ...b, visible: false }))}
      />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) + 14, paddingLeft: Math.max(insets.left, 12), paddingRight: Math.max(insets.right, 12) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name={ICONS.backArrow} size={SIZES.icon20} color={COLORS.blackText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title ?? t.title}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {(loading.conversation && !conversationId) || (loading.messages && messages.length === 0) ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={COLORS.secondary} />
          </View>
        ) : !conversationId && doctorId && error?.conversation ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error.conversation}</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={displayMessages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            inverted={false}
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Text style={styles.emptyText}>{t.placeholder}</Text>
              </View>
            }
            ListHeaderComponent={
              error?.messages ? (
                <View style={styles.errorWrap}>
                  <Text style={styles.errorText}>{error.messages}</Text>
                </View>
              ) : null
            }
          />
        )}

        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 24), paddingLeft: Math.max(insets.left, 12), paddingRight: Math.max(insets.right, 12) }]}>
          <TextInput
            style={styles.input}
            placeholder={t.typeMessage}
            placeholderTextColor={COLORS.ligthGreyText}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            editable={!loading.send}
          />
          <GlassButton
            variant="primary"
            style={[styles.sendButton, (!inputText.trim() || loading.send) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || loading.send || !conversationId}
          >
            {loading.send ? (
              <ActivityIndicator size="small" color={COLORS.selectedItem} />
            ) : (
              <Ionicons name="send" size={22} color={COLORS.selectedItem} />
            )}
          </GlassButton>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
