import React from "react";
import { ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";

interface GradientBackgroundProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  className?: string;
  colors?: [string, string, ...string[]];
}

export default function GradientBackground({ children, style, className, colors }: GradientBackgroundProps) {
  const { colors: themeColors } = useTheme();

  const gradientColors: [string, string, ...string[]] = colors || [themeColors.primaryStart, themeColors.primaryEnd];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
      className={className}
    >
      {children}
    </LinearGradient>
  );
}
