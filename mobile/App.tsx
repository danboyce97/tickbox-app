import { StatusBar } from "expo-status-bar";
import React, { useEffect, useCallback } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from "./src/navigation/AppNavigator";
import { ThemeProvider, useTheme } from "./src/contexts/ThemeContext";
import { initializeRevenueCat, setupCustomerInfoListener } from "./src/services/revenueCat";
import { useSubscriptionStore } from "./src/state/subscriptionStore";
import { useUserStore } from "./src/state/userStore";
import { useNotificationStore } from "./src/state/notificationStore";
import { useFriendStore } from "./src/state/friendStore";
import { useMemoryStore } from "./src/state/memoryStore";
import { registerForPushNotificationsAsync, addNotificationResponseListener, addNotificationReceivedListener } from "./src/services/pushNotifications";
import * as FirebaseService from "./src/services/firebase";
import "./config/firebase"; // Initialize Firebase

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function ThemedApp() {
  const { isDark } = useTheme();
  const user = useUserStore((state) => state.user);
  const cleanupGhostAccounts = useUserStore((state) => state.cleanupGhostAccounts);
  const checkAndUpdateStatus = useSubscriptionStore((state) => state.checkAndUpdateStatus);
  const setCustomerInfo = useSubscriptionStore((state) => state.setCustomerInfo);
  const subscribeToNotifications = useNotificationStore((state) => state.subscribeToNotifications);
  const subscribeToFriendships = useFriendStore((state) => state.subscribeToFriendships);
  const subscribeToFriendRequests = useFriendStore((state) => state.subscribeToFriendRequests);
  const loadUserMemories = useMemoryStore((state) => state.loadUserMemories);

  const [appIsReady, setAppIsReady] = React.useState(false);

  // Load user memories on app startup (when user exists from persistence)
  useEffect(() => {
    if (user?.id) {
      console.log('📱 Loading user memories on app startup...');
      loadUserMemories(user.id).then(() => {
        console.log('✅ User memories loaded on startup');
      }).catch((error) => {
        console.error('❌ Failed to load user memories on startup:', error);
      });
    }
  }, [user?.id]);

  // Cleanup ghost accounts on app startup (once when user is available)
  useEffect(() => {
    if (user?.id) {
      // Run cleanup in background - don't block app startup
      cleanupGhostAccounts().catch((error) => {
        console.error('❌ Ghost account cleanup failed:', error);
      });
    }
  }, [user?.id]);

  // Subscribe to real-time notifications and friendships when user is available
  useEffect(() => {
    if (user?.id) {
      console.log('📱 Setting up real-time subscriptions for user:', user.id);

      // Subscribe to notifications from Firestore
      const unsubNotifications = subscribeToNotifications(user.id);

      // Subscribe to friendships from Firestore
      const unsubFriendships = subscribeToFriendships(user.id);

      // Subscribe to friend requests from Firestore
      const unsubFriendRequests = subscribeToFriendRequests(user.id);

      return () => {
        console.log('📱 Cleaning up real-time subscriptions');
        unsubNotifications();
        unsubFriendships();
        unsubFriendRequests();
      };
    }
  }, [user?.id]);

  // Register for push notifications and save token to Firebase
  useEffect(() => {
    if (user?.id) {
      const setupPushNotifications = async () => {
        try {
          console.log('📱 Registering for push notifications...');
          console.log('📱 Current user ID:', user.id);
          const token = await registerForPushNotificationsAsync();

          if (token) {
            console.log('📱 Push token obtained:', token);
            console.log('📱 Saving push token to Firebase for user:', user.id);
            // Save push token to user's Firebase document
            await FirebaseService.updateUserDocument(user.id, { pushToken: token });
            console.log('✅ Push token saved to Firebase successfully!');
          } else {
            console.log('⚠️ No push token obtained - user may have denied permission or using simulator');
            console.log('⚠️ Check if running on physical device and permissions are granted');
          }
        } catch (error: any) {
          console.error('❌ Error setting up push notifications:', error?.message || error);
        }
      };

      // Run immediately, then again after a short delay to handle cases where
      // native modules aren't ready immediately after app launch
      setupPushNotifications();
      const retryTimeout = setTimeout(() => {
        setupPushNotifications();
      }, 5000);

      // Set up notification listeners
      const responseListener = addNotificationResponseListener((response) => {
        console.log('📱 Notification tapped:', response.notification.request.content);
        // Handle notification tap - navigate to appropriate screen based on notification type
        const data = response.notification.request.content.data;
        if (data?.type) {
          console.log('📱 Notification type:', data.type);
          // Navigation will be handled by the app based on the notification type
        }
      });

      const receivedListener = addNotificationReceivedListener((notification) => {
        console.log('📱 Notification received in foreground:', notification.request.content);
      });

      return () => {
        clearTimeout(retryTimeout);
        responseListener.remove();
        receivedListener.remove();
      };
    }
  }, [user?.id]);

  useEffect(() => {
    // Initialize RevenueCat when user is available
    const initRevenueCat = async () => {
      try {
        if (user?.id) {
          // Add significant delay to ensure native modules are fully ready
          await new Promise(resolve => setTimeout(resolve, 2000));

          await initializeRevenueCat(user.id);

          // Check initial subscription status
          await checkAndUpdateStatus();

          // Set up listener for subscription changes
          const listener = (customerInfo: any) => {
            setCustomerInfo(customerInfo);
          };

          setupCustomerInfoListener(listener);
        }
      } catch (error) {
        // Silently handle errors - app continues without premium features
        console.log('RevenueCat initialization skipped or failed - continuing without premium features');
      } finally {
        // Mark app as ready even if RevenueCat fails
        setAppIsReady(true);
      }
    };

    initRevenueCat();
  }, [user?.id]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <>
      <NavigationContainer onReady={onLayoutRootView}>
        <AppNavigator />
        <StatusBar style={isDark ? "light" : "dark"} />
      </NavigationContainer>
    </>
  );
}

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project. 
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

export default function App() {
  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
