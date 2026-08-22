import { StyleSheet, Platform, Dimensions } from "react-native";
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHT,
  FONT_FAMILY,
  PADDINGS,
  getShadowStyle,
} from "../../../styles/theme";

const { width } = Dimensions.get("window");
const isNarrow = width < 400;
const CARD_MAX = 400;
const CARD_PADDING = 24;
const CARD_RADIUS = 16;
const GAP = 12;
const contentWidth = Math.min(width - CARD_PADDING * 2, CARD_MAX - 40);
const NUM_COLUMNS = contentWidth > 320 ? 2 : 1;
const TILE_SIZE = (contentWidth - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: CARD_PADDING,
  },
  scrollContent: {
    flexGrow: 1,
    width: "100%",
    maxWidth: CARD_MAX,
    paddingBottom: 40,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backTouch: {
    padding: 8,
    marginLeft: -8,
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: CARD_RADIUS,
    paddingHorizontal: PADDINGS.screenEdge,
    paddingVertical: 24,
    ...getShadowStyle({ y: 4, blur: 12, opacity: 0.1, elevation: 8 }),
  },
  title: {
    fontSize: 22,
    fontWeight: FONT_WEIGHT.boldFontBig,
    color: COLORS.blackText,
    marginBottom: 4,
    fontFamily: FONT_FAMILY.semiBold,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.greyText,
    marginBottom: 24,
    fontFamily: FONT_FAMILY.regular,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tile: {
    width: TILE_SIZE,
    minHeight: 72,
    marginBottom: GAP,
    backgroundColor: "rgba(112, 193, 227, 0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(112, 193, 227, 0.3)",
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  tileText: {
    fontSize: isNarrow ? FONT_SIZES.xsText : FONT_SIZES.inputText,
    color: COLORS.blackText,
    fontWeight: FONT_WEIGHT.boldFont,
    textAlign: "center",
    fontFamily: FONT_FAMILY.regular,
  },
});

export default styles;
