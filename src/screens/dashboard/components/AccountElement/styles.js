import { StyleSheet, Dimensions } from "react-native";
import { COLORS, FONT_SIZES, FONT_WEIGHT, FONT_FAMILY, PADDINGS, getShadowStyle } from "../../../../styles/theme";

const screenWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  cardItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardItemBackground,
    width: screenWidth - PADDINGS.screenEdge * 2,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    ...getShadowStyle({ y: 4, blur: 6, opacity: 0.1, elevation: 5 }),
    transition: "transform 0.2s ease-in-out",
  },
  textItem: {
    marginLeft: PADDINGS.screenEdge,
  },
  cardIcon: {
    width: 40,
    height: 40,
    marginRight: PADDINGS.screenEdge,
    marginLeft: 5,
  },
  item1: {
    fontWeight: FONT_WEIGHT.boldFont,
    fontSize: FONT_SIZES.subtitle2,
    fontFamily: FONT_FAMILY.regular,
  },
});

export default styles;
