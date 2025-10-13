import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useUserStore } from "../state/userStore";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";
import GradientBackground from "../components/GradientBackground";

export default function ProfileSetupScreen() {
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);
  const setProfileSetupComplete = useUserStore((state) => state.setProfileSetupComplete);
  const { colors } = useTheme();

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: user?.username || "",
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    location: user?.location || "",
    profilePhoto: user?.profilePhoto || undefined,
  });

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
    setFormData({ ...formData, [field]: value });

    // Real-time validation
    if (field === "username") {
      const usernameValidation = validateUsername(value);
      setValidation((prev) => ({ ...prev, username: usernameValidation }));
    } else if (field === "displayName") {
      const displayNameValidation = validateDisplayName(value);
      setValidation((prev) => ({ ...prev, displayName: displayNameValidation }));
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert("Select Photo", "Choose how you'd like to add your profile photo:", [
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
    ]);
  };

  const handleCameraLaunch = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraPermission.granted === false) {
      Alert.alert("Permission required", "Permission to access camera is required!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      setFormData({ ...formData, profilePhoto: result.assets[0].uri });
    }
  };

  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission required", "Permission to access photo library is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      setFormData({ ...formData, profilePhoto: result.assets[0].uri });
    }
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

    setIsLoading(true);

    try {
      // In a real app, this would create/update PublicProfile and propagate to friend records
      updateUser({
        username: formData.username.trim().toLowerCase(),
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim(),
        location: formData.location.trim(),
        profilePhoto: formData.profilePhoto,
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setProfileSetupComplete();
    } catch (error) {
      Alert.alert("Error", "Failed to complete profile setup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="py-8">
            {/* Header */}
            <TickBoxCard style={{ marginBottom: 24 }}>
              <View className="items-center py-4">
                <View
                  style={{ backgroundColor: `${colors.primary}20` }}
                  className="w-16 h-16 rounded-full items-center justify-center mb-4"
                >
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
                      source={{ uri: formData.profilePhoto }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
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
                <Text style={{ color: colors.text }} className="font-medium mb-2">
                  Username *
                </Text>
                <TextInput
                  value={formData.username}
                  onChangeText={(value) => handleInputChange("username", value)}
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
                  autoComplete="username"
                />
                {!validation.username.isValid && (
                  <Text style={{ color: colors.error }} className="text-sm mt-1">
                    {validation.username.message}
                  </Text>
                )}
              </View>

              <View className="mb-4">
                <Text style={{ color: colors.text }} className="font-medium mb-2">
                  Name *
                </Text>
                <TextInput
                  value={formData.displayName}
                  onChangeText={(value) => handleInputChange("displayName", value)}
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
                  autoComplete="name"
                />
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
                <Text style={{ color: colors.text }} className="font-medium mb-2">
                  Bio
                </Text>
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
                />
                <Text style={{ color: colors.textMuted }} className="text-xs mt-1">
                  {formData.bio.length}/200 characters
                </Text>
              </View>

              <View>
                <Text style={{ color: colors.text }} className="font-medium mb-2">
                  Location
                </Text>
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
                />
              </View>
            </TickBoxCard>

            {/* Complete Button */}
            <GradientBackground style={{ borderRadius: 16, opacity: isLoading ? 0.7 : 1 }}>
              <Pressable
                onPress={handleComplete}
                disabled={isLoading}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 32,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
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
