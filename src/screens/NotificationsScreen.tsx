import React, { useState } from "react";
import { View, Text, Pressable, SectionList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useUserStore } from "../state/userStore";
import { useNotificationStore, Notification, NotificationType } from "../state/notificationStore";

interface NotificationGroup {
  category: string;
  title: string;
  notifications: Notification[];
  unreadCount: number;
}

export default function NotificationsScreen() {
  const user = useUserStore((state) => state.user);
  const getNotificationsByUser = useNotificationStore((state) => state.getNotificationsByUser);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const deleteNotification = useNotificationStore((state) => state.deleteNotification);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["friends", "memories", "activity", "other"]),
  );

  if (!user) return null;

  const notifications = getNotificationsByUser(user.id);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationCategoryInfo = (type: NotificationType) => {
    switch (type) {
      case "friend_request_received":
      case "friend_request_accepted":
        return { category: "friends", title: "Friends" };
      case "new_memory":
      case "tagged_in_memory":
        return { category: "memories", title: "Memories" };
      case "memory_liked":
        return { category: "activity", title: "Activity" };
      default:
        return { category: "other", title: "Other" };
    }
  };

  // Group notifications by category
  const groupedNotifications = notifications.reduce((groups: { [key: string]: NotificationGroup }, notification) => {
    const { category, title } = getNotificationCategoryInfo(notification.type);

    if (!groups[category]) {
      groups[category] = {
        category,
        title,
        notifications: [],
        unreadCount: 0,
      };
    }

    groups[category].notifications.push(notification);
    if (!notification.read) {
      groups[category].unreadCount++;
    }

    return groups;
  }, {});

  const notificationSections = Object.values(groupedNotifications).map((group) => ({
    title: group.title,
    category: group.category,
    unreadCount: group.unreadCount,
    data: expandedCategories.has(group.category) ? group.notifications : [],
  }));

  const toggleCategoryExpansion = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "friend_request_received":
        return "person-add";
      case "friend_request_accepted":
        return "person-add";
      case "new_memory":
        return "ticket";
      case "memory_liked":
        return "heart";
      case "tagged_in_memory":
        return "pricetag";
      default:
        return "notifications";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "friend_request_received":
      case "friend_request_accepted":
        return "#3B82F6";
      case "new_memory":
        return "#10B981";
      case "memory_liked":
        return "#EF4444";
      case "tagged_in_memory":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "friends":
        return "people";
      case "memories":
        return "ticket";
      case "activity":
        return "heart";
      default:
        return "notifications";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "friends":
        return "#3B82F6";
      case "memories":
        return "#10B981";
      case "activity":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const handleNotificationPress = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    // Here you would navigate based on notification type and data
  };

  const renderSectionHeader = ({ section }: any) => {
    const isExpanded = expandedCategories.has(section.category);
    const categoryColor = getCategoryColor(section.category);
    const categoryIcon = getCategoryIcon(section.category);

    return (
      <Pressable
        onPress={() => toggleCategoryExpansion(section.category)}
        className="bg-gray-50 px-4 py-3 border-b border-gray-200"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View
              className="w-8 h-8 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: `${categoryColor}20` }}
            >
              <Ionicons name={categoryIcon as any} size={16} color={categoryColor} />
            </View>
            <Text className="font-semibold text-gray-900 text-base">{section.title}</Text>
            {section.unreadCount > 0 && (
              <View className="ml-2 bg-blue-600 rounded-full px-2 py-0.5 min-w-[20px] items-center">
                <Text className="text-white text-xs font-medium">{section.unreadCount}</Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center">
            <Text className="text-gray-500 text-sm mr-2">
              {groupedNotifications[section.category]?.notifications.length || 0}
            </Text>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
          </View>
        </View>
      </Pressable>
    );
  };

  const renderNotification = ({ item: notification }: any) => (
    <Pressable
      onPress={() => handleNotificationPress(notification)}
      className={`px-4 py-3 border-b border-gray-100 ${!notification.read ? "bg-blue-50" : "bg-white"}`}
    >
      <View className="flex-row">
        <View className="mr-3">
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: `${getNotificationColor(notification.type)}20` }}
          >
            <Ionicons
              name={getNotificationIcon(notification.type) as any}
              size={20}
              color={getNotificationColor(notification.type)}
            />
          </View>
          {!notification.read && <View className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full" />}
        </View>

        <View className="flex-1">
          <Text className="font-medium text-gray-900 mb-1">{notification.title}</Text>
          <Text className="text-gray-600 text-sm mb-2">{notification.message}</Text>
          <Text className="text-xs text-gray-400">{new Date(notification.createdAt).toLocaleString()}</Text>
        </View>

        <Pressable onPress={() => deleteNotification(notification.id)} className="ml-2 p-1">
          <Ionicons name="close" size={16} color="#9CA3AF" />
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-200">
        <Text className="text-xl font-bold text-gray-900">Notifications</Text>
        <View className="flex-row items-center space-x-3">
          {unreadCount > 0 && (
            <Pressable onPress={() => markAllAsRead(user.id)} className="px-3 py-1 bg-blue-600 rounded-full">
              <Text className="text-white text-sm font-medium">Mark All Read</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => {
              const allExpanded = expandedCategories.size === Object.keys(groupedNotifications).length;
              if (allExpanded) {
                setExpandedCategories(new Set());
              } else {
                setExpandedCategories(new Set(Object.keys(groupedNotifications)));
              }
            }}
            className="px-3 py-1 bg-gray-200 rounded-full"
          >
            <Text className="text-gray-700 text-sm font-medium">
              {expandedCategories.size === Object.keys(groupedNotifications).length ? "Collapse All" : "Expand All"}
            </Text>
          </Pressable>
        </View>
      </View>

      {notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 bg-gray-200 rounded-full items-center justify-center mb-4">
            <Ionicons name="notifications-outline" size={32} color="#9CA3AF" />
          </View>
          <Text className="text-xl font-semibold text-gray-900 mb-2">No Notifications</Text>
          <Text className="text-gray-600 text-center">When you have notifications, they will appear here.</Text>
        </View>
      ) : (
        <SectionList
          sections={notificationSections}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={true}
        />
      )}
    </SafeAreaView>
  );
}
