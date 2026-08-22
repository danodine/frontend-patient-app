import { StyleSheet, Platform } from "react-native";
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHT,
  FONT_FAMILY,
  PADDINGS,
  VALUES,
  getShadowStyle,
  getGlassStyle,
} from "../../../styles/theme";

const CARD_RADIUS = 16;
const INPUT_RADIUS = 12;
const BUTTON_RADIUS = 12;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    padding: 8,
    marginBottom: 16,
    zIndex: 1,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    backgroundColor: COLORS.white,
    borderRadius: CARD_RADIUS,
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginBottom: PADDINGS.screenEdge,
    ...getShadowStyle({ y: 4, blur: 12, opacity: 0.1, elevation: 8 }),
  },
  title: {
    fontSize: 22,
    fontWeight: FONT_WEIGHT.boldFontBig,
    color: COLORS.blackText,
    textAlign: "center",
    marginBottom: 8,
    fontFamily: FONT_FAMILY.semiBold,
  },
  titleBold: {
    fontWeight: FONT_WEIGHT.boldFontBig,
    fontFamily: FONT_FAMILY.semiBold,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.greyText,
    textAlign: "center",
    marginBottom: 24,
    fontFamily: FONT_FAMILY.regular,
  },
  label: {
    marginBottom: 6,
    fontWeight: FONT_WEIGHT.boldFont,
    fontSize: FONT_SIZES.inputTitle,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.regular,
  },
  input: {
    width: "100%",
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: INPUT_RADIUS,
    marginBottom: 16,
    fontSize: FONT_SIZES.inputText,
    color: COLORS.blackText,
    borderWidth: 1,
    borderColor: COLORS.greyBorder,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  dropdown: {
    minHeight: 48,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: -10,
    marginBottom: 12,
  },
  button: {
    ...getGlassStyle("primary"),
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: BUTTON_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: VALUES.inactiveButtonOpacity,
  },
  buttonText: {
    color: COLORS.selectedItem,
    fontWeight: FONT_WEIGHT.boldFontBig,
    fontSize: FONT_SIZES.mediumButtonText,
  },
  loginRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginTop: PADDINGS.screenEdge,
  },
  loginPrompt: {
    fontSize: 14,
    color: COLORS.greyText,
  },
  loginLink: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: FONT_WEIGHT.boldFontBig,
  },
});

export default styles;
