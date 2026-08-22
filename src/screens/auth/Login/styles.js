import { StyleSheet, Platform } from "react-native";
import {
  COLORS,
  FONT_WEIGHT,
  FONT_SIZES,
  FONT_FAMILY,
  PADDINGS,
  getShadowStyle,
  getGlassStyle,
} from "../../../styles/theme";

const INPUT_RADIUS = 12;
const BUTTON_RADIUS = 12;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 32,
  },
  content: {
    alignSelf: "center",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    marginBottom: 8,
  },
  backTouch: {
    padding: 8,
    marginLeft: -8,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  welfareIcon: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: FONT_WEIGHT.boldFontBig,
    color: COLORS.blackText,
    textAlign: "center",
    marginBottom: 8,
    fontFamily: FONT_FAMILY.semiBold,
  },
  welfareMessage: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.greyText,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.regular,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: INPUT_RADIUS,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.greyBorder,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 0,
    fontSize: FONT_SIZES.inputText,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.regular,
  },
  inputErrorBorder: {
    borderColor: COLORS.error,
  },
  passwordRow: {
    position: "relative",
    marginBottom: 14,
  },
  passwordToggle: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    padding: 4,
    zIndex: 1,
  },
  rememberForgotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: PADDINGS.screenEdge,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  checkboxUnchecked: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.greyBorder,
  },
  rememberText: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.regular,
  },
  forgotPassword: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.secondary,
    fontWeight: FONT_WEIGHT.boldFont,
    fontFamily: FONT_FAMILY.regular,
  },
  button: {
    ...getGlassStyle("primary"),
    paddingVertical: 14,
    borderRadius: BUTTON_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.selectedItem,
    fontWeight: FONT_WEIGHT.boldFontBig,
    fontSize: FONT_SIZES.mediumButtonText,
    fontFamily: FONT_FAMILY.semiBold,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: PADDINGS.screenEdge,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.greyBorder,
  },
  orText: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.greyText,
    marginHorizontal: 16,
    fontFamily: FONT_FAMILY.regular,
  },
  socialButton: {
    ...getGlassStyle("secondary"),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: INPUT_RADIUS,
    marginBottom: 10,
  },
  socialButtonText: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.blackText,
    marginLeft: 12,
    fontFamily: FONT_FAMILY.regular,
  },
  signupRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginTop: PADDINGS.screenEdge,
  },
  signupPrompt: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
  },
  signupLink: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.secondary,
    fontWeight: FONT_WEIGHT.boldFontBig,
    fontFamily: FONT_FAMILY.semiBold,
  },
  error: {
    fontSize: 13,
    color: COLORS.error,
    marginBottom: 12,
    fontFamily: FONT_FAMILY.regular,
  },
  loadingWrap: {
    alignItems: "center",
    marginVertical: 8,
  },

  // Blocked-account modal
  blockedOverlay: {
    flex: 1,
    backgroundColor: COLORS.modalOverlay,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  blockedCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    ...getShadowStyle({ y: 10, blur: 30, opacity: 0.2, elevation: 8 }),
  },
  blockedIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 59, 48, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  blockedTitle: {
    fontSize: FONT_SIZES.subtitle1,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.blackText,
    textAlign: "center",
    marginBottom: 8,
  },
  blockedMessage: {
    fontSize: FONT_SIZES.generalText,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.greyText,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 22,
  },
  blockedButton: {
    ...getGlassStyle("primary"),
    width: "100%",
    paddingVertical: 13,
    borderRadius: BUTTON_RADIUS,
    alignItems: "center",
  },
  blockedButtonText: {
    color: COLORS.selectedItem,
    fontSize: FONT_SIZES.mediumButtonText,
    fontFamily: FONT_FAMILY.semiBold,
    fontWeight: FONT_WEIGHT.semiBold,
  },
});

export default styles;
