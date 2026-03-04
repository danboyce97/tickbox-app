import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false, // Disabled badge counts
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationData {
  type: 'friend_request_received' | 'friend_request_accepted' | 'memory_liked' | 'tagged_in_memory' | 'on_this_day' | 'one_week_to_go' | 'join_anniversary' | 'weekly_reminder';
  title: string;
  body: string;
  data?: any;
}

/**
 * Register for push notifications and get push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token;

  // Get project ID from Constants (works in both dev and production)
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? '6f37ea61-53f4-4fdd-9bba-07d51ec40c35';
  console.log('📱 Push registration starting with projectId:', projectId);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    console.log('📱 Running on physical device, checking permissions...');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    console.log('📱 Existing permission status:', existingStatus);

    if (existingStatus !== 'granted') {
      console.log('📱 Requesting notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('📱 New permission status:', status);
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Push notification permission not granted!');
      return;
    }

    try {
      // First, try to get the native device push token for debugging
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        console.log('📱 Native device push token obtained:', deviceToken.type, deviceToken.data?.substring(0, 20) + '...');
      } catch (deviceTokenError: any) {
        console.log('⚠️ Could not get native device token:', deviceTokenError?.message);
      }

      console.log('📱 Getting Expo push token...');
      console.log('📱 Using projectId:', projectId);

      // Retry logic for production builds - APNs can be slow
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📱 Push token attempt ${attempt}/${maxRetries}...`);

          // Longer timeout for production builds (30 seconds)
          const tokenPromise = Notifications.getExpoPushTokenAsync({
            projectId,
          });

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Push token request timed out after 30 seconds (attempt ${attempt})`)), 30000);
          });

          const tokenResponse = await Promise.race([tokenPromise, timeoutPromise]);
          token = tokenResponse.data;
          console.log('✅ Push token obtained successfully:', token);
          break; // Success, exit retry loop
        } catch (attemptError: any) {
          lastError = attemptError;
          console.log(`⚠️ Push token attempt ${attempt} failed:`, attemptError?.message);

          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            const delay = attempt * 2000;
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (!token && lastError) {
        throw lastError;
      }
    } catch (error: any) {
      console.error('❌ Error getting push token:', error?.message || error);
      console.error('❌ Full error details:', JSON.stringify(error, null, 2));
    }
  } else {
    console.log('⚠️ Must use physical device for Push Notifications (running on simulator)');
  }

  return token;
}

/**
 * Schedule a local push notification (for testing or offline notifications)
 */
export async function scheduleLocalNotification(notification: PushNotificationData) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: { ...notification.data, type: notification.type },
      sound: true,
    },
    trigger: null, // Send immediately
  });
}

/**
 * Send push notification via Expo Push Notification service
 * In production, this should be called from your backend server
 */
export async function sendPushNotification(
  expoPushToken: string,
  notification: PushNotificationData
) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: { ...notification.data, type: notification.type },
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

/**
 * Get notification badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set notification badge count
 */
export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications() {
  await Notifications.dismissAllNotificationsAsync();
  await setBadgeCount(0);
}

/**
 * Add notification response listener
 * Called when user taps on a notification
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add notification received listener
 * Called when notification arrives while app is in foreground
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}
