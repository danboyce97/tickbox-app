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

export default function SignInScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const setUser = useUserStore((state) => state.setUser);
  const authenticateUser = useUserStore((state) => state.authenticateUser);
  const findUserByEmail = useUserStore((state) => state.findUserByEmail);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorAction, setErrorAction] = useState<"signup" | "password" | null>(null);
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

  const showError = (message: string, action: "signup" | "password" | null = null) => {
    setErrorMessage(message);
    setErrorAction(action);
    setShowErrorModal(true);
  };

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      showError("Please enter both email and password");
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

      // Check if user exists
      const existingUser = findUserByEmail(email);

      if (!existingUser) {
        setIsLoading(false);
        showError("No account found with this email address. Would you like to create a new account?", "signup");
        return;
      }

      // Authenticate user
      const authenticatedUser = authenticateUser(email, password);

      if (!authenticatedUser) {
        setIsLoading(false);
        showError("Incorrect password. Please try again or reset your password.", "password");
        return;
      }

      // Successfully authenticated
      setUser(authenticatedUser);
    } catch (error) {
      showError("Sign in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        showError(
          "Apple Sign In is not available on this device. Please use email sign in or contact support if you believe this is an error.",
        );
        return;
      }

      console.log("🍎 Starting Apple Sign In...");

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log("🍎 Apple Sign In - Credential received:", {
        user: credential.user,
        email: credential.email,
        fullName: credential.fullName,
        identityToken: credential.identityToken ? "Present" : "Missing",
      });

      // Apple uses a stable user identifier - try to find user by Apple ID first
      const appleEmail = credential.email || `apple_${credential.user}@tickbox.app`;

      // Check for existing user by email OR by matching Apple user ID in username
      let existingUser = findUserByEmail(appleEmail);

      if (!existingUser) {
        // Try to find by Apple user ID (stored in username for Apple users)
        const registeredUsers = useUserStore.getState().registeredUsers;
        existingUser = registeredUsers.find(
          (u) => u.username === credential.user.substring(0, 15) || u.email.includes(`apple_${credential.user}`),
        );
      }

      if (existingUser) {
        // Sign in existing user
        console.log("✅ Found existing Apple user, signing in");
        setUser(existingUser);
      } else {
        // Create new user from Apple credentials
        console.log("👤 Creating new Apple user");
        const mockUser = createMockUser();
        mockUser.email = appleEmail;
        mockUser.displayName = credential.fullName?.givenName
          ? `${credential.fullName.givenName} ${credential.fullName.familyName || ""}`.trim()
          : "Apple User";
        mockUser.username = credential.user.substring(0, 15);
        mockUser.introSeen = false;

        useUserStore.getState().registerUser(mockUser);
        setUser(mockUser);
        console.log("✅ New Apple user created and registered");
      }
    } catch (error: any) {
      console.error("❌ Apple Sign In error:", error);
      console.error("   Error code:", error.code);
      console.error("   Error message:", error.message);

      // Handle user cancellation
      if (error.code === "ERR_REQUEST_CANCELED" || error.code === "ERR_CANCELED") {
        console.log("ℹ️ Apple Sign In cancelled by user");
        return;
      }

      // Handle specific error cases
      if (error.code === "ERR_INVALID_OPERATION") {
        showError(
          "Apple Sign In is not properly configured for this app. Please use email sign in or contact support.",
        );
        return;
      }

      if (error.code === "ERR_NOT_AVAILABLE") {
        showError("Apple Sign In is not available on this device. Please use email sign in instead.");
        return;
      }

      // Generic error with more helpful message
      showError("Apple Sign In is temporarily unavailable. Please try email sign in or try again later.");
    }
  };

  const handleGoogleSignIn = async () => {
    // Google Sign In is not available in current build
    // Will be enabled in future native build with Firebase configuration
    showError("Google Sign In will be available soon. For now, please use email sign in or Apple Sign In.");
  };

  const handleErrorAction = () => {
    setShowErrorModal(false);
    if (errorAction === "signup") {
      navigation.navigate("SignUp" as never);
    } else if (errorAction === "password") {
      navigation.navigate("ForgotPassword" as never);
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
            {/* Header */}
            <View className="items-center mb-8 mt-8">
              <View
                style={{ backgroundColor: colors.primary + "20" }}
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
              >
                <Ionicons name="ticket" size={40} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text }} className="text-3xl font-bold mb-2">
                Welcome Back
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center text-base">
                Sign in to access your memories
              </Text>
            </View>

            {/* Social Sign In Buttons */}
            <View className="mb-6">
              {Platform.OS === "ios" && isAppleAuthAvailable && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={12}
                  style={{ width: "100%", height: 50, marginBottom: 12 }}
                  onPress={handleAppleSignIn}
                />
              )}

              <Pressable
                onPress={handleGoogleSignIn}
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

            {/* Email Sign In Form */}
            <TickBoxCard style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
                Sign In with Email
              </Text>

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
                    placeholder="Enter your password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
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

              {/* Forgot Password */}
              <Pressable onPress={() => navigation.navigate("ForgotPassword" as never)} className="mb-4">
                <Text style={{ color: colors.primary }} className="text-right font-medium">
                  Forgot Password?
                </Text>
              </Pressable>

              {/* Sign In Button */}
              <GradientBackground style={{ borderRadius: 12 }}>
                <Pressable
                  onPress={handleEmailSignIn}
                  disabled={isLoading}
                  style={{ paddingVertical: 16, alignItems: "center" }}
                >
                  <Text className="text-white font-bold text-lg">{isLoading ? "Signing In..." : "Sign In"}</Text>
                </Pressable>
              </GradientBackground>
            </TickBoxCard>

            {/* Sign Up Link */}
            <View className="flex-row items-center justify-center mt-6">
              <Text style={{ color: colors.textSecondary }}>{"Don't have an account? "}</Text>
              <Pressable onPress={() => navigation.navigate("SignUp" as never)}>
                <Text style={{ color: colors.primary }} className="font-semibold">
                  Sign Up
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
              {errorAction ? "Account Issue" : "Error"}
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
                  {errorAction ? "Cancel" : "OK"}
                </Text>
              </Pressable>

              {errorAction && (
                <Pressable
                  onPress={handleErrorAction}
                  style={{
                    flex: 1,
                    backgroundColor: colors.primary,
                    paddingVertical: 14,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: "white", textAlign: "center", fontWeight: "600", fontSize: 16 }}>
                    {errorAction === "signup" ? "Sign Up" : "Reset Password"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
