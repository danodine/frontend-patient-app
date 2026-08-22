import { StyleSheet } from "react-native";
import {
  COLORS,
  getGlassStyle,
  FONT_SIZES,
  FONT_WEIGHT,
  FONT_FAMILY,
  PADDINGS,
  VALUES,
} from "../../../../styles/theme";

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: COLORS.modalOverlay,
  },
  modalContent: {
    marginHorizontal: 30,
    padding: PADDINGS.screenEdge,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    elevation: 10,
  },
  title: {
    fontSize: FONT_SIZES.subtitle1,
    fontWeight: FONT_WEIGHT.boldFont,
    marginBottom: PADDINGS.screenEdge,
  },
  option: {
    paddingVertical: 10,
  },
  cancel: {
    marginTop: PADDINGS.screenEdge,
    alignItems: "center",
  },
  cancelText: { color: COLORS.error, fontFamily: FONT_FAMILY.regular },

  typeButton: {
    ...getGlassStyle("primary"),
    paddingVertical: PADDINGS.mediumButtonVertical,
    paddingHorizontal: PADDINGS.mediumButtonHorizontal,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
  },
  typeButtonText: {
    fontWeight: FONT_WEIGHT.boldFont,
    color: COLORS.selectedItem,
    fontFamily: FONT_FAMILY.regular,
  },
});

export default styles;
