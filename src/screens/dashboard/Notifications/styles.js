import { StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZES,
  FONT_FAMILY,
  FONT_WEIGHT,
  PADDINGS,
  getShadowStyle,
  getGlassStyle,
} from "../../../styles/theme";

const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: PADDINGS.tabBarSafeBottom,
  },
  title: {
    fontSize: FONT_SIZES.sectionTitleBig,
    fontWeight: FONT_WEIGHT.boldFontBig,
    color: COLORS.blackText,
    marginBottom: 10,
    fontFamily: FONT_FAMILY.semiBold,
  },
  sectionHeader: {
    fontSize: 13,
    letterSpacing: 1,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.semiBold,
    textTransform: "uppercase",
    marginTop: 18,
    marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: CARD_RADIUS,
    padding: 16,
    marginBottom: 12,
    ...getShadowStyle({ y: 2, blur: 10, opacity: 0.05, elevation: 2 }),
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },
  cardApproved: {
    opacity: 0.7,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardIcon: {
    marginRight: 12,
    marginTop: 1,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: FONT_SIZES.subtitle2,
    fontWeight: FONT_WEIGHT.boldFont,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.semiBold,
    marginRight: 8,
  },
  cardStamp: {
    fontSize: 12,
    color: COLORS.ligthGreyText,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 1,
  },
  cardBody: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.greyText,
    lineHeight: 21,
    marginBottom: 2,
    fontFamily: FONT_FAMILY.regular,
  },
  cardHint: {
    fontSize: FONT_SIZES.xsText,
    color: COLORS.greyText,
    lineHeight: 20,
    marginBottom: 10,
    fontStyle: "italic",
    fontFamily: FONT_FAMILY.regular,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  detailIcon: { marginRight: 8 },
  detailText: {
    fontSize: FONT_SIZES.xsText,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.regular,
  },
  approveButton: {
    ...getGlassStyle("primary"),
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 6,
  },
  approveButtonText: {
    fontSize: FONT_SIZES.inputText,
    fontWeight: FONT_WEIGHT.boldFont,
    color: COLORS.selectedItem,
    fontFamily: FONT_FAMILY.semiBold,
  },
  chatButton: {
    ...getGlassStyle("secondary"),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 8,
    borderRadius: 10,
  },
  chatButtonText: {
    fontSize: FONT_SIZES.inputText,
    fontWeight: FONT_WEIGHT.boldFont,
    color: COLORS.secondary,
    fontFamily: FONT_FAMILY.semiBold,
    marginLeft: 8,
  },
  approvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    paddingVertical: 6,
  },
  approvedText: {
    fontSize: FONT_SIZES.xsText,
    color: COLORS.green,
    marginLeft: 6,
    fontWeight: FONT_WEIGHT.boldFont,
    fontFamily: FONT_FAMILY.semiBold,
  },
  timeAgo: {
    fontSize: 12,
    color: COLORS.ligthGreyText,
    marginTop: 6,
    fontFamily: FONT_FAMILY.regular,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.subtitle2,
    color: COLORS.blackText,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
    fontFamily: FONT_FAMILY.semiBold,
  },
  emptyHint: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.greyText,
    textAlign: "center",
    fontFamily: FONT_FAMILY.regular,
  },
  loader: {
    paddingVertical: 24,
    alignItems: "center",
  },
  errorBanner: {
    backgroundColor: "rgba(255,0,0,0.08)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    marginHorizontal: PADDINGS.screenEdge,
  },
  errorText: {
    fontSize: FONT_SIZES.xsText,
    color: COLORS.error,
    textAlign: "center",
    fontFamily: FONT_FAMILY.regular,
  },
});

export default styles;
