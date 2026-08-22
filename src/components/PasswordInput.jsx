import React, { useState } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import PropTypes from "prop-types";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../styles/theme";

/**
 * A TextInput for password fields with a show/hide toggle.
 * Renders on top of the caller's own input style (border/box, etc.) — just
 * adds right padding for the eye icon and manages the reveal state itself.
 */
const PasswordInput = ({ style, iconColor, iconSize, ...textInputProps }) => {
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ justifyContent: "center" }}>
      <TextInput
        {...textInputProps}
        style={[style, { paddingRight: 44 }]}
        secureTextEntry={!visible}
      />
      <TouchableOpacity
        style={{ position: "absolute", right: 14 }}
        onPress={() => setVisible((v) => !v)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
      >
        <Ionicons
          name={visible ? "eye-off-outline" : "eye-outline"}
          size={iconSize || 22}
          color={iconColor || COLORS.iconGrey}
        />
      </TouchableOpacity>
    </View>
  );
};

PasswordInput.propTypes = {
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  iconColor: PropTypes.string,
  iconSize: PropTypes.number,
};

export default PasswordInput;
