import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Pressable, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useUserStore } from "../state/userStore";
import { useNotificationStore } from "../state/notificationStore";
import { useTheme } from "../contexts/ThemeContext";

// Screens
import OnboardingScreen from "../screens/OnboardingScreen";
import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import ProfileSetupScreen from "../screens/ProfileSetupScreen";
import DashboardScreen from "../screens/DashboardScreen";
import FriendsScreen from "../screens/FriendsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CreateMemoryScreen from "../screens/CreateMemoryScreen";
import MemoryDetailScreen from "../screens/MemoryDetailScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import SettingsPrivacyScreen from "../screens/SettingsPrivacyScreen";
import MyDetailsScreen from "../screens/MyDetailsScreen";
import SupportFeedbackScreen from "../screens/SupportFeedbackScreen";
import InviteFriendsScreen from "../screens/InviteFriendsScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import UserProfileScreen from "../screens/UserProfileScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";

export type RootStackParamList = {
  Onboarding: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ProfileSetup: undefined;
  MainTabs: undefined;
  CreateMemory: { mode?: "upload" | "manual" | "edit"; memoryId?: string } | undefined;
  MemoryDetail: { memoryId: string };
  EditProfile: undefined;
  UserProfile: { userId: string };
  Notifications: undefined;
  InviteFriends: undefined;
  SettingsPrivacy: undefined;
  MyDetails: undefined;
  SupportFeedback: undefined;
  Subscription: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Friends: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const getUnreadCount = useNotificationStore((state) => state.getUnreadCount);
  const unreadCount = user ? getUnreadCount(user.id) : 0;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Dashboard") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Friends") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          } else {
            iconName = "help-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTitleStyle: {
          color: colors.text,
        },
        headerTintColor: colors.primary,
        headerRight: () => {
          const navigation = useNavigation();
          return (
            <Pressable
              onPress={() => navigation.navigate("Notifications" as never)}
              style={{ marginRight: 16 }}
            >
              <View>
                <Ionicons
                  name={unreadCount > 0 ? "notifications" : "notifications-outline"}
                  size={24}
                  color={colors.primary}
                />
                {unreadCount > 0 && (
                  <View className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full items-center justify-center">
                    <Text className="text-white text-xs font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: "TickBox" }}
      />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);

  // Show auth screens if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.primary,
        }}
      >
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </Stack.Navigator>
    );
  }

  // Show onboarding if user hasn't seen it yet
  if (!user.introSeen) {
    return (
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.primary,
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      </Stack.Navigator>
    );
  }

  // Show profile setup if not complete
  if (!user.profileSetupComplete) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.primary,
        }}
      >
        <Stack.Screen 
          name="ProfileSetup" 
          component={ProfileSetupScreen}
          options={{ title: "Complete Your Profile", headerBackVisible: false }}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabNavigator} 
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateMemory"
        component={CreateMemoryScreen}
        options={{
          presentation: "modal",
          title: "Add Memory",
        }}
      />
      <Stack.Screen
        name="MemoryDetail"
        component={MemoryDetailScreen}
        options={{ 
          title: "Memory" // Dynamic header will be set by the component
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Notifications" }}
      />
      <Stack.Screen
        name="SettingsPrivacy"
        component={SettingsPrivacyScreen}
        options={{ title: "Settings & Privacy" }}
      />
      <Stack.Screen
        name="MyDetails"
        component={MyDetailsScreen}
        options={{ title: "My Details" }}
      />
      <Stack.Screen
        name="SupportFeedback"
        component={SupportFeedbackScreen}
        options={{ title: "Support & Feedback" }}
      />
      <Stack.Screen
        name="InviteFriends"
        component={InviteFriendsScreen}
        options={{ title: "Invite Friends" }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: "Edit Profile" }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: "Profile", headerShown: false }}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: "Premium", headerShown: false }}
      />
    </Stack.Navigator>
  );
}