// Illustration icon per specialty code. Metro's require() needs static string
// literals, so this is an explicit map (not a computed path). Files live in
// src/assets/specialties/<code>.jpg (compressed ~200px).
const SPECIALTY_ICONS = {
  general_medicine: require("../assets/specialties/general_medicine.jpg"),
  internal_medicine: require("../assets/specialties/internal_medicine.jpg"),
  cardiology: require("../assets/specialties/cardiology.jpg"),
  pulmonology: require("../assets/specialties/pulmonology.jpg"),
  gastroenterology: require("../assets/specialties/gastroenterology.jpg"),
  endocrinology: require("../assets/specialties/endocrinology.jpg"),
  nephrology_urology: require("../assets/specialties/nephrology_urology.jpg"),
  gynecology_obstetrics: require("../assets/specialties/gynecology_obstetrics.jpg"),
  pediatrics: require("../assets/specialties/pediatrics.jpg"),
  mental_health: require("../assets/specialties/mental_health.jpg"),
  neurology: require("../assets/specialties/neurology.jpg"),
  dermatology: require("../assets/specialties/dermatology.jpg"),
  ophthalmology: require("../assets/specialties/ophthalmology.jpg"),
  otolaryngology: require("../assets/specialties/otolaryngology.jpg"),
  orthopedics: require("../assets/specialties/orthopedics.jpg"),
  surgery: require("../assets/specialties/surgery.jpg"),
  oncology_hematology: require("../assets/specialties/oncology_hematology.jpg"),
  anesthesiology: require("../assets/specialties/anesthesiology.jpg"),
  rehabilitation: require("../assets/specialties/rehabilitation.jpg"),
  radiology: require("../assets/specialties/radiology.jpg"),
  laboratory: require("../assets/specialties/laboratory.jpg"),
  preventive_medicine: require("../assets/specialties/preventive_medicine.jpg"),
  occupational_medicine: require("../assets/specialties/occupational_medicine.jpg"),
  legal_medicine: require("../assets/specialties/legal_medicine.jpg"),
  dentistry: require("../assets/specialties/dentistry.jpg"),
};

/** Image source for a specialty code, or null if none. */
export function getSpecialtyIcon(code) {
  return SPECIALTY_ICONS[code] || null;
}

export default SPECIALTY_ICONS;
