import { StyleSheet } from "react-native";
import { COLORS, PADDINGS, FONT_WEIGHT, FONT_SIZES, FONT_FAMILY, getGlassStyle } from "../../../styles/theme";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: PADDINGS.screenEdge,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILY.semiBold,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: PADDINGS.screenEdge,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.regular,
  },
  input: {
    width: "100%",
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: -10,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: PADDINGS.screenEdge,
    zIndex: 1,
  },
  button: {
    ...getGlassStyle("primary"),
    marginTop: 24,
    paddingVertical: PADDINGS.mainButtonVertical,
    borderRadius: 12,
    paddingHorizontal: PADDINGS.mainButtonHorizontal,
    alignItems: "center",
  },
  buttonText: {
    color: COLORS.selectedItem,
    fontWeight: FONT_WEIGHT.boldFont,
    fontSize: FONT_SIZES.bigButtonText,
    fontFamily: FONT_FAMILY.regular,
  },
});

export default styles;
