import React, { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform, Modal, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { useTheme } from "../contexts/ThemeContext";
import { useUserStore } from "../state/userStore";
import { useMemoryStore } from "../state/memoryStore";
import { useFriendStore } from "../state/friendStore";
import GradientBackground from "../components/GradientBackground";
import TickBoxCard from "../components/TickBoxCard";
import { RootStackParamList } from "../navigation/AppNavigator";
import { signInWithEmail, getUserDocument, signInWithApple, createUserDocument, findUserByAppleId } from "../services/firebase";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SignInScreen() {
  console.log('📱 SignInScreen: Rendering...');
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const setUser = useUserStore((state) => state.setUser);
  const authenticateUser = useUserStore((state) => state.authenticateUser);
  const findUserByEmailLocal = useUserStore((state) => state.findUserByEmail);
  const loadUserMemories = useMemoryStore((state) => state.loadUserMemories);
  const loadFriendsMemories = useMemoryStore((state) => state.loadFriendsMemories);
  const loadUserFriends = useFriendStore((state) => state.loadUserFriends);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorAction, setErrorAction] = useState<"signup" | "password" | null>(null);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  // Check if Apple Sign In is available
  useEffect(() => {
    const checkAppleAvailability = async () => {
      const available = await AppleAuthentication.isAvailableAsync();
      setIsAppleAvailable(available);
    };
    checkAppleAvailability();
  }, []);

  console.log('📱 SignInScreen: Colors loaded', { background: colors.background });

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
      console.log('🔥 Signing in with Firebase...');

      // Sign in with Firebase
      const firebaseUser = await signInWithEmail(email.toLowerCase(), password);
      console.log('✅ Firebase sign in successful:', firebaseUser.uid);

      // Get user document from Firestore
      const userData = await getUserDocument(firebaseUser.uid);

      if (!userData) {
        throw new Error('User data not found in Firestore');
      }

      console.log('✅ User data loaded from Firestore');

      // Save to local store and update registeredUsers list
      const registerUser = useUserStore.getState().registerUser;
      const findUserByEmailStore = useUserStore.getState().findUserByEmail;

      // Check if user exists in local registeredUsers list, if not add them
      const existingLocalUser = findUserByEmailStore(userData.email);
      if (!existingLocalUser) {
        registerUser(userData);
        console.log('✅ Added user to local storage');
      } else {
        // Update existing local user with fresh Firebase data
        useUserStore.getState().updateUser(userData);
        console.log('✅ Updated local user with Firebase data');
      }

      await setUser(userData);

      // Load user's memories from Firebase
      console.log('🔄 Loading memories from Firebase...');
      await loadUserMemories(userData.id);

      // Load user's friends and their memories for the activity feed
      console.log('🔄 Loading friends from Firebase...');
      await loadUserFriends(userData.id);

      // Get the friend IDs after loading and load their memories
      const friendStore = useFriendStore.getState();
      const friendIds = friendStore.friends.map(f => f.id);
      if (friendIds.length > 0) {
        console.log('🔄 Loading friend memories from Firebase...');
        await loadFriendsMemories(friendIds);
      }

      console.log('✅ Sign in complete!');
    } catch (error: any) {
      console.error('❌ Sign in error:', error);

      if (error.code === 'auth/user-not-found') {
        showError(
          "No account found with this email address. Would you like to create a new account?",
          "signup"
        );
      } else if (error.code === 'auth/wrong-password') {
        showError(
          "Incorrect password. Please try again or reset your password.",
          "password"
        );
      } else if (error.code === 'auth/invalid-email') {
        showError("Please enter a valid email address");
      } else if (error.code === 'auth/too-many-requests') {
        showError("Too many failed attempts. Please try again later or reset your password.");
      } else if (error.code === 'auth/invalid-credential') {
        showError(
          "Invalid email or password. Please check your credentials and try again.",
          "password"
        );
      } else {
        showError("Sign in failed. Please try again. " + (error.message || ''));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleErrorAction = () => {
    setShowErrorModal(false);
    if (errorAction === "signup") {
      navigation.navigate("SignUp" as never);
    } else if (errorAction === "password") {
      navigation.navigate("ForgotPassword" as never);
    }
  };

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    try {
      // Generate a random nonce
      const nonce = Math.random().toString(36).substring(2, 15);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce
      );

      // Request Apple authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      console.log('🍎 Apple credential received, signing in with Firebase...');

      // Sign in with Firebase using Apple credential
      const firebaseUser = await signInWithApple(credential.identityToken, nonce);
      console.log('✅ Firebase sign in successful:', firebaseUser.uid);

      // Check if user already exists in Firestore
      let userData = await getUserDocument(firebaseUser.uid);

      if (!userData) {
        // New user - create document in Firestore
        console.log('📝 Creating new user document...');

        // Build the display name from Apple credential or email
        const firstName = credential.fullName?.givenName || '';
        const lastName = credential.fullName?.familyName || '';
        let displayName = `${firstName} ${lastName}`.trim();

        // If no name provided, use email prefix or default
        if (!displayName) {
          const appleEmail = credential.email || firebaseUser.email;
          displayName = appleEmail ? appleEmail.split('@')[0] : 'Apple User';
        }

        const username = displayName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString(36);
        const userEmail = credential.email || firebaseUser.email || `${credential.user}@privaterelay.appleid.com`;

        userData = {
          id: firebaseUser.uid,
          email: userEmail.toLowerCase(),
          displayName: displayName,
          username: username,
          appleUserId: credential.user,
          bio: '',
          location: '',
          joinDate: new Date().toISOString(),
          introSeen: false,
          profileSetupComplete: false,
          isPrivate: false,
          showLocation: true,
          theme: 'light' as const,
          customCategories: [],
          preferredCurrency: 'GBP',
          notificationSettings: {
            pushEnabled: true,
            onThisDay: true,
            oneWeekToGo: true,
            joinAnniversary: true,
            weeklyReminder: true,
            friendRequests: true,
            memoriesLiked: true,
            tagged: true,
          },
        };

        await createUserDocument(firebaseUser.uid, userData);
        console.log('✅ User document created in Firestore');
      }

      // Update local store
      const registerUser = useUserStore.getState().registerUser;
      const findUserByEmailStore = useUserStore.getState().findUserByEmail;

      const existingLocalUser = findUserByEmailStore(userData.email);
      if (!existingLocalUser) {
        registerUser(userData);
        console.log('✅ Added user to local storage');
      } else {
        useUserStore.getState().updateUser(userData);
        console.log('✅ Updated local user with Firebase data');
      }

      setUser(userData);

      // Load user's memories
      console.log('🔄 Loading memories from Firebase...');
      await loadUserMemories(userData.id);

      // Load friends
      console.log('🔄 Loading friends from Firebase...');
      await loadUserFriends(userData.id);

      const friendStore = useFriendStore.getState();
      const friendIds = friendStore.friends.map(f => f.id);
      if (friendIds.length > 0) {
        console.log('🔄 Loading friend memories from Firebase...');
        await loadFriendsMemories(friendIds);
      }

      console.log('✅ Apple Sign In complete!');
    } catch (error: any) {
      console.error('❌ Apple Sign In error:', error);

      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User canceled - do nothing
        return;
      }

      showError("Apple Sign In failed. Please try again. " + (error.message || ''));
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
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
                className="w-20 h-20 items-center justify-center mb-4"
              >
                <Image
                  source={require("../../assets/splash.png")}
                  style={{ width: 80, height: 80 }}
                  resizeMode="contain"
                />
              </View>
              <Text style={{ color: colors.text }} className="text-3xl font-bold mb-2">
                Welcome Back
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center text-base">
                Sign in to access your memories
              </Text>
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
                    autoComplete="off"
                    textContentType="none"
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 12,
                      padding: 4,
                      zIndex: 10,
                      minWidth: 28,
                      minHeight: 28,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={22}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Forgot Password */}
              <Pressable 
                onPress={() => navigation.navigate("ForgotPassword" as never)}
                className="mb-4"
              >
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
                  <Text className="text-white font-bold text-lg">
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Text>
                </Pressable>
              </GradientBackground>
            </TickBoxCard>

            {/* Apple Sign In */}
            {isAppleAvailable && Platform.OS === 'ios' && (
              <View style={{ marginBottom: 16 }}>
                <View className="flex-row items-center mb-4">
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                  <Text style={{ color: colors.textSecondary, marginHorizontal: 16 }}>or</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                </View>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={12}
                  style={{ width: '100%', height: 52 }}
                  onPress={handleAppleSignIn}
                />
                {isAppleLoading && (
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
                    Signing in...
                  </Text>
                )}
              </View>
            )}

            {/* Sign Up Link */}
            <View className="flex-row items-center justify-center mt-6">
              <Text style={{ color: colors.textSecondary }}>
                {"Don't have an account? "}
              </Text>
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
          <View style={{ backgroundColor: colors.background, borderRadius: 16, padding: 24, marginHorizontal: 32, width: "85%" }}>
            <View style={{ backgroundColor: colors.error + "20", width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 16 }}>
              <Ionicons name="alert-circle" size={32} color={colors.error} />
            </View>

            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 8 }}>
              {errorAction ? "Account Issue" : "Error"}
            </Text>
            
            <Text style={{ color: colors.textSecondary, fontSize: 16, textAlign: "center", marginBottom: 24, lineHeight: 22 }}>
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