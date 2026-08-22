import { StyleSheet, Dimensions } from "react-native";
import { FONT_SIZES, FONT_FAMILY, getShadowStyle } from "../../../../styles/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const H_MARGIN = 16;
const SNACKBAR_MAX_WIDTH = SCREEN_WIDTH - H_MARGIN * 2;
const BORDER_RADIUS = 12;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: H_MARGIN,
    right: H_MARGIN,
    maxWidth: SNACKBAR_MAX_WIDTH,
    alignSelf: "center",
    borderRadius: BORDER_RADIUS,
    zIndex: 9999,
    ...getShadowStyle({ y: 4, blur: 8, opacity: 0.2, elevation: 12 }),
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconWrapDark: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  message: {
    flex: 1,
    fontSize: FONT_SIZES.inputText,
    fontFamily: FONT_FAMILY.regular,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  actionText: {
    fontSize: FONT_SIZES.inputText,
    fontFamily: FONT_FAMILY.semiBold,
    color: "#fff",
  },
  dismissButton: {
    padding: 4,
  },
});

export default styles;
