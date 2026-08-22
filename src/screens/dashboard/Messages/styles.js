import { StyleSheet } from "react-native";
import { COLORS, FONT_SIZES, FONT_FAMILY, PADDINGS, getShadowStyle, getGlassStyle } from "../../../styles/theme";

const AVATAR_SIZE = 52;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.screenBackground,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
    marginBottom: 4,
  },
  listBody: {
    paddingTop: 12,
    paddingBottom: PADDINGS.tabBarSafeBottom,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: FONT_SIZES.sectionTitleBig,
    fontWeight: "600",
    color: COLORS.blackText,
    marginBottom: 10,
    fontFamily: FONT_FAMILY.semiBold,
  },
  videoCallButton: {
    ...getGlassStyle("secondary"),
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  videoCallButtonText: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.semiBold,
  },
  placeholder: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.greyText,
    textAlign: "center",
    fontFamily: FONT_FAMILY.regular,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 120,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.subtitle2,
    color: COLORS.blackText,
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
  cardWrapper: {
    marginBottom: 14,
  },
  conversationRow: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 0,
    shadowColor: "#9ca3af",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.greyBorder,
    marginVertical: 12,
    marginHorizontal: 4,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginRight: 14,
    backgroundColor: COLORS.tagColor,
  },
  unreadDot: {
    position: "absolute",
    bottom: 0,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.error,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginRight: 14,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 20,
    color: COLORS.whiteText,
    fontFamily: FONT_FAMILY.semiBold,
  },
  cardDoctorBlock: {
    flex: 1,
    minWidth: 0,
  },
  conversationName: {
    fontSize: FONT_SIZES.subtitle2,
    color: COLORS.blackText,
    marginBottom: 2,
    fontFamily: FONT_FAMILY.semiBold,
  },
  conversationNameUnread: {
    fontFamily: FONT_FAMILY.semiBold,
  },
  cardSpecialty: {
    fontSize: FONT_SIZES.xsText,
    color: COLORS.greyText,
    marginBottom: 2,
    fontFamily: FONT_FAMILY.regular,
  },
  cardConsultationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardConsultationDate: {
    fontSize: FONT_SIZES.xsText - 1,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
  },
  cardTimeAgo: {
    fontSize: FONT_SIZES.xsText - 1,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
  },
  cardChevron: {
    marginLeft: 6,
  },
  conversationPreview: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.regular,
  },
  cardStatusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green,
    marginRight: 6,
  },
  cardStatusText: {
    fontSize: FONT_SIZES.xsText - 1,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
  },
  conversationBody: {
    flex: 1,
    minWidth: 0,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginRight: 8,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.whiteText,
    fontFamily: FONT_FAMILY.semiBold,
  },
  loader: {
    paddingVertical: 24,
    alignItems: "center",
  },
});

export default styles;
