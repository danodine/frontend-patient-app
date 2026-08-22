import { StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHT,
  FONT_FAMILY,
  PADDINGS,
  getShadowStyle,
  getGlassStyle,
} from "../../../styles/theme";

const CARD_MAX = 500;
const CARD_PADDING = 24;
const CARD_RADIUS = 16;
const AVATAR_SIZE = 56;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: CARD_PADDING,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  backTouch: {
    padding: 8,
    marginLeft: -8,
  },
  card: {
    width: "100%",
    maxWidth: CARD_MAX,
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: CARD_RADIUS,
    paddingHorizontal: PADDINGS.screenEdge,
    paddingVertical: PADDINGS.screenEdge,
    ...getShadowStyle({ y: 4, blur: 12, opacity: 0.1, elevation: 8 }),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: FONT_WEIGHT.boldFontBig,
    color: COLORS.blackText,
    marginBottom: 4,
    fontFamily: FONT_FAMILY.semiBold,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.greyText,
    marginBottom: PADDINGS.screenEdge,
    fontFamily: FONT_FAMILY.regular,
  },
  list: {
    paddingBottom: 24,
  },
  doctorItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  doctorName: {
    fontSize: FONT_SIZES.subtitle2,
    fontWeight: FONT_WEIGHT.boldFont,
    color: COLORS.blackText,
    marginBottom: 2,
    fontFamily: FONT_FAMILY.regular,
  },
  doctorMeta: {
    fontSize: FONT_SIZES.xsText,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
  },
  removeButton: {
    padding: 8,
  },
  loader: {
    paddingVertical: 40,
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.greyText,
    textAlign: "center",
    marginBottom: 8,
    fontFamily: FONT_FAMILY.regular,
  },
  errorText: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.error,
    textAlign: "center",
    fontFamily: FONT_FAMILY.regular,
  },
});

export default styles;
