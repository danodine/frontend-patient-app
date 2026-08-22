import { StyleSheet } from "react-native";
import { COLORS, FONT_SIZES, FONT_FAMILY, getShadowStyle, getGlassStyle } from "../../../styles/theme";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.screenBackground,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    paddingTop: 50,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.greyBorder,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZES.headerTitle,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.semiBold,
  },
  keyboardView: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyMessages: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.greyText,
    fontFamily: FONT_FAMILY.regular,
  },
  errorWrap: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "rgba(255,0,0,0.08)",
    borderRadius: 8,
  },
  errorText: {
    fontSize: FONT_SIZES.inputText,
    color: COLORS.error,
    fontFamily: FONT_FAMILY.regular,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 8,
  },
  messageBubblePatient: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.secondary,
  },
  messageBubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.cardItemBackground,
    ...getShadowStyle({ y: 1, blur: 4, opacity: 0.06, elevation: 2 }),
  },
  messageBubbleNew: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },
  messageText: {
    fontSize: FONT_SIZES.inputText,
    fontFamily: FONT_FAMILY.regular,
  },
  messageTextPatient: {
    color: COLORS.whiteText,
  },
  messageTextOther: {
    color: COLORS.blackText,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    fontFamily: FONT_FAMILY.regular,
  },
  messageTimePatient: {
    color: "rgba(255,255,255,0.85)",
  },
  messageTimeOther: {
    color: COLORS.greyText,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 24,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.greyBorder,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: COLORS.inputBackgeound,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: FONT_SIZES.inputText,
    color: COLORS.blackText,
    fontFamily: FONT_FAMILY.regular,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.greyBorder,
  },
  sendButton: {
    ...getGlassStyle("primary"),
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default styles;
