import React, { useState } from "react";
import GlassButton from "../../../components/GlassButton";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { COLORS } from "../../../styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useDispatch, useSelector } from "react-redux";
import { requestPasswordReset } from "../../../redux/authSlice";
import STRINGS from "../../../constants/strings";
import TopBanner from "../../dashboard/components/TopBanner/Index";

import styles from "./styles";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPasswordRequest = () => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);
  const language = useSelector((state) => state.language.language);
  const text = STRINGS[language]?.forgotPasswordRequest || STRINGS.es.forgotPasswordRequest;

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [banner, setBanner] = useState({ visible: false, type: "", message: "" });
  const navigation = useNavigation();

  const handleEmailChange = (value) => {
    setEmail(value);
    if (!value) {
      setEmailError("");
    } else {
      setEmailError(EMAIL_REGEX.test(value) ? "" : text.emailInvalid);
    }
  };

  const handleForgotPassword = async () => {
    setEmailTouched(true);
    if (!email) {
      setEmailError(text.emailRequired);
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setEmailError(text.emailInvalid);
      return;
    }

    const resultAction = await dispatch(requestPasswordReset({ email }));
    if (requestPasswordReset.fulfilled.match(resultAction)) {
      setBanner({
        visible: true,
        type: "success",
        message: typeof resultAction.payload === "string" ? resultAction.payload : text.successTitle,
      });
      navigation.navigate("ForgotPasswordReset", { email });
    } else {
      const payload = resultAction.payload;
      const message = typeof payload === "string" ? payload : payload?.message;
      setBanner({
        visible: true,
        type: "error",
        message: message || text.genericError,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TopBanner
        visible={banner.visible}
        type={banner.type}
        message={banner.message}
        onHide={() => setBanner((b) => ({ ...b, visible: false }))}
      />
      <LinearGradient
        colors={COLORS.main}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate("Login")}
          >
            <Ionicons
              name="arrow-back-outline"
              size={24}
              color={COLORS.black}
            />
          </TouchableOpacity>
          <Text style={styles.title}>{text.title}</Text>
          <Text style={styles.subtitle}>{text.subtitle}</Text>

          <TextInput
            style={[styles.input, emailError && emailTouched && styles.inputError]}
            placeholder={text.emailPlaceholder}
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={handleEmailChange}
            onBlur={() => setEmailTouched(true)}
          />
          {emailError && emailTouched ? (
            <Text style={styles.errorText}>{emailError}</Text>
          ) : null}

          <GlassButton
            variant="primary"
            style={styles.button}
            onPress={handleForgotPassword}
            disabled={loading.requestPasswordReset}
          >
            {loading.requestPasswordReset ? (
              <ActivityIndicator size="small" color={COLORS.blackText} />
            ) : (
              <Text style={styles.buttonText}>{text.sendCode}</Text>
            )}
          </GlassButton>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordRequest;
