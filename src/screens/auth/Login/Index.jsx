import React, { useState, useMemo, useEffect, useRef } from "react";
import GlassButton from "../../../components/GlassButton";
import PropTypes from "prop-types";
import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  Animated,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, clearLoginError } from "../../../redux/authSlice";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import STRINGS from "../../../constants/strings";
import styles from "./styles";
import { COLORS } from "../../../styles/theme";
import { isValidEmail } from "../../../utils/errorMessages";

const CARD_WIDTH_RATIO = 0.92;
const CARD_MAX_WIDTH = 440;
const CARD_MIN_WIDTH = 280;

const LoginScreen = ({ navigation }) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const language = useSelector((state) => state.language.language);
  const { loading, error } = useSelector((state) => state.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: null, password: null });
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [displayedTipIndex, setDisplayedTipIndex] = useState(0);
  const messageOpacity = useRef(new Animated.Value(1)).current;

  const dispatch = useDispatch();
  const t = STRINGS[language]?.login || STRINGS.es.login;
  const tips = STRINGS[language]?.home?.welfareTips ?? STRINGS.es.home.welfareTips ?? [];
  const suggestion = STRINGS[language]?.home?.suggestion ?? STRINGS.es.home.suggestion;

  useEffect(() => {
    if (tips.length <= 1) return;
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 6000);
    return () => clearInterval(id);
  }, [tips.length]);

  useEffect(() => {
    if (tipIndex === displayedTipIndex) return;
    Animated.timing(messageOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setDisplayedTipIndex(tipIndex);
      Animated.timing(messageOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    });
  }, [tipIndex, displayedTipIndex, messageOpacity]);

  const responsiveStyles = useMemo(() => {
    const contentWidth = Math.max(
      CARD_MIN_WIDTH,
      Math.min(screenWidth * CARD_WIDTH_RATIO, CARD_MAX_WIDTH)
    );
    const contentPaddingH = Math.max(24, Math.round(screenWidth * 0.06));
    const contentPaddingV = Math.max(28, Math.min(40, Math.round(screenHeight * 0.04)));
    const iconSize = Math.max(72, Math.min(Math.round(screenWidth * 0.22), 100));
    const gutter = Math.max(20, Math.min(Math.round(screenWidth * 0.05), 40));
    const isWeb = Platform.OS === "web";
    return {
      gradient: { paddingHorizontal: gutter },
      scrollContent: { minHeight: isWeb ? undefined : screenHeight * 0.5 },
      content: {
        width: contentWidth,
        maxWidth: isWeb ? 420 : screenWidth - gutter * 2,
        paddingHorizontal: contentPaddingH,
        paddingVertical: contentPaddingV,
      },
      welfareIcon: { width: iconSize, height: iconSize },
    };
  }, [screenWidth, screenHeight]);

  useFocusEffect(
    React.useCallback(() => {
      dispatch(clearLoginError());
    }, [dispatch])
  );

  // Mandatory email verification (S1): redirect straight to the code-entry screen
  useEffect(() => {
    if (error?.login?.code === "EMAIL_NOT_VERIFIED") {
      dispatch(clearLoginError());
      navigation.navigate("VerifyEmail", { email });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error?.login]);

  // Blocked account: show a modal (localized in-app), like the approval notice,
  // instead of an inline error line.
  useEffect(() => {
    if (error?.login?.code === "ACCOUNT_BLOCKED") {
      setShowBlockedModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error?.login]);

  const dismissBlockedModal = () => {
    setShowBlockedModal(false);
    dispatch(clearLoginError());
  };

  const handleLogin = () => {
    const nextErrors = { email: null, password: null };
    if (!email.trim()) {
      nextErrors.email = t.emailRequired;
    } else if (!isValidEmail(email)) {
      nextErrors.email = t.invalidEmail;
    }
    if (!password) {
      nextErrors.password = t.passwordRequired;
    }
    setFieldErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;
    dispatch(loginUser({ email, password }));
  };

  const handleSignUp = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "SingUp" }],
    });
  };

  const handleForgotPassword = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "ForgotPasswordRequest" }],
    });
  };

  // Blocked shows in the modal, not inline — keep it out of the inline error line.
  const backendError =
    error?.login?.code === "ACCOUNT_BLOCKED"
      ? null
      : typeof error?.login === "string"
        ? error.login
        : error?.login?.message;

  return (
    <View style={styles.wrapper}>
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <LinearGradient
          colors={[
            "rgba(112, 193, 227, 0.35)",
            "rgba(112, 193, 227, 0.12)",
            COLORS.screenBackground,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, responsiveStyles.gradient]}
        >
          <ScrollView
            contentContainerStyle={[styles.scrollContent, responsiveStyles.scrollContent]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.content, responsiveStyles.content]}>
              {navigation.canGoBack() ? (
                <View style={styles.backRow}>
                  <TouchableOpacity
                    style={styles.backTouch}
                    onPress={() => navigation.goBack()}
                  >
                    <Ionicons name="arrow-back" size={24} color={COLORS.greyText} />
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.iconContainer}>
                <Image
                  source={require("../../../assets/logo.png")}
                  style={[styles.welfareIcon, responsiveStyles.welfareIcon]}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.title}>
                {t.welcomeBack ?? t.title}
              </Text>
              <Animated.Text style={[styles.welfareMessage, { opacity: messageOpacity }]}>
                {tips[displayedTipIndex] ?? suggestion ?? t.accessYourAccount}
              </Animated.Text>

              <View style={[styles.inputRow, fieldErrors.email && styles.inputErrorBorder]}>
                <Ionicons
                  name="mail-outline"
                  size={22}
                  color={COLORS.iconGrey}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t.emailPlaceHolder}
                  placeholderTextColor={COLORS.ligthGreyText}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: null }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {fieldErrors.email ? (
                <Text style={styles.error}>{fieldErrors.email}</Text>
              ) : null}

              <View style={styles.passwordRow}>
                <View style={[styles.inputRow, fieldErrors.password && styles.inputErrorBorder]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={22}
                    color={COLORS.iconGrey}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t.passwordPlaceHolder}
                    placeholderTextColor={COLORS.ligthGreyText}
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: null }));
                    }}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color={COLORS.iconGrey}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              {fieldErrors.password ? (
                <Text style={styles.error}>{fieldErrors.password}</Text>
              ) : null}

              {backendError && !fieldErrors.email && !fieldErrors.password ? (
                <Text style={styles.error}>{backendError}</Text>
              ) : null}

              <View style={styles.rememberForgotRow}>
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgotPassword}>{t.forgotPassword}</Text>
                </TouchableOpacity>
              </View>

              {loading.login && (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="small" color={COLORS.secondary} />
                </View>
              )}

              <GlassButton
                variant="primary"
                style={[styles.button, loading.login && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading.login}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>{t.logIn}</Text>
              </GlassButton>

              <View style={styles.signupRow}>
                <Text style={styles.signupPrompt}>{t.noAccount}</Text>
                <TouchableOpacity onPress={handleSignUp}>
                  <Text style={styles.signupLink}>{t.createAccount}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>

      {/* Blocked-account notice — modal overlay, localized in-app. */}
      <Modal
        visible={showBlockedModal}
        transparent
        animationType="fade"
        onRequestClose={dismissBlockedModal}
        statusBarTranslucent
      >
        <View style={styles.blockedOverlay}>
          <View style={styles.blockedCard}>
            <View style={styles.blockedIconWrap}>
              <Ionicons name="lock-closed" size={26} color={COLORS.error} />
            </View>
            <Text style={styles.blockedTitle}>{t.accountBlockedTitle}</Text>
            <Text style={styles.blockedMessage}>{t.accountBlockedMessage}</Text>
            <GlassButton
              variant="primary"
              style={styles.blockedButton}
              onPress={dismissBlockedModal}
              activeOpacity={0.85}
            >
              <Text style={styles.blockedButtonText}>{t.understood}</Text>
            </GlassButton>
          </View>
        </View>
      </Modal>
    </View>
  );
};

LoginScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    reset: PropTypes.func.isRequired,
    goBack: PropTypes.func.isRequired,
    canGoBack: PropTypes.func.isRequired,
  }).isRequired,
};

export default LoginScreen;
