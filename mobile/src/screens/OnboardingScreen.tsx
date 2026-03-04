import React, { useState, useRef } from "react";
import { View, Text, Pressable, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useUserStore } from "../state/userStore";
import { useTheme } from "../contexts/ThemeContext";
import GradientBackground from "../components/GradientBackground";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingSlide {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  features: string[];
}

const slides: OnboardingSlide[] = [
  {
    title: "Welcome to TickBox",
    description: "Your digital memory keeper for all life's special moments. Transform tickets into treasured memories.",
    icon: "ticket-outline",
    color: "#dc808b",
    features: ["Keep all your event memories in one place", "Never lose a ticket again", "Relive your favorite moments"],
  },
  {
    title: "Upload Tickets",
    description: "Upload your tickets as photos or screenshots to keep your memories alive forever.",
    icon: "camera-outline",
    color: "#dc808b",
    features: ["Upload photos or screenshots", "High-quality storage", "QR code protection for future events"],
  },
  {
    title: "Tag Your Friends",
    description: "Tag friends who joined you at events and share your experiences together. Build memories as a community.",
    icon: "people-outline",
    color: "#dc808b",
    features: ["Tag friends in memories", "See friends' activities", "Share experiences together"],
  },
  {
    title: "Get Timely Reminders",
    description: "Receive 'On This Day' reminders of past events and 'One Week To Go' notifications for upcoming ones.",
    icon: "notifications-outline",
    color: "#dc808b",
    features: ["On This Day memories", "Upcoming event reminders", "Never miss important dates"],
  },
];

export default function OnboardingScreen() {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const setIntroSeen = useUserStore((state) => state.setIntroSeen);
  const { colors } = useTheme();

  const handleGetStarted = () => {
    // Just mark intro as seen - don't create a new user
    // The user was already created during signup with a real Firebase UID
    setIntroSeen();
  };

  const handleNext = () => {
    if (currentPage < slides.length - 1) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      scrollViewRef.current?.scrollTo({ x: nextPage * SCREEN_WIDTH, animated: true });
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      scrollViewRef.current?.scrollTo({ x: prevPage * SCREEN_WIDTH, animated: true });
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 }}>
          {currentPage > 0 && (
            <Pressable
              onPress={handlePrevious}
              style={{ padding: 8 }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
            </Pressable>
          )}
          <View style={{ flex: 1 }} />
          <Pressable onPress={handleSkip} style={{ padding: 8 }}>
            <Text style={{ color: colors.primary, fontWeight: "500" }}>Skip</Text>
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          {slides.map((slide, index) => (
            <View 
              key={`slide-${index}`} 
              style={{ 
                width: SCREEN_WIDTH,
                flex: 1,
                alignItems: "center", 
                justifyContent: "center", 
                paddingHorizontal: 32 
              }}
            >
              <View 
                style={{ 
                  width: 128, 
                  height: 128, 
                  borderRadius: 64, 
                  alignItems: "center", 
                  justifyContent: "center", 
                  marginBottom: 32,
                  backgroundColor: `${slide.color}20` 
                }}
              >
                <Ionicons name={slide.icon} size={64} color={slide.color} />
              </View>
              
              <Text style={{ color: colors.text, fontSize: 28, fontWeight: "bold", marginBottom: 16, textAlign: "center" }}>
                {slide.title}
              </Text>
              
              <Text style={{ color: colors.textSecondary, fontSize: 17, textAlign: "center", lineHeight: 24, paddingHorizontal: 16, marginBottom: 32 }}>
                {slide.description}
              </Text>

              {/* Feature List */}
              <View style={{ width: "100%", maxWidth: 320 }}>
                {slide.features.map((feature, featureIndex) => (
                  <View key={`feature-${index}-${featureIndex}`} style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, marginRight: 16, backgroundColor: slide.color }} />
                    <Text style={{ color: colors.text, flex: 1, fontSize: 15 }}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
          {/* Page Indicators */}
          <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 32 }}>
            {slides.map((_, index) => (
              <Pressable
                key={`indicator-${index}`}
                onPress={() => {
                  setCurrentPage(index);
                  scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
                }}
                style={{ marginHorizontal: 4 }}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: index === currentPage ? colors.primary : colors.border,
                  }}
                />
              </Pressable>
            ))}
          </View>

          {/* Action Button */}
          <GradientBackground style={{ borderRadius: 16 }}>
            <Pressable
              onPress={currentPage === slides.length - 1 ? handleGetStarted : handleNext}
              style={{ paddingVertical: 16, paddingHorizontal: 32 }}
            >
              <Text style={{ color: "white", textAlign: "center", fontWeight: "600", fontSize: 18 }}>
                {currentPage === slides.length - 1 ? "Get Started" : "Next"}
              </Text>
            </Pressable>
          </GradientBackground>
        </View>
      </View>
    </SafeAreaView>
  );
}