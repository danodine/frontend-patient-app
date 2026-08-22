import React, { useRef, useMemo } from "react";
import GlassButton from "../../../components/GlassButton";
import PulsingDot from "../../../components/PulsingDot";
import {
  View,
  Text,
  Animated,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { fetchConversations } from "../../../redux/chatSlice";
import STRINGS from "../../../constants/strings";
import { getSpecialtyLabel } from "../../../constants/specialties";
import styles from "./styles";
import { COLORS, GRADIENT_COLORS } from "../../../styles/theme";
import { BASE_URL } from "../../../../config";
import { useBottomBarSearch } from "../../../contexts/BottomBarSearchContext";
import { LinearGradient } from "expo-linear-gradient";
import {
  formatConsultationDate,
  getTimeAgo,
} from "../../../utils/helpers";

function getDoctorDisplay(conversation) {
  const doctor = conversation?.doctor;
  if (!doctor) return { name: "Doctor", imageUrl: null };
  const name = doctor.fullName ?? doctor.name ?? "Doctor";
  const imageUrl = doctor.profileImageUrl
    ? doctor.profileImageUrl.startsWith("http")
      ? doctor.profileImageUrl
      : `${BASE_URL}${doctor.profileImageUrl}`
    : null;
  return { name, imageUrl };
}

function getSpecialty(conversation, language) {
  const doctor = conversation?.doctor;
  if (!doctor) return "";
  if (doctor.profession) return getSpecialtyLabel(doctor.profession, language);
  const arr = doctor.specialties;
  if (Array.isArray(arr) && arr.length) return arr[0];
  return "";
}

function getPreview(conversation) {
  const last = conversation?.lastMessage;
  if (last?.body) return last.body;
  return null;
}

function getConsultationDate(conversation) {
  const last = conversation?.lastMessage?.createdAt ?? conversation?.updatedAt;
  return last || null;
}

export default function MessagesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const language = useSelector((state) => state.language.language);
  const dispatch = useDispatch();
  const { setSearchConfig, searchBarAtTopHeight } = useBottomBarSearch();
  const { conversations, loading } = useSelector((state) => state.chat);
  const [refreshing, setRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const tabFade = useRef(new Animated.Value(1)).current;
  const contentPadding = {
    paddingTop:
      searchBarAtTopHeight > 0
        ? searchBarAtTopHeight
        : Math.max(insets.top, 48),
    paddingLeft: Math.max(insets.left, 16),
    paddingRight: Math.max(insets.right, 16),
  };

  const t = STRINGS[language]?.messages ?? STRINGS.es.messages ?? {};
  const searchPlaceholder =
    language === "es" ? "Buscar conversaciones" : "Search conversations";

  const load = React.useCallback(async () => {
    await dispatch(fetchConversations());
  }, [dispatch]);

  useFocusEffect(
    React.useCallback(() => {
      setSearchConfig({
        visible: true,
        placeholder: searchPlaceholder,
        value: searchQuery,
        onChange: setSearchQuery,
        onFilter: null, // no doctor filters on the conversations search
        filtersActive: false,
      });
    }, [setSearchConfig, searchQuery, searchPlaceholder]),
  );

  useFocusEffect(
    React.useCallback(() => {
      tabFade.setValue(0);
      Animated.timing(tabFade, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
      load();
    }, [tabFade, load]),
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleConversation = (item) => {
    const { name } = getDoctorDisplay(item);
    navigation.navigate("Conversation", {
      conversationId: item._id,
      title: name,
    });
  };

  const openVideoCall = () => navigation.navigate("JoinVideoCall");

  const tMsg = STRINGS[language]?.messages ?? STRINGS.es.messages ?? {};
  const consultationLabel = tMsg.consultation ?? (language === "es" ? "Consulta" : "Consultation");
  const noMessagesLabel = tMsg.noMessages ?? (language === "es" ? "Sin mensajes" : "No messages");

  const renderItem = ({ item }) => {
    const { name, imageUrl } = getDoctorDisplay(item);
    const specialty = getSpecialty(item, language);
    const preview = getPreview(item);
    const consultationDate = getConsultationDate(item);
    const timeAgo = getTimeAgo(consultationDate, language);
    const initial = name.trim() ? name.trim()[0].toUpperCase() : "?";
    const hasUnread = (item?.unreadCount ?? 0) > 0;

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          style={styles.conversationRow}
          onPress={() => handleConversation(item)}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.avatarWrap}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetter}>{initial}</Text>
                </View>
              )}
              {hasUnread && <View style={styles.unreadDot} />}
            </View>
            <View style={styles.cardDoctorBlock}>
              <Text
                style={[
                  styles.conversationName,
                  hasUnread && styles.conversationNameUnread,
                ]}
                numberOfLines={1}
              >
                {name}
              </Text>
              {specialty ? (
                <Text style={styles.cardSpecialty} numberOfLines={1}>
                  {specialty}
                </Text>
              ) : null}
              <View style={styles.cardConsultationRow}>
                <Text style={styles.cardConsultationDate} numberOfLines={1}>
                  {consultationLabel}: {consultationDate ? formatConsultationDate(consultationDate, language) : "—"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={styles.cardTimeAgo} numberOfLines={1}>
                    {timeAgo}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={COLORS.greyText}
                    style={styles.cardChevron}
                  />
                </View>
              </View>
            </View>
          </View>
          <View style={styles.cardDivider} />
          <Text style={styles.conversationPreview} numberOfLines={2}>
            {preview || noMessagesLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (
    loading.conversations &&
    !refreshing &&
    (!conversations || conversations.length === 0)
  ) {
    return (
      <LinearGradient
        colors={GRADIENT_COLORS}
        style={{ flex: 1 }}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
      >
        <Animated.View
          style={[
            styles.container,
            { opacity: tabFade, backgroundColor: "transparent" },
          ]}
        >
          <View style={[styles.listHeader, contentPadding]}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text style={styles.title}>{t.title}</Text>
              <GlassButton
                variant="secondary"
                onPress={openVideoCall}
                style={styles.videoCallButton}
              >
                <PulsingDot
                  color={COLORS.error}
                  size={8}
                  style={{ marginRight: 8 }}
                />
                <View style={{ marginRight: 6 }}>
                  <Ionicons
                    name="videocam"
                    size={22}
                    color={COLORS.blackText}
                  />
                </View>
                <Text style={styles.videoCallButtonText}>{t.videoCall}</Text>
              </GlassButton>
            </View>
            <View style={styles.loader}>
              <ActivityIndicator size="small" color={COLORS.secondary} />
            </View>
          </View>
        </Animated.View>
      </LinearGradient>
    );
  }

  const list = Array.isArray(conversations) ? conversations : [];

  return (
    <LinearGradient
      colors={GRADIENT_COLORS}
      style={{ flex: 1 }}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
    >
      <Animated.View
        style={[
          styles.container,
          { opacity: tabFade, backgroundColor: "transparent" },
        ]}
      >
        <View style={[styles.listHeader, contentPadding]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <Text style={styles.title}>{t.title}</Text>
            <GlassButton
              variant="secondary"
              onPress={openVideoCall}
              style={styles.videoCallButton}
            >
              <PulsingDot
                color={COLORS.error}
                size={8}
                style={{ marginRight: 8 }}
              />
              <View style={{ marginRight: 6 }}>
                <Ionicons name="videocam" size={22} color={COLORS.blackText} />
              </View>
              <Text style={styles.videoCallButtonText}>{t.videoCall}</Text>
            </GlassButton>
          </View>
        </View>
        {list.length === 0 ? (
          <View
            style={[
              styles.emptyWrap,
              {
                paddingLeft: contentPadding.paddingLeft,
                paddingRight: contentPadding.paddingRight,
              },
            ]}
          >
            <Text style={styles.emptyTitle}>{t.emptyConversations}</Text>
            <Text style={styles.emptyHint}>{t.emptyConversationsHint}</Text>
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listBody,
              {
                paddingLeft: contentPadding.paddingLeft,
                paddingRight: contentPadding.paddingRight,
              },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.secondary]}
                tintColor={COLORS.secondary}
              />
            }
          />
        )}
      </Animated.View>
    </LinearGradient>
  );
}
