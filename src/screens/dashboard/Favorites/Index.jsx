// M14: dedicated section to view/remove favorite doctors.
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
  fetchFavoriteDoctors,
  removeFavoriteDoctor,
} from "../../../redux/doctorSlice";
import { getMainSpecialtyDisplay } from "../../../utils/helpers";
import { BASE_URL } from "../../../../config";
import { COLORS, ICONS, SIZES } from "../../../styles/theme";
import styles from "./styles";

const gradientColors = [
  "rgba(81, 232, 239, 0.25)",
  "rgba(67, 144, 246, 0.15)",
  "rgba(108, 166, 244, 0.25)",
];

const FavoritesScreen = ({ navigation }) => {
  const language = useSelector((state) => state.language.language);
  const { favoriteDoctors, loading, error } = useSelector((state) => state.doctor);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchFavoriteDoctors());
    }, [dispatch]),
  );

  const handleBack = () => navigation.goBack();
  const handleSelectDoctor = (doctor) => {
    // This screen lives in the Profile tab's stack, but DoctorProfile (and the
    // booking flow it links to) lives in the Home tab's stack — cross-tab
    // navigate rather than duplicating those screens into this stack too.
    navigation.navigate("Home", { screen: "DoctorProfile", params: { doctor } });
  };

  const handleRemove = (doctor) => {
    const name = doctor?.fullName ?? doctor?.name ?? "";
    Alert.alert(
      language === "es" ? "Quitar de favoritos" : "Remove from favorites",
      language === "es"
        ? `¿Quitar a ${name} de tus médicos favoritos?`
        : `Remove ${name} from your favorite doctors?`,
      [
        { text: language === "es" ? "Cancelar" : "Cancel", style: "cancel" },
        {
          text: language === "es" ? "Quitar" : "Remove",
          style: "destructive",
          onPress: () => dispatch(removeFavoriteDoctor(doctor._id)),
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
    const photoUri = getPhotoUri(item);
    return (
      <TouchableOpacity
        style={styles.doctorItem}
        onPress={() => handleSelectDoctor(item)}
        activeOpacity={0.7}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name={ICONS.person} size={28} color={COLORS.whiteText} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.doctorName} numberOfLines={1}>
            {item?.fullName ?? item?.name ?? ""}
          </Text>
          <Text style={styles.doctorMeta} numberOfLines={2}>
            {getMainSpecialtyDisplay(item, language) || item?.profession || ""}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemove(item)}
          accessibilityLabel={language === "es" ? "Quitar de favoritos" : "Remove from favorites"}
        >
          <Ionicons name="heart" size={22} color="#EF4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <>
      <Text style={styles.headerTitle}>
        {language === "es" ? "Médicos favoritos" : "Favorite doctors"}
      </Text>
      <Text style={styles.headerSubtitle}>
        {favoriteDoctors.length}{" "}
        {language === "es"
          ? favoriteDoctors.length === 1
            ? "médico guardado"
            : "médicos guardados"
          : favoriteDoctors.length === 1
            ? "saved doctor"
            : "saved doctors"}
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
            <Ionicons name={ICONS.backArrow} size={SIZES.icon20} color={COLORS.blackText} />
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {loading.favorites ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={COLORS.secondary} />
            </View>
          ) : error.favorites ? (
            <View style={styles.empty}>
              <Text style={styles.errorText}>{error.favorites}</Text>
            </View>
          ) : favoriteDoctors.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {language === "es"
                  ? "Aún no tienes médicos favoritos."
                  : "You don't have any favorite doctors yet."}
              </Text>
              <Text style={styles.emptyText}>
                {language === "es"
                  ? "Toca el corazón en el perfil de un médico para guardarlo aquí."
                  : "Tap the heart on a doctor's profile to save them here."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={favoriteDoctors}
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

FavoritesScreen.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

export default FavoritesScreen;
