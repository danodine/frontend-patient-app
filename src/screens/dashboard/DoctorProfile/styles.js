import { StyleSheet } from "react-native";
import { COLORS, FONT_FAMILY, getShadowStyle, getGlassShadow } from "../../../styles/theme";

const HEADER_HEIGHT = 300;
const BLUE_SOFT = "#EAF6FB"; // tinted background for icon squares
const BORDER = "#EDEFF2";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // Header photo
  header: {
    width: "100%",
    height: HEADER_HEIGHT,
    backgroundColor: "#DDE9F1",
  },
  headerImage: {
    width: "100%",
    height: HEADER_HEIGHT,
    resizeMode: "cover",
  },
  headerPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DDE9F1",
  },
  headerInitials: {
    fontSize: 48,
    color: COLORS.secondary,
    fontFamily: FONT_FAMILY.bold,
  },

  // Floating circular buttons over the header
  circleBtn: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    ...getGlassShadow({ y: 2, blur: 6, opacity: 0.12, elevation: 4 }),
  },

  // Body card overlapping the photo
  body: {
    marginTop: -24,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  name: {
    fontSize: 20,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.bold,
  },
  specialty: {
    fontSize: 15,
    color: COLORS.secondary,
    fontFamily: FONT_FAMILY.semiBold,
    marginTop: 2,
  },
  experienceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  experienceBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: COLORS.ligthGreyText,
    marginRight: 8,
  },
  experienceText: {
    fontSize: 13,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
  },
  experienceStrong: {
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.bold,
  },

  // Sections
  section: {
    marginTop: 22,
  },
  sectionTitle: {
    fontSize: 16,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.bold,
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
  },

  // Clinic cards
  clinicCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 12,
    ...getShadowStyle({ y: 1, blur: 4, opacity: 0.04, elevation: 1 }),
  },
  clinicCardSelected: {
    borderColor: COLORS.secondary,
    borderWidth: 1.5,
    backgroundColor: "#F4FBFE",
  },
  clinicIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BLUE_SOFT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  clinicTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  clinicName: {
    flex: 1,
    fontSize: 15,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.semiBold,
    marginRight: 8,
  },
  mapLinkWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 4,
  },
  mapLinkText: {
    fontSize: 13,
    color: COLORS.secondary,
    fontFamily: FONT_FAMILY.semiBold,
    marginLeft: 2,
  },
  clinicAddress: {
    fontSize: 13,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 4,
    lineHeight: 18,
  },
  clinicHoursRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  clinicHoursText: {
    fontSize: 12,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
    marginLeft: 4,
  },
  clinicActions: {
    marginLeft: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  roundAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },

  // Chip grid (insurance / services / payment / languages)
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridChip: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  gridChipText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.regular,
  },
  modalityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  modalityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(112, 193, 227, 0.14)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  modalityBadgeText: {
    fontSize: 13,
    color: COLORS.secondary,
    fontFamily: FONT_FAMILY.semiBold,
    marginLeft: 6,
  },

  // Day pills
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayPill: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F0F2F5",
    alignItems: "center",
  },
  dayPillOn: {
    backgroundColor: COLORS.secondary,
  },
  dayPillText: {
    fontSize: 12,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.semiBold,
  },
  dayPillTextOn: {
    color: COLORS.white,
  },

  // Working hours card
  hoursCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    borderRadius: 14,
    padding: 14,
  },
  hoursIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BLUE_SOFT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  hoursRange: {
    fontSize: 15,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.semiBold,
  },
  hoursDays: {
    fontSize: 13,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },

  // Bottom action bar
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  consultBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.white,
  },
  consultBtnText: {
    fontSize: 15,
    color: COLORS.secondary,
    fontFamily: FONT_FAMILY.bold,
  },
  bookBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
  },
  bookBtnText: {
    fontSize: 15,
    color: COLORS.white,
    fontFamily: FONT_FAMILY.bold,
  },
});

export default styles;
