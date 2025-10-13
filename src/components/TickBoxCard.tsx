import React from "react";
import { View, ViewStyle } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

interface TickBoxCardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  noPadding?: boolean;
}

export default function TickBoxCard({ children, className = "", style, noPadding = false }: TickBoxCardProps) {
  const { colors, isDark } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: isDark ? "#000" : "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 3,
    elevation: 3,
    ...(!noPadding && { padding: 16 }),
    ...style,
  };

  return (
    <View style={cardStyle} className={className}>
      {children}
    </View>
  );
}
