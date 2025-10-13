import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useUserStore } from "../state/userStore";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";
import { RootStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EditProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [location, setLocation] = useState(user?.location || "");
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || "");
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow photo library access to select a profile photo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow camera access to take a profile photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const showImagePicker = () => {
    Alert.alert("Update Profile Photo", "Choose an option", [
      { text: "Camera", onPress: takePhoto },
      { text: "Photo Library", onPress: pickImage },
      { text: "Remove Photo", onPress: () => setProfilePhoto(""), style: "destructive" },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert("Error", "Display name is required");
      return;
    }

    setIsLoading(true);
    try {
      updateUser({
        displayName: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        profilePhoto: profilePhoto || undefined,
      });

      Alert.alert("Success", "Profile updated successfully", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: colors.textSecondary }} className="text-xl">
            Please log in to edit your profile
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="p-6">
            {/* Profile Photo Section */}
            <TickBoxCard style={{ marginBottom: 24 }}>
              <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
                Profile Photo
              </Text>
              <View className="items-center">
                <Pressable onPress={showImagePicker} className="relative mb-4">
                  {profilePhoto ? (
                    <Image
                      source={{ uri: profilePhoto }}
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        backgroundColor: colors.border,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        backgroundColor: colors.border,
                      }}
                      className="items-center justify-center"
                    >
                      <Ionicons name="person" size={40} color={colors.textSecondary} />
                    </View>
                  )}

                  <View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      backgroundColor: colors.primary,
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                    }}
                    className="items-center justify-center"
                  >
                    <Ionicons name="camera" size={16} color="white" />
                  </View>
                </Pressable>

                <Text style={{ color: colors.textSecondary }} className="text-center text-sm">
                  Tap to change photo
                </Text>
              </View>
            </TickBoxCard>

            {/* Basic Information */}
            <TickBoxCard style={{ marginBottom: 24 }}>
              <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
                Basic Information
              </Text>

              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-sm font-medium mb-2">
                  Name *
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderRadius: 8,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your name"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={50}
                />
              </View>

              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-sm font-medium mb-2">
                  Location
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderRadius: 8,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="City, Country"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={100}
                />
              </View>

              <View className="mb-0">
                <Text style={{ color: colors.text }} className="text-sm font-medium mb-2">
                  Bio
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderRadius: 8,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    minHeight: 80,
                    textAlignVertical: "top",
                  }}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell others about yourself..."
                  placeholderTextColor={colors.textSecondary}
                  multiline={true}
                  maxLength={200}
                />
                <Text style={{ color: colors.textMuted }} className="text-xs mt-1 text-right">
                  {bio.length}/200
                </Text>
              </View>
            </TickBoxCard>

            {/* Account Information (Read Only) */}
            <TickBoxCard style={{ marginBottom: 24 }}>
              <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
                Account Information
              </Text>

              <View className="mb-3">
                <Text style={{ color: colors.textSecondary }} className="text-sm font-medium mb-1">
                  Username
                </Text>
                <Text style={{ color: colors.text }} className="text-base">
                  @{user.username}
                </Text>
              </View>

              <View className="mb-3">
                <Text style={{ color: colors.textSecondary }} className="text-sm font-medium mb-1">
                  Email
                </Text>
                <Text style={{ color: colors.text }} className="text-base">
                  {user.email}
                </Text>
              </View>

              <View>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-medium mb-1">
                  Member Since
                </Text>
                <Text style={{ color: colors.text }} className="text-base">
                  {new Date(user.joinDate).toLocaleDateString()}
                </Text>
              </View>
            </TickBoxCard>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View
          className="p-6 flex-row"
          style={{
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Pressable
            onPress={handleCancel}
            className="flex-1 mr-3 py-3 rounded-lg"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ color: colors.textSecondary }} className="text-center font-medium">
              Cancel
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            disabled={isLoading}
            className="flex-1 ml-3 py-3 rounded-lg"
            style={{ backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }}
          >
            <Text className="text-white text-center font-medium">{isLoading ? "Saving..." : "Save Changes"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
