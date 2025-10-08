import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "./TickBoxCard";

interface StatItem {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}

interface StatsGridProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
}

export default function StatsGrid({ stats, columns = 3 }: StatsGridProps) {
  const { colors } = useTheme();

  return (
    <TickBoxCard>
      <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
        Your Stats
      </Text>
      
      <View className="flex-row flex-wrap -mx-2">
        {stats.map((stat, index) => (
          <View key={index} style={{ width: `${100 / columns}%` }} className="px-2 mb-4">
            <View className="items-center">
              <View 
                style={{ 
                  backgroundColor: `${stat.color || colors.primary}20`,
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons 
                  name={stat.icon} 
                  size={24} 
                  color={stat.color || colors.primary} 
                />
              </View>
              <Text 
                style={{ color: stat.color || colors.primary }} 
                className="text-2xl font-bold"
              >
                {stat.value}
              </Text>
              <Text 
                style={{ color: colors.textSecondary }} 
                className="text-sm text-center"
                numberOfLines={2}
              >
                {stat.label}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </TickBoxCard>
  );
}