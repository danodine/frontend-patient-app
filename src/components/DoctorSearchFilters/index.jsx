import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import { COLORS, SIZES } from "../../styles/theme";
import { getSpecialtyOptions, getSpecialtyLabel } from "../../constants/specialties";
import styles from "./styles";

// Expanded search-filter panel used on the Home and Citas search views. Driven
// entirely by a useDoctorSearchFilters() instance passed as `filters`.
export default function DoctorSearchFilters({ filters }) {
  const language = useSelector((state) => state.language.language);
  const es = language === "es";
  const [specialtyModal, setSpecialtyModal] = useState(false);

  const modalityOptions = [
    { key: "both", label: es ? "Ambas" : "Both" },
    { key: "in_person", label: es ? "Presencial" : "In-person" },
    { key: "video_call", label: es ? "Virtual" : "Virtual" },
  ];
  const languageOptions = [
    { key: null, label: es ? "Cualquiera" : "Any" },
    { key: "Espanol", label: "Español" },
    { key: "Ingles", label: "English" },
  ];

  const Toggle = ({ label, value, onPress }) => (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Ionicons
          name={value ? "checkbox" : "square-outline"}
          size={22}
          color={value ? COLORS.secondary : COLORS.greyText}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="options-outline" size={SIZES.icon20 ?? 18} color={COLORS.secondary} />
          <Text style={styles.headerTitle}>{es ? "Filtros de búsqueda" : "Search filters"}</Text>
        </View>
        {filters.hasActiveFilters && (
          <TouchableOpacity onPress={filters.reset}>
            <Text style={styles.clearText}>{es ? "Limpiar" : "Clear"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modality */}
      <Text style={styles.sectionLabel}>{es ? "MODALIDAD" : "MODALITY"}</Text>
      <View style={styles.optionRow}>
        {modalityOptions.map((opt) => {
          const selected = filters.modality === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => filters.setModality(opt.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Specialty */}
      <Text style={styles.sectionLabel}>{es ? "ESPECIALIDAD" : "SPECIALTY"}</Text>
      <TouchableOpacity
        style={styles.selectRow}
        onPress={() => setSpecialtyModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.selectValue} numberOfLines={1}>
          {filters.specialty
            ? getSpecialtyLabel(filters.specialty, language)
            : es ? "Cualquiera" : "Any"}
        </Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.greyText} />
      </TouchableOpacity>

      {/* Language */}
      <Text style={styles.sectionLabel}>{es ? "IDIOMA DE ATENCIÓN" : "PREFERRED LANGUAGE"}</Text>
      <View style={styles.optionRow}>
        {languageOptions.map((opt) => {
          const selected = filters.searchLanguage === opt.key;
          return (
            <TouchableOpacity
              key={opt.label}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => filters.setSearchLanguage(opt.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.divider} />

      <Toggle
        label={es ? "Acepta seguro privado" : "Accepts private insurance"}
        value={filters.acceptsInsurance}
        onPress={() => filters.setAcceptsInsurance((v) => !v)}
      />
      <Toggle
        label={es ? "Disponible hoy" : "Available today"}
        value={filters.availableToday}
        onPress={() => filters.setAvailableToday((v) => !v)}
      />
      <Toggle
        label={es ? "Distancia máxima" : "Maximum distance"}
        value={filters.distanceEnabled}
        onPress={filters.toggleDistance}
      />

      {filters.distanceEnabled &&
        (filters.locatingUser ? (
          <View style={styles.locatingRow}>
            <ActivityIndicator size="small" color={COLORS.secondary} />
            <Text style={styles.hint}>
              {es ? "Obteniendo tu ubicación…" : "Getting your location…"}
            </Text>
          </View>
        ) : filters.locationError ? (
          <Text style={[styles.hint, { color: COLORS.error }]}>{filters.locationError}</Text>
        ) : filters.userCoords ? (
          <View style={styles.distanceRow}>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => filters.setMaxDistanceKm((v) => Math.max(1, v - 5))}
              >
                <Text style={styles.stepperText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.distanceValue}>{filters.maxDistanceKm} km</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => filters.setMaxDistanceKm((v) => Math.min(200, v + 5))}
              >
                <Text style={styles.stepperText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null)}

      {/* Specialty picker modal */}
      <Modal
        visible={specialtyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setSpecialtyModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSpecialtyModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{es ? "Especialidad" : "Specialty"}</Text>
              <TouchableOpacity onPress={() => setSpecialtyModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.blackText} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => {
                  filters.setSpecialty(null);
                  setSpecialtyModal(false);
                }}
              >
                <Text style={styles.modalRowText}>{es ? "Cualquiera" : "Any"}</Text>
                {!filters.specialty && (
                  <Ionicons name="checkmark" size={18} color={COLORS.secondary} />
                )}
              </TouchableOpacity>
              {getSpecialtyOptions(language).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.modalRow}
                  onPress={() => {
                    filters.setSpecialty(opt.value);
                    setSpecialtyModal(false);
                  }}
                >
                  <Text style={styles.modalRowText}>{opt.label}</Text>
                  {filters.specialty === opt.value && (
                    <Ionicons name="checkmark" size={18} color={COLORS.secondary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

DoctorSearchFilters.propTypes = {
  filters: PropTypes.object.isRequired,
};
