import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import PropTypes from "prop-types";
import {
  searchDoctorsBySpecialty,
  clearBySpecialty,
} from "../../../redux/doctorSlice";
import { BASE_URL } from "../../../../config";
import STRINGS from "../../../constants/strings";
import { getSpecialtyLabel } from "../../../constants/specialties";
import { COLORS, ICONS, SIZES } from "../../../styles/theme";
import styles from "./styles";

const gradientColors = [
  "rgba(81, 232, 239, 0.25)",
  "rgba(67, 144, 246, 0.15)",
  "rgba(108, 166, 244, 0.25)",
];

const DoctorListScreen = ({ route, navigation }) => {
  const { specialty, specialtyLabel } = route.params || {};
  const language = useSelector((state) => state.language.language);
  const { doctorsBySpecialty, loading, error } = useSelector(
    (state) => state.doctor,
  );
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const t = STRINGS[language]?.findDoctor ?? STRINGS.es.findDoctor;

  useFocusEffect(
    useCallback(() => {
      if (specialty) {
        dispatch(searchDoctorsBySpecialty({ specialty, limit: 30 }));
      }
      return () => {
        dispatch(clearBySpecialty());
      };
    }, [specialty, dispatch]),
  );

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSelectDoctor = (doctor) => {
    navigation.navigate("DoctorProfile", { doctor });
  };

  const getDoctorDisplayName = (d) => d?.fullName ?? d?.name ?? "";
  const getDoctorSpecialties = (d) => getSpecialtyLabel(d?.profession, language);
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
            {getDoctorDisplayName(item)}
          </Text>
          <Text style={styles.doctorMeta} numberOfLines={2}>
            {getDoctorSpecialties(item)}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={COLORS.greyText}
          style={styles.chevron}
        />
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <>
      <Text style={styles.headerTitle}>
        {specialtyLabel || specialty || t.title}
      </Text>
      <Text style={styles.headerSubtitle}>
        {doctorsBySpecialty.length}{" "}
        {doctorsBySpecialty.length === 1 ? t.doctorCount : t.doctorCountPlural}
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
          {loading.bySpecialty ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={COLORS.secondary} />
            </View>
          ) : error.bySpecialty ? (
            <View style={styles.empty}>
              <Text style={styles.errorText}>{error.bySpecialty}</Text>
              <Text style={styles.emptyText}>{t.errorLoading}</Text>
            </View>
          ) : doctorsBySpecialty.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t.noDoctors}</Text>
              <Text style={styles.emptyText}>{t.tryAnother}</Text>
            </View>
          ) : (
            <FlatList
              data={doctorsBySpecialty}
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

DoctorListScreen.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      specialty: PropTypes.string,
      specialtyLabel: PropTypes.string,
    }),
  }).isRequired,
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

export default DoctorListScreen;
