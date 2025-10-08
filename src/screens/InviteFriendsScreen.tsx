import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Share, Alert } from "react-native";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";

export default function InviteFriendsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();


  const handleShare = async (method: string) => {
    const shareMessage = "Join me on TickBox - the best way to keep track of all your event memories! 🎫✨\n\nDownload the app:\n📱 iOS: https://apps.apple.com/app/tickbox\n🤖 Android: https://play.google.com/store/apps/details?id=com.tickbox.app";
    
    try {
      // Customize message based on the selected method
      let customMessage = shareMessage;
      let title = "Join TickBox!";

      switch (method) {
        case "whatsapp":
          customMessage = `🎫 *TickBox* - Your Digital Memory Keeper!\n\n${shareMessage.replace('Join me on TickBox', 'Join me on *TickBox*')}`;
          break;
        case "instagram":
          customMessage = "Check out TickBox! 🎫✨ The best way to keep track of all your event memories! #TickBox #Events #Memories";
          break;
        case "twitter":
          customMessage = "Just discovered @TickBox 🎫 - the perfect app for keeping track of all my event memories! Never lose a ticket again ✨ #TickBox #Events";
          break;
        case "email":
          title = "You should try TickBox!";
          customMessage = `Hi there!\n\nI've been using this amazing app called TickBox to keep track of all my event memories, and I thought you might love it too!\n\n${shareMessage}\n\nHope to see you there!\n\nBest regards`;
          break;
      }

      await Share.share({
        message: customMessage,
        title: title,
      });
    } catch (error) {
      console.error("Error sharing:", error);
      Alert.alert("Share Failed", "Unable to share at the moment. Please try again.");
    }
  };

  const handleCopyLink = async () => {
    const inviteLink = "https://tickbox.app/download?ref=invite";
    await Clipboard.setStringAsync(inviteLink);
    Alert.alert("Link Copied!", "Invite link copied to clipboard. Share it with your friends!");
  };

  const shareOptions = [
    {
      id: "message",
      title: "Messages",
      icon: "chatbubble" as keyof typeof Ionicons.glyphMap,
      description: "Send via text message",
      color: colors.primary,
    },
    {
      id: "email",
      title: "Email",
      icon: "mail" as keyof typeof Ionicons.glyphMap,
      description: "Send via email",
      color: colors.success,
    },
    {
      id: "whatsapp",
      title: "WhatsApp",
      icon: "logo-whatsapp" as keyof typeof Ionicons.glyphMap,
      description: "Share on WhatsApp",
      color: "#25D366",
    },
    {
      id: "twitter",
      title: "Twitter",
      icon: "logo-twitter" as keyof typeof Ionicons.glyphMap,
      description: "Tweet about TickBox",
      color: "#1DA1F2",
    },
    {
      id: "more",
      title: "More Options",
      icon: "share" as keyof typeof Ionicons.glyphMap,
      description: "Other sharing options",
      color: colors.textSecondary,
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable
          onPress={() => navigation.goBack()}
          className="mr-4"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={{ color: colors.text }} className="text-xl font-bold">
          Invite Friends
        </Text>
      </View>

      <ScrollView className="flex-1">
        {/* Hero Section */}
        <View className="px-6 py-8 items-center">
          <View
            style={{
              backgroundColor: `${colors.primary}20`,
              width: 80,
              height: 80,
              borderRadius: 40,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons name="people" size={40} color={colors.primary} />
          </View>
          
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 8 }}>
            Share TickBox
          </Text>
          
          <Text style={{ color: colors.textSecondary, fontSize: 16, textAlign: "center", lineHeight: 22 }}>
            Invite your friends to join TickBox and share your amazing event memories together!
          </Text>
        </View>



        {/* Share Options */}
        <View className="px-6 mb-6">
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600", marginBottom: 16 }}>
            Choose how to invite
          </Text>
          
          <View className="space-y-3">
            {shareOptions.map((option) => (
              <TickBoxCard key={option.id} noPadding>
                <Pressable
                  onPress={() => handleShare(option.id)}
                  style={{ padding: 16 }}
                >
                  <View className="flex-row items-center">
                    <View
                      style={{
                        backgroundColor: `${option.color}20`,
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 16,
                      }}
                    >
                      <Ionicons name={option.icon} size={24} color={option.color} />
                    </View>
                    
                    <View className="flex-1">
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 2 }}>
                        {option.title}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                        {option.description}
                      </Text>
                    </View>
                    
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </View>
                </Pressable>
              </TickBoxCard>
            ))}
          </View>
        </View>

        {/* Copy Link */}
        <View className="px-6 mb-8">
          <TickBoxCard>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
              Share Invite Link
            </Text>
            <View className="flex-row">
              <View 
                className="flex-1 mr-3"
                style={{
                  backgroundColor: colors.background,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                  https://tickbox.app/download?ref=invite
                </Text>
              </View>
              <Pressable
                onPress={handleCopyLink}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text className="text-white font-medium">Copy</Text>
              </Pressable>
            </View>
          </TickBoxCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}