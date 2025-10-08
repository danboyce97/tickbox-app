import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type NotificationType = 
  | "friend_request_received"
  | "friend_request_accepted"
  | "new_memory"
  | "memory_liked"
  | "tagged_in_memory";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any; // Additional data for the notification
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id" | "createdAt">) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: (userId: string) => void;
  getUnreadCount: (userId: string) => number;
  getNotificationsByUser: (userId: string) => Notification[];
  deleteNotification: (notificationId: string) => void;
  clearAllNotifications: (userId: string) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      addNotification: (notificationData) => {
        const newNotification: Notification = {
          ...notificationData,
          id: `notif-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
        }));
      },
      markAsRead: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.id === notificationId
              ? { ...notification, read: true }
              : notification
          ),
        }));
      },
      markAllAsRead: (userId) => {
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.userId === userId
              ? { ...notification, read: true }
              : notification
          ),
        }));
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
      deleteNotification: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.filter(
            (notification) => notification.id !== notificationId
          ),
        }));
      },
      clearAllNotifications: (userId) => {
        set((state) => ({
          notifications: state.notifications.filter(
            (notification) => notification.userId !== userId
          ),
        }));
      },
    }),
    {
      name: "notification-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);