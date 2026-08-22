import React, { useEffect, useRef, useState } from "react";
import GlassButton from "../../../components/GlassButton";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateField from "../../../components/DateField";
import { updateUser, getCurrentUser } from "../../../redux/userSlice";
import { syncReminderNotifications } from "../../../utils/localReminders";
import { bloodTypes, spokenLanguages } from "../../../constants/vars";
import { COLORS } from "../../../styles/theme";
import styles from "./styles";
import STRINGS from "../../../constants/strings";

const GENDERS = ["Male", "Female", "Diverse"];

// Fields that are edited as a single scalar (number / pill selector).
const SCALAR_FIELDS = ["weight", "height", "bloodType", "gender"];

function titleForField(field, t) {
  switch (field) {
    case "weight":
      return t.weight;
    case "height":
      return t.height;
    case "bloodType":
      return t.bloodType;
    case "gender":
      return t.gender;
    case "languages":
      return t.languages;
    case "allergies":
      return t.allergies;
    case "vaccines":
      return t.vaccines;
    case "medicationReminders":
      return t.medicationReminders;
    default:
      return "";
  }
}

/**
 * A single-field edit overlay (point 3 of the profile redesign). Instead of
 * sending the patient to the full EditProfile screen, each health field opens
 * this bottom sheet, edits just that one value/list, and PATCHes only that key
 * (updateMe does a partial merge, so untouched fields are preserved).
 *
 * Kept in its own module so its TextInputs re-render locally and don't lose
 * focus when the parent ProfileScreen re-renders.
 */
export default function FieldEditModal({ field, currentUser, onClose }) {
  const dispatch = useDispatch();
  const language = useSelector((s) => s.language.language);
  const updating = useSelector((s) => s.users.loading.update);
  const insets = useSafeAreaInsets();
  const t = STRINGS[language]?.myProfile ?? STRINGS.es.myProfile;

  const modalHeight = Dimensions.get("window").height;
  const slideAnim = useRef(new Animated.Value(modalHeight)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Scalar draft (weight/height text, bloodType/gender value)
  const [scalar, setScalar] = useState("");
  // Multi-select draft (languages)
  const [multi, setMulti] = useState([]);
  // Allergies list
  const [allergiesList, setAllergiesList] = useState([]);
  const [allergyInput, setAllergyInput] = useState("");
  // Vaccines list + add-flow
  const [vaccinesList, setVaccinesList] = useState([]);
  const [vaccineInput, setVaccineInput] = useState("");
  const [vaccineDate, setVaccineDate] = useState(null);
  const [vaccineReminderEnabled, setVaccineReminderEnabled] = useState(false);
  const [vaccineReminderDate, setVaccineReminderDate] = useState(null);
  // Medication reminders list + add-flow
  const [medList, setMedList] = useState([]);
  const [medNameInput, setMedNameInput] = useState("");
  const [medDoseInput, setMedDoseInput] = useState("");
  const [medReminderEnabled, setMedReminderEnabled] = useState(false);
  const [medTime, setMedTime] = useState(null);

  const visible = !!field;

  // Initialize drafts + run the open animation whenever a field is selected.
  useEffect(() => {
    if (!field) return;
    const u = currentUser ?? {};
    if (field === "weight") setScalar(u.weight != null ? String(u.weight) : "");
    else if (field === "height")
      setScalar(u.height != null ? String(u.height) : "");
    else if (field === "bloodType") setScalar(u.bloodType ?? "");
    else if (field === "gender") setScalar(u.gender ?? "");
    else if (field === "languages")
      setMulti(Array.isArray(u.languages) ? u.languages.filter(Boolean) : []);
    else if (field === "allergies") {
      if (Array.isArray(u.allergies)) setAllergiesList(u.allergies.filter(Boolean));
      else if (typeof u.allergies === "string" && u.allergies.trim())
        setAllergiesList([u.allergies.trim()]);
      else setAllergiesList([]);
      setAllergyInput("");
    } else if (field === "vaccines") {
      setVaccinesList(
        Array.isArray(u.vaccines)
          ? u.vaccines.map((v) => ({
              name: typeof v === "object" && v?.name ? v.name : String(v),
              date:
                typeof v === "object" && v?.date ? v.date.slice(0, 10) : undefined,
              reminderDate:
                typeof v === "object" && v?.reminderDate
                  ? v.reminderDate.slice(0, 10)
                  : undefined,
            }))
          : [],
      );
      setVaccineInput("");
      setVaccineDate(null);
      setVaccineReminderEnabled(false);
      setVaccineReminderDate(null);
    } else if (field === "medicationReminders") {
      setMedList(Array.isArray(u.medicationReminders) ? u.medicationReminders : []);
      setMedNameInput("");
      setMedDoseInput("");
      setMedReminderEnabled(false);
      setMedTime(null);
    }

    slideAnim.setValue(modalHeight);
    overlayOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: modalHeight,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  const toggleLanguage = (code) => {
    setMulti((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const addAllergy = () => {
    const trimmed = allergyInput.trim();
    if (!trimmed) return;
    setAllergiesList((prev) => [...prev, trimmed]);
    setAllergyInput("");
  };
  const removeAllergy = (index) =>
    setAllergiesList((prev) => prev.filter((_, i) => i !== index));

  const addVaccine = () => {
    const trimmed = vaccineInput.trim();
    if (!trimmed) return;
    setVaccinesList((prev) => [
      ...prev,
      {
        name: trimmed,
        date: vaccineDate ? vaccineDate.toISOString().slice(0, 10) : undefined,
        reminderDate:
          vaccineReminderEnabled && vaccineReminderDate
            ? vaccineReminderDate.toISOString().slice(0, 10)
            : undefined,
      },
    ]);
    setVaccineInput("");
    setVaccineDate(null);
    setVaccineReminderEnabled(false);
    setVaccineReminderDate(null);
  };
  const removeVaccine = (index) =>
    setVaccinesList((prev) => prev.filter((_, i) => i !== index));

  const addMedication = () => {
    const trimmed = medNameInput.trim();
    if (!trimmed) return;
    setMedList((prev) => [
      ...prev,
      {
        name: trimmed,
        dose: medDoseInput.trim() || undefined,
        reminderEnabled: medReminderEnabled && !!medTime,
        time:
          medReminderEnabled && medTime
            ? `${String(medTime.getHours()).padStart(2, "0")}:${String(
                medTime.getMinutes(),
              ).padStart(2, "0")}`
            : undefined,
      },
    ]);
    setMedNameInput("");
    setMedDoseInput("");
    setMedReminderEnabled(false);
    setMedTime(null);
  };
  const removeMedication = (index) =>
    setMedList((prev) => prev.filter((_, i) => i !== index));

  const buildPayload = () => {
    switch (field) {
      case "weight": {
        const w = parseFloat(scalar);
        return Number.isFinite(w) ? { weight: w } : {};
      }
      case "height": {
        const h = parseFloat(scalar);
        return Number.isFinite(h) ? { height: h } : {};
      }
      // Scalar selectors: only sent when set (matches EditProfile — the schema
      // rejects an empty enum under runValidators, so "deselect" = no change).
      case "bloodType":
        return scalar ? { bloodType: scalar } : {};
      case "gender":
        return scalar ? { gender: scalar } : {};
      case "languages":
        return { languages: multi };
      case "allergies":
        return { allergies: allergiesList.filter(Boolean) };
      case "vaccines":
        return {
          vaccines: vaccinesList.map((v) => ({
            name: v.name,
            ...(v.date ? { date: v.date } : {}),
            ...(v.reminderDate ? { reminderDate: v.reminderDate } : {}),
          })),
        };
      case "medicationReminders":
        return { medicationReminders: medList };
      default:
        return {};
    }
  };

  const handleSave = async () => {
    const payload = buildPayload();
    try {
      await dispatch(updateUser(payload)).unwrap();
      dispatch(getCurrentUser());
      // Reschedule local reminders. syncReminderNotifications cancels ALL
      // reminder notifications first, so we must pass BOTH lists (the edited
      // one + the other from currentUser) to avoid wiping the other type's.
      if (field === "vaccines") {
        syncReminderNotifications(
          {
            vaccines: payload.vaccines,
            medicationReminders: currentUser?.medicationReminders ?? [],
          },
          language,
        ).catch(() => {});
      } else if (field === "medicationReminders") {
        syncReminderNotifications(
          {
            medicationReminders: payload.medicationReminders,
            vaccines: currentUser?.vaccines ?? [],
          },
          language,
        ).catch(() => {});
      }
      handleClose();
    } catch (_) {
      // Banner surfaced by the parent via the userSlice.
    }
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View
        style={[
          styles.modalOverlay,
          { opacity: overlayOpacity, padding: 0 },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%", flex: 1, justifyContent: "flex-end" }}
          pointerEvents="box-none"
        >
        <Animated.View
          style={[
            styles.fieldSheet,
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{titleForField(field, t)}</Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={COLORS.blackText} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ maxHeight: modalHeight * 0.68 }}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
              {/* Numeric fields */}
              {(field === "weight" || field === "height") && (
                <>
                  <Text style={styles.numberHint}>
                    {field === "weight"
                      ? (language === "es" ? "Ingresa tu peso en kilogramos." : "Enter your weight in kilograms.")
                      : (language === "es" ? "Ingresa tu altura en centímetros." : "Enter your height in centimeters.")}
                  </Text>
                  <View style={styles.numberInputRow}>
                    <TextInput
                      style={styles.numberInput}
                      placeholder="0"
                      value={scalar}
                      onChangeText={setScalar}
                      keyboardType="decimal-pad"
                      placeholderTextColor={COLORS.ligthGreyText}
                      autoFocus
                    />
                    <Text style={styles.numberUnit}>
                      {field === "weight" ? "kg" : "cm"}
                    </Text>
                  </View>
                </>
              )}

              {/* Blood type selector */}
              {field === "bloodType" && (
                <View style={styles.selectorRow}>
                  {bloodTypes.map((bt) => (
                    <TouchableOpacity
                      key={bt.value}
                      style={[
                        styles.selectorOption,
                        scalar === bt.value && styles.selectorOptionSelected,
                      ]}
                      onPress={() => setScalar(scalar === bt.value ? "" : bt.value)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.selectorOptionText,
                          scalar === bt.value && styles.selectorOptionTextSelected,
                        ]}
                      >
                        {bt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Gender selector */}
              {field === "gender" && (
                <View style={styles.selectorRow}>
                  {GENDERS.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.selectorOption,
                        scalar === g && styles.selectorOptionSelected,
                      ]}
                      onPress={() => setScalar(scalar === g ? "" : g)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.selectorOptionText,
                          scalar === g && styles.selectorOptionTextSelected,
                        ]}
                      >
                        {t[`gender${g}`]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Languages multi-select */}
              {field === "languages" && (
                <>
                  <Text style={styles.sectionSubLabel}>{t.languagesOptional}</Text>
                  <View style={styles.selectorRow}>
                    {spokenLanguages.map((lng) => {
                      const selected = multi.includes(lng.code);
                      return (
                        <TouchableOpacity
                          key={lng.code}
                          style={[
                            styles.selectorOption,
                            selected && styles.selectorOptionSelected,
                          ]}
                          onPress={() => toggleLanguage(lng.code)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.selectorOptionText,
                              selected && styles.selectorOptionTextSelected,
                            ]}
                          >
                            {lng.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Allergies list manager */}
              {field === "allergies" && (
                <>
                  {allergiesList.length > 0 ? (
                    <View style={styles.chipRow}>
                      {allergiesList.map((item, index) => (
                        <View key={`allergy-${index}`} style={styles.chip}>
                          <Text style={styles.chipText} numberOfLines={1}>
                            {item}
                          </Text>
                          <TouchableOpacity
                            style={styles.chipRemove}
                            onPress={() => removeAllergy(index)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="close-circle" size={20} color={COLORS.greyText} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.sectionSubLabel}>{t.noAllergies}</Text>
                  )}
                  <View style={styles.addRow}>
                    <TextInput
                      style={styles.addRowInput}
                      placeholder={t.allergyAddPlaceholder}
                      value={allergyInput}
                      onChangeText={setAllergyInput}
                      onSubmitEditing={addAllergy}
                      returnKeyType="done"
                      placeholderTextColor={COLORS.ligthGreyText}
                    />
                    <GlassButton
                      variant="primary" style={styles.addButton} onPress={addAllergy} activeOpacity={0.8}>
                      <Text style={styles.addButtonText}>{t.add}</Text>
                    </GlassButton>
                  </View>
                </>
              )}

              {/* Vaccines list manager */}
              {field === "vaccines" && (
                <>
                  {vaccinesList.length > 0 && (
                    <View style={styles.chipRow}>
                      {vaccinesList.map((item, index) => (
                        <View key={`vaccine-${index}`} style={styles.chip}>
                          <Text style={styles.chipText} numberOfLines={1}>
                            {item.date ? `${item.name} (${item.date})` : item.name}
                            {item.reminderDate ? " 🔔" : ""}
                          </Text>
                          <TouchableOpacity
                            style={styles.chipRemove}
                            onPress={() => removeVaccine(index)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="close-circle" size={20} color={COLORS.greyText} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                  <TextInput
                    style={styles.input}
                    placeholder={t.vaccineNamePlaceholder}
                    value={vaccineInput}
                    onChangeText={setVaccineInput}
                    placeholderTextColor={COLORS.ligthGreyText}
                  />
                  <DateField
                    style={styles.dateButton}
                    textStyle={styles.dateButtonText}
                    value={vaccineDate}
                    onChange={setVaccineDate}
                    mode="date"
                    maximumDate={new Date()}
                    placeholder={t.date}
                    title={t.SelectDate}
                    confirmText={t.save}
                    cancelText={t.cancel}
                  />
                  <TouchableOpacity
                    style={styles.toggleRow}
                    onPress={() => setVaccineReminderEnabled((v) => !v)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={vaccineReminderEnabled ? "checkbox" : "square-outline"}
                      size={22}
                      color={vaccineReminderEnabled ? COLORS.secondary : COLORS.greyText}
                    />
                    <Text style={styles.toggleLabel}>{t.vaccineReminderToggle}</Text>
                  </TouchableOpacity>
                  {vaccineReminderEnabled && (
                    <DateField
                      style={styles.dateButton}
                      textStyle={styles.dateButtonText}
                      value={vaccineReminderDate}
                      onChange={setVaccineReminderDate}
                      mode="date"
                      minimumDate={new Date()}
                      placeholder={t.vaccineReminderDate}
                      title={t.vaccineReminderDate}
                      confirmText={t.save}
                      cancelText={t.cancel}
                    />
                  )}
                  <View style={styles.addRow}>
                    <View style={{ flex: 1 }} />
                    <GlassButton
                      variant="primary" style={styles.addButton} onPress={addVaccine} activeOpacity={0.8}>
                      <Text style={styles.addButtonText}>{t.addVaccine}</Text>
                    </GlassButton>
                  </View>
                </>
              )}

              {/* Medication reminders list manager */}
              {field === "medicationReminders" && (
                <>
                  {medList.length > 0 ? (
                    medList.map((med, index) => (
                      <View key={`med-${index}`} style={styles.reminderCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reminderCardTitle}>{med.name}</Text>
                          {med.dose ? (
                            <Text style={styles.reminderCardMeta}>{med.dose}</Text>
                          ) : null}
                          {med.reminderEnabled && med.time ? (
                            <Text style={styles.reminderCardMeta}>🔔 {med.time}</Text>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          onPress={() => removeMedication(index)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close-circle" size={20} color={COLORS.greyText} />
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.sectionSubLabel}>{t.noMedicationReminders}</Text>
                  )}
                  <TextInput
                    style={styles.input}
                    placeholder={t.medicationNamePlaceholder}
                    value={medNameInput}
                    onChangeText={setMedNameInput}
                    placeholderTextColor={COLORS.ligthGreyText}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t.medicationDosePlaceholder}
                    value={medDoseInput}
                    onChangeText={setMedDoseInput}
                    placeholderTextColor={COLORS.ligthGreyText}
                  />
                  <TouchableOpacity
                    style={styles.toggleRow}
                    onPress={() => setMedReminderEnabled((v) => !v)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={medReminderEnabled ? "checkbox" : "square-outline"}
                      size={22}
                      color={medReminderEnabled ? COLORS.secondary : COLORS.greyText}
                    />
                    <Text style={styles.toggleLabel}>{t.medicationReminderToggle}</Text>
                  </TouchableOpacity>
                  {medReminderEnabled && (
                    <DateField
                      style={styles.dateButton}
                      textStyle={styles.dateButtonText}
                      value={medTime}
                      onChange={setMedTime}
                      mode="time"
                      placeholder={t.medicationTime}
                      title={t.medicationTime}
                      confirmText={t.save}
                      cancelText={t.cancel}
                    />
                  )}
                  <View style={styles.addRow}>
                    <View style={{ flex: 1 }} />
                    <GlassButton
                      variant="primary" style={styles.addButton} onPress={addMedication} activeOpacity={0.8}>
                      <Text style={styles.addButtonText}>{t.addMedication}</Text>
                    </GlassButton>
                  </View>
                </>
              )}

              <GlassButton
                variant="primary"
                style={[styles.saveButton, updating && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color={COLORS.whiteText} />
                ) : (
                  <Text style={styles.saveButtonText}>{t.save}</Text>
                )}
              </GlassButton>
          </ScrollView>
        </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

FieldEditModal.propTypes = {
  field: PropTypes.oneOf([
    ...SCALAR_FIELDS,
    "languages",
    "allergies",
    "vaccines",
    "medicationReminders",
    null,
  ]),
  currentUser: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};
