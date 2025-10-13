import React, { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as AppleAuthentication from "expo-apple-authentication";
import { useTheme } from "../contexts/ThemeContext";
import { useUserStore, createMockUser } from "../state/userStore";
import GradientBackground from "../components/GradientBackground";
import TickBoxCard from "../components/TickBoxCard";
import { RootStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SignUpScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const setUser = useUserStore((state) => state.setUser);
  const registerUser = useUserStore((state) => state.registerUser);
  const findUserByEmail = useUserStore((state) => state.findUserByEmail);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

  useEffect(() => {
    // Check if Apple Authentication is available
    const checkAppleAuth = async () => {
      try {
        const available = await AppleAuthentication.isAvailableAsync();
        setIsAppleAuthAvailable(available);
      } catch (error) {
        setIsAppleAuthAvailable(false);
      }
    };

    if (Platform.OS === "ios") {
      checkAppleAuth();
    }
  }, []);

  const showError = (message: string, promptSignIn: boolean = false) => {
    setErrorMessage(message);
    setShowSignInPrompt(promptSignIn);
    setShowErrorModal(true);
  };

  const handleEmailSignUp = async () => {
    // Validation
    if (!name.trim() || !email.trim() || !password.trim()) {
      showError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Check if email already exists
      const existingUser = findUserByEmail(email);
      if (existingUser) {
        setIsLoading(false);
        showError(
          "An account with this email already exists. Please sign in instead or reset your password if you forgot it.",
          true,
        );
        return;
      }

      // Create new user
      const mockUser = createMockUser();
      mockUser.email = email.toLowerCase();
      mockUser.password = password;
      mockUser.displayName = name;
      mockUser.username = name.toLowerCase().replace(/\s+/g, "_");
      mockUser.introSeen = false; // Show intro for new users

      registerUser(mockUser);
      setUser(mockUser);
    } catch (error) {
      showError("Sign up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    try {
      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        showError("Apple Sign In is not available on this device. Please use email sign up instead.");
        return;
      }

      console.log("🍎 Starting Apple Sign Up...");

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log("🍎 Apple Sign Up - Credential received");

      const email = credential.email || `apple_${credential.user}@tickbox.app`;

      // Check for existing user by email OR Apple user ID
      let existingUser = findUserByEmail(email);

      if (!existingUser) {
        const registeredUsers = useUserStore.getState().registeredUsers;
        existingUser = registeredUsers.find(
          (u) => u.username === credential.user.substring(0, 15) || u.email.includes(`apple_${credential.user}`),
        );
      }

      if (existingUser) {
        // Sign in existing user
        console.log("✅ Apple user already exists, signing in");
        setUser(existingUser);
      } else {
        // Create new user from Apple credentials
        console.log("👤 Creating new Apple user from sign up");
        const mockUser = createMockUser();
        mockUser.email = email;
        mockUser.displayName = credential.fullName?.givenName
          ? `${credential.fullName.givenName} ${credential.fullName.familyName || ""}`.trim()
          : "Apple User";
        mockUser.username = credential.user.substring(0, 15);
        mockUser.introSeen = false;

        registerUser(mockUser);
        setUser(mockUser);
        console.log("✅ New Apple user created");
      }
    } catch (error: any) {
      console.error("❌ Apple Sign Up error:", error);
      console.error("   Error code:", error.code);

      if (error.code === "ERR_REQUEST_CANCELED" || error.code === "ERR_CANCELED") {
        console.log("ℹ️ Apple Sign Up cancelled by user");
        return;
      }

      if (error.code === "ERR_INVALID_OPERATION") {
        showError("Apple Sign In is not properly configured. Please use email sign up or contact support.");
        return;
      }

      showError("Apple Sign In is temporarily unavailable. Please try email sign up or try again later.");
    }
  };

  const handleGoogleSignUp = async () => {
    // Google Sign In is not available in current build
    // Will be enabled in future native build with Firebase configuration
    showError("Google Sign In will be available soon. For now, please use email sign up or Apple Sign In.");
  };

  const handleErrorAction = () => {
    setShowErrorModal(false);
    if (showSignInPrompt) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View className="px-6 py-8">
            {/* Back Button */}
            <Pressable onPress={() => navigation.goBack()} style={{ marginBottom: 16 }}>
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </Pressable>

            {/* Header */}
            <View className="items-center mb-8">
              <View
                style={{ backgroundColor: colors.primary + "20" }}
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
              >
                <Ionicons name="ticket" size={40} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text }} className="text-3xl font-bold mb-2">
                Create Account
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center text-base">
                Start saving your memories today
              </Text>
            </View>

            {/* Social Sign Up Buttons */}
            <View className="mb-6">
              {Platform.OS === "ios" && isAppleAuthAvailable && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={12}
                  style={{ width: "100%", height: 50, marginBottom: 12 }}
                  onPress={handleAppleSignUp}
                />
              )}

              <Pressable
                onPress={handleGoogleSignUp}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "white",
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingVertical: 14,
                  marginBottom: 12,
                }}
              >
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={{ color: colors.text, marginLeft: 12, fontWeight: "600" }}>Continue with Google</Text>
              </Pressable>
            </View>

            {/* Divider */}
            <View className="flex-row items-center mb-6">
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text style={{ color: colors.textMuted, marginHorizontal: 16 }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>

            {/* Email Sign Up Form */}
            <TickBoxCard style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
                Sign Up with Email
              </Text>

              {/* Name Input */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="font-medium mb-2">
                  Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: colors.text,
                    backgroundColor: colors.surface,
                  }}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.textMuted}
                  autoComplete="name"
                />
              </View>

              {/* Email Input */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="font-medium mb-2">
                  Email
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
              </View>

              {/* Password Input */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="font-medium mb-2">
                  Password
                </Text>
                <View className="relative">
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      paddingRight: 48,
                      color: colors.text,
                      backgroundColor: colors.surface,
                    }}
                    placeholder="Create a password (min. 6 characters)"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 12,
                      padding: 4,
                    }}
                  >
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View className="mb-6">
                <Text style={{ color: colors.text }} className="font-medium mb-2">
                  Confirm Password
                </Text>
                <View className="relative">
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      paddingRight: 48,
                      color: colors.text,
                      backgroundColor: colors.surface,
                    }}
                    placeholder="Confirm your password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 12,
                      padding: 4,
                    }}
                  >
                    <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>

              {/* Sign Up Button */}
              <GradientBackground style={{ borderRadius: 12 }}>
                <Pressable
                  onPress={handleEmailSignUp}
                  disabled={isLoading}
                  style={{ paddingVertical: 16, alignItems: "center" }}
                >
                  <Text className="text-white font-bold text-lg">
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Text>
                </Pressable>
              </GradientBackground>
            </TickBoxCard>

            {/* Terms */}
            <Text style={{ color: colors.textMuted }} className="text-xs text-center mb-6">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </Text>

            {/* Sign In Link */}
            <View className="flex-row items-center justify-center">
              <Text style={{ color: colors.textSecondary }}>Already have an account? </Text>
              <Pressable onPress={() => navigation.goBack()}>
                <Text style={{ color: colors.primary }} className="font-semibold">
                  Sign In
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: 16,
              padding: 24,
              marginHorizontal: 32,
              width: "85%",
            }}
          >
            <View
              style={{
                backgroundColor: colors.error + "20",
                width: 64,
                height: 64,
                borderRadius: 32,
                justifyContent: "center",
                alignItems: "center",
                alignSelf: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="alert-circle" size={32} color={colors.error} />
            </View>

            <Text
              style={{ color: colors.text, fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 8 }}
            >
              {showSignInPrompt ? "Account Exists" : "Error"}
            </Text>

            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 16,
                textAlign: "center",
                marginBottom: 24,
                lineHeight: 22,
              }}
            >
              {errorMessage}
            </Text>

            <View className="flex-row" style={{ gap: 12 }}>
              <Pressable
                onPress={() => setShowErrorModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  paddingVertical: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, textAlign: "center", fontWeight: "600", fontSize: 16 }}>
                  {showSignInPrompt ? "Cancel" : "OK"}
                </Text>
              </Pressable>

              {showSignInPrompt && (
                <Pressable
                  onPress={handleErrorAction}
                  style={{
                    flex: 1,
                    backgroundColor: colors.primary,
                    paddingVertical: 14,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: "white", textAlign: "center", fontWeight: "600", fontSize: 16 }}>Sign In</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
