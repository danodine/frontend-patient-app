import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import axiosInstance from "../utils/axiosInstance";
import { LEGAL_URLS } from "../../config";
import { COLORS } from "../styles/theme";

// Blocking re-consent prompt (GDPR Art. 7) for patient accounts created before
// consent capture, or when a policy version was bumped. Cannot be dismissed.
export default function ReConsentModal({ visible, onAccepted }) {
  const language = useSelector((s) => s.language?.language) || "es";
  const es = language !== "en";
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [health, setHealth] = useState(false);
  const [saving, setSaving] = useState(false);

  const ready = terms && privacy && health;

  const submit = async () => {
    if (!ready) return;
    setSaving(true);
    try {
      await axiosInstance.post("/api/patients/me/consent/accept", {
        acceptedTerms: true,
        acceptedPrivacy: true,
        acceptedHealthData: true,
      });
      onAccepted();
    } catch (e) {
      setSaving(false);
    }
  };

  const rows = [
    { k: "terms", v: terms, s: setTerms, url: LEGAL_URLS.terms, label: es ? "Acepto los Términos del servicio." : "I accept the Terms of Service." },
    { k: "privacy", v: privacy, s: setPrivacy, url: LEGAL_URLS.privacy, label: es ? "He leído y acepto la Política de privacidad." : "I have read and accept the Privacy Policy." },
    { k: "health", v: health, s: setHealth, url: LEGAL_URLS.healthDataConsent, label: es ? "Consiento el tratamiento de mis datos de salud." : "I consent to processing my health data." },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.blackText, marginBottom: 8 }}>
            {es ? "Actualización de consentimiento" : "Consent update"}
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.ligthGreyText, marginBottom: 16 }}>
            {es
              ? "Para seguir usando la aplicación, revisa y acepta lo siguiente:"
              : "To keep using the app, please review and accept:"}
          </Text>
          {rows.map((r) => (
            <View key={r.k} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => r.s(!r.v)}
                activeOpacity={0.7}
                style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, flex: 1 }}
              >
                <Ionicons
                  name={r.v ? "checkbox" : "square-outline"}
                  size={22}
                  color={r.v ? COLORS.secondary : COLORS.ligthGreyText}
                  style={{ marginTop: 1 }}
                />
                <Text style={{ flex: 1, fontSize: 13, color: COLORS.blackText }}>{r.label}</Text>
              </TouchableOpacity>
              <Text
                onPress={() => Linking.openURL(r.url)}
                style={{ fontSize: 13, color: COLORS.secondary, textDecorationLine: "underline", marginTop: 1 }}
              >
                {es ? "Leer" : "Read"}
              </Text>
            </View>
          ))}
          <TouchableOpacity
            onPress={submit}
            disabled={saving || !ready}
            style={{
              marginTop: 12,
              backgroundColor: COLORS.secondary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              opacity: saving || !ready ? 0.5 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {es ? "Aceptar y continuar" : "Accept and continue"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
