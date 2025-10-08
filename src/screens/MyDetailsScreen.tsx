import React, { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useUserStore } from "../state/userStore";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";
import GradientBackground from "../components/GradientBackground";
import { RootStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MyDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);
  
  const [currentEmail, setCurrentEmail] = useState(user?.email || "");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  if (!user) return null;

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert("Error", "Please enter a new email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (newEmail === currentEmail) {
      Alert.alert("Error", "New email must be different from current email");
      return;
    }

    setIsUpdatingEmail(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      updateUser({ email: newEmail });
      setCurrentEmail(newEmail);
      setNewEmail("");
      
      Alert.alert("Success", "Your email has been updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to update email. Please try again.");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      Alert.alert("Error", "Please fill in all password fields");
      return;
    }

    if (user.password && currentPassword !== user.password) {
      Alert.alert("Error", "Current password is incorrect");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    if (newPassword === currentPassword) {
      Alert.alert("Error", "New password must be different from current password");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      updateUser({ password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      
      Alert.alert("Success", "Your password has been updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to update password. Please try again.");
    } finally {
      setIsUpdatingPassword(false);
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
        >
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
              My Details
            </Text>
          </View>

          <View className="px-6 py-6">
            {/* Update Email Section */}
            <TickBoxCard style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
                Update Email
              </Text>

              {/* Current Email */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="font-medium mb-2">
                  Current Email
                </Text>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Text style={{ color: colors.textSecondary }}>
                    {currentEmail}
                  </Text>
                </View>
              </View>

              {/* New Email */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="font-medium mb-2">
                  New Email
                </Text>
                <TextInput
                  value={newEmail}
                  onChangeText={setNewEmail}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: colors.text,
                    backgroundColor: colors.background,
                  }}
                  placeholder="Enter new email"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              {/* Update Button */}
              <GradientBackground style={{ borderRadius: 12 }}>
                <Pressable
                  onPress={handleUpdateEmail}
                  disabled={isUpdatingEmail || !newEmail.trim()}
                  style={{ 
                    paddingVertical: 14, 
                    alignItems: "center",
                    opacity: isUpdatingEmail || !newEmail.trim() ? 0.5 : 1,
                  }}
                >
                  <Text className="text-white font-bold text-base">
                    {isUpdatingEmail ? "Updating..." : "Update Email"}
                  </Text>
                </Pressable>
              </GradientBackground>
            </TickBoxCard>

            {/* Update Password Section */}
            <TickBoxCard>
              <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
                Update Password
              </Text>

              {/* Current Password */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="font-medium mb-2">
                  Current Password
                </Text>
                <View className="relative">
                  <TextInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      paddingRight: 48,
                      color: colors.text,
                      backgroundColor: colors.background,
                    }}
                    placeholder="Enter current password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 12,
                      padding: 4,
                    }}
                  >
                    <Ionicons
                      name={showCurrentPassword ? "eye-off" : "eye"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>
              </View>

              {/* New Password */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="font-medium mb-2">
                  New Password
                </Text>
                <View className="relative">
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      paddingRight: 48,
                      color: colors.text,
                      backgroundColor: colors.background,
                    }}
                    placeholder="Enter new password (min 6 characters)"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 12,
                      padding: 4,
                    }}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye-off" : "eye"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm New Password */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="font-medium mb-2">
                  Confirm New Password
                </Text>
                <View className="relative">
                  <TextInput
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      paddingRight: 48,
                      color: colors.text,
                      backgroundColor: colors.background,
                    }}
                    placeholder="Confirm new password"
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
                    <Ionicons
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Update Button */}
              <GradientBackground style={{ borderRadius: 12 }}>
                <Pressable
                  onPress={handleUpdatePassword}
                  disabled={isUpdatingPassword || !currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()}
                  style={{ 
                    paddingVertical: 14, 
                    alignItems: "center",
                    opacity: isUpdatingPassword || !currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim() ? 0.5 : 1,
                  }}
                >
                  <Text className="text-white font-bold text-base">
                    {isUpdatingPassword ? "Updating..." : "Update Password"}
                  </Text>
                </Pressable>
              </GradientBackground>
            </TickBoxCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
