import { StyleSheet, Platform } from "react-native";
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHT,
  FONT_FAMILY,
  PADDINGS,
  getShadowStyle,
  getGlassStyle,
} from "../../../styles/theme";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: PADDINGS.screenEdge,
    paddingBottom: PADDINGS.tabBarSafeBottom,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 14,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: FONT_SIZES.headerTitle,
    fontWeight: FONT_WEIGHT.boldFontBig,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.semiBold,
    flex: 1,
    textAlign: "center",
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.subtitle2,
    fontWeight: FONT_WEIGHT.boldFont,
    color: COLORS.blackText,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyHint: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.greyText,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryButton: {
    ...getGlassStyle("primary"),
    marginTop: 20,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: COLORS.selectedItem,
    fontWeight: FONT_WEIGHT.boldFont,
    fontSize: FONT_SIZES.inputText,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    ...getShadowStyle({ y: 2, blur: 10, opacity: 0.06, elevation: 3 }),
  },
  cardTitle: {
    fontSize: FONT_SIZES.inputTitle,
    fontWeight: FONT_WEIGHT.boldFont,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.semiBold,
    marginBottom: 6,
  },
  cardDate: {
    fontSize: FONT_SIZES.xsText,
    color: COLORS.greyText,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: FONT_SIZES.xsText,
    color: COLORS.secondary,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  tag: {
    fontSize: 12,
    color: COLORS.secondary,
    backgroundColor: "rgba(112, 193, 227, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: "hidden",
  },
  contentBlock: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  contentText: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.blackText,
    lineHeight: 22,
    fontFamily: FONT_FAMILY.regular,
  },
  contentParagraph: {
    marginBottom: 10,
  },
  loader: {
    paddingVertical: 48,
    alignItems: "center",
  },
});

export default styles;
