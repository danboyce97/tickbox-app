import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Linking, Alert, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";
import GradientBackground from "../components/GradientBackground";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getAnthropicTextResponse } from "../api/chat-service";
import { AIMessage } from "../types/ai";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "SupportFeedback">;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function SupportFeedbackScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm your TickBox AI assistant. How can I help you today? If I can't answer your question, I'll direct you to our support team at support@tickboxapp.com."
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);

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
    Linking.openURL("https://tickbox.app/help");
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isLoadingChat) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsLoadingChat(true);

    try {
      const systemPrompt = "You are a helpful customer support assistant for TickBox, an app that helps users create and store memories of events they attend. Answer questions about the app features, help with troubleshooting, and guide users. If you cannot answer a question, politely suggest they contact support@tickboxapp.com. Keep responses concise and friendly.";
      
      const aiMessages: AIMessage[] = [
        { role: "user", content: systemPrompt },
        ...chatMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: "user", content: chatInput }
      ];

      const response = await getAnthropicTextResponse(aiMessages, {
        model: "claude-3-5-sonnet-20240620",
        temperature: 0.7,
        maxTokens: 500
      });

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.content
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again or email our support team at support@tickboxapp.com for immediate assistance."
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingChat(false);
    }
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
                onPress={() => setShowAIChat(true)}
              >
                <View style={{ backgroundColor: colors.primary + "20" }} className="w-10 h-10 rounded-full items-center justify-center mr-4">
                  <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.text }}>AI Assistant</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm">
                    Get instant help from our AI assistant
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
              
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

      {/* AI Chat Modal */}
      <Modal
        visible={showAIChat}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAIChat(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            {/* Chat Header */}
            <View
              className="flex-row items-center justify-between px-6 py-4"
              style={{
                backgroundColor: colors.surface,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View className="flex-row items-center">
                <View style={{ backgroundColor: colors.primary + "20" }} className="w-10 h-10 rounded-full items-center justify-center mr-3">
                  <Ionicons name="chatbubbles" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={{ color: colors.text }} className="text-lg font-semibold">
                    AI Assistant
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm">
                    Ask me anything
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => setShowAIChat(false)}>
                <Ionicons name="close" size={28} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Chat Messages */}
            <ScrollView className="flex-1 px-6 py-4">
              {chatMessages.map((message, index) => (
                <View
                  key={index}
                  className="mb-4"
                  style={{
                    alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: message.role === "user" ? colors.primary : colors.surface,
                      borderRadius: 16,
                      padding: 12,
                      borderWidth: message.role === "assistant" ? 1 : 0,
                      borderColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color: message.role === "user" ? "white" : colors.text,
                        fontSize: 15,
                        lineHeight: 20,
                      }}
                    >
                      {message.content}
                    </Text>
                  </View>
                </View>
              ))}
              {isLoadingChat && (
                <View
                  className="mb-4"
                  style={{ alignSelf: "flex-start", maxWidth: "80%" }}
                >
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 16,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.textSecondary }}>Typing...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Chat Input */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                padding: 16,
              }}
            >
              <View className="flex-row items-center">
                <TextInput
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Type your question..."
                  placeholderTextColor={colors.textMuted}
                  style={{
                    flex: 1,
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 24,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: colors.text,
                    marginRight: 12,
                  }}
                  multiline
                  maxLength={500}
                  onSubmitEditing={handleSendChatMessage}
                />
                <Pressable
                  onPress={handleSendChatMessage}
                  disabled={!chatInput.trim() || isLoadingChat}
                  style={{
                    backgroundColor: chatInput.trim() && !isLoadingChat ? colors.primary : colors.border,
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="send" size={20} color="white" />
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}