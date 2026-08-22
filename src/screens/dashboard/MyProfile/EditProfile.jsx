import React, { useState, useEffect } from "react";
import GlassButton from "../../../components/GlassButton";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getCurrentUser,
  updateUser,
  clearUserBanner,
  clearUserError,
} from "../../../redux/userSlice";
import PropTypes from "prop-types";
import TopBanner from "../components/TopBanner/Index";
import DateField from "../../../components/DateField";
import { COLORS, ICONS, SIZES } from "../../../styles/theme";
import styles from "./styles";
import STRINGS from "../../../constants/strings";
import { BASE_URL } from "../../../../config";
import { validateEcuadorianCedula } from "../../../utils/helpers";
import * as secureStorage from "../../../utils/secureStorage";

// The pencil on the profile screen now edits ONLY the "Información" section
// (identity + contact) and the profile photo. Every health field (weight,
// height, blood type, gender, languages, allergies, vaccines, medication
// reminders) is edited inline through its own per-field overlay on the profile
// screen, so those editors were removed from here.
const PATIENT_EDITABLE_KEYS = [
  "fullName",
  "email",
  "documentId",
  "phone",
  "birthDate",
  "address",
  "emergencyContact",
];

// The backend only stores a single `fullName` string — split it heuristically
// (last word = last name, everything before it = first name(s)) so the edit
// form can offer two fields without a data-model change. Imperfect for
// compound surnames, but there's no stored metadata to split on correctly.
function splitFullName(full) {
  const trimmed = (full || "").trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function getProfileImageUri(user) {
  if (!user) return null;
  if (user.profileImageUrl) {
    const path = user.profileImageUrl.startsWith("/")
      ? user.profileImageUrl
      : `/${user.profileImageUrl}`;
    return `${BASE_URL}${path}`;
  }
  return null;
}

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const language = useSelector((state) => state.language.language);
  const {
    currentUser,
    cachedProfileImageUri,
    userBanner,
    loading: userLoading,
    error: userError,
  } = useSelector((state) => state.users);
  const dispatch = useDispatch();

  const [profileImageUri, setProfileImageUri] = useState(null);
  // Patient photos require auth on the server; an <Image> can't use the axios
  // interceptor, so pass the token as a header. Fall back to initials on error.
  const [authToken, setAuthToken] = useState(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => {
    secureStorage.getItemAsync("token").then(setAuthToken).catch(() => {});
  }, []);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [documentIdError, setDocumentIdError] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [addressCountry, setAddressCountry] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressParish, setAddressParish] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [banner, setBanner] = useState({
    visible: false,
    type: "",
    message: "",
  });

  const t = STRINGS[language]?.myProfile ?? STRINGS.es.myProfile;

  useEffect(() => {
    dispatch(getCurrentUser());
  }, [dispatch]);

  useEffect(() => {
    const u = currentUser;
    const { firstName: fn, lastName: ln } = splitFullName(u?.fullName ?? u?.name ?? "");
    setFirstName(fn);
    setLastName(ln);
    setEmail(u?.email ?? "");
    setDocumentId(u?.documentId ?? "");
    setPhone(u?.phone ?? "");
    const bd = u?.birthDate;
    setBirthDate(
      bd
        ? typeof bd === "string"
          ? bd.slice(0, 10)
          : new Date(bd).toISOString().slice(0, 10)
        : "",
    );
    setAddressCountry(u?.address?.country ?? "");
    setAddressCity(u?.address?.city ?? "");
    setAddressParish(u?.address?.parish ?? "");
    setAddressStreet(u?.address?.street ?? "");
    setEmergencyName(u?.emergencyContact?.name ?? "");
    setEmergencyPhone(u?.emergencyContact?.phone ?? "");
    setEmergencyRelationship(u?.emergencyContact?.relationship ?? "");
  }, [currentUser]);

  useEffect(() => {
    if (userError?.get) {
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message: t.banerErrorGetUser,
      }));
    }
    if (userBanner?.message) {
      setBanner((b) => ({
        ...b,
        visible: true,
        type: userBanner.type || "success",
        message:
          userBanner.message === "banerSuccess"
            ? t.banerSuccess
            : userBanner.type === "error" &&
                userBanner.message &&
                userBanner.message !== "banerError"
              ? userBanner.message
              : t.banerError,
      }));
    }
  }, [
    userError?.get,
    userBanner,
    t.banerErrorGetUser,
    t.banerSuccess,
    t.banerError,
  ]);

  const photoUri =
    profileImageUri || cachedProfileImageUri || getProfileImageUri(currentUser);
  useEffect(() => {
    setAvatarFailed(false);
  }, [photoUri]);
  const initials = getInitials(
    currentUser?.fullName ?? currentUser?.name ?? "",
  );

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setProfileImageUri(result.assets[0].uri);
    }
  };

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleEmailChange = (value) => {
    setEmail(value);
    setEmailError(!value.trim() || EMAIL_REGEX.test(value.trim()) ? "" : t.emailInvalid);
  };

  const handleDocumentIdChange = (value) => {
    setDocumentId(value);
    const isEcuadorian = (currentUser?.nationality ?? "").toLowerCase() === "ecuador";
    setDocumentIdError(
      !value.trim() || !isEcuadorian || validateEcuadorianCedula(value.trim())
        ? ""
        : t.nationalIdInvalid,
    );
  };

  const handlePhoneChange = (value) => {
    setPhone(value);
    const digits = value.replace(/\D/g, "");
    setPhoneError(!value.trim() || digits.length >= 7 ? "" : t.phoneInvalid);
  };

  const handleSave = async () => {
    if (emailError || documentIdError || phoneError) {
      setBanner({ visible: true, type: "error", message: t.banerError });
      return;
    }
    const payload = {};
    const combinedFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (combinedFullName) payload.fullName = combinedFullName;
    // email is intentionally NOT sent — the backend ignores it (verified email
    // change is a separate two-step flow on the profile screen).
    if (documentId.trim()) payload.documentId = documentId.trim();
    if (phone.trim()) payload.phone = phone.trim();
    if (birthDate.trim()) payload.birthDate = birthDate.trim();
    if (
      addressCountry.trim() ||
      addressCity.trim() ||
      addressParish.trim() ||
      addressStreet.trim()
    ) {
      payload.address = {
        country: addressCountry.trim(),
        city: addressCity.trim(),
        parish: addressParish.trim(),
        street: addressStreet.trim(),
      };
    }
    if (emergencyName.trim() || emergencyPhone.trim() || emergencyRelationship.trim()) {
      payload.emergencyContact = {
        name: emergencyName.trim(),
        phone: emergencyPhone.trim(),
        relationship: emergencyRelationship.trim(),
      };
    }
    if (profileImageUri) payload.profileImageUri = profileImageUri;

    const toSend = {};
    PATIENT_EDITABLE_KEYS.forEach((key) => {
      if (payload[key] !== undefined) toSend[key] = payload[key];
    });
    if (payload.profileImageUri)
      toSend.profileImageUri = payload.profileImageUri;

    try {
      await dispatch(updateUser(toSend)).unwrap();
      dispatch(getCurrentUser());
      setProfileImageUri(null);
      navigation.goBack();
    } catch (_) {
      // Banner from slice
    }
  };

  const handleBack = () => {
    dispatch(clearUserBanner());
    dispatch(clearUserError());
    navigation.navigate("ProfileMain");
  };

  if (userLoading.get) {
    return (
      <View style={[styles.keyboardView, styles.loaderContainer]}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TopBanner
        visible={banner.visible}
        type={banner.type}
        message={banner.message}
        onHide={() => setBanner((b) => ({ ...b, visible: false }))}
      />
      <ScrollView
        style={styles.mainContainer}
        contentContainerStyle={[
          styles.scrollContent,
          styles.editScrollContent,
          { paddingTop: Math.max(insets.top ?? 0, 48) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons
            name={ICONS.backArrow}
            size={SIZES.icon20}
            color={COLORS.blackText}
          />
        </TouchableOpacity>

        <View style={styles.avatarContainer}>
          {photoUri && !avatarFailed ? (
            <Image
              source={{
                uri: photoUri,
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
              }}
              style={styles.avatar}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.avatarEditButton}
            onPress={handlePickImage}
          >
            <Ionicons name={ICONS.pencil} size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <Text style={styles.editFieldLabel}>{t.firstName}</Text>
        <TextInput
          style={styles.input}
          placeholder={t.firstName}
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          placeholderTextColor={COLORS.ligthGreyText}
        />

        <Text style={styles.editFieldLabel}>{t.lastName}</Text>
        <TextInput
          style={styles.input}
          placeholder={t.lastName}
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          placeholderTextColor={COLORS.ligthGreyText}
        />

        <Text style={styles.editFieldLabel}>{t.email}</Text>
        {/* Email is NOT edited here: changing it requires a verified two-step
            code flow (GDPR Art. 16), which lives on the profile screen. Shown
            read-only so the field isn't a silent no-op. */}
        <TextInput
          style={[styles.input, { opacity: 0.6 }]}
          value={email}
          editable={false}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={COLORS.ligthGreyText}
        />
        <Text style={[styles.errorText, { color: COLORS.ligthGreyText }]}>
          {language === "en"
            ? "To change your email, use “Change email” on your profile."
            : "Para cambiar tu correo, usa “Cambiar correo” en tu perfil."}
        </Text>

        <Text style={styles.editFieldLabel}>{t.document}</Text>
        <TextInput
          style={[styles.input, documentIdError && styles.inputError]}
          placeholder={t.document}
          value={documentId}
          onChangeText={handleDocumentIdChange}
          placeholderTextColor={COLORS.ligthGreyText}
        />
        {documentIdError ? <Text style={styles.errorText}>{documentIdError}</Text> : null}

        <Text style={styles.editFieldLabel}>{t.phone}</Text>
        <TextInput
          style={[styles.input, phoneError && styles.inputError]}
          placeholder={t.phone}
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          placeholderTextColor={COLORS.ligthGreyText}
        />
        {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

        <Text style={styles.editFieldLabel}>{t.dateOfBirth}</Text>
        <DateField
          style={styles.dateButton}
          textStyle={styles.dateButtonText}
          value={birthDate ? new Date(`${birthDate}T12:00:00`) : null}
          onChange={(date) => setBirthDate(date.toISOString().slice(0, 10))}
          mode="date"
          maximumDate={new Date()}
          placeholder={language === "es" ? "AAAA-MM-DD" : "YYYY-MM-DD"}
          title={language === "es" ? "Seleccionar fecha" : "Select date"}
          confirmText={t.save}
          cancelText={language === "es" ? "Cancelar" : "Cancel"}
        />

        <Text style={styles.editFieldLabel}>{t.address}</Text>
        <TextInput
          style={styles.input}
          placeholder={t.country}
          value={addressCountry}
          onChangeText={setAddressCountry}
          placeholderTextColor={COLORS.ligthGreyText}
        />
        <TextInput
          style={styles.input}
          placeholder={t.city}
          value={addressCity}
          onChangeText={setAddressCity}
          placeholderTextColor={COLORS.ligthGreyText}
        />
        <TextInput
          style={styles.input}
          placeholder={t.parish}
          value={addressParish}
          onChangeText={setAddressParish}
          placeholderTextColor={COLORS.ligthGreyText}
        />
        <TextInput
          style={styles.input}
          placeholder={t.address}
          value={addressStreet}
          onChangeText={setAddressStreet}
          placeholderTextColor={COLORS.ligthGreyText}
        />

        <Text style={styles.editFieldLabel}>{t.emergencyContact}</Text>
        <TextInput
          style={styles.input}
          placeholder={t.emergencyContactName}
          value={emergencyName}
          onChangeText={setEmergencyName}
          autoCapitalize="words"
          placeholderTextColor={COLORS.ligthGreyText}
        />
        <TextInput
          style={styles.input}
          placeholder={t.emergencyContactPhone}
          value={emergencyPhone}
          onChangeText={setEmergencyPhone}
          keyboardType="phone-pad"
          placeholderTextColor={COLORS.ligthGreyText}
        />
        <TextInput
          style={styles.input}
          placeholder={t.emergencyContactRelationship}
          value={emergencyRelationship}
          onChangeText={setEmergencyRelationship}
          placeholderTextColor={COLORS.ligthGreyText}
        />

        <GlassButton
          variant="primary"
          style={[
            styles.saveButton,
            styles.saveButtonBottom,
            userLoading.update && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={userLoading.update}
        >
          {userLoading.update ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>{t.save}</Text>
          )}
        </GlassButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

EditProfileScreen.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
  }).isRequired,
};
