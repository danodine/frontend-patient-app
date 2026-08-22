import { SPECIALTIES } from "./specialties";

export const provinces = [
  { label: "Azuay", value: "azuay" },
  { label: "Bolívar", value: "bolivar" },
  { label: "Cañar", value: "canar" },
  { label: "Carchi", value: "carchi" },
  { label: "Chimborazo", value: "chimborazo" },
  { label: "Cotopaxi", value: "cotopaxi" },
  { label: "El Oro", value: "el_oro" },
  { label: "Esmeraldas", value: "esmeraldas" },
  { label: "Galápagos", value: "galapagos" },
  { label: "Guayas", value: "guayas" },
  { label: "Imbabura", value: "imbabura" },
  { label: "Loja", value: "loja" },
  { label: "Los Ríos", value: "los_rios" },
  { label: "Manabí", value: "manabi" },
  { label: "Morona Santiago", value: "morona_santiago" },
  { label: "Napo", value: "napo" },
  { label: "Orellana", value: "orellana" },
  { label: "Pastaza", value: "pastaza" },
  { label: "Pichincha", value: "pichincha" },
  { label: "Santa Elena", value: "santa_elena" },
  { label: "Santo Domingo de los Tsáchilas", value: "santo_domingo" },
  { label: "Sucumbíos", value: "sucumbios" },
  { label: "Tungurahua", value: "tungurahua" },
  { label: "Zamora Chinchipe", value: "zamora_chinchipe" },
];
export const languages = [
  { code: "en", label: "🇬🇧 English" },
  { code: "es", label: "🇪🇸 Español" },
];

export const countrys = [{ label: "🇪🇨 Ecuador", value: "ecuador" }];

/** Spoken languages the patient can select on their profile (optional, multi-select). */
export const spokenLanguages = [
  { code: "es", label: "Español" },
  { code: "en", label: "Inglés" },
  { code: "qu", label: "Kichwa" },
  { code: "pt", label: "Portugués" },
  { code: "fr", label: "Francés" },
  { code: "de", label: "Alemán" },
  { code: "it", label: "Italiano" },
  { code: "zh", label: "Chino" },
];

/** Nationalities: Latin America + Europe. `code` = ISO 3166-1 alpha-2 for flag emoji. */
export const nationalities = [
  // Latin America & Caribbean
  { label: "Argentina", value: "argentina", code: "AR" },
  { label: "Bolivia", value: "bolivia", code: "BO" },
  { label: "Brasil", value: "brasil", code: "BR" },
  { label: "Chile", value: "chile", code: "CL" },
  { label: "Colombia", value: "colombia", code: "CO" },
  { label: "Costa Rica", value: "costa_rica", code: "CR" },
  { label: "Cuba", value: "cuba", code: "CU" },
  { label: "República Dominicana", value: "republica_dominicana", code: "DO" },
  { label: "Ecuador", value: "ecuador", code: "EC" },
  { label: "El Salvador", value: "el_salvador", code: "SV" },
  { label: "Guatemala", value: "guatemala", code: "GT" },
  { label: "Honduras", value: "honduras", code: "HN" },
  { label: "México", value: "mexico", code: "MX" },
  { label: "Nicaragua", value: "nicaragua", code: "NI" },
  { label: "Panamá", value: "panama", code: "PA" },
  { label: "Paraguay", value: "paraguay", code: "PY" },
  { label: "Perú", value: "peru", code: "PE" },
  { label: "Puerto Rico", value: "puerto_rico", code: "PR" },
  { label: "Uruguay", value: "uruguay", code: "UY" },
  { label: "Venezuela", value: "venezuela", code: "VE" },
  { label: "Belice", value: "belice", code: "BZ" },
  { label: "Guyana", value: "guyana", code: "GY" },
  { label: "Haití", value: "haiti", code: "HT" },
  { label: "Jamaica", value: "jamaica", code: "JM" },
  { label: "Surinam", value: "surinam", code: "SR" },
  { label: "Trinidad y Tobago", value: "trinidad_tobago", code: "TT" },
  // Europe
  { label: "Albania", value: "albania", code: "AL" },
  { label: "Alemania", value: "alemania", code: "DE" },
  { label: "Andorra", value: "andorra", code: "AD" },
  { label: "Austria", value: "austria", code: "AT" },
  { label: "Bélgica", value: "belgica", code: "BE" },
  { label: "Bielorrusia", value: "bielorrusia", code: "BY" },
  { label: "Bosnia y Herzegovina", value: "bosnia_herzegovina", code: "BA" },
  { label: "Bulgaria", value: "bulgaria", code: "BG" },
  { label: "Croacia", value: "croacia", code: "HR" },
  { label: "Chipre", value: "chipre", code: "CY" },
  { label: "Dinamarca", value: "dinamarca", code: "DK" },
  { label: "Eslovaquia", value: "eslovaquia", code: "SK" },
  { label: "Eslovenia", value: "eslovenia", code: "SI" },
  { label: "España", value: "espana", code: "ES" },
  { label: "Estonia", value: "estonia", code: "EE" },
  { label: "Finlandia", value: "finlandia", code: "FI" },
  { label: "Francia", value: "francia", code: "FR" },
  { label: "Grecia", value: "grecia", code: "GR" },
  { label: "Hungría", value: "hungria", code: "HU" },
  { label: "Irlanda", value: "irlanda", code: "IE" },
  { label: "Islandia", value: "islandia", code: "IS" },
  { label: "Italia", value: "italia", code: "IT" },
  { label: "Letonia", value: "letonia", code: "LV" },
  { label: "Liechtenstein", value: "liechtenstein", code: "LI" },
  { label: "Lituania", value: "lituania", code: "LT" },
  { label: "Luxemburgo", value: "luxemburgo", code: "LU" },
  { label: "Malta", value: "malta", code: "MT" },
  { label: "Moldavia", value: "moldavia", code: "MD" },
  { label: "Mónaco", value: "monaco", code: "MC" },
  { label: "Montenegro", value: "montenegro", code: "ME" },
  { label: "Noruega", value: "noruega", code: "NO" },
  { label: "Países Bajos", value: "paises_bajos", code: "NL" },
  { label: "Polonia", value: "polonia", code: "PL" },
  { label: "Portugal", value: "portugal", code: "PT" },
  { label: "Reino Unido", value: "reino_unido", code: "GB" },
  { label: "República Checa", value: "republica_checa", code: "CZ" },
  { label: "Rumania", value: "rumania", code: "RO" },
  { label: "Rusia", value: "rusia", code: "RU" },
  { label: "San Marino", value: "san_marino", code: "SM" },
  { label: "Serbia", value: "serbia", code: "RS" },
  { label: "Suecia", value: "suecia", code: "SE" },
  { label: "Suiza", value: "suiza", code: "CH" },
  { label: "Turquía", value: "turquia", code: "TR" },
  { label: "Ucrania", value: "ucrania", code: "UA" },
  { label: "Ciudad del Vaticano", value: "vaticano", code: "VA" },
  { label: "Macedonia del Norte", value: "macedonia", code: "MK" },
];

export const bloodTypes = [
  { label: "A+", value: "A+" },
  { label: "A-", value: "A-" },
  { label: "B+", value: "B+" },
  { label: "B-", value: "B-" },
  { label: "AB+", value: "AB+" },
  { label: "AB-", value: "AB-" },
  { label: "O+", value: "O+" },
  { label: "O-", value: "O-" },
  { label: "Unknown", value: "Unknown" },
];

/**
 * Legacy specialty options for doctor search, DERIVED from the single source of
 * truth (constants/specialties.js) so it never drifts. `value` is the specialty
 * code. Prefer getSpecialtyOptions(language) from constants/specialties.js in
 * new code — it gives localized labels.
 */
export const doctorSpecialties = SPECIALTIES.map((s) => ({
  value: s.code,
  label: s.es,
}));
