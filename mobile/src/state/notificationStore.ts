import { create } from "zustand";
import * as FirebaseService from "../services/firebase";

export type NotificationType =
  | "friend_request_received"
  | "friend_request_accepted"
  | "memory_liked"
  | "memory_comment"
  | "comment_reply"
  | "comment_liked"
  | "tagged_in_memory"
  | "on_this_day"
  | "one_week_to_go"
  | "join_anniversary"
  | "weekly_reminder";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  isLoading: boolean;
  unsubscribe: (() => void) | null;

  // Firestore-backed actions
  loadNotifications: (userId: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, "id" | "createdAt">) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  getUnreadCount: (userId: string) => number;
  getNotificationsByUser: (userId: string) => Notification[];
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: (userId: string) => Promise<void>;

  // Real-time subscription
  subscribeToNotifications: (userId: string) => () => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  isLoading: false,
  unsubscribe: null,

  loadNotifications: async (userId) => {
    try {
      set({ isLoading: true });
      const notifications = await FirebaseService.getUserNotifications(userId);
      set({
        notifications: notifications as Notification[],
        isLoading: false
      });
    } catch (error) {
      console.error("Error loading notifications:", error);
      set({ isLoading: false });
    }
  },

  addNotification: async (notificationData) => {
    try {
      console.log(`🔔 Creating notification for user ${notificationData.userId}:`, {
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
      });

      // Create notification in Firestore
      const notificationId = await FirebaseService.createNotification({
        userId: notificationData.userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
        read: notificationData.read,
      });

      console.log(`✅ Notification created in Firestore: ${notificationId}`);

      // Also send a push notification to the user's device
      console.log(`📱 Fetching target user document for push notification...`);
      const targetUser = await FirebaseService.getUserDocument(notificationData.userId);

      if (!targetUser) {
        console.log(`⚠️ Target user document not found for user ${notificationData.userId}`);
        return;
      }

      console.log(`📱 Target user push settings:`, {
        userId: notificationData.userId,
        displayName: targetUser.displayName,
        hasPushToken: !!targetUser.pushToken,
        pushTokenPrefix: targetUser.pushToken?.substring(0, 40),
        pushEnabled: targetUser.notificationSettings?.pushEnabled,
        allNotificationSettings: JSON.stringify(targetUser.notificationSettings),
      });

      // Check if push notifications are enabled (default to true if setting is missing)
      const pushEnabled = targetUser.notificationSettings?.pushEnabled !== false;

      if (pushEnabled) {
        if (targetUser.pushToken) {
          console.log(`📤 Sending push notification to token: ${targetUser.pushToken.substring(0, 40)}...`);
          try {
            await FirebaseService.sendPushNotificationToUser(
              notificationData.userId,
              notificationData.title,
              notificationData.message,
              { ...notificationData.data, type: notificationData.type }
            );
            console.log(`✅ Push notification send attempt completed`);
          } catch (pushError) {
            console.error(`❌ Push notification send failed:`, pushError);
          }
        } else {
          console.log(`⚠️ No push token found for user ${notificationData.userId} - push notification skipped`);
          console.log(`⚠️ User may need to re-open the app to register for push notifications`);
        }
      } else {
        console.log(`⚠️ Push notifications disabled for user ${notificationData.userId}`);
      }
    } catch (error) {
      console.error("❌ Error adding notification:", error);
    }
  },

  markAsRead: async (notificationId) => {
    try {
      await FirebaseService.markNotificationAsRead(notificationId);
      // Update local state
      set((state) => ({
        notifications: state.notifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        ),
      }));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  },

  markAllAsRead: async (userId) => {
    try {
      await FirebaseService.markAllNotificationsAsRead(userId);
      // Update local state
      set((state) => ({
        notifications: state.notifications.map((notification) =>
          notification.userId === userId
            ? { ...notification, read: true }
            : notification
        ),
      }));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  },

  getUnreadCount: (userId) => {
    return get().notifications.filter(
      (notification) => notification.userId === userId && !notification.read
    ).length;
  },

  getNotificationsByUser: (userId) => {
    return get().notifications.filter(
      (notification) => notification.userId === userId
    );
  },

  deleteNotification: async (notificationId) => {
    try {
      await FirebaseService.deleteNotification(notificationId);
      // Update local state
      set((state) => ({
        notifications: state.notifications.filter(
          (notification) => notification.id !== notificationId
        ),
      }));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  },

  clearAllNotifications: async (userId) => {
    try {
      const userNotifications = get().notifications.filter(
        (n) => n.userId === userId
      );
      // Delete each notification from Firestore
      await Promise.all(
        userNotifications.map((n) => FirebaseService.deleteNotification(n.id))
      );
      // Update local state
      set((state) => ({
        notifications: state.notifications.filter(
          (notification) => notification.userId !== userId
        ),
      }));
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    }
  },

  subscribeToNotifications: (userId) => {
    // Unsubscribe from previous subscription if exists
    const currentUnsubscribe = get().unsubscribe;
    if (currentUnsubscribe) {
      currentUnsubscribe();
    }

    const unsubscribe = FirebaseService.subscribeToUserNotifications(
      userId,
      (notifications) => {
        set({ notifications: notifications as Notification[] });
      }
    );

    set({ unsubscribe });
    return unsubscribe;
  },
}));
