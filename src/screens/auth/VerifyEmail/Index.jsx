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
import { verifyEmail, resendVerification } from "../../../redux/authSlice";
import STRINGS from "../../../constants/strings";
import TopBanner from "../../dashboard/components/TopBanner/Index";

import styles from "./styles";

const VerifyEmail = () => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);
  const language = useSelector((state) => state.language.language);
  const text = STRINGS[language]?.verifyEmail || STRINGS.es.verifyEmail;

  const [code, setCode] = useState("");
  const [banner, setBanner] = useState({ visible: false, type: "", message: "" });

  const navigation = useNavigation();
  const route = useRoute();
  const { email } = route.params || {};

  if (!email) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }}>
        <LinearGradient colors={COLORS.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
          <View style={styles.container}>
            <Text style={styles.subtitle}>{text.missingContext}</Text>
            <GlassButton
              variant="primary" style={styles.button} onPress={() => navigation.navigate("Login")}>
              <Text style={styles.buttonText}>{text.goToLogin}</Text>
            </GlassButton>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    );
  }

  const handleVerify = async () => {
    if (!code) {
      setBanner({ visible: true, type: "error", message: text.codeRequired });
      return;
    }
    const resultAction = await dispatch(verifyEmail({ email, code }));
    if (verifyEmail.fulfilled.match(resultAction)) {
      setBanner({ visible: true, type: "success", message: text.success });
      // A token was just stored — StackNavigator switches to the app stack automatically.
    } else {
      const payload = resultAction.payload;
      const message = typeof payload === "string" ? payload : payload?.message;
      setBanner({ visible: true, type: "error", message: message || text.genericError });
    }
  };

  const handleResend = async () => {
    const resultAction = await dispatch(resendVerification({ email }));
    if (resendVerification.fulfilled.match(resultAction)) {
      setBanner({
        visible: true,
        type: "success",
        message: typeof resultAction.payload === "string" ? resultAction.payload : text.codeSent,
      });
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
          onPress={() => navigation.navigate("Login")}
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
            value={code}
            onChangeText={setCode}
          />

          <GlassButton
            variant="primary"
            style={styles.button}
            onPress={handleVerify}
            disabled={loading.verifyEmail}
          >
            {loading.verifyEmail ? (
              <ActivityIndicator size="small" color={COLORS.blackText} />
            ) : (
              <Text style={styles.buttonText}>{text.verify}</Text>
            )}
          </GlassButton>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={loading.resendVerification}
          >
            {loading.resendVerification ? (
              <ActivityIndicator size="small" color={COLORS.secondary} />
            ) : (
              <Text style={styles.resendButtonText}>{text.resendCode}</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

export default VerifyEmail;
