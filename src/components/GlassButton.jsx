import React from "react";
import { TouchableOpacity, View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import PropTypes from "prop-types";

// Frosted-glass button.
//
// iOS/web: a real BlurView (blurs whatever is behind it) + a thin variant tint.
// Android: the BlurView's live blur (experimentalBlurMethod) bleeds content from
//   BEHIND the modal window through the button, so it looks see-through. There we
//   skip the blur and paint a mostly-opaque frosted fill instead — same look,
//   never see-through. (getGlassShadow already keeps shadows Android-safe.)
//
// Drop-in for a glass TouchableOpacity: swap the tag, pass `variant`, keep the
// existing style (its border/shadow/radius still apply).
const isAndroid = Platform.OS === "android";

// Light tints layered over the real blur on iOS/web.
const TINTS = {
  primary: "rgba(255, 255, 255, 0.10)",
  secondary: "rgba(255, 255, 255, 0.10)",
  danger: "rgba(255, 255, 255, 0.10)",
  neutral: "rgba(255, 255, 255, 0.15)",
};

// FULLY OPAQUE frosted fills for Android (no live blur there, so any
// transparency just reveals the content behind → see-through). Solid colors,
// lightly tinted so they still read as soft glass rather than stark blocks.
const ANDROID_FILL = {
  primary: "rgb(238, 244, 250)", // near-white (outline) — same as secondary
  secondary: "rgb(238, 244, 250)", // near-white, faint blue tint
  danger: "rgb(249, 242, 242)", // near-white, faint warm tint
  neutral: "rgb(240, 245, 250)", // near-white for icon/back buttons
};

export default function GlassButton({
  variant = "neutral",
  intensity = 28,
  style,
  children,
  ...rest
}) {
  return (
    <TouchableOpacity {...rest} style={[styles.base, style]}>
      {isAndroid ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: ANDROID_FILL[variant] || ANDROID_FILL.neutral },
          ]}
        />
      ) : (
        <>
          <BlurView
            intensity={intensity}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: TINTS[variant] || TINTS.neutral },
            ]}
          />
        </>
      )}
      {children}
    </TouchableOpacity>
  );
}

// overflow:hidden so the fill/blur is clipped to the button's borderRadius.
const styles = StyleSheet.create({
  base: { overflow: "hidden" },
});

GlassButton.propTypes = {
  variant: PropTypes.oneOf(["primary", "secondary", "danger", "neutral"]),
  intensity: PropTypes.number,
  style: PropTypes.any,
  children: PropTypes.node,
};
