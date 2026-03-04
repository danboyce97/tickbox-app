import React, { useState, useEffect } from "react";
import { Image } from "expo-image";
import { View, Text, TextInput, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useUserStore } from "../state/userStore";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";
import GradientBackground from "../components/GradientBackground";
import { updateUserDocument, logoutUser } from "../services/firebase";
import { auth } from "../../config/firebase";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileSetupScreen() {
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);
  const setProfileSetupComplete = useUserStore((state) => state.setProfileSetupComplete);
  const { colors } = useTheme();

  console.log('👤 ProfileSetupScreen - User data:', {
    username: user?.username,
    displayName: user?.displayName,
    email: user?.email,
    id: user?.id
  });

  console.log('🔥 Firebase Auth current user:', auth.currentUser?.uid);

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // DO NOT request permission on mount - let iOS handle it naturally when user tries to access photos

  const [formData, setFormData] = useState({
    username: user?.username || "",
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    location: user?.location || "",
    profilePhoto: user?.profilePhoto || undefined,
  });

  console.log('👤 ProfileSetupScreen - Form data:', formData);

  const [validation, setValidation] = useState({
    username: { isValid: true, message: "" },
    displayName: { isValid: true, message: "" },
  });

  const validateUsername = (username: string) => {
    if (!username.trim()) {
      return { isValid: false, message: "Username is required" };
    }
    if (username.length < 3) {
      return { isValid: false, message: "Username must be at least 3 characters" };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { isValid: false, message: "Username can only contain letters, numbers, and underscores" };
    }
    return { isValid: true, message: "" };
  };

  const validateDisplayName = (displayName: string) => {
    if (!displayName.trim()) {
      return { isValid: false, message: "Name is required" };
    }
    if (displayName.length > 50) {
      return { isValid: false, message: "Name must be 50 characters or less" };
    }
    return { isValid: true, message: "" };
  };

  const handleInputChange = (field: string, value: string) => {
    console.log(`📝 Input change - ${field}:`, value);
    setFormData({ ...formData, [field]: value });

    // Real-time validation
    if (field === "username") {
      const usernameValidation = validateUsername(value);
      setValidation(prev => ({ ...prev, username: usernameValidation }));
    } else if (field === "displayName") {
      const displayNameValidation = validateDisplayName(value);
      setValidation(prev => ({ ...prev, displayName: displayNameValidation }));
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      "Select Photo",
      "Choose how you'd like to add your profile photo:",
      [
        {
          text: "Take Photo",
          onPress: handleCameraLaunch,
        },
        {
          text: "Choose from Library", 
          onPress: handleImagePicker,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const handleCameraLaunch = async () => {
    console.log('📷 ProfileSetup: Checking camera permission...');

    // First check current permission status
    const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();
    console.log('📷 ProfileSetup: Current camera permission status:', currentStatus);

    let finalStatus = currentStatus;

    // If not determined yet, request permission (this shows the iOS system prompt)
    if (currentStatus === 'undetermined') {
      console.log('📷 ProfileSetup: Requesting camera permission (will show iOS prompt)...');
      const { status: newStatus } = await ImagePicker.requestCameraPermissionsAsync();
      finalStatus = newStatus;
      console.log('📷 ProfileSetup: Camera permission request result:', finalStatus);
    }

    // If permission is denied, show alert directing to Settings
    if (finalStatus === 'denied') {
      console.log('❌ ProfileSetup: Camera permission denied - showing settings alert');
      Alert.alert(
        "Camera Access Required",
        "To take photos, please enable camera access in your device Settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              }
            }
          }
        ]
      );
      return;
    }

    // Only launch camera if permission is granted
    if (finalStatus === 'granted') {
      console.log('✅ ProfileSetup: Camera permission granted - launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('✅ ProfileSetup: Photo captured');
        setFormData({ ...formData, profilePhoto: result.assets[0].uri });
      } else {
        console.log('📷 ProfileSetup: Camera cancelled');
      }
    }
  };

  const handleImagePicker = async () => {
    console.log('📸 ProfileSetup: Checking photo library permission...');

    // First check current permission status
    const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
    console.log('📸 ProfileSetup: Current permission status:', currentStatus);

    let finalStatus = currentStatus;

    // If not determined yet, request permission (this shows the iOS system prompt)
    if (currentStatus === 'undetermined') {
      console.log('📸 ProfileSetup: Requesting permission (will show iOS prompt)...');
      const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      finalStatus = newStatus;
      console.log('📸 ProfileSetup: Permission request result:', finalStatus);
    }

    // If permission is denied, show alert directing to Settings
    if (finalStatus === 'denied') {
      console.log('❌ ProfileSetup: Permission denied - showing settings alert');
      Alert.alert(
        "Photo Access Required",
        "To add photos to your profile, please enable photo access in your device Settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              // On iOS, this will open the app's settings page
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              }
            }
          }
        ]
      );
      return;
    }

    // Only launch picker if permission is granted
    if (finalStatus === 'granted') {
      console.log('✅ ProfileSetup: Permission granted - launching picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('✅ ProfileSetup: Photo selected');
        setFormData({ ...formData, profilePhoto: result.assets[0].uri });
      } else {
        console.log('📸 ProfileSetup: Photo picker cancelled');
      }
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? Your profile setup is not complete yet.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              console.log('🔓 Signing out...');
              const logout = useUserStore.getState().logout;
              await logoutUser();
              await logout();
              console.log('✅ Signed out successfully');
            } catch (error) {
              console.error('❌ Sign out error:', error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          }
        },
        {
          text: "Sign Out & Clear All Data",
          style: "destructive",
          onPress: async () => {
            try {
              console.log('🗑️ Clearing all data...');

              // Clear AsyncStorage completely
              await AsyncStorage.clear();
              console.log('✅ AsyncStorage cleared');

              // Sign out from Firebase
              await logoutUser();
              console.log('✅ Firebase signed out');

              // Reset Zustand store
              const logout = useUserStore.getState().logout;
              logout();

              console.log('✅ All data cleared - please restart app');
              Alert.alert(
                "Data Cleared",
                "All data has been cleared. Please force close and restart the app, then sign up with a new account.",
                [{ text: "OK" }]
              );
            } catch (error) {
              console.error('❌ Clear data error:', error);
              Alert.alert("Error", "Failed to clear data. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleComplete = async () => {
    const usernameValidation = validateUsername(formData.username);
    const displayNameValidation = validateDisplayName(formData.displayName);

    setValidation({
      username: usernameValidation,
      displayName: displayNameValidation,
    });

    if (!usernameValidation.isValid || !displayNameValidation.isValid) {
      Alert.alert("Validation Error", "Please fix the errors before continuing.");
      return;
    }

    if (!user) {
      Alert.alert("Error", "User not found. Please sign in again.");
      return;
    }

    // Use Firebase Auth UID if there's a mismatch with the stored user ID
    const firebaseUserId = auth.currentUser?.uid;
    const userId = firebaseUserId || user.id;

    if (!userId) {
      console.error('❌ No valid user ID found:', {
        storedUserId: user.id,
        firebaseUserId
      });
      Alert.alert(
        "Authentication Error",
        "Please sign out and create a new account. Your current account has an ID mismatch."
      );
      return;
    }

    // Warn about ID mismatch
    if (user.id !== firebaseUserId) {
      console.warn('⚠️ User ID mismatch detected!', {
        storedUserId: user.id,
        firebaseUserId: firebaseUserId
      });
      console.log('🔧 Using Firebase Auth UID:', firebaseUserId);
    }

    setIsLoading(true);

    try {
      console.log('📝 Updating profile setup...');
      console.log('👤 User ID:', userId);

      const updates: any = {
        username: formData.username.trim().toLowerCase(),
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim(),
        location: formData.location.trim(),
        profileSetupComplete: true,
      };

      // Only add profilePhoto if it's defined
      if (formData.profilePhoto) {
        updates.profilePhoto = formData.profilePhoto;
      }

      // Update user ID if there's a mismatch
      if (user.id !== userId) {
        updates.id = userId;
      }

      console.log('📝 Updates to save:', updates);

      // Use the new updateUser which handles Firebase upload automatically
      await updateUser(updates);
      console.log('✅ Firebase updated successfully');

      setProfileSetupComplete();

      console.log('✅ Profile setup complete!');
    } catch (error) {
      console.error('❌ Profile setup error:', error);
      Alert.alert(
        "Error",
        "Failed to complete profile setup. Please sign out and create a new account if this persists."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View className="py-8">
          {/* Header with Sign Out Button */}
          <View className="flex-row justify-end mb-4">
            <Pressable
              onPress={handleSignOut}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Text style={{ color: colors.error, fontWeight: "600" }}>
                Sign Out
              </Text>
            </Pressable>
          </View>

          {/* Header */}
          <TickBoxCard style={{ marginBottom: 24 }}>
            <View className="items-center py-4">
              <View style={{ backgroundColor: `${colors.primary}20` }} className="w-16 h-16 rounded-full items-center justify-center mb-4">
                <Ionicons name="person" size={32} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text }} className="text-2xl font-bold mb-2">
                Complete Your Profile
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center">
                Help your friends find and connect with you on TickBox.
              </Text>
            </View>
          </TickBoxCard>

          {/* Profile Photo */}
          <TickBoxCard style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
              Profile Photo
            </Text>
            <View className="items-center">
              <Pressable
                onPress={showImagePickerOptions}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: colors.surface,
                  borderWidth: 2,
                  borderColor: colors.border,
                  borderStyle: "dashed",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                  overflow: "hidden",
                }}
              >
                {formData.profilePhoto ? (
                  <Image
                    source={formData.profilePhoto}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={0}
                  />
                ) : (
                  <Ionicons name="camera" size={40} color={colors.textMuted} />
                )}
              </Pressable>
              <Pressable onPress={showImagePickerOptions}>
                <Text style={{ color: colors.primary }} className="font-medium">
                  {formData.profilePhoto ? "Change Photo" : "Add Profile Photo"}
                </Text>
              </Pressable>
            </View>
          </TickBoxCard>

          {/* Username */}
          <TickBoxCard style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
              Basic Information
            </Text>
            
            <View className="mb-4">
              <Text style={{ color: colors.text }} className="font-medium mb-2">Username *</Text>
              <View style={{ borderRadius: 12, overflow: 'hidden' }}>
                <TextInput
                  value={formData.username}
                  onChangeText={(value) => handleInputChange("username", value)}
                  editable={true}
                  style={{
                    borderWidth: 1,
                    borderColor: validation.username.isValid ? colors.border : colors.error,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: colors.text,
                    backgroundColor: colors.surface,
                  }}
                  placeholder="Enter your username"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType="none"
                  importantForAutofill="no"
                  keyboardType="default"
                />
              </View>
              {!validation.username.isValid && (
                <Text style={{ color: colors.error }} className="text-sm mt-1">
                  {validation.username.message}
                </Text>
              )}
            </View>

            <View className="mb-4">
              <Text style={{ color: colors.text }} className="font-medium mb-2">Name *</Text>
              <View style={{ borderRadius: 12, overflow: 'hidden' }}>
                <TextInput
                  value={formData.displayName}
                  onChangeText={(value) => handleInputChange("displayName", value)}
                  editable={true}
                  style={{
                    borderWidth: 1,
                    borderColor: validation.displayName.isValid ? colors.border : colors.error,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: colors.text,
                    backgroundColor: colors.surface,
                  }}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.textMuted}
                  autoComplete="off"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType="none"
                  importantForAutofill="no"
                  keyboardType="default"
                />
              </View>
              {!validation.displayName.isValid && (
                <Text style={{ color: colors.error }} className="text-sm mt-1">
                  {validation.displayName.message}
                </Text>
              )}
            </View>
          </TickBoxCard>

          {/* Optional Information */}
          <TickBoxCard style={{ marginBottom: 24 }}>
            <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
              Optional Information
            </Text>
            
            <View className="mb-4">
              <Text style={{ color: colors.text }} className="font-medium mb-2">Bio</Text>
              <TextInput
                value={formData.bio}
                onChangeText={(value) => handleInputChange("bio", value)}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: colors.text,
                  backgroundColor: colors.surface,
                  minHeight: 80,
                }}
                placeholder="Tell us about yourself..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                autoComplete="off"
                autoCorrect={false}
                spellCheck={false}
              />
              <Text style={{ color: colors.textMuted }} className="text-xs mt-1">
                {formData.bio.length}/200 characters
              </Text>
            </View>

            <View>
              <Text style={{ color: colors.text }} className="font-medium mb-2">Location</Text>
              <TextInput
                value={formData.location}
                onChangeText={(value) => handleInputChange("location", value)}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: colors.text,
                  backgroundColor: colors.surface,
                }}
                placeholder="Enter your location"
                placeholderTextColor={colors.textMuted}
                autoComplete="off"
                autoCorrect={false}
                spellCheck={false}
              />
            </View>
          </TickBoxCard>

          {/* Complete Button */}
          <GradientBackground style={{ borderRadius: 16, opacity: isLoading ? 0.7 : 1 }}>
            <Pressable
              onPress={handleComplete}
              disabled={isLoading}
              style={{ paddingVertical: 16, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", justifyContent: "center" }}
            >
              {isLoading && (
                <View className="mr-2">
                  <Ionicons name="reload" size={20} color="white" />
                </View>
              )}
              <Text className="text-white text-center font-semibold text-lg">
                {isLoading ? "Setting up..." : "Complete Setup"}
              </Text>
            </Pressable>
          </GradientBackground>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

