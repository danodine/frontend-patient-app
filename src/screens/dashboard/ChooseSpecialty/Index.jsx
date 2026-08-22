import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import { getSpecialtyOptions } from "../../../constants/specialties";
import STRINGS from "../../../constants/strings";
import { COLORS, ICONS, SIZES } from "../../../styles/theme";
import styles from "./styles";

const gradientColors = ["rgba(81, 232, 239, 0.25)", "rgba(67, 144, 246, 0.15)", "rgba(108, 166, 244, 0.25)"];

const ChooseSpecialtyScreen = ({ navigation }) => {
  const language = useSelector((state) => state.language.language);
  const insets = useSafeAreaInsets();
  const t = STRINGS[language]?.findDoctor ?? STRINGS.es.findDoctor;

  const handleSelectSpecialty = (specialty) => {
    navigation.navigate("DoctorList", { specialty: specialty.value, specialtyLabel: specialty.label });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.wrapper}>
      <LinearGradient colors={gradientColors} style={[styles.gradient, { paddingTop: insets.top + 12 }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.backRow}>
            <TouchableOpacity style={styles.backTouch} onPress={handleBack} accessibilityLabel="Back">
              <Ionicons name={ICONS.backArrow} size={SIZES.icon20} color={COLORS.blackText} />
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
            <View style={styles.grid}>
              {getSpecialtyOptions(language).map((spec) => (
                <TouchableOpacity
                  key={spec.value}
                  style={styles.tile}
                  onPress={() => handleSelectSpecialty(spec)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tileText} numberOfLines={2}>
                    {spec.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

ChooseSpecialtyScreen.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

export default ChooseSpecialtyScreen;
