import React, { useEffect, useRef } from "react";
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import styles from "./styles";
import { COLORS } from "../../../../styles/theme";

const TYPE_CONFIG = {
  primary: {
    bg: COLORS.secondary,
    icon: "information-circle",
    textColor: COLORS.blackText,
  },
  success: {
    bg: COLORS.green,
    icon: "checkmark-circle",
    textColor: COLORS.blackText,
  },
  error: {
    bg: COLORS.error,
    icon: "alert-circle",
    textColor: COLORS.blackText,
  },
  danger: {
    bg: COLORS.error,
    icon: "alert-circle",
    textColor: COLORS.blackText,
  },
  warning: {
    bg: "#E6A800",
    icon: "warning",
    textColor: COLORS.blackText,
  },
  general: {
    bg: "#333",
    icon: "information-circle",
    textColor: COLORS.whiteText,
  },
};

const Snackbar = ({
  type = "success",
  message = "",
  visible = false,
  duration = 4000,
  onHide,
  actionLabel,
  onAction,
}) => {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 12);

  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.general;
  const isDark = type === "general";

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      let timer = null;
      if (duration > 0) {
        timer = setTimeout(() => {
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: -120,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            }),
          ]).start(() => {
            if (onHide) onHide();
          });
        }, duration);
      }

      return () => {
        if (timer) clearTimeout(timer);
      };
    } else {
      translateY.setValue(-120);
      opacity.setValue(0);
    }
  }, [visible, duration, onHide, translateY, opacity]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          top: topInset,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.inner}>
        <View style={[styles.iconWrap, isDark && styles.iconWrapDark]}>
          <Ionicons
            name={config.icon}
            size={20}
            color={isDark ? COLORS.whiteText : config.bg}
          />
        </View>
        <Text
          style={[styles.message, { color: config.textColor }]}
          numberOfLines={2}
        >
          {message}
        </Text>
        {actionLabel && onAction ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              onAction();
              handleDismiss();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons
            name="close"
            size={22}
            color={config.textColor}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

Snackbar.propTypes = {
  type: PropTypes.oneOf(["primary", "success", "error", "danger", "warning", "general"]),
  message: PropTypes.string,
  visible: PropTypes.bool,
  duration: PropTypes.number,
  onHide: PropTypes.func,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
};

// Keep TopBanner as alias for backward compatibility
export default Snackbar;
