import React, { useEffect, useState } from "react";
import GlassButton from "../../../components/GlassButton";
import {
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import PropTypes from "prop-types";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { signupUser, clearSignupError } from "../../../redux/authSlice";
import { LEGAL_URLS } from "../../../../config";
import { isStrongPassword, replaceVal, validateEcuadorianCedula } from "../../../utils/helpers";
import STRINGS from "../../../constants/strings";
import { nationalities } from "../../../constants/vars";
import { getFlagEmoji } from "../../../utils/flagEmoji";
import TopBanner from "../../dashboard/components/TopBanner/Index";
import PasswordInput from "../../../components/PasswordInput";
import styles from "./styles";
import { COLORS, FONT_SIZES } from "../../../styles/theme";

const SingUpScreen = ({ navigation }) => {
  const language = useSelector((state) => state.language.language);
  const { error, loading } = useSelector((state) => state.auth);
  const text = STRINGS[language]?.signupUser || STRINGS.es.signupUser;
  const dispatch = useDispatch();

  const [firstName, setFirstName] = useState("");
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [lastName, setLastName] = useState("");
  const [lastNameTouched, setLastNameTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordConfirmError, setPasswordConfirmError] = useState("");
  const [passwordConfirmTouched, setPasswordConfirmTouched] = useState(false);

  const [nationalId, setNationalId] = useState("");
  const [nationalIdError, setNationalIdError] = useState("");
  const [nationalIdTouched, setNationalIdTouched] = useState(false);

  const [nationality, setNationality] = useState("");
  const [nationalityError, setNationalityError] = useState("");
  const [nationalityTouched, setNationalityTouched] = useState(false);
  // Consent (GDPR Art. 7) — all required to register.
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedHealthData, setAcceptedHealthData] = useState(false);

  const [banner, setBanner] = useState({
    visible: false,
    type: "",
    message: "",
  });

  useEffect(() => {
    if (error?.signup) {
      const errStr = String(error.signup);
      const [type, field] = errStr.split(",");
      if (type === "dupKey" && field === "email") {
        setBanner({
          visible: true,
          type: "error",
          message: replaceVal(text.emailDuplicate, email || ""),
        });
      } else {
        setBanner({
          visible: true,
          type: "error",
          message: text.errorFromDb,
        });
      }
      dispatch(clearSignupError());
    }
  }, [error?.signup]);

  const handleRegister = async () => {
    setNationalityTouched(true);
    setFirstNameTouched(true);
    setLastNameTouched(true);
    if (!nationality) {
      setNationalityError(text.nationalityRequired ?? "Please select nationality");
      return;
    }
    if (!acceptedTerms || !acceptedPrivacy || !acceptedHealthData) {
      setBanner({
        visible: true,
        type: "error",
        message:
          language === "es"
            ? "Debes aceptar los Términos, la Política de privacidad y el consentimiento de datos de salud."
            : "You must accept the Terms, Privacy Policy, and health-data consent.",
      });
      return;
    }
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await dispatch(
        signupUser({
          name: fullName,
          email,
          password,
          passwordConfirm,
          nationalId: nationalId.trim(),
          nationality: nationality.trim(),
          acceptedTerms,
          acceptedPrivacy,
          acceptedHealthData,
        })
      ).unwrap();
      // Mandatory email verification (S1): account isn't usable yet.
      navigation.navigate("VerifyEmail", { email });
    } catch (_) {
      // Error shown via banner in useEffect
    }
  };

  const handleEmail = (value) => {
    setEmail(value);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(value ? (emailRegex.test(value) ? "" : text.emailInvalid) : "");
  };

  const handlePassword = (value) => {
    setPassword(value);
    setPasswordError(
      value ? (isStrongPassword(value) ? "" : text.passwordInvalid) : ""
    );
    if (passwordConfirm) {
      setPasswordConfirmError(
        value === passwordConfirm ? "" : text.passwordMismatch
      );
    }
  };

  const handlePasswordConfirm = (value) => {
    setPasswordConfirm(value);
    setPasswordConfirmError(value === password ? "" : text.passwordMismatch);
  };

  const validateNationalId = (value, nationalityValue) => {
    if (!value) return "";
    if (nationalityValue === "ecuador" && !validateEcuadorianCedula(value)) {
      return text.nationalIdInvalid;
    }
    return "";
  };

  const handleNationalId = (value) => {
    setNationalId(value);
    setNationalIdError(validateNationalId(value, nationality));
  };

  const handleNationality = (item) => {
    const value = item?.value ?? "";
    setNationality(value);
    setNationalityError("");
    setNationalIdError(validateNationalId(nationalId, value));
  };

  const nationalitiesWithFlags = nationalities.map((n) => ({
    ...n,
    label: `${getFlagEmoji(n.code)} ${n.label}`,
  }));

  const isFormValid =
    firstName.trim() &&
    lastName.trim() &&
    email &&
    !emailError &&
    nationalId.trim() &&
    !nationalIdError &&
    nationality &&
    password &&
    !passwordError &&
    passwordConfirm &&
    !passwordConfirmError;

  // The submit button must be disabled — AND visibly greyed — until every field
  // is valid AND all consent boxes are checked. Both the style and the disabled
  // prop use this single flag so the look always matches the behaviour.
  const isSubmitDisabled =
    !isFormValid ||
    !acceptedTerms ||
    !acceptedPrivacy ||
    !acceptedHealthData ||
    loading.signup;

  return (
    <View style={styles.wrapper}>
      <TopBanner
        visible={banner.visible}
        type={banner.type}
        message={banner.message}
        onHide={() => setBanner((b) => ({ ...b, visible: false }))}
      />
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <LinearGradient
          colors={COLORS.main}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate("Login")}
            >
              <Ionicons
                name="arrow-back-outline"
                size={24}
                color={COLORS.blackText}
              />
            </TouchableOpacity>

            <View style={styles.card}>
              {[
                <Text key="title" style={styles.title}>
                  {text.createAccountTitle1}
                  <Text style={styles.titleBold}>{text.createAccountTitle2}</Text>
                </Text>,
                <Text key="lfirstname" style={styles.label}>{text.firstName}</Text>,
                <TextInput
                  key="firstName"
                  style={[
                    styles.input,
                    !firstName.trim() && firstNameTouched && styles.inputError,
                  ]}
                  value={firstName}
                  onChangeText={setFirstName}
                  onBlur={() => setFirstNameTouched(true)}
                  placeholder={text.firstNamePlaceholder}
                  placeholderTextColor={COLORS.ligthGreyText}
                  autoCapitalize="words"
                />,
                !firstName.trim() && firstNameTouched && (
                  <Text key="firstNameErr" style={styles.errorText}>{text.firstNameRequired}</Text>
                ),
                <Text key="llastname" style={styles.label}>{text.lastName}</Text>,
                <TextInput
                  key="lastName"
                  style={[
                    styles.input,
                    !lastName.trim() && lastNameTouched && styles.inputError,
                  ]}
                  value={lastName}
                  onChangeText={setLastName}
                  onBlur={() => setLastNameTouched(true)}
                  placeholder={text.lastNamePlaceholder}
                  placeholderTextColor={COLORS.ligthGreyText}
                  autoCapitalize="words"
                />,
                !lastName.trim() && lastNameTouched && (
                  <Text key="lastNameErr" style={styles.errorText}>{text.lastNameRequired}</Text>
                ),
                <Text key="lnid" style={styles.label}>{text.nationalId}</Text>,
                <TextInput
                  key="nationalId"
                  style={[
                    styles.input,
                    nationalIdError && nationalIdTouched && styles.inputError,
                  ]}
                  value={nationalId}
                  onChangeText={handleNationalId}
                  onBlur={() => setNationalIdTouched(true)}
                  placeholder={text.nationalIDPlaceholder}
                  placeholderTextColor={COLORS.ligthGreyText}
                  keyboardType="numeric"
                />,
                nationalIdError && nationalIdTouched && (
                  <Text key="nidErr" style={styles.errorText}>{nationalIdError}</Text>
                ),
                <Text key="lnat" style={styles.label}>{text.nationality}</Text>,
                <Dropdown
                  key="nationality"
                  style={[
                    styles.input,
                    styles.dropdown,
                    nationalityError && nationalityTouched && styles.inputError,
                  ]}
                  data={nationalitiesWithFlags}
                  labelField="label"
                  valueField="value"
                  value={nationality}
                  onChange={handleNationality}
                  onBlur={() => setNationalityTouched(true)}
                  placeholder={text.nationalityPlaceholder}
                  placeholderStyle={{
                    fontSize: FONT_SIZES.inputText,
                    color: COLORS.ligthGreyText,
                  }}
                  itemTextStyle={{ fontSize: FONT_SIZES.inputText }}
                  selectedTextStyle={{ fontSize: FONT_SIZES.inputText }}
                />,
                nationalityError && nationalityTouched && (
                  <Text key="natErr" style={styles.errorText}>{nationalityError}</Text>
                ),
                <Text key="lemail" style={styles.label}>{text.email}</Text>,
                <TextInput
                  key="email"
                  style={[
                    styles.input,
                    emailError && emailTouched && styles.inputError,
                  ]}
                  value={email}
                  onChangeText={handleEmail}
                  onBlur={() => setEmailTouched(true)}
                  placeholder={text.emailPlaceholder}
                  placeholderTextColor={COLORS.ligthGreyText}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />,
                emailError && emailTouched && (
                  <Text key="emailErr" style={styles.errorText}>{emailError}</Text>
                ),
                <Text key="lpass" style={styles.label}>{text.password}</Text>,
                <PasswordInput
                  key="password"
                  style={[
                    styles.input,
                    passwordError && passwordTouched && styles.inputError,
                  ]}
                  value={password}
                  onChangeText={handlePassword}
                  onBlur={() => setPasswordTouched(true)}
                  placeholder={text.passwordPlaceholder}
                  placeholderTextColor={COLORS.ligthGreyText}
                />,
                passwordError && passwordTouched && (
                  <Text key="passErr" style={styles.errorText}>{passwordError}</Text>
                ),
                <Text key="lconfirm" style={styles.label}>{text.confirmPassword}</Text>,
                <PasswordInput
                  key="passwordConfirm"
                  style={[
                    styles.input,
                    passwordConfirmError &&
                      passwordConfirmTouched &&
                      styles.inputError,
                  ]}
                  value={passwordConfirm}
                  onChangeText={handlePasswordConfirm}
                  onBlur={() => setPasswordConfirmTouched(true)}
                  placeholder={text.passwordPlaceholder}
                  placeholderTextColor={COLORS.ligthGreyText}
                />,
                passwordConfirmError && passwordConfirmTouched && (
                  <Text key="confirmErr" style={styles.errorText}>{passwordConfirmError}</Text>
                ),
              <View key="consent" style={{ marginTop: 8, marginBottom: 4, gap: 10 }}>
                {[
                  {
                    k: "terms",
                    val: acceptedTerms,
                    set: setAcceptedTerms,
                    url: LEGAL_URLS.terms,
                    label:
                      language === "es"
                        ? "Acepto los Términos del servicio."
                        : "I accept the Terms of Service.",
                  },
                  {
                    k: "privacy",
                    val: acceptedPrivacy,
                    set: setAcceptedPrivacy,
                    url: LEGAL_URLS.privacy,
                    label:
                      language === "es"
                        ? "He leído y acepto la Política de privacidad."
                        : "I have read and accept the Privacy Policy.",
                  },
                  {
                    k: "health",
                    val: acceptedHealthData,
                    set: setAcceptedHealthData,
                    url: LEGAL_URLS.healthDataConsent,
                    label:
                      language === "es"
                        ? "Doy mi consentimiento explícito para el tratamiento de mis datos de salud, necesario para brindarme atención médica."
                        : "I give my explicit consent to process my health data, required to provide me medical care.",
                  },
                ].map((c) => (
                  <View
                    key={c.k}
                    style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}
                  >
                    <TouchableOpacity
                      onPress={() => c.set(!c.val)}
                      activeOpacity={0.7}
                      style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, flex: 1 }}
                    >
                      <Ionicons
                        name={c.val ? "checkbox" : "square-outline"}
                        size={22}
                        color={c.val ? COLORS.secondary : COLORS.ligthGreyText}
                        style={{ marginTop: 1 }}
                      />
                      <Text style={{ flex: 1, fontSize: 13, color: COLORS.blackText }}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                    <Text
                      onPress={() => Linking.openURL(c.url)}
                      style={{
                        fontSize: 13,
                        color: COLORS.secondary,
                        textDecorationLine: "underline",
                        marginTop: 1,
                      }}
                    >
                      {language === "es" ? "Leer" : "Read"}
                    </Text>
                  </View>
                ))}
              </View>,
              <GlassButton
                variant="primary"
                key="submit"
                style={[
                  styles.button,
                  isSubmitDisabled && styles.buttonDisabled,
                ]}
                onPress={handleRegister}
                disabled={isSubmitDisabled}
                activeOpacity={0.85}
              >
                {loading.signup ? (
                  <ActivityIndicator size="small" color={COLORS.blackText} />
                ) : (
                  <Text style={styles.buttonText}>
                    {text.createAccountButton}
                  </Text>
                )}
              </GlassButton>,
              ].filter(Boolean)}
            </View>

            <View style={styles.loginRow}>
              <Text style={styles.loginPrompt}>{STRINGS[language]?.login?.haveAccount ?? "¿Ya tienes cuenta? "}</Text><TouchableOpacity onPress={() => navigation.navigate("Login")}><Text style={styles.loginLink}>{STRINGS[language]?.login?.logIn ?? "Iniciar sesión"}</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
};

SingUpScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

export default SingUpScreen;
