import React, { createContext, useContext, useEffect } from "react";
import { useColorScheme } from "react-native";
import { useUserStore } from "../state/userStore";

export interface ThemeColors {
  background: string;
  surface: string;
  cardBackground: string;
  primary: string;
  primaryStart: string; // For gradient start
  primaryEnd: string; // For gradient end
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  accent: string;
}

const lightTheme: ThemeColors = {
  background: "#FAFAFA",
  surface: "#FFFFFF",
  cardBackground: "#FFFFFF",
  primary: "#dc808b",
  primaryStart: "#dc808b", // TickBox gradient start
  primaryEnd: "#c96d7a", // TickBox gradient end
  text: "#1F2937",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#F3F4F6",
  error: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
  accent: "#dc808b",
};

const darkTheme: ThemeColors = {
  background: "#1F2937",
  surface: "#374151",
  cardBackground: "#374151",
  primary: "#dc808b",
  primaryStart: "#dc808b",
  primaryEnd: "#c96d7a",
  text: "#F9FAFB",
  textSecondary: "#D1D5DB",
  textMuted: "#9CA3AF",
  border: "#4B5563",
  error: "#F87171",
  success: "#34D399",
  warning: "#FBBF24",
  accent: "#dc808b",
};

interface ThemeContextType {
  theme: "light" | "dark";
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const userTheme = useUserStore((state) => state.user?.theme);
  const setTheme = useUserStore((state) => state.setTheme);

  // Set initial theme based on system preference if user hasn't set one
  useEffect(() => {
    if (!userTheme && systemColorScheme) {
      setTheme(systemColorScheme);
    }
  }, [systemColorScheme, userTheme, setTheme]);

  const theme = userTheme || systemColorScheme || "light";
  const colors = theme === "dark" ? darkTheme : lightTheme;
  const isDark = theme === "dark";

  return <ThemeContext.Provider value={{ theme, colors, isDark }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
