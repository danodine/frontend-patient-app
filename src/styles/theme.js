import { Platform } from "react-native";

/** Same gradient as web (AppLayout): 135deg */
const GRADIENT_COLORS = [
  "rgba(81, 232, 239, 0.66)",
  "rgba(67, 144, 246, 0.2)",
  "rgba(108, 166, 244, 0.66)",
];

const COLORS = {
  main: GRADIENT_COLORS,
  /** Dark bar for merged search + tab bar (like reference image) */
  bottomBarBackground: "#2C2C2E",
  bottomBarSearchBackground: "rgba(255,255,255,0.12)",
  bottomBarPlaceholder: "rgba(255,255,255,0.6)",
  bottomBarText: "#FFFFFF",
  secondary: "#70C1E3",
  white: "#fff",
  selectedItem: "#2563EB",
  selectedMenuItem: "white",
  menuItem: "black",
  ligthGreyText: "#A9A9A9",
  cardItemBackground: "#fff",
  cardItemShadow: "#121212",
  blackText: "#1C1C1E",
  greyText: "#555",
  whiteText: "#fff",
  inputBackgeound: "#fff",
  iconGrey: "#9ca3af",
  error: "#FF0000",
  externalLink: "#0000EE",
  morning: "#B7E4C7",
  afternoon: "#FFD6A5",
  black: "#000",
  greyBorder: "#ccc",
  tagColor: "#d1eded",
  green: "#34B233",
  modalOverlay: "rgba(0,0,0,0.4)",
  screenBackground: "#F5F5F7",
  tabBarBackground: "#FFFFFF",
  tabBarActivePill: "rgba(112, 193, 227, 0.25)",
};

const FONT_FAMILY = {
  regular: "Nunito_400Regular",
  semiBold: "Nunito_600SemiBold",
  bold: "Nunito_700Bold",
};

/** Spread in text styles to use Nunito app-wide (e.g. ...DEFAULT_TEXT) */
const DEFAULT_TEXT = { fontFamily: FONT_FAMILY.regular };

const FONT_WEIGHT = {
  regular: "400",
  medium: "500",
  semiBold: "600",
  bold: "700",
  /** Use for emphasis – slightly bolder across app */
  boldFont: "600",
  /** Use for titles */
  boldFontBig: "700",
};

const FONT_SIZES = {
  pageTitle: 30,
  sectionTitleBig: 24,
  inputTitle: 16,
  inputText: 15,
  bigButtonText: 18,
  mediumButtonText: 17,
  textButton: 16,
  headerTitle: 22,
  subtitle1: 19,
  subtitle2: 17,
  xsText: 14,
  generalText: 15,
};

const PADDINGS = {
  mainButtonVertical: 12,
  mainButtonHorizontal: 30,
  mediumButtonVertical: 8,
  mediumButtonHorizontal: 16,
  smallButtonVertical: 3,
  smallButtonHorizontal: 10,
  mainTop: 90,
  /** Edge margin/padding for screens and modals (used app-wide) */
  screenEdge: 16,
  /** Min bottom padding so scroll content stays above the merged tab bar (tab + optional search) */
  tabBarSafeBottom: 120,
};

/** Use for web (boxShadow) instead of deprecated shadow* props. Returns platform-specific shadow style. */
function getShadowStyle({ y = 2, blur = 8, opacity = 0.1, elevation }) {
  if (Platform.OS === "web") {
    return { boxShadow: `0px ${y}px ${blur}px rgba(0,0,0,${opacity})` };
  }
  const e = elevation ?? Math.min(Math.round(blur / 2), 12);
  if (Platform.OS === "ios") {
    return { shadowColor: "#000", shadowOffset: { width: 0, height: y }, shadowOpacity: opacity, shadowRadius: blur };
  }
  return { elevation: e };
}

// Shadow for "glass" (translucent) elements. iOS/web get a soft drop shadow;
// Android gets NONE — its `elevation` renders a hard/boxy shadow behind a
// semi-transparent, rounded view, which reads as the "terrible on Android"
// look. The translucent fill + border alone is enough there.
function getGlassShadow({ y = 2, blur = 8, opacity = 0.1 } = {}) {
  if (Platform.OS === "web") {
    return { boxShadow: `0px ${y}px ${blur}px rgba(0,0,0,${opacity})` };
  }
  if (Platform.OS === "ios") {
    return { shadowColor: "#000", shadowOffset: { width: 0, height: y }, shadowOpacity: opacity, shadowRadius: blur };
  }
  return {};
}

// Centralized "glass" button skin — ONE source of truth for every button in the
// app so they all look identical and stay Android-safe (soft shadow on iOS/web,
// no elevation on Android). Returns only the visual skin (fill + border +
// shadow); callers keep their own size/padding/radius and text color.
//   primary   → outline blue (same as secondary — the whole app uses ONE outline
//                format; pairs with blue text)
//   secondary → translucent white, blue border, pairs with blue text
//   danger    → translucent white, red border, pairs with red text
//   neutral   → translucent white, light border (icon / back / utility buttons)
const GLASS_BLUE = "37, 99, 235";
function getGlassStyle(variant = "neutral") {
  const shadow = getGlassShadow({ y: 2, blur: 8, opacity: 0.1 });
  switch (variant) {
    case "primary":
    case "secondary":
      return {
        backgroundColor: "rgba(255,255,255,0.28)",
        borderWidth: 1,
        borderColor: `rgba(${GLASS_BLUE}, 0.55)`,
        ...shadow,
      };
    case "danger":
      return {
        backgroundColor: "rgba(255,255,255,0.28)",
        borderWidth: 1,
        borderColor: "rgba(255, 0, 0, 0.5)",
        ...shadow,
      };
    case "neutral":
    default:
      return {
        backgroundColor: "rgba(255,255,255,0.28)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.6)",
        ...shadow,
      };
  }
}

const SIZES = {
  icon50: 50,
  icon20: 20,
};

const ICONS = {
  backArrow: "arrow-back-outline",
  userCircle: "user-circle-o",
  time: "time-outline",
  globe: "globe-outline",
  cash: "cash-outline",
  shieldCheckmark: "shield-checkmark-outline",
  personCircle: "person-circle",
  closeIcon: "close",
  person: "person",
  search: "search",
  pencil: "pencil",
  add: "add",
  arrowUp: "chevron-up",
  arrowDown: "chevron-down",
};

const TYPES = {
  button: "button",
  listSelector: "listSelector",
};

const VALUES = {
  inactiveButtonOpacity: 0.5,
  backButtonColor: {
    position: "absolute",
    top: 50,
    backgroundColor: COLORS.secondary,
    padding: 10,
    borderRadius: 50,
    zIndex: 10,
  },
};

export {
  COLORS,
  GRADIENT_COLORS,
  FONT_FAMILY,
  DEFAULT_TEXT,
  FONT_WEIGHT,
  SIZES,
  ICONS,
  TYPES,
  VALUES,
  FONT_SIZES,
  PADDINGS,
  getShadowStyle,
  getGlassShadow,
  getGlassStyle,
};
