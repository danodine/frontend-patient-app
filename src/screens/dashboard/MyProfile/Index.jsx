import React, { useState, useEffect, useCallback, useRef } from "react";
import GlassButton from "../../../components/GlassButton";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  Platform,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import {
  getCurrentUser,
  clearCurrentUser,
  deleteMe,
} from "../../../redux/userSlice";
import { logoutUser, changePassword, requestPasswordChangeCode } from "../../../redux/authSlice";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PropTypes from "prop-types";
import TopBanner from "../components/TopBanner/Index";
import PasswordInput from "../../../components/PasswordInput";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, ICONS, SIZES, GRADIENT_COLORS, FONT_FAMILY } from "../../../styles/theme";
import styles from "./styles";
import STRINGS from "../../../constants/strings";
import { BASE_URL } from "../../../../config";
import { patientMedicationsService } from "../../../services/patientMedicationsService";
import axiosInstance from "../../../utils/axiosInstance";
import * as secureStorage from "../../../utils/secureStorage";
import { useBottomBarSearch } from "../../../contexts/BottomBarSearchContext";
import { isStrongPassword } from "../../../utils/helpers";
import { spokenLanguages } from "../../../constants/vars";
import CollapsibleSection from "./CollapsibleSection";
import FieldEditModal from "./FieldEditModal";

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

function formatBirthDate(value) {
  if (value == null || value === "") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const WINDOW_HEIGHT = Dimensions.get("window").height;

function runOpenAnimation(slideAnim, overlayOpacity) {
  slideAnim.setValue(WINDOW_HEIGHT);
  overlayOpacity.setValue(0);
  Animated.parallel([
    Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    Animated.timing(overlayOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
  ]).start();
}

function runCloseAnimation(slideAnim, overlayOpacity, onDone) {
  Animated.parallel([
    Animated.timing(slideAnim, { toValue: WINDOW_HEIGHT, duration: 180, useNativeDriver: true }),
    Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
  ]).start(({ finished }) => {
    if (finished) onDone();
  });
}

// Hoisted to module scope so its component identity stays stable across parent
// re-renders. Defined inside ProfileScreen, the type was recreated on every
// keystroke, remounting the modal (replaying the open animation + dropping input
// focus) — which is why typing in the contact-support fields kept "re-opening"
// the modal. As a top-level component it reads insets via its own hook.
function FullScreenModal({
  visible,
  onClose,
  title,
  children,
  loading,
  slideAnim,
  overlayOpacity,
}) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      runOpenAnimation(slideAnim, overlayOpacity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = () => {
    runCloseAnimation(slideAnim, overlayOpacity, onClose);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          { opacity: overlayOpacity, justifyContent: "flex-end" },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <Animated.View
          style={[
            styles.modalBox,
            {
              transform: [{ translateY: slideAnim }],
              marginTop: Math.max(insets.top, 20) + 32,
              marginBottom: Math.max(insets.bottom, 20) + 16,
              borderRadius: 20,
            },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.blackText} />
              </TouchableOpacity>
            </View>
            {loading ? (
              <View style={styles.modalLoader}>
                <ActivityIndicator size="large" color={COLORS.secondary} />
              </View>
            ) : (
              <View style={{ flex: 1 }}>{children}</View>
            )}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default function ProfileScreen({ navigation }) {
  const language = useSelector((state) => state.language.language);
  const {
    currentUser: usersCurrentUser,
    cachedProfileImageUri,
    userBanner,
    loading: userLoading,
    error: userError,
  } = useSelector((state) => state.users);
  const authUser = useSelector((state) => state.auth?.user);
  const currentUser =
    usersCurrentUser && Object.keys(usersCurrentUser).length > 0
      ? usersCurrentUser
      : authUser && typeof authUser === "object"
        ? authUser
        : {};
  const dispatch = useDispatch();

  const [banner, setBanner] = useState({
    visible: false,
    type: "",
    message: "",
  });
  const [medicationsModalVisible, setMedicationsModalVisible] = useState(false);
  const [medicationsList, setMedicationsList] = useState([]);
  const [medicationsLoading, setMedicationsLoading] = useState(false);
  const [medicationsLoadError, setMedicationsLoadError] = useState(false);
  // Which health field is currently being edited in the per-field overlay
  // (null = closed). See FieldEditModal for the set of valid keys.
  const [editingField, setEditingField] = useState(null);
  const [changePasswordModalVisible, setChangePasswordModalVisible] =
    useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordChangePhase, setPasswordChangePhase] = useState("form"); // 'form' | 'code'
  const [passwordChangeCode, setPasswordChangeCode] = useState("");
  const [requestingPasswordCode, setRequestingPasswordCode] = useState(false);
  // Verified email change (GDPR Art. 16).
  const [changeEmailModalVisible, setChangeEmailModalVisible] = useState(false);
  const [emailPhase, setEmailPhase] = useState("form"); // 'form' | 'code'
  const [newEmail, setNewEmail] = useState("");
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [emailChangeCode, setEmailChangeCode] = useState("");
  const [requestingEmailCode, setRequestingEmailCode] = useState(false);
  const [confirmingEmail, setConfirmingEmail] = useState(false);
  // Account deletion requires the current password as confirmation.
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  // Optional "why are you leaving?" captured for the admin closure log.
  const [deleteReasonCode, setDeleteReasonCode] = useState("");
  const [deleteReasonText, setDeleteReasonText] = useState("");
  const [deleting, setDeleting] = useState(false);
  // M22: contact-support form
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sendingContact, setSendingContact] = useState(false);

  const t = STRINGS[language]?.myProfile ?? STRINGS.es.myProfile;
  const tAccount = STRINGS[language]?.account ?? STRINGS.es.account;

  useEffect(() => {
    dispatch(getCurrentUser());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      dispatch(getCurrentUser());
    }, [dispatch]),
  );

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

  const photoUri = cachedProfileImageUri || getProfileImageUri(currentUser);
  // Patient photos now require auth on the server. An <Image> can't use our axios
  // interceptor, so we pass the token as a header. Load it once; fall back to
  // initials if the image fails so a photo can never break the screen.
  const [authToken, setAuthToken] = useState(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => {
    secureStorage.getItemAsync("token").then(setAuthToken).catch(() => {});
  }, []);
  useEffect(() => {
    setAvatarFailed(false);
  }, [photoUri]);
  const initials = getInitials(
    currentUser?.fullName ?? currentUser?.name ?? "",
  );
  const rawPatientId = currentUser?._id ?? currentUser?.id;
  const patientId = rawPatientId != null ? String(rawPatientId) : undefined;

  const performLogout = async () => {
    await dispatch(logoutUser());
    dispatch(clearCurrentUser());
  };

  // GDPR Art. 15/20 — fetch a machine-readable JSON of all my data and hand it
  // to the OS share sheet (Save to Files, Mail, etc.). Uses the core Share API,
  // so no extra native module / rebuild is needed.
  const [exportingData, setExportingData] = useState(false);
  const handleExportData = async () => {
    if (exportingData) return;
    setExportingData(true);
    try {
      const res = await axiosInstance.get("/api/patients/me/export");
      const json = JSON.stringify(res.data, null, 2);
      await Share.share({
        title: language === "es" ? "Mis datos (HeiDoctor)" : "My data (HeiDoctor)",
        message: json,
      });
    } catch (e) {
      Alert.alert(
        language === "es" ? "Error" : "Error",
        language === "es"
          ? "No se pudieron exportar tus datos. Inténtalo de nuevo."
          : "Could not export your data. Please try again.",
      );
    } finally {
      setExportingData(false);
    }
  };

  // Verified email change — step 1: send a code to the NEW address.
  const handleRequestEmailChangeCode = async () => {
    if (!newEmail.trim() || !emailChangePassword) {
      Alert.alert(
        language === "es" ? "Faltan datos" : "Missing info",
        language === "es"
          ? "Ingresa el nuevo correo y tu contraseña."
          : "Enter the new email and your password.",
      );
      return;
    }
    setRequestingEmailCode(true);
    try {
      await axiosInstance.post("/api/auth/patient/changeEmail/request-code", {
        newEmail: newEmail.trim(),
        password: emailChangePassword,
      });
      setEmailPhase("code");
    } catch (err) {
      Alert.alert(
        language === "es" ? "Error" : "Error",
        err?.response?.data?.message ||
          (language === "es" ? "No se pudo enviar el código." : "Could not send the code."),
      );
    } finally {
      setRequestingEmailCode(false);
    }
  };

  // Step 2: confirm with the code → email switches.
  const handleConfirmEmailChange = async () => {
    if (!emailChangeCode.trim()) return;
    setConfirmingEmail(true);
    try {
      await axiosInstance.patch("/api/auth/patient/changeEmail", {
        code: emailChangeCode.trim(),
      });
      setChangeEmailModalVisible(false);
      setEmailPhase("form");
      setNewEmail("");
      setEmailChangePassword("");
      setEmailChangeCode("");
      dispatch(getCurrentUser());
      Alert.alert(
        language === "es" ? "Correo actualizado" : "Email updated",
        language === "es"
          ? "Tu correo se actualizó correctamente."
          : "Your email has been updated.",
      );
    } catch (err) {
      Alert.alert(
        language === "es" ? "Error" : "Error",
        err?.response?.data?.message ||
          (language === "es" ? "No se pudo confirmar el cambio." : "Could not confirm the change."),
      );
    } finally {
      setConfirmingEmail(false);
    }
  };

  // Withdraw health-data processing consent (GDPR Art. 7(3)).
  const handleWithdrawConsent = () => {
    Alert.alert(
      language === "es" ? "Retirar consentimiento" : "Withdraw consent",
      language === "es"
        ? "No podemos brindarte atención sin procesar tus datos de salud. Al retirar tu consentimiento deberás eliminar tu cuenta para completar el proceso. ¿Deseas continuar?"
        : "We cannot provide care without processing your health data. Withdrawing your consent means you must delete your account to complete the process. Continue?",
      [
        { text: language === "es" ? "Cancelar" : "Cancel", style: "cancel" },
        {
          text: language === "es" ? "Retirar" : "Withdraw",
          style: "destructive",
          onPress: async () => {
            try {
              await axiosInstance.post("/api/patients/me/consent/withdraw-health");
              Alert.alert(
                language === "es" ? "Consentimiento retirado" : "Consent withdrawn",
                language === "es"
                  ? "Tu consentimiento fue retirado. Elimina tu cuenta para completar la eliminación de tus datos."
                  : "Your consent was withdrawn. Please delete your account to complete erasure of your data.",
              );
            } catch (e) {
              Alert.alert(
                language === "es" ? "Error" : "Error",
                language === "es"
                  ? "No se pudo retirar el consentimiento."
                  : "Could not withdraw consent.",
              );
            }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    const confirmTitle =
      tAccount.confirmLogOut ??
      (language === "es" ? "¿Estás seguro?" : "Are you sure?");
    const logoutLabel =
      tAccount.logOut ?? (language === "es" ? "Cerrar sesión" : "Log out");
    const cancelLabel = language === "es" ? "Cancelar" : "Cancel";

    if (Platform.OS === "web") {
      // Alert.alert doesn't show on web; use native confirm
      if (typeof window !== "undefined" && window.confirm(confirmTitle)) {
        performLogout();
      }
      return;
    }

    const buttons = [
      { text: cancelLabel, style: "cancel" },
      { text: logoutLabel, style: "destructive", onPress: performLogout },
    ];
    Alert.alert(confirmTitle, null, buttons);
  };

  const performDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError(
        language === "es"
          ? "Ingresa tu contraseña para confirmar."
          : "Enter your password to confirm.",
      );
      return;
    }
    setDeleting(true);
    setDeleteError("");
    // deleteMe clears the stored token/type on success; StackNavigator's
    // token check then redirects to the auth stack automatically.
    const result = await dispatch(
      deleteMe({
        password: deletePassword,
        reasonCode: deleteReasonCode || undefined,
        reasonText: deleteReasonText.trim() || undefined,
      }),
    );
    setDeleting(false);
    if (deleteMe.fulfilled.match(result)) {
      setDeleteModalVisible(false);
      setDeletePassword("");
      setDeleteReasonCode("");
      setDeleteReasonText("");
      dispatch(clearCurrentUser());
    } else {
      setDeleteError(
        typeof result.payload === "string"
          ? result.payload
          : language === "es"
            ? "No se pudo eliminar la cuenta."
            : "Could not delete the account.",
      );
    }
  };

  const handleDeleteAccount = () => {
    setDeletePassword("");
    setDeleteError("");
    setDeleteReasonCode("");
    setDeleteReasonText("");
    setDeleteModalVisible(true);
  };

  const loadMedications = useCallback(async () => {
    if (!patientId) return;
    setMedicationsLoading(true);
    setMedicationsLoadError(false);
    try {
      const data = await patientMedicationsService.getMedications(patientId, {
        page: 1,
        limit: 100,
      });
      setMedicationsList(Array.isArray(data) ? data : []);
    } catch (_) {
      setMedicationsList([]);
      setMedicationsLoadError(true);
    } finally {
      setMedicationsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (medicationsModalVisible && patientId) loadMedications();
  }, [medicationsModalVisible, patientId, loadMedications]);

  const handleRequestPasswordChangeCode = useCallback(async () => {
    if (!oldPassword) {
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message: t.oldPasswordInvalid,
      }));
      return;
    }
    if (!newPassword || !isStrongPassword(newPassword)) {
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message: t.passwordInvalid,
      }));
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message: t.passwordMismatch,
      }));
      return;
    }
    setRequestingPasswordCode(true);
    try {
      await dispatch(requestPasswordChangeCode({ passwordCurrent: oldPassword })).unwrap();
      setPasswordChangePhase("code");
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "success",
        message: t.codeSent,
      }));
    } catch (err) {
      const msg = typeof err === "string" ? err : err?.message;
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message: msg || t.banerError,
      }));
    } finally {
      setRequestingPasswordCode(false);
    }
  }, [oldPassword, newPassword, newPasswordConfirm, dispatch, t]);

  const handleConfirmPasswordChange = useCallback(async () => {
    if (!passwordChangeCode) {
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message: t.codeRequired,
      }));
      return;
    }
    setChangingPassword(true);
    try {
      await dispatch(
        changePassword({
          code: passwordChangeCode,
          password: newPassword,
          passwordConfirm: newPasswordConfirm,
        }),
      ).unwrap();
      setOldPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setPasswordChangeCode("");
      setPasswordChangePhase("form");
      setChangePasswordModalVisible(false);
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "success",
        message: t.banerSuccess,
      }));
    } catch (err) {
      const msg = typeof err === "string" ? err : err?.message;
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message: msg || t.banerError,
      }));
    } finally {
      setChangingPassword(false);
    }
  }, [passwordChangeCode, newPassword, newPasswordConfirm, dispatch, t]);

  // M22: send the contact-support message to the platform support inbox.
  const handleSendSupportMessage = useCallback(async () => {
    if (!contactMessage.trim()) {
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "error",
        message: language === "es" ? "Escribe un mensaje." : "Please write a message.",
      }));
      return;
    }
    setSendingContact(true);
    try {
      await axiosInstance.post("/api/patients/me/contact-support", {
        subject: contactSubject.trim(),
        message: contactMessage.trim(),
      });
      setContactSubject("");
      setContactMessage("");
      setContactModalVisible(false);
      setBanner((b) => ({
        ...b,
        visible: true,
        type: "success",
        message:
          language === "es"
            ? "Mensaje enviado. Te responderemos pronto."
            : "Message sent. We'll get back to you soon.",
      }));
    } catch (_err) {
      setBanner((b) => ({ ...b, visible: true, type: "error", message: t.banerError }));
    } finally {
      setSendingContact(false);
    }
  }, [contactSubject, contactMessage, language, t.banerError]);

  const modalHeight = Dimensions.get("window").height;
  const slideAnim2 = useRef(new Animated.Value(modalHeight)).current;
  const overlayOpacity2 = useRef(new Animated.Value(0)).current;
  const slideAnim5 = useRef(new Animated.Value(modalHeight)).current;
  const overlayOpacity5 = useRef(new Animated.Value(0)).current;
  const slideAnim6 = useRef(new Animated.Value(modalHeight)).current;
  const overlayOpacity6 = useRef(new Animated.Value(0)).current;
  const slideAnim7 = useRef(new Animated.Value(modalHeight)).current;
  const overlayOpacity7 = useRef(new Animated.Value(0)).current;
  const tabFade = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    React.useCallback(() => {
      tabFade.setValue(1);
    }, [tabFade]),
  );

  const insets = useSafeAreaInsets();
  const { setSearchConfig } = useBottomBarSearch();
  useFocusEffect(
    useCallback(() => {
      setSearchConfig({ visible: false });
    }, [setSearchConfig]),
  );

  const infoCards = [
    { icon: "mail-outline", label: t.email, value: currentUser?.email ?? "" },
    {
      icon: "card-outline",
      label: t.document,
      value:
        currentUser?.documentId ??
        currentUser?.nationalId ??
        currentUser?.identityNumber ??
        "",
    },
    { icon: "call-outline", label: t.phone, value: currentUser?.phone ?? "" },
    {
      icon: "calendar-outline",
      label: t.dateOfBirth,
      value: formatBirthDate(currentUser?.birthDate),
    },
    {
      icon: "location-outline",
      label: t.address,
      value: [
        currentUser?.address?.street,
        currentUser?.address?.parish,
        currentUser?.address?.city,
        currentUser?.address?.country,
      ]
        .filter(Boolean)
        .join(", "),
    },
    {
      icon: "alert-outline",
      label: t.emergencyContact,
      value: currentUser?.emergencyContact?.name
        ? [
            currentUser.emergencyContact.name,
            currentUser.emergencyContact.relationship,
            currentUser.emergencyContact.phone,
          ]
            .filter(Boolean)
            .join(" · ")
        : "",
    },
  ];

  const weightVal =
    currentUser?.weight != null && currentUser?.weight !== ""
      ? String(currentUser.weight)
      : "";
  const heightVal =
    currentUser?.height != null && currentUser?.height !== ""
      ? String(currentUser.height)
      : "";
  const genderText = currentUser?.gender ? t[`gender${currentUser.gender}`] : "";
  const languagesListProfile = Array.isArray(currentUser?.languages)
    ? currentUser.languages.filter(Boolean)
    : [];
  const languagesText = languagesListProfile
    .map((code) => spokenLanguages.find((l) => l.code === code)?.label ?? code)
    .join(", ");

  const allergiesListProfile =
    Array.isArray(currentUser?.allergies) && currentUser.allergies.length > 0
      ? currentUser.allergies.filter(Boolean)
      : typeof currentUser?.allergies === "string" && currentUser?.allergies?.trim()
        ? [currentUser.allergies.trim()]
        : [];
  const vaccinesListProfile =
    Array.isArray(currentUser?.vaccines) && currentUser.vaccines.length > 0
      ? currentUser.vaccines
      : [];
  const medicationRemindersListProfile =
    Array.isArray(currentUser?.medicationReminders) && currentUser.medicationReminders.length > 0
      ? currentUser.medicationReminders
      : [];
  const allergyCount = allergiesListProfile.length;
  const vaccineCount = vaccinesListProfile.length;
  const medicationReminderCount = medicationRemindersListProfile.length;
  const allergyCountText =
    allergyCount === 1
      ? (t.allergyCountOne ?? "1 alergia")
      : (t.allergyCountOther ?? "{{count}} alergias").replace("{{count}}", String(allergyCount));
  const vaccineCountText =
    vaccineCount === 1
      ? (t.vaccineCountOne ?? "1 vacuna")
      : (t.vaccineCountOther ?? "{{count}} vacunas").replace("{{count}}", String(vaccineCount));

  // A health card whose value is edited in the per-field overlay (point 3):
  // shows the current value (if any) plus an "Editar" button that opens the
  // FieldEditModal for just that field. Returns JSX (not a component) so it
  // doesn't remount on every parent render.
  const renderEditCard = (icon, label, value, fieldKey) => (
    <View style={styles.infoCard} key={fieldKey}>
      <View style={styles.infoCardLeft}>
        <Ionicons
          name={icon}
          size={22}
          color={COLORS.blackText}
          style={styles.infoCardIcon}
        />
        <Text style={styles.infoCardLabel} numberOfLines={2}>{label}</Text>
      </View>
      <View style={styles.infoCardRight}>
        {value ? (
          <Text
            style={[styles.infoCardValue, { maxWidth: 130 }]}
            numberOfLines={1}
          >
            {value}
          </Text>
        ) : null}
        <GlassButton
          variant="secondary"
          style={[styles.editLinkButton, { marginLeft: 8 }]}
          onPress={() => setEditingField(fieldKey)}
        >
          <Text style={styles.editLinkButtonText}>{t.editShort}</Text>
        </GlassButton>
      </View>
    </View>
  );

  // A health card that navigates / opens a view (the "Ver" rows).
  const renderNavCard = (icon, label, onPress, key) => (
    <View style={styles.infoCard} key={key}>
      <View style={styles.infoCardLeft}>
        <Ionicons
          name={icon}
          size={22}
          color={COLORS.blackText}
          style={styles.infoCardIcon}
        />
        <Text style={styles.infoCardLabel} numberOfLines={2}>{label}</Text>
      </View>
      <GlassButton variant="secondary" style={styles.infoCardButton} onPress={onPress}>
        <Text style={styles.infoCardButtonText}>
          {language === "es" ? "Ver" : "View"}
        </Text>
      </GlassButton>
    </View>
  );

  // runOpenAnimation / runCloseAnimation / FullScreenModal are hoisted to module
  // scope (top of this file) so the modal keeps a stable component identity.


  if (userLoading.get && !currentUser?.email && !authUser?.email) {
    return (
      <LinearGradient
        colors={GRADIENT_COLORS}
        style={{ flex: 1 }}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
      >
        <View
          style={[
            styles.keyboardView,
            styles.loaderContainer,
            { backgroundColor: "transparent" },
          ]}
        >
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={GRADIENT_COLORS}
      style={{ flex: 1 }}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={{ flex: 1 }}>
        <View style={[styles.keyboardView, { backgroundColor: "transparent" }]}>
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
              { paddingTop: Math.max(insets.top ?? 0, 48) },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerRow}>
              {/* Profile is a tab root — no back button; spacer keeps the
                  title centered opposite the edit (pencil) button. */}
              <View style={styles.headerSpacer} />
              <Text style={styles.headerTitle}>{t.profileTitle}</Text>
              <GlassButton
                variant="neutral"
                style={styles.headerEditButton}
                onPress={() => navigation.navigate("EditProfile")}
              >
                <Ionicons
                  name={ICONS.pencil}
                  size={SIZES.icon20}
                  color={COLORS.blackText}
                />
              </GlassButton>
            </View>

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
              <Text style={styles.fullNameUnderAvatar}>
                {currentUser?.fullName ?? currentUser?.name ?? ""}
              </Text>
              <Text style={styles.emailUnderAvatar}>
                {currentUser?.email ?? ""}
              </Text>
              {currentUser?.createdAt && (
                <Text style={styles.memberSinceText}>
                  {language === "es" ? "Miembro desde " : "Member since "}
                  {new Date(currentUser.createdAt).toLocaleDateString(
                    language === "es" ? "es-ES" : "en-US",
                    { year: "numeric", month: "long" },
                  )}
                </Text>
              )}
            </View>

            {/* Información — collapsible (closed by default). Edited only via the
                main pencil above; per point 5, empties read "No registrado". */}
            <CollapsibleSection title={t.informationSection}>
              {infoCards.map(({ icon, label, value }) => (
                <View key={label} style={styles.infoCard}>
                  <View style={styles.infoCardLeft}>
                    <Ionicons
                      name={icon}
                      size={22}
                      color={COLORS.blackText}
                      style={styles.infoCardIcon}
                    />
                    <Text style={styles.infoCardLabel}>{label}</Text>
                  </View>
                  <Text
                    style={[styles.infoCardValue, { maxWidth: 160 }]}
                    numberOfLines={1}
                  >
                    {value || t.noRegistrado}
                  </Text>
                </View>
              ))}
            </CollapsibleSection>

            {/* Datos físicos — each field edits inline via the overlay */}
            <CollapsibleSection title={t.sectionPhysical}>
              {renderEditCard(
                "scale-outline",
                t.weight,
                weightVal ? `${weightVal} kg` : "",
                "weight",
              )}
              {renderEditCard(
                "resize-outline",
                t.height,
                heightVal ? `${heightVal} cm` : "",
                "height",
              )}
              {renderEditCard(
                "water-outline",
                t.bloodType,
                currentUser?.bloodType?.trim() ? currentUser.bloodType : "",
                "bloodType",
              )}
              {renderEditCard("male-female-outline", t.gender, genderText, "gender")}
              {renderEditCard(
                "language-outline",
                t.languages,
                languagesText,
                "languages",
              )}
            </CollapsibleSection>

            {/* Historial médico — list managers open in the overlay */}
            <CollapsibleSection title={t.sectionMedicalHistory}>
              {renderEditCard(
                "alert-circle-outline",
                t.allergies,
                allergyCount > 0 ? allergyCountText : "",
                "allergies",
              )}
              {renderEditCard(
                "medkit-outline",
                t.vaccines,
                vaccineCount > 0 ? vaccineCountText : "",
                "vaccines",
              )}
              {renderEditCard(
                "alarm-outline",
                t.medicationReminders,
                medicationReminderCount > 0 ? String(medicationReminderCount) : "",
                "medicationReminders",
              )}
            </CollapsibleSection>

            {/* Mis accesos — read-only "Ver" rows that navigate elsewhere */}
            <CollapsibleSection title={t.sectionAccess}>
              {renderNavCard(
                "heart-outline",
                t.favoriteDoctors,
                () => navigation.navigate("Favorites"),
                "favorites",
              )}
              {renderNavCard(
                "hourglass-outline",
                t.waitlist,
                () => navigation.navigate("Waitlist"),
                "waitlist",
              )}
              {renderNavCard(
                "document-text-outline",
                t.clinicalHistory,
                () => navigation.navigate("ClinicalHistory"),
                "clinical",
              )}
              {renderNavCard(
                "medkit-outline",
                t.medications,
                () => setMedicationsModalVisible(true),
                "medications",
              )}
            </CollapsibleSection>

            {/* Cambiar clave — standalone account action */}
            <View style={[styles.infoCard, { marginTop: 4 }]}>
              <View style={styles.infoCardLeft}>
                <Ionicons
                  name="lock-closed-outline"
                  size={22}
                  color={COLORS.blackText}
                  style={styles.infoCardIcon}
                />
                <Text style={styles.infoCardLabel}>{t.changePassword}</Text>
              </View>
              <GlassButton
                variant="secondary"
                style={styles.infoCardButton}
                onPress={() => setChangePasswordModalVisible(true)}
              >
                <Text style={styles.infoCardButtonText}>
                  {language === "es" ? "Ver" : "View"}
                </Text>
              </GlassButton>
            </View>

            {/* Change email — verified two-step (GDPR Art. 16) */}
            <View style={[styles.infoCard, { marginTop: 4 }]}>
              <View style={styles.infoCardLeft}>
                <Ionicons
                  name="mail-outline"
                  size={22}
                  color={COLORS.blackText}
                  style={styles.infoCardIcon}
                />
                <Text style={styles.infoCardLabel}>
                  {language === "es" ? "Cambiar correo" : "Change email"}
                </Text>
              </View>
              <GlassButton
                variant="secondary"
                style={styles.infoCardButton}
                onPress={() => setChangeEmailModalVisible(true)}
              >
                <Text style={styles.infoCardButtonText}>
                  {language === "es" ? "Ver" : "View"}
                </Text>
              </GlassButton>
            </View>

            {/* M22: Contact support */}
            <View style={[styles.infoCard, { marginTop: 4 }]}>
              <View style={styles.infoCardLeft}>
                <Ionicons
                  name="help-buoy-outline"
                  size={22}
                  color={COLORS.blackText}
                  style={styles.infoCardIcon}
                />
                <Text style={styles.infoCardLabel}>
                  {language === "es" ? "Contactar soporte" : "Contact support"}
                </Text>
              </View>
              <GlassButton
                variant="secondary"
                style={styles.infoCardButton}
                onPress={() => setContactModalVisible(true)}
              >
                <Text style={styles.infoCardButtonText}>
                  {language === "es" ? "Escribir" : "Write"}
                </Text>
              </GlassButton>
            </View>

            <GlassButton
              variant="secondary"
              style={styles.exportDataButton}
              onPress={handleExportData}
              disabled={exportingData}
            >
              <Ionicons name="download-outline" size={22} color={COLORS.secondary} />
              <Text style={styles.exportDataButtonText}>
                {exportingData
                  ? language === "es"
                    ? "Preparando..."
                    : "Preparing..."
                  : language === "es"
                  ? "Descargar mis datos"
                  : "Download my data"}
              </Text>
            </GlassButton>

            <GlassButton
              variant="danger"
              style={[styles.logoutButton]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
              <Text style={styles.logoutButtonText}>{tAccount.logOut}</Text>
            </GlassButton>

            <TouchableOpacity
              style={{ alignSelf: "center", paddingVertical: 10 }}
              onPress={handleWithdrawConsent}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: COLORS.secondary,
                  textDecorationLine: "underline",
                }}
              >
                {language === "es"
                  ? "Retirar consentimiento de datos de salud"
                  : "Withdraw health-data consent"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteAccountButton}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.deleteAccountButtonText}>
                {language === "es" ? "Eliminar cuenta" : "Delete account"}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Delete-account confirmation: requires the current password. */}
          <Modal
            visible={deleteModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => !deleting && setDeleteModalVisible(false)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.45)",
                justifyContent: "center",
                paddingHorizontal: 24,
              }}
            >
              <View
                style={{
                  backgroundColor: COLORS.white,
                  borderRadius: 20,
                  padding: 22,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: FONT_FAMILY.bold,
                    color: COLORS.blackText,
                    marginBottom: 8,
                  }}
                >
                  {language === "es" ? "Eliminar cuenta" : "Delete account"}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: COLORS.greyText,
                    marginBottom: 16,
                    lineHeight: 20,
                  }}
                >
                  {language === "es"
                    ? "Esta acción es permanente y no se puede deshacer. Se perderán todos tus datos, incluidas tus citas agendadas. Ingresa tu contraseña para confirmar."
                    : "This action is permanent and cannot be undone. You will lose all your data, including your scheduled appointments. Enter your password to confirm."}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: COLORS.greyText,
                    marginBottom: 8,
                    fontFamily: FONT_FAMILY.semiBold,
                  }}
                >
                  {language === "es" ? "Motivo (opcional)" : "Reason (optional)"}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  {[
                    { code: "no_longer_needed", es: "Ya no lo necesito", en: "No longer need it" },
                    { code: "not_satisfied", es: "No satisfecho", en: "Not satisfied" },
                    { code: "privacy", es: "Privacidad", en: "Privacy" },
                    { code: "other", es: "Otro", en: "Other" },
                  ].map((r) => {
                    const selected = deleteReasonCode === r.code;
                    return (
                      <TouchableOpacity
                        key={r.code}
                        disabled={deleting}
                        onPress={() =>
                          setDeleteReasonCode(selected ? "" : r.code)
                        }
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 14,
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: selected ? COLORS.secondary : COLORS.tagColor,
                          backgroundColor: selected ? COLORS.secondary : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            color: selected ? COLORS.white : COLORS.blackText,
                            fontFamily: FONT_FAMILY.regular,
                          }}
                        >
                          {language === "es" ? r.es : r.en}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={[styles.input, { marginBottom: 12, minHeight: 44 }]}
                  placeholder={
                    language === "es"
                      ? "Comentario adicional (opcional)"
                      : "Additional comment (optional)"
                  }
                  value={deleteReasonText}
                  onChangeText={setDeleteReasonText}
                  editable={!deleting}
                  maxLength={1000}
                  multiline
                  placeholderTextColor={COLORS.ligthGreyText}
                />
                <PasswordInput
                  style={styles.input}
                  placeholder={language === "es" ? "Contraseña" : "Password"}
                  value={deletePassword}
                  onChangeText={(v) => {
                    setDeletePassword(v);
                    if (deleteError) setDeleteError("");
                  }}
                  placeholderTextColor={COLORS.ligthGreyText}
                />
                {deleteError ? (
                  <Text
                    style={{ color: COLORS.error, marginTop: 8, fontSize: 13 }}
                  >
                    {deleteError}
                  </Text>
                ) : null}
                <View
                  style={{ flexDirection: "row", gap: 12, marginTop: 20 }}
                >
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: COLORS.tagColor,
                      alignItems: "center",
                    }}
                    disabled={deleting}
                    onPress={() => setDeleteModalVisible(false)}
                  >
                    <Text
                      style={{ color: COLORS.blackText, fontFamily: FONT_FAMILY.semiBold }}
                    >
                      {language === "es" ? "Cancelar" : "Cancel"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: COLORS.error,
                      alignItems: "center",
                      opacity: deleting ? 0.7 : 1,
                    }}
                    disabled={deleting}
                    onPress={performDeleteAccount}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text
                        style={{ color: COLORS.white, fontFamily: FONT_FAMILY.bold }}
                      >
                        {language === "es" ? "Eliminar" : "Delete"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <FullScreenModal
            visible={medicationsModalVisible}
            onClose={() => setMedicationsModalVisible(false)}
            title={t.medications}
            loading={medicationsLoading}
            slideAnim={slideAnim2}
            overlayOpacity={overlayOpacity2}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {medicationsLoadError ? (
                <View style={{ alignItems: "center" }}>
                  <Text style={[styles.modalEmpty, { color: COLORS.error }]}>
                    {language === "es"
                      ? "No se pudieron cargar los medicamentos. Verifica tu conexión e intenta nuevamente."
                      : "Could not load medications. Check your connection and try again."}
                  </Text>
                  <TouchableOpacity onPress={loadMedications} style={{ marginTop: 12 }}>
                    <Text style={{ color: COLORS.secondary, fontWeight: "700" }}>
                      {language === "es" ? "Reintentar" : "Retry"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : medicationsList.length === 0 ? (
                <Text style={styles.modalEmpty}>
                  {language === "es"
                    ? "No hay medicamentos registrados."
                    : "No medications recorded."}
                </Text>
              ) : (
                medicationsList.map((med, idx) => (
                  <View
                    key={med._id ?? med.id ?? `m-${idx}`}
                    style={styles.modalCard}
                  >
                    <Text style={styles.modalCardTitle}>
                      {med.medicationName ??
                        med.name ??
                        med.title ??
                        (language === "es" ? "Medicamento" : "Medication")}
                    </Text>
                    {(med.dosage || med.dose) && (
                      <Text style={styles.modalCardMeta}>
                        {med.dosage ?? med.dose}
                      </Text>
                    )}
                    {(med.frequency || med.instructions) && (
                      <Text style={styles.modalCardDate}>
                        {med.frequency ?? med.instructions}
                      </Text>
                    )}
                    {med.doctor && (
                      <Text style={styles.modalCardMeta}>
                        {med.doctor.fullName ?? med.doctor.email}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </FullScreenModal>

          {/* Per-field edit overlay (Datos físicos + Historial médico). */}
          <FieldEditModal
            field={editingField}
            currentUser={currentUser}
            onClose={() => setEditingField(null)}
          />

          <FullScreenModal
            visible={changePasswordModalVisible}
            onClose={() => {
              setChangePasswordModalVisible(false);
              setPasswordChangePhase("form");
              setPasswordChangeCode("");
            }}
            title={t.changePassword}
            slideAnim={slideAnim5}
            overlayOpacity={overlayOpacity5}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {passwordChangePhase === "form" ? (
                <>
                  <Text style={styles.editFieldLabel}>{t.oldPassword}</Text>
                  <PasswordInput
                    style={styles.input}
                    placeholder={t.oldPassword}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    placeholderTextColor={COLORS.ligthGreyText}
                  />
                  <Text style={styles.editFieldLabel}>{t.newPassword}</Text>
                  <PasswordInput
                    style={styles.input}
                    placeholder={t.newPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholderTextColor={COLORS.ligthGreyText}
                  />
                  <Text style={styles.editFieldLabel}>{t.newPasswordConfirm}</Text>
                  <PasswordInput
                    style={styles.input}
                    placeholder={t.newPasswordConfirm}
                    value={newPasswordConfirm}
                    onChangeText={setNewPasswordConfirm}
                    placeholderTextColor={COLORS.ligthGreyText}
                  />
                  <GlassButton
                    variant="primary"
                    style={[
                      styles.saveButton,
                      (requestingPasswordCode ||
                        !oldPassword ||
                        !newPassword ||
                        newPassword !== newPasswordConfirm) && { opacity: 0.6 },
                    ]}
                    onPress={handleRequestPasswordChangeCode}
                    disabled={
                      requestingPasswordCode ||
                      !oldPassword ||
                      !newPassword ||
                      newPassword !== newPasswordConfirm
                    }
                  >
                    {requestingPasswordCode ? (
                      <ActivityIndicator size="small" color={COLORS.whiteText} />
                    ) : (
                      <Text style={styles.saveButtonText}>{t.sendCode}</Text>
                    )}
                  </GlassButton>
                </>
              ) : (
                <>
                  <Text style={styles.editFieldLabel}>{t.codeSentMessage}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t.confirmationCode}
                    value={passwordChangeCode}
                    onChangeText={setPasswordChangeCode}
                    keyboardType="number-pad"
                    placeholderTextColor={COLORS.ligthGreyText}
                  />
                  <GlassButton
                    variant="primary"
                    style={[
                      styles.saveButton,
                      (changingPassword || !passwordChangeCode) && { opacity: 0.6 },
                    ]}
                    onPress={handleConfirmPasswordChange}
                    disabled={changingPassword || !passwordChangeCode}
                  >
                    {changingPassword ? (
                      <ActivityIndicator size="small" color={COLORS.whiteText} />
                    ) : (
                      <Text style={styles.saveButtonText}>{t.savePassword}</Text>
                    )}
                  </GlassButton>
                </>
              )}
            </ScrollView>
          </FullScreenModal>

          {/* Change email — verified two-step (GDPR Art. 16) */}
          <FullScreenModal
            visible={changeEmailModalVisible}
            onClose={() => {
              setChangeEmailModalVisible(false);
              setEmailPhase("form");
              setEmailChangeCode("");
            }}
            title={language === "es" ? "Cambiar correo" : "Change email"}
            slideAnim={slideAnim6}
            overlayOpacity={overlayOpacity6}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {emailPhase === "form" ? (
                <>
                  <Text style={styles.editFieldLabel}>
                    {language === "es" ? "Nuevo correo electrónico" : "New email"}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={language === "es" ? "Nuevo correo electrónico" : "New email"}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor={COLORS.ligthGreyText}
                  />
                  <Text style={styles.editFieldLabel}>
                    {language === "es" ? "Tu contraseña actual" : "Your current password"}
                  </Text>
                  <PasswordInput
                    style={styles.input}
                    placeholder={language === "es" ? "Contraseña actual" : "Current password"}
                    value={emailChangePassword}
                    onChangeText={setEmailChangePassword}
                    placeholderTextColor={COLORS.ligthGreyText}
                  />
                  <GlassButton
                    variant="primary"
                    style={[
                      styles.saveButton,
                      (requestingEmailCode || !newEmail.trim() || !emailChangePassword) && { opacity: 0.6 },
                    ]}
                    onPress={handleRequestEmailChangeCode}
                    disabled={requestingEmailCode || !newEmail.trim() || !emailChangePassword}
                  >
                    {requestingEmailCode ? (
                      <ActivityIndicator size="small" color={COLORS.whiteText} />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        {language === "es" ? "Enviar código" : "Send code"}
                      </Text>
                    )}
                  </GlassButton>
                </>
              ) : (
                <>
                  <Text style={styles.editFieldLabel}>
                    {language === "es"
                      ? "Ingresa el código que enviamos a tu nuevo correo."
                      : "Enter the code we sent to your new email."}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={language === "es" ? "Código de confirmación" : "Confirmation code"}
                    value={emailChangeCode}
                    onChangeText={setEmailChangeCode}
                    keyboardType="number-pad"
                    placeholderTextColor={COLORS.ligthGreyText}
                  />
                  <GlassButton
                    variant="primary"
                    style={[
                      styles.saveButton,
                      (confirmingEmail || !emailChangeCode.trim()) && { opacity: 0.6 },
                    ]}
                    onPress={handleConfirmEmailChange}
                    disabled={confirmingEmail || !emailChangeCode.trim()}
                  >
                    {confirmingEmail ? (
                      <ActivityIndicator size="small" color={COLORS.whiteText} />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        {language === "es" ? "Confirmar cambio" : "Confirm change"}
                      </Text>
                    )}
                  </GlassButton>
                </>
              )}
            </ScrollView>
          </FullScreenModal>

          {/* M22: Contact support form */}
          <FullScreenModal
            visible={contactModalVisible}
            onClose={() => setContactModalVisible(false)}
            title={language === "es" ? "Contactar soporte" : "Contact support"}
            slideAnim={slideAnim7}
            overlayOpacity={overlayOpacity7}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.sectionSubLabel}>
                {language === "es"
                  ? "Envíanos tu mensaje y te responderemos por correo."
                  : "Send us your message and we'll reply by email."}
              </Text>
              <Text style={styles.editFieldLabel}>
                {language === "es" ? "Asunto (opcional)" : "Subject (optional)"}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={language === "es" ? "Asunto" : "Subject"}
                value={contactSubject}
                onChangeText={setContactSubject}
                placeholderTextColor={COLORS.ligthGreyText}
              />
              <Text style={styles.editFieldLabel}>
                {language === "es" ? "Mensaje" : "Message"}
              </Text>
              <TextInput
                style={[styles.input, { minHeight: 120, textAlignVertical: "top" }]}
                placeholder={
                  language === "es"
                    ? "Describe tu problema o pregunta..."
                    : "Describe your issue or question..."
                }
                value={contactMessage}
                onChangeText={setContactMessage}
                multiline
                placeholderTextColor={COLORS.ligthGreyText}
              />
              <GlassButton
                variant="primary"
                style={[
                  styles.saveButton,
                  (sendingContact || !contactMessage.trim()) && { opacity: 0.6 },
                ]}
                onPress={handleSendSupportMessage}
                disabled={sendingContact || !contactMessage.trim()}
              >
                {sendingContact ? (
                  <ActivityIndicator size="small" color={COLORS.whiteText} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {language === "es" ? "Enviar" : "Send"}
                  </Text>
                )}
              </GlassButton>
            </ScrollView>
          </FullScreenModal>
        </View>
      </View>
    </LinearGradient>
  );
}

ProfileScreen.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    getParent: PropTypes.func,
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};
