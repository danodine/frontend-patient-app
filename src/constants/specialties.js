// Canonical, code-based medical specialty taxonomy (mirror of the backend's
// constants/specialties.js — keep in sync). A doctor's specialty is stored as a
// `code`; the client renders the `es`/`en` label for the viewer's language.

export const SPECIALTIES = [
  { code: "general_medicine", es: "Medicina general", en: "General Medicine" },
  { code: "internal_medicine", es: "Medicina interna", en: "Internal Medicine" },
  { code: "cardiology", es: "Corazón y circulación", en: "Heart & Circulation" },
  { code: "pulmonology", es: "Pulmón y respiración", en: "Lungs & Breathing" },
  { code: "gastroenterology", es: "Digestivo, hígado y nutrición", en: "Digestive, Liver & Nutrition" },
  { code: "endocrinology", es: "Hormonas y metabolismo", en: "Hormones & Metabolism" },
  { code: "nephrology_urology", es: "Riñón y vías urinarias", en: "Kidney & Urinary Tract" },
  { code: "gynecology_obstetrics", es: "Ginecología, embarazo y fertilidad", en: "Gynecology, Pregnancy & Fertility" },
  { code: "pediatrics", es: "Pediatría", en: "Pediatrics" },
  { code: "mental_health", es: "Salud mental", en: "Mental Health" },
  { code: "neurology", es: "Cerebro y sistema nervioso", en: "Brain & Nervous System" },
  { code: "dermatology", es: "Piel, cabello y alergias", en: "Skin, Hair & Allergies" },
  { code: "ophthalmology", es: "Ojos", en: "Eyes" },
  { code: "otolaryngology", es: "Oído, nariz y garganta", en: "Ear, Nose & Throat" },
  { code: "orthopedics", es: "Huesos, músculos y articulaciones", en: "Bones, Muscles & Joints" },
  { code: "surgery", es: "Cirugía", en: "Surgery" },
  { code: "oncology_hematology", es: "Cáncer y hematología", en: "Cancer & Hematology" },
  { code: "anesthesiology", es: "Dolor, anestesia y cuidados intensivos", en: "Pain, Anesthesia & Critical Care" },
  { code: "rehabilitation", es: "Rehabilitación", en: "Rehabilitation" },
  { code: "radiology", es: "Radiología e imagen", en: "Radiology & Imaging" },
  { code: "laboratory", es: "Laboratorio y diagnóstico", en: "Laboratory & Diagnostics" },
  { code: "preventive_medicine", es: "Medicina preventiva y salud pública", en: "Preventive Medicine & Public Health" },
  { code: "occupational_medicine", es: "Medicina del trabajo", en: "Occupational Medicine" },
  { code: "legal_medicine", es: "Medicina legal y peritajes", en: "Legal Medicine & Forensics" },
  { code: "dentistry", es: "Odontología", en: "Dentistry" },
];

const BY_CODE = new Map(SPECIALTIES.map((s) => [s.code, s]));

const norm = (str) =>
  String(str || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const RESOLVE = new Map();
for (const s of SPECIALTIES) {
  RESOLVE.set(norm(s.code), s.code);
  RESOLVE.set(norm(s.es), s.code);
  RESOLVE.set(norm(s.en), s.code);
}

/** Localized label for a code. Falls back to the raw value (legacy/unmigrated). */
export function getSpecialtyLabel(code, language = "es") {
  const s = BY_CODE.get(code);
  if (!s) return code || "";
  return (language === "en" ? s.en : s.es) || s.es;
}

/** Resolve a code or es/en label to the canonical code, or null. */
export function resolveSpecialtyCode(input) {
  if (!input) return null;
  return RESOLVE.get(norm(input)) || null;
}

/** Options for a picker: [{ value: code, label }] in the given language. */
export function getSpecialtyOptions(language = "es") {
  return SPECIALTIES.map((s) => ({
    value: s.code,
    label: language === "en" ? s.en : s.es,
  })).sort((a, b) =>
    a.label.localeCompare(b.label, language, { sensitivity: "base" })
  );
}
