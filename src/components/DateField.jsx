import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, Platform } from "react-native";
import PropTypes from "prop-types";
import { Ionicons } from "@expo/vector-icons";
import DatePicker from "react-native-date-picker";
import { COLORS, FONT_SIZES } from "../styles/theme";

/**
 * A tappable date/time field. `react-native-date-picker` has no web renderer,
 * so on Platform.OS === "web" this falls back to a plain <input type="date"/"time">
 * in a modal instead of the native picker.
 */
export default function DateField({
  value,
  onChange,
  mode,
  placeholder,
  maximumDate,
  minimumDate,
  title,
  confirmText,
  cancelText,
  style,
  textStyle,
}) {
  const [open, setOpen] = useState(false);

  const displayText = value
    ? mode === "time"
      ? value.toTimeString().slice(0, 5)
      : value.toISOString().slice(0, 10)
    : placeholder;

  return (
    <>
      <TouchableOpacity style={style} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text
          style={[textStyle, !value && { color: COLORS.ligthGreyText }]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <Ionicons
          name={mode === "time" ? "time-outline" : "calendar-outline"}
          size={22}
          color={COLORS.greyText}
        />
      </TouchableOpacity>

      {Platform.OS === "web" ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
              padding: 24,
            }}
            onPress={() => setOpen(false)}
          >
            <Pressable
              style={{
                backgroundColor: COLORS.screenBackground,
                borderRadius: 16,
                padding: 24,
                width: "100%",
                maxWidth: 320,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.subtitle2,
                  fontWeight: "600",
                  color: COLORS.blackText,
                  marginBottom: 16,
                }}
              >
                {title}
              </Text>
              <input
                type={mode === "time" ? "time" : "date"}
                defaultValue={
                  value
                    ? mode === "time"
                      ? value.toTimeString().slice(0, 5)
                      : value.toISOString().slice(0, 10)
                    : ""
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  if (mode === "time") {
                    const [h, m] = v.split(":").map(Number);
                    const d = value ? new Date(value) : new Date();
                    d.setHours(h, m, 0, 0);
                    onChange(d);
                  } else {
                    onChange(new Date(`${v}T12:00:00`));
                  }
                }}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 16,
                  border: `1px solid ${COLORS.greyBorder}`,
                  borderRadius: 10,
                  marginBottom: 16,
                  backgroundColor: COLORS.inputBackgeound,
                  color: COLORS.blackText,
                }}
              />
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setOpen(false)}
                  style={{ paddingVertical: 10, paddingHorizontal: 16 }}
                >
                  <Text style={{ fontSize: FONT_SIZES.inputText, color: COLORS.greyText }}>
                    {cancelText}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setOpen(false)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    backgroundColor: COLORS.secondary,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: FONT_SIZES.inputText,
                      color: COLORS.whiteText,
                      fontWeight: "600",
                    }}
                  >
                    {confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : (
        <DatePicker
          modal
          open={open}
          date={value || new Date()}
          mode={mode}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onConfirm={(date) => {
            setOpen(false);
            onChange(date);
          }}
          onCancel={() => setOpen(false)}
          title={title}
          confirmText={confirmText}
          cancelText={cancelText}
        />
      )}
    </>
  );
}

DateField.propTypes = {
  value: PropTypes.instanceOf(Date),
  onChange: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(["date", "time"]),
  placeholder: PropTypes.string,
  maximumDate: PropTypes.instanceOf(Date),
  minimumDate: PropTypes.instanceOf(Date),
  title: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  textStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

DateField.defaultProps = {
  mode: "date",
};
