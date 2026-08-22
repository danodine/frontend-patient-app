import React, { useState, useCallback } from "react";
import GlassButton from "../../../components/GlassButton";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import { COLORS, GRADIENT_COLORS, ICONS, SIZES } from "../../../styles/theme";
import STRINGS from "../../../constants/strings";
import { patientHistoryService } from "../../../services/patientHistoryService";
import styles from "./styles";

function formatDate(iso, language) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderEntryContent(content) {
  if (!content) return null;
  if (content.type === "markdown" && content.body) {
    return (
      <View style={styles.contentBlock}>
        <Text style={styles.contentText}>{content.body}</Text>
      </View>
    );
  }
  if (content.type === "structured" && Array.isArray(content.blocks)) {
    return (
      <View style={styles.contentBlock}>
        {content.blocks.map((block, idx) => {
          if (block.type === "paragraph" && block.text) {
            return (
              <Text
                key={idx}
                style={[styles.contentText, styles.contentParagraph]}
              >
                {block.text}
              </Text>
            );
          }
          if (block.type === "heading" && block.text) {
            return (
              <Text
                key={idx}
                style={[
                  styles.contentText,
                  styles.contentParagraph,
                  { fontWeight: "700", fontSize: 16 },
                ]}
              >
                {block.text}
              </Text>
            );
          }
          return null;
        })}
      </View>
    );
  }
  return null;
}

export default function ClinicalHistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const language = useSelector((state) => state.language.language);
  const currentUser = useSelector((state) => state.users?.currentUser) ?? useSelector((state) => state.auth?.user) ?? {};
  const rawPatientId = currentUser?._id ?? currentUser?.id;
  const patientId = rawPatientId != null ? String(rawPatientId) : undefined;

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const t = STRINGS[language]?.myProfile ?? STRINGS.es?.myProfile;
  const emptyTitle = language === "es" ? "No hay entradas en el historial." : "No history entries.";
  const emptyHint = language === "es"
    ? "Tu historial clínico aparecerá aquí cuando un médico registre consultas o notas."
    : "Your clinical history will appear here when a doctor records visits or notes.";
  const errorTitle = language === "es" ? "No se pudo cargar el historial." : "Could not load history.";
  const errorHint = language === "es"
    ? "Verifica tu conexión a internet e intenta nuevamente."
    : "Check your internet connection and try again.";
  const retryLabel = language === "es" ? "Reintentar" : "Retry";

  const loadHistory = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      return;
    }
    try {
      setLoadError(false);
      const list = await patientHistoryService.getHistory(patientId, {
        page: 1,
        limit: 100,
        sort: "-createdAt",
      });
      setEntries(Array.isArray(list) ? list : []);
    } catch (_) {
      setEntries([]);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadHistory();
    }, [loadHistory])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
  }, [loadHistory]);

  const handleBack = () => navigation.goBack();

  const paddingTop = Math.max(insets.top, 12);
  const contentPadding = {
    paddingTop,
    paddingLeft: Math.max(insets.left, 0),
    paddingRight: Math.max(insets.right, 0),
  };

  return (
    <LinearGradient
      colors={GRADIENT_COLORS}
      style={styles.container}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={[styles.content, contentPadding]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons
              name={ICONS.backArrow}
              size={SIZES.icon20}
              color={COLORS.blackText}
            />
          </TouchableOpacity>
          <Text style={styles.title}>{t.clinicalHistory}</Text>
          <View style={styles.backButton} />
        </View>

        {loading && !refreshing ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={COLORS.secondary} />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.listContent,
              entries.length === 0 && { flexGrow: 1 },
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
          >
            {loadError ? (
              <View style={styles.emptyWrap}>
                <Ionicons
                  name="alert-circle-outline"
                  size={56}
                  color={COLORS.error}
                  style={styles.emptyIcon}
                />
                <Text style={[styles.emptyTitle, { color: COLORS.error }]}>{errorTitle}</Text>
                <Text style={styles.emptyHint}>{errorHint}</Text>
                <GlassButton
                  variant="primary"
                  onPress={() => {
                    setLoading(true);
                    loadHistory();
                  }}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>{retryLabel}</Text>
                </GlassButton>
              </View>
            ) : entries.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons
                  name="document-text-outline"
                  size={56}
                  color={COLORS.ligthGreyText}
                  style={styles.emptyIcon}
                />
                <Text style={styles.emptyTitle}>{emptyTitle}</Text>
                <Text style={styles.emptyHint}>{emptyHint}</Text>
              </View>
            ) : (
              entries.map((entry, idx) => {
                const dateStr = formatDate(entry.createdAt, language);
                const doctorName = entry.doctor?.fullName || entry.doctor?.email || "";
                return (
                  <View key={entry._id ?? entry.id ?? `h-${idx}`} style={styles.card}>
                    <Text style={styles.cardTitle}>
                      {entry.title || (language === "es" ? "Sin título" : "No title")}
                    </Text>
                    <Text style={styles.cardDate}>{dateStr}</Text>
                    {doctorName ? (
                      <Text style={styles.cardMeta}>
                        {language === "es" ? "Médico: " : "Doctor: "}
                        {doctorName}
                      </Text>
                    ) : null}
                    {entry.tags && entry.tags.length > 0 ? (
                      <View style={styles.tagsRow}>
                        {entry.tags.slice(0, 8).map((tag, i) => (
                          <Text key={i} style={styles.tag}>
                            {tag}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                    {renderEntryContent(entry.content)}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </LinearGradient>
  );
}

ClinicalHistoryScreen.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
  }).isRequired,
};
