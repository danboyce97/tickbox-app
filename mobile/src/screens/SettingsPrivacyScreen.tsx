import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Switch, Linking, Alert, Modal, ActivityIndicator, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useUserStore } from "../state/userStore";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";
import { RootStackParamList } from "../navigation/AppNavigator";
import { CURRENCIES, getPopularCurrencies, getOtherCurrencies, getCurrencySymbol } from "../utils/currencies";
import { deleteUserAccount, sendBroadcastPushNotification, getAllUsersWithPushTokens } from "../services/firebase";
import { scheduleLocalNotification, registerForPushNotificationsAsync } from "../services/pushNotifications";

// Admin user IDs who can access broadcast functionality
const ADMIN_USER_IDS = ['IFQnR9obcqMeFTnyUgSz94Nz5RI3'];

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "SettingsPrivacy">;

export default function SettingsPrivacyScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const setTheme = useUserStore((state) => state.setTheme);
  const setPreferredCurrency = useUserStore((state) => state.setPreferredCurrency);
  const updateNotificationSettings = useUserStore((state) => state.updateNotificationSettings);
  const updateUser = useUserStore((state) => state.updateUser);
  const logout = useUserStore((state) => state.logout);
  const deleteAccountLocal = useUserStore((state) => state.deleteAccount);

  const [isNotificationExpanded, setIsNotificationExpanded] = useState(false);
  const [isPrivacyExpanded, setIsPrivacyExpanded] = useState(false);
  const [isDataExpanded, setIsDataExpanded] = useState(false);
  const [isAdminExpanded, setIsAdminExpanded] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Admin broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [usersWithTokenCount, setUsersWithTokenCount] = useState<number | null>(null);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  const isAdmin = user?.id ? ADMIN_USER_IDS.includes(user.id) : false;

  if (!user) return null;

  const handleNotificationToggle = (setting: keyof typeof user.notificationSettings) => {
    updateNotificationSettings({
      [setting]: !user.notificationSettings[setting],
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!user?.id) return;

            setIsDeletingAccount(true);
            try {
              // Delete from Firebase (this includes memories, images, and auth)
              await deleteUserAccount(user.id);

              // Delete from local storage
              deleteAccountLocal();

              // Navigate to sign in screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'SignIn' as never }],
              });

              Alert.alert("Account Deleted", "Your account has been permanently deleted.");
            } catch (error) {
              console.error("Error deleting account:", error);
              setIsDeletingAccount(false);
              Alert.alert(
                "Delete Failed",
                "There was an error deleting your account. Please try again or contact support."
              );
            }
          },
        },
      ]
    );
  };

  // Admin functions
  const handleCheckUsersWithTokens = async () => {
    try {
      const users = await getAllUsersWithPushTokens();
      setUsersWithTokenCount(users.length);
      Alert.alert('Users with Push Tokens', `Found ${users.length} users with valid push tokens.`);
    } catch (error) {
      console.error('Error checking users:', error);
      Alert.alert('Error', 'Failed to check users with push tokens.');
    }
  };

  const handleTestLocalNotification = async () => {
    setIsTestingNotification(true);
    try {
      console.log('🔔 Testing notification - sending local notification first...');

      // Send a local notification immediately (don't wait for push token)
      await scheduleLocalNotification({
        type: 'weekly_reminder',
        title: 'Test Notification',
        body: 'If you see this, notifications are working on your device!',
        data: { test: true },
      });

      console.log('🔔 Local notification scheduled, now checking push token (with timeout)...');

      // Try to get push token with a short timeout (5 seconds max)
      let token: string | undefined;
      try {
        const tokenPromise = registerForPushNotificationsAsync();
        const timeoutPromise = new Promise<undefined>((resolve) => {
          setTimeout(() => resolve(undefined), 5000);
        });
        token = await Promise.race([tokenPromise, timeoutPromise]);

        if (token) {
          console.log('🔔 Push token obtained:', token);
        } else {
          console.log('🔔 Push token check timed out or not available');
        }
      } catch (tokenError: any) {
        console.log('🔔 Push token error (non-blocking):', tokenError?.message);
      }

      Alert.alert(
        'Test Notification Sent',
        token
          ? `Local notification sent!\n\nYour push token:\n${token.substring(0, 30)}...`
          : 'Local notification sent!\n\nNote: Push token not available or timed out. Remote notifications may not work.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('🔔 Test notification error:', error);
      Alert.alert('Error', `Failed to send test notification: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsTestingNotification(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      Alert.alert('Missing Fields', 'Please enter both a title and message.');
      return;
    }

    Alert.alert(
      'Send Broadcast',
      `Are you sure you want to send this notification to ALL users?\n\nTitle: ${broadcastTitle}\nMessage: ${broadcastBody}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'destructive',
          onPress: async () => {
            setIsSendingBroadcast(true);
            try {
              const result = await sendBroadcastPushNotification(
                broadcastTitle,
                broadcastBody,
                { type: 'broadcast' }
              );
              Alert.alert(
                'Broadcast Sent',
                `Successfully sent: ${result.sent}\nFailed: ${result.failed}`
              );
              setBroadcastTitle('');
              setBroadcastBody('');
            } catch (error) {
              console.error('Error sending broadcast:', error);
              Alert.alert('Error', 'Failed to send broadcast notification.');
            } finally {
              setIsSendingBroadcast(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {isDeletingAccount && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              padding: 24,
              borderRadius: 12,
              alignItems: 'center'
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.text, marginTop: 16 }}>
              Deleting account...
            </Text>
          </View>
        </View>
      )}
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
            Settings & Privacy
          </Text>
        </View>

        <View className="px-6 py-6">
          {/* Theme Settings */}
          <TickBoxCard style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
              Appearance
            </Text>
            <View className="flex-row justify-between items-center">
              <View>
                <Text style={{ color: colors.text }}>Dark Mode</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">
                  Switch between light and dark theme
                </Text>
              </View>
              <Switch
                value={user.theme === "dark"}
                onValueChange={(value) => setTheme(value ? "dark" : "light")}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>
          </TickBoxCard>

          {/* Privacy Settings */}
          <TickBoxCard style={{ marginBottom: 16 }} noPadding>
            <Pressable
              onPress={() => setIsPrivacyExpanded(!isPrivacyExpanded)}
              style={{ padding: 20 }}
            >
              <View className="flex-row items-center justify-between">
                <Text style={{ color: colors.text }} className="text-lg font-semibold">
                  Privacy
                </Text>
                <Ionicons 
                  name={isPrivacyExpanded ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color={colors.textSecondary} 
                />
              </View>
            </Pressable>

            {isPrivacyExpanded && (
              <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                <View className="space-y-3">
                  <View className="flex-row justify-between items-center py-2">
                    <View className="flex-1">
                      <Text style={{ color: colors.text }}>Private Account</Text>
                      <Text style={{ color: colors.textSecondary }} className="text-sm">
                        Others must send a friend request to see your memories
                      </Text>
                    </View>
                    <Switch
                      value={user.isPrivate}
                      onValueChange={(value) => updateUser({ isPrivate: value })}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="white"
                    />
                  </View>

                  <View className="flex-row justify-between items-center py-2">
                    <View className="flex-1">
                      <Text style={{ color: colors.text }}>Show Location</Text>
                      <Text style={{ color: colors.textSecondary }} className="text-sm">
                        Display location on your profile
                      </Text>
                    </View>
                    <Switch
                      value={user.showLocation ?? true}
                      onValueChange={(value) => updateUser({ showLocation: value })}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="white"
                    />
                  </View>

                  {/* Privacy Policy Button */}
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Pressable
                      onPress={() => Linking.openURL("https://tick-box-support-d9183920.base44.app/PrivacyPolicy")}
                      className="flex-row items-center justify-between py-2"
                    >
                      <View className="flex-row items-center">
                        <Ionicons name="shield-outline" size={20} color={colors.primary} />
                        <View className="ml-3">
                          <Text style={{ color: colors.text }}>Privacy Policy</Text>
                          <Text style={{ color: colors.textSecondary }} className="text-sm">
                            View our privacy policy and terms
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </Pressable>

                    {/* Terms of Use Button */}
                    <Pressable
                      onPress={() => Linking.openURL("https://tick-box-support-d9183920.base44.app/TermsOfService")}
                      className="flex-row items-center justify-between py-2"
                      style={{ marginTop: 8 }}
                    >
                      <View className="flex-row items-center">
                        <Ionicons name="shield-outline" size={20} color={colors.primary} />
                        <View className="ml-3">
                          <Text style={{ color: colors.text }}>Terms of Use</Text>
                          <Text style={{ color: colors.textSecondary }} className="text-sm">
                            View our privacy policy and terms
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </TickBoxCard>

          {/* Notification Settings */}
          <TickBoxCard style={{ marginBottom: 16 }} noPadding>
            <Pressable
              onPress={() => setIsNotificationExpanded(!isNotificationExpanded)}
              style={{ padding: 20 }}
            >
              <View className="flex-row items-center justify-between">
                <Text style={{ color: colors.text }} className="text-lg font-semibold">
                  Notifications
                </Text>
                <Ionicons 
                  name={isNotificationExpanded ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color={colors.textSecondary} 
                />
              </View>
            </Pressable>

            {isNotificationExpanded && (
              <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                <View className="space-y-3">
              <View className="flex-row justify-between items-center py-2">
                <View className="flex-1">
                  <Text style={{ color: colors.text }}>Push Notifications</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm">
                    Master toggle for all notifications
                  </Text>
                </View>
                <Switch
                  value={user.notificationSettings.pushEnabled}
                  onValueChange={() => handleNotificationToggle("pushEnabled")}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="white"
                />
              </View>

              <View className="flex-row justify-between items-center py-2">
                <View className="flex-1">
                  <Text style={{ color: colors.text }}>Friend Requests</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm">
                    When someone sends you a friend request
                  </Text>
                </View>
                <Switch
                  value={user.notificationSettings.friendRequests}
                  onValueChange={() => handleNotificationToggle("friendRequests")}
                  disabled={!user.notificationSettings.pushEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="white"
                />
              </View>

              <View className="flex-row justify-between items-center py-2">
                <View className="flex-1">
                  <Text style={{ color: colors.text }}>Memory Likes</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm">
                    When someone likes your memories
                  </Text>
                </View>
                <Switch
                  value={user.notificationSettings.memoriesLiked}
                  onValueChange={() => handleNotificationToggle("memoriesLiked")}
                  disabled={!user.notificationSettings.pushEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="white"
                />
              </View>

              <View className="flex-row justify-between items-center py-2">
                <View className="flex-1">
                  <Text style={{ color: colors.text }}>Tagged in Memory</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm">
                    When friends tag you in their memories
                  </Text>
                </View>
                <Switch
                  value={user.notificationSettings.tagged}
                  onValueChange={() => handleNotificationToggle("tagged")}
                  disabled={!user.notificationSettings.pushEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="white"
                />
              </View>

              <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase mb-3">
                  Scheduled Reminders
                </Text>

                <View className="flex-row justify-between items-center py-2">
                  <View className="flex-1">
                    <Text style={{ color: colors.text }}>On This Day</Text>
                    <Text style={{ color: colors.textSecondary }} className="text-sm">
                      Yearly reminder of your past memories
                    </Text>
                  </View>
                  <Switch
                    value={user.notificationSettings.onThisDay}
                    onValueChange={() => handleNotificationToggle("onThisDay")}
                    disabled={!user.notificationSettings.pushEnabled}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="white"
                  />
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <View className="flex-1">
                    <Text style={{ color: colors.text }}>One Week To Go</Text>
                    <Text style={{ color: colors.textSecondary }} className="text-sm">
                      7 days before upcoming events
                    </Text>
                  </View>
                  <Switch
                    value={user.notificationSettings.oneWeekToGo}
                    onValueChange={() => handleNotificationToggle("oneWeekToGo")}
                    disabled={!user.notificationSettings.pushEnabled}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="white"
                  />
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <View className="flex-1">
                    <Text style={{ color: colors.text }}>Join Anniversary</Text>
                    <Text style={{ color: colors.textSecondary }} className="text-sm">
                      Celebrate your TickBox anniversary
                    </Text>
                  </View>
                  <Switch
                    value={user.notificationSettings.joinAnniversary}
                    onValueChange={() => handleNotificationToggle("joinAnniversary")}
                    disabled={!user.notificationSettings.pushEnabled}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="white"
                  />
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <View className="flex-1">
                    <Text style={{ color: colors.text }}>Weekly Reminder</Text>
                    <Text style={{ color: colors.textSecondary }} className="text-sm">
                      Every Sunday at 6 PM to upload memories
                    </Text>
                  </View>
                  <Switch
                    value={user.notificationSettings.weeklyReminder}
                    onValueChange={() => handleNotificationToggle("weeklyReminder")}
                    disabled={!user.notificationSettings.pushEnabled}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="white"
                  />
                </View>
              </View>
                </View>
              </View>
            )}
          </TickBoxCard>

          {/* My Account Settings */}
          <TickBoxCard noPadding>
            <Pressable
              onPress={() => setIsDataExpanded(!isDataExpanded)}
              style={{ padding: 20 }}
            >
              <View className="flex-row items-center justify-between">
                <Text style={{ color: colors.text }} className="text-lg font-semibold">
                  My Account
                </Text>
                <Ionicons 
                  name={isDataExpanded ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color={colors.textSecondary} 
                />
              </View>
            </Pressable>

            {isDataExpanded && (
              <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                {/* My Details */}
                <Pressable 
                  onPress={() => navigation.navigate("MyDetails" as never)}
                  style={{ 
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    marginBottom: 12,
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text style={{ color: colors.text }} className="font-medium mb-1">
                        My Details
                      </Text>
                      <Text style={{ color: colors.textSecondary }} className="text-sm">
                        Update your email and password
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </View>
                </Pressable>

                {/* Preferred Currency */}
                <Pressable 
                  onPress={() => setShowCurrencyModal(true)}
                  style={{ 
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    marginBottom: 12,
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text style={{ color: colors.text }} className="font-medium mb-1">
                        Preferred Currency
                      </Text>
                      <Text style={{ color: colors.textSecondary }} className="text-sm">
                        Default currency for stats and reports
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text style={{ color: colors.primary, fontWeight: "600", marginRight: 8 }}>
                        {user.preferredCurrency}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </View>
                  </View>
                </Pressable>

                {/* Delete Account */}
                <Pressable onPress={handleDeleteAccount} className="py-3">
                  <Text style={{ color: colors.error }}>Delete Account</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm">
                    Permanently delete your account
                  </Text>
                </Pressable>
              </View>
            )}
          </TickBoxCard>

          {/* Admin Section - Only visible to admin users */}
          {isAdmin && (
            <TickBoxCard style={{ marginTop: 16 }} noPadding>
              <Pressable
                onPress={() => setIsAdminExpanded(!isAdminExpanded)}
                style={{ padding: 20 }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="shield-checkmark" size={20} color={colors.warning} style={{ marginRight: 8 }} />
                    <Text style={{ color: colors.warning }} className="text-lg font-semibold">
                      Admin
                    </Text>
                  </View>
                  <Ionicons
                    name={isAdminExpanded ? "chevron-up" : "chevron-down"}
                    size={24}
                    color={colors.textSecondary}
                  />
                </View>
              </Pressable>

              {isAdminExpanded && (
                <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                  {/* Test Local Notification */}
                  <Pressable
                    onPress={handleTestLocalNotification}
                    disabled={isTestingNotification}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      marginBottom: 16,
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text style={{ color: colors.text }} className="font-medium">
                          Test Local Notification
                        </Text>
                        <Text style={{ color: colors.textSecondary }} className="text-sm">
                          Send a test notification to this device
                        </Text>
                      </View>
                      {isTestingNotification ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Ionicons name="notifications" size={20} color={colors.success} />
                      )}
                    </View>
                  </Pressable>

                  {/* Check Users */}
                  <Pressable
                    onPress={handleCheckUsersWithTokens}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      marginBottom: 16,
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text style={{ color: colors.text }} className="font-medium">
                          Check Push Token Users
                        </Text>
                        <Text style={{ color: colors.textSecondary }} className="text-sm">
                          {usersWithTokenCount !== null
                            ? `${usersWithTokenCount} users have push tokens`
                            : 'See how many users can receive notifications'}
                        </Text>
                      </View>
                      <Ionicons name="people" size={20} color={colors.primary} />
                    </View>
                  </Pressable>

                  {/* Broadcast Notification */}
                  <Text style={{ color: colors.text }} className="font-semibold mb-3">
                    Send Broadcast Notification
                  </Text>

                  <TextInput
                    style={{
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 8,
                      padding: 12,
                      color: colors.text,
                      marginBottom: 12,
                    }}
                    placeholder="Notification Title"
                    placeholderTextColor={colors.textMuted}
                    value={broadcastTitle}
                    onChangeText={setBroadcastTitle}
                  />

                  <TextInput
                    style={{
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 8,
                      padding: 12,
                      color: colors.text,
                      marginBottom: 16,
                      minHeight: 80,
                      textAlignVertical: 'top',
                    }}
                    placeholder="Notification Message"
                    placeholderTextColor={colors.textMuted}
                    value={broadcastBody}
                    onChangeText={setBroadcastBody}
                    multiline
                    numberOfLines={3}
                  />

                  <Pressable
                    onPress={handleSendBroadcast}
                    disabled={isSendingBroadcast}
                    style={{
                      backgroundColor: isSendingBroadcast ? colors.border : colors.warning,
                      paddingVertical: 14,
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                  >
                    {isSendingBroadcast ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <View className="flex-row items-center">
                        <Ionicons name="megaphone" size={18} color="white" style={{ marginRight: 8 }} />
                        <Text style={{ color: 'white', fontWeight: '600' }}>
                          Send to All Users
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              )}
            </TickBoxCard>
          )}
        </View>
      </ScrollView>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <Pressable 
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
          onPress={() => setShowCurrencyModal(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View 
              style={{ 
                backgroundColor: colors.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 8,
                maxHeight: "80%",
              }}
            >
              {/* Handle Bar */}
              <View className="items-center py-3">
                <View 
                  style={{ 
                    width: 40, 
                    height: 4, 
                    backgroundColor: colors.border, 
                    borderRadius: 2 
                  }} 
                />
              </View>

              {/* Header */}
              <View className="px-6 mb-4">
                <Text style={{ color: colors.text }} className="text-xl font-bold">
                  Select Preferred Currency
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm mt-1">
                  This will be used for stats and reports
                </Text>
              </View>

              {/* Currency List */}
              <ScrollView style={{ maxHeight: 500 }}>
                {/* Popular Currencies Section */}
                <View className="px-6 mb-2">
                  <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase mb-2">
                    Popular
                  </Text>
                </View>
                {getPopularCurrencies().map((currency) => (
                  <Pressable
                    key={currency.code}
                    onPress={() => {
                      setPreferredCurrency(currency.code);
                      setShowCurrencyModal(false);
                    }}
                    style={{
                      paddingHorizontal: 24,
                      paddingVertical: 14,
                      backgroundColor: user.preferredCurrency === currency.code ? `${colors.primary}15` : "transparent",
                      borderLeftWidth: 4,
                      borderLeftColor: user.preferredCurrency === currency.code ? colors.primary : "transparent",
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View 
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: colors.surface,
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 12,
                          }}
                        >
                          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>
                            {currency.symbol}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text 
                            style={{ 
                              color: colors.text, 
                              fontSize: 16, 
                              fontWeight: user.preferredCurrency === currency.code ? "600" : "500" 
                            }}
                          >
                            {currency.code}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 14 }} numberOfLines={1}>
                            {currency.name}
                          </Text>
                        </View>
                      </View>
                      {user.preferredCurrency === currency.code && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                      )}
                    </View>
                  </Pressable>
                ))}

                {/* All Currencies Section */}
                <View className="px-6 mb-2 mt-4">
                  <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase mb-2">
                    All Currencies
                  </Text>
                </View>
                {getOtherCurrencies().map((currency) => (
                  <Pressable
                    key={currency.code}
                    onPress={() => {
                      setPreferredCurrency(currency.code);
                      setShowCurrencyModal(false);
                    }}
                    style={{
                      paddingHorizontal: 24,
                      paddingVertical: 14,
                      backgroundColor: user.preferredCurrency === currency.code ? `${colors.primary}15` : "transparent",
                      borderLeftWidth: 4,
                      borderLeftColor: user.preferredCurrency === currency.code ? colors.primary : "transparent",
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View 
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: colors.surface,
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 12,
                          }}
                        >
                          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>
                            {currency.symbol}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text 
                            style={{ 
                              color: colors.text, 
                              fontSize: 16, 
                              fontWeight: user.preferredCurrency === currency.code ? "600" : "500" 
                            }}
                          >
                            {currency.code}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 14 }} numberOfLines={1}>
                            {currency.name}
                          </Text>
                        </View>
                      </View>
                      {user.preferredCurrency === currency.code && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                      )}
                    </View>
                  </Pressable>
                ))}
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}