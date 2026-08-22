import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import PropTypes from "prop-types";
import { COLORS } from "../styles/theme";

// A small dot that gently pulses (opacity + scale loop) to signal "live".
// Self-contained: manages its own animation loop.
export default function PulsingDot({ color = COLORS.green, size = 8, style }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
        {
          opacity: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.35],
          }),
          transform: [
            {
              scale: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.5],
              }),
            },
          ],
        },
      ]}
    />
  );
}

PulsingDot.propTypes = {
  color: PropTypes.string,
  size: PropTypes.number,
  style: PropTypes.any,
};
