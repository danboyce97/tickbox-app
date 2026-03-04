import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";
import GradientBackground from "../components/GradientBackground";
import { RootStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "SupportFeedback">;

export default function SupportFeedbackScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const feedbackCategories = [
    { id: "bug", label: "Bug Report", icon: "bug-outline" },
    { id: "feature", label: "Feature Request", icon: "bulb-outline" },
    { id: "general", label: "General Feedback", icon: "chatbubble-outline" },
    { id: "support", label: "Need Help", icon: "help-circle-outline" },
  ];

  const handleSubmitFeedback = () => {
    if (!selectedCategory || !feedbackText.trim()) {
      Alert.alert("Missing Information", "Please select a category and provide your feedback.");
      return;
    }

    const categoryLabel = feedbackCategories.find(c => c.id === selectedCategory)?.label || selectedCategory;
    const subject = encodeURIComponent(`TickBox ${categoryLabel}`);
    const body = encodeURIComponent(feedbackText);

    Linking.openURL(`mailto:support@tickboxapp.com?subject=${subject}&body=${body}`);

    // Clear form after opening email
    setTimeout(() => {
      setFeedbackText("");
      setSelectedCategory(null);
    }, 500);
  };

  const openEmail = () => {
    Linking.openURL("mailto:support@tickboxapp.com?subject=TickBox Support");
  };

  const openWebsite = () => {
    Linking.openURL("https://tick-box-support-d9183920.base44.app");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView className="flex-1">
        {/* Header */}
        <View
          className="flex-row items-center px-6 py-4"
          style={{
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            className="mr-4"
          >
            <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          </Pressable>
          <Text style={{ color: colors.text }} className="text-xl font-bold">
            Support & Feedback
          </Text>
        </View>

        <View className="px-6 py-6">
          {/* Quick Help */}
          <TickBoxCard style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
              Quick Help
            </Text>

            <View className="space-y-3">
              <Pressable
                className="flex-row items-center py-3"
                onPress={openWebsite}
              >
                <View style={{ backgroundColor: colors.primary + "20" }} className="w-10 h-10 rounded-full items-center justify-center mr-4">
                  <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.text }}>Help Center</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm">
                    Browse our FAQ and guides
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>

              <Pressable
                className="flex-row items-center py-3"
                onPress={openEmail}
              >
                <View style={{ backgroundColor: colors.primary + "20" }} className="w-10 h-10 rounded-full items-center justify-center mr-4">
                  <Ionicons name="mail-outline" size={20} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.text }}>Email Support</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm">
                    Get help from our support team
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          </TickBoxCard>

          {/* Send Feedback */}
          <TickBoxCard style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
              Send Feedback
            </Text>

            {/* Feedback Categories */}
            <Text style={{ color: colors.text }} className="font-medium mb-3">
              What type of feedback?
            </Text>
            <View className="flex-row flex-wrap mb-4">
              {feedbackCategories.map((category) => (
                <Pressable
                  key={category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  style={{
                    backgroundColor: selectedCategory === category.id ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: selectedCategory === category.id ? colors.primary : colors.border,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginRight: 8,
                    marginBottom: 8,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name={category.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={selectedCategory === category.id ? "white" : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      color: selectedCategory === category.id ? "white" : colors.text,
                      fontSize: 14,
                    }}
                  >
                    {category.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Feedback Text */}
            <Text style={{ color: colors.text }} className="font-medium mb-3">
              Your Message
            </Text>
            <TextInput
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={6}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 16,
                color: colors.text,
                backgroundColor: colors.surface,
                textAlignVertical: "top",
                minHeight: 120,
                marginBottom: 16,
              }}
              placeholder="Tell us about your experience, report a bug, or suggest a feature..."
              placeholderTextColor={colors.textMuted}
            />

            {/* Submit Button */}
            <GradientBackground style={{ borderRadius: 12 }}>
              <Pressable
                onPress={handleSubmitFeedback}
                style={{ paddingVertical: 16 }}
              >
                <Text className="text-white text-center font-semibold text-base">
                  Submit Feedback
                </Text>
              </Pressable>
            </GradientBackground>
          </TickBoxCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
