import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

interface Tab {
  key: string;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  content: React.ReactNode;
}

interface TabViewProps {
  tabs: Tab[];
  initialTab?: string;
}

export default function TabView({ tabs, initialTab }: TabViewProps) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState(initialTab || tabs[0]?.key || "");

  const activeTabContent = tabs.find(tab => tab.key === activeTab)?.content;

  return (
    <View className="flex-1">
      {/* Tab Headers */}
      <View className="flex-row p-2" style={{ backgroundColor: colors.surface }}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className="flex-1 py-3 mx-1"
            style={{ 
              backgroundColor: activeTab === tab.key ? colors.primary : "transparent",
              borderRadius: 12
            }}
          >
            <View className="flex-row items-center justify-center">
              {tab.icon && (
                <Ionicons 
                  name={tab.icon} 
                  size={18} 
                  color={activeTab === tab.key ? "white" : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
              )}
              <Text 
                className="font-medium"
                style={{ color: activeTab === tab.key ? "white" : colors.textSecondary }}
              >
                {tab.title}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView className="flex-1">
        {activeTabContent}
      </ScrollView>
    </View>
  );
}