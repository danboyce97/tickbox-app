import React, { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../contexts/ThemeContext";
import GradientBackground from "../components/GradientBackground";
import TickBoxCard from "../components/TickBoxCard";
import { RootStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendReset = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setEmailSent(true);
    } catch (error) {
      Alert.alert("Error", "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 px-6 justify-center">
          {/* Success Icon */}
          <View className="items-center mb-8">
            <View 
              style={{ backgroundColor: colors.success + "20" }} 
              className="w-24 h-24 rounded-full items-center justify-center mb-6"
            >
              <Ionicons name="mail" size={48} color={colors.success} />
            </View>
            
            <Text style={{ color: colors.text }} className="text-2xl font-bold mb-3 text-center">
              Check Your Email
            </Text>
            
            <Text style={{ color: colors.textSecondary }} className="text-center text-base mb-2">
              We sent a password reset link to:
            </Text>
            
            <Text style={{ color: colors.primary }} className="text-center font-semibold mb-6">
              {email}
            </Text>
            
            <Text style={{ color: colors.textMuted }} className="text-center text-sm">
              Didn't receive the email? Check your spam folder or try again.
            </Text>
          </View>

          {/* Buttons */}
          <View>
            <GradientBackground style={{ borderRadius: 12, marginBottom: 12 }}>
              <Pressable
                onPress={() => navigation.goBack()}
                style={{ paddingVertical: 16, alignItems: "center" }}
              >
                <Text className="text-white font-bold text-lg">
                  Back to Sign In
                </Text>
              </Pressable>
            </GradientBackground>

            <Pressable
              onPress={() => setEmailSent(false)}
              style={{
                paddingVertical: 14,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: colors.primary }} className="font-semibold">
                Try Different Email
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        >
          <View className="px-6 py-8">
            {/* Back Button */}
            <Pressable 
              onPress={() => navigation.goBack()}
              style={{ marginBottom: 24 }}
            >
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </Pressable>

            {/* Header */}
            <View className="items-center mb-8">
              <View 
                style={{ backgroundColor: colors.primary + "20" }} 
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
              >
                <Ionicons name="lock-closed" size={40} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text }} className="text-3xl font-bold mb-2">
                Forgot Password?
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center text-base">
                No worries, we'll send you reset instructions
              </Text>
            </View>

            {/* Form */}
            <TickBoxCard style={{ marginBottom: 24 }}>
              <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
                Reset Your Password
              </Text>

              {/* Email Input */}
              <View className="mb-6">
                <Text style={{ color: colors.text }} className="font-medium mb-2">
                  Email Address
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: colors.text,
                    backgroundColor: colors.surface,
                  }}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <Text style={{ color: colors.textMuted }} className="text-xs mt-2">
                  Enter the email associated with your account
                </Text>
              </View>

              {/* Send Reset Button */}
              <GradientBackground style={{ borderRadius: 12 }}>
                <Pressable
                  onPress={handleSendReset}
                  disabled={isLoading}
                  style={{ paddingVertical: 16, alignItems: "center" }}
                >
                  <Text className="text-white font-bold text-lg">
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Text>
                </Pressable>
              </GradientBackground>
            </TickBoxCard>

            {/* Back to Sign In */}
            <View className="flex-row items-center justify-center">
              <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
              <Pressable onPress={() => navigation.goBack()}>
                <Text style={{ color: colors.primary }} className="font-semibold ml-2">
                  Back to Sign In
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}