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
import { useNavigation, useRoute } from "@react-navigation/native";
import { COLORS } from "../../../styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useDispatch, useSelector } from "react-redux";
import { resetPassword } from "../../../redux/authSlice";
import { isStrongPassword } from "../../../utils/helpers";
import STRINGS from "../../../constants/strings";
import TopBanner from "../../dashboard/components/TopBanner/Index";
import PasswordInput from "../../../components/PasswordInput";

// Import the styles you will create
import styles from "./styles";

const ForgotPasswordReset = () => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);
  const language = useSelector((state) => state.language.language);
  const text = STRINGS[language]?.forgotPasswordReset || STRINGS.es.forgotPasswordReset;

  const [resetCode, setResetCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordConfirmError, setPasswordConfirmError] = useState("");
  const [passwordConfirmTouched, setPasswordConfirmTouched] = useState(false);
  const [banner, setBanner] = useState({ visible: false, type: "", message: "" });

  const navigation = useNavigation();
  const route = useRoute();
  const { email } = route.params;

  const handlePassword = (value) => {
    setPassword(value);
    setPasswordError(value ? (isStrongPassword(value) ? "" : text.passwordInvalid) : "");
    if (passwordConfirm) {
      setPasswordConfirmError(value === passwordConfirm ? "" : text.passwordMismatch);
    }
  };

  const handlePasswordConfirm = (value) => {
    setPasswordConfirm(value);
    setPasswordConfirmError(value === password ? "" : text.passwordMismatch);
  };

  const handleResetPassword = async () => {
    setPasswordTouched(true);
    setPasswordConfirmTouched(true);
    if (!resetCode || !password || !passwordConfirm) {
      setBanner({ visible: true, type: "error", message: text.fieldsRequired });
      return;
    }
    if (!isStrongPassword(password)) {
      setPasswordError(text.passwordInvalid);
      return;
    }
    if (password !== passwordConfirm) {
      setPasswordConfirmError(text.passwordMismatch);
      return;
    }

    const resultAction = await dispatch(
      resetPassword({ resetCode, password, passwordConfirm })
    );

    if (resetPassword.fulfilled.match(resultAction)) {
      setBanner({ visible: true, type: "success", message: text.successMessage });
      navigation.navigate("Login");
    } else {
      const payload = resultAction.payload;
      const message = typeof payload === "string" ? payload : payload?.message;
      setBanner({ visible: true, type: "error", message: message || text.genericError });
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back-outline" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <View style={styles.container}>
          <Text style={styles.title}>{text.title}</Text>
          <Text style={styles.subtitle}>{text.subtitle}</Text>
          <Text style={styles.emailText}>{text.codeSentTo.replace("{email}", email || "")}</Text>

          <TextInput
            style={styles.input}
            placeholder={text.codePlaceholder}
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="number-pad"
            autoCapitalize="none"
            value={resetCode}
            onChangeText={setResetCode}
          />

          <PasswordInput
            style={[styles.input, passwordError && passwordTouched && styles.inputError]}
            placeholder={text.passwordPlaceholder}
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            value={password}
            onChangeText={handlePassword}
            onBlur={() => setPasswordTouched(true)}
          />
          {passwordError && passwordTouched ? (
            <Text style={styles.errorText}>{passwordError}</Text>
          ) : null}

          <PasswordInput
            style={[
              styles.input,
              passwordConfirmError && passwordConfirmTouched && styles.inputError,
            ]}
            placeholder={text.passwordConfirmPlaceholder}
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            value={passwordConfirm}
            onChangeText={handlePasswordConfirm}
            onBlur={() => setPasswordConfirmTouched(true)}
          />
          {passwordConfirmError && passwordConfirmTouched ? (
            <Text style={styles.errorText}>{passwordConfirmError}</Text>
          ) : null}

          <GlassButton
            variant="primary"
            style={styles.button}
            onPress={handleResetPassword}
            disabled={loading.resetPassword}
          >
            {loading.resetPassword ? (
              <ActivityIndicator size="small" color={COLORS.blackText} />
            ) : (
              <Text style={styles.buttonText}>{text.resetPassword}</Text>
            )}
          </GlassButton>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordReset;
