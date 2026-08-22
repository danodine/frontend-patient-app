import { store } from "../redux/store";
import { Linking } from "react-native";
import { setLanguage } from "../redux/languageSlice";
import { syncPreferredLanguage } from "../redux/userSlice";
import STRINGS from "../constants/strings";
import { getSpecialtyLabel } from "../constants/specialties";

export const toggleLanguage = () => {
  const currentLang = store.getState().language.language;
  const newLang = currentLang === "es" ? "en" : "es";
  store.dispatch(setLanguage(newLang));
  // Persist to the account so notifications/emails follow this choice.
  store.dispatch(syncPreferredLanguage(newLang));
};

export const setLanguageTo = (language) => {
  store.dispatch(setLanguage(language));
  store.dispatch(syncPreferredLanguage(language));
};

export const validateEcuadorianCedula = (cedula) => {
  if (!/^\d{10}$/.test(cedula)) {
    return false;
  }

  const provinceCode = parseInt(cedula.substring(0, 2), 10);
  const thirdDigit = parseInt(cedula[2], 10);

  if (provinceCode < 1 || provinceCode > 24 || thirdDigit > 5) {
    return false;
  }

  const digits = cedula.split("").map(Number);
  let total = 0;

  for (let i = 0; i < 9; i++) {
    let value = digits[i];
    if (i % 2 === 0) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    total += value;
  }

  const checkDigit = total % 10 === 0 ? 0 : 10 - (total % 10);
  return checkDigit === digits[9];
};

export const isStrongPassword = (password) => {
  const lengthCheck = /.{8,}/;
  const lowercaseCheck = /[a-z]/;
  const uppercaseCheck = /[A-Z]/;
  const numberCheck = /\d/;
  const specialCharCheck = /[!@#$%^&*(),.?":{}|<>]/;

  return (
    lengthCheck.test(password) &&
    lowercaseCheck.test(password) &&
    uppercaseCheck.test(password) &&
    numberCheck.test(password) &&
    specialCharCheck.test(password)
  );
};

export const formatDate = (date) => {
  const formatedDate = new Date(date);
  const day = formatedDate.getDate().toString().padStart(2, "0");
  const month = (formatedDate.getMonth() + 1).toString().padStart(2, "0");
  const year = formatedDate.getFullYear();
  return `${day}/${month}/${year}`;
};

/** Format UTC ISO date for display in the user's local timezone (matches web). */
export const formatDateText = (isoDateStr, language) => {
  const date = new Date(isoDateStr);

  const dayName = STRINGS[language].daysOfWeek[date.getDay()];
  const day = String(date.getDate());
  const monthName = STRINGS[language].months[date.getMonth()];
  const year = date.getFullYear();

  return `${dayName} ${day} ${monthName} ${year}`;
};

/** Short date for cards: "Lunes 9 Marzo" (no year). */
export const formatDateTextShort = (isoDateStr, language) => {
  const date = new Date(isoDateStr);
  const dayName = STRINGS[language].daysOfWeek[date.getDay()];
  const day = String(date.getDate());
  const monthName = STRINGS[language].months[date.getMonth()];
  return `${dayName} ${day} ${monthName}`;
};

/** Consultation date for message card: "11 Marzo". */
export const formatConsultationDate = (isoDateStr, language) => {
  if (!isoDateStr) return "";
  const date = new Date(isoDateStr);
  const day = String(date.getDate());
  const monthName = STRINGS[language].months[date.getMonth()];
  return `${day} ${monthName}`;
};

/** Time ago for last message: "Hace 2 min", "Hace 1 h", "Hace 3 días". */
export const getTimeAgo = (isoDateStr, language) => {
  if (!isoDateStr) return "";
  const then = new Date(isoDateStr);
  const now = new Date();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const t = STRINGS[language]?.messages ?? STRINGS.es.messages ?? {};
  if (diffMins < 1) return language === "es" ? "Ahora" : "Now";
  if (diffMins < 60) return (t.timeAgoMin ?? "Hace {{n}} min").replace("{{n}}", String(diffMins));
  if (diffHours < 24) return (t.timeAgoHour ?? "Hace {{n}} h").replace("{{n}}", String(diffHours));
  return (t.timeAgoDay ?? "Hace {{n}} días").replace("{{n}}", String(diffDays));
};

/** Format UTC ISO time for display in the user's local timezone (matches web). */
export const formatTime = (isoDateStr, addMinutes = 0) => {
  const date = new Date(isoDateStr);

  date.setMinutes(date.getMinutes() + addMinutes);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
};

export const getCurrentTimeHHSS = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
};

export const callPhone = (number) => {
  Linking.openURL(`tel:${number}`);
};

export const sendEmail = (emailAddress) => {
  Linking.openURL(`mailto:${emailAddress}`);
};

export const replaceVal = (template, value) => {
  return template.replace(/{VAL}/g, value);
};

/** Main specialty for display (Especialidad). Prefer profession or specialtyId over specialties (sub). */
export const getMainSpecialtyDisplay = (doctor, language) => {
  if (!doctor) return "";
  const lang = language ?? "es";
  const byId = STRINGS[lang]?.speciality?.[doctor?.profile?.specialtyId];
  // `profession` holds a specialty code — render its localized label. Falls back
  // to the raw value for legacy/not-yet-migrated records.
  if (doctor.profession) return getSpecialtyLabel(doctor.profession, lang);
  if (byId) return byId;
  if (Array.isArray(doctor.specialties) && doctor.specialties.length) {
    return doctor.specialties.join(", ");
  }
  return "";
};

/** Time remaining until appointment for "Próximas Citas": "7 días", "1 día", "Hoy", "Mañana". */
export const getTimeRemainingUntil = (startDateIso, language) => {
  if (!startDateIso) return "";
  const start = new Date(startDateIso);
  const now = new Date();
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((startDay - today) / 86400000);
  const t = STRINGS[language]?.appointments ?? STRINGS.es?.appointments ?? {};
  if (diffDays < 0) return "";
  if (diffDays === 0) return t.timeRemainingToday ?? "Hoy";
  if (diffDays === 1) return t.timeRemainingTomorrow ?? "Mañana";
  const key = diffDays === 1 ? "timeRemainingDay" : "timeRemainingDays";
  const template = t[key] ?? (diffDays === 1 ? "1 día" : "{count} días");
  return template.replace("{count}", String(diffDays));
};
