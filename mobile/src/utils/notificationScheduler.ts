/**
 * Notification Scheduler
 *
 * Integrates with Expo Notifications for scheduled push notifications
 */

import * as Notifications from 'expo-notifications';
import { useUserStore } from '../state/userStore';
import { useMemoryStore } from '../state/memoryStore';

export interface NotificationSchedule {
  id: string;
  type: "onThisDay" | "oneWeekToGo" | "eventTag" | "friendRequest" | "memoryLiked" | "throwback";
  userId: string;
  memoryId?: string;
  friendId?: string;
  scheduledDate: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

class NotificationScheduler {
  private schedules: NotificationSchedule[] = [];

  /**
   * Schedule "On This Day" notification for a memory
   * Triggers annually on the memory's date
   */
  async scheduleOnThisDayNotification(memoryId: string, userId: string, eventTitle: string, eventDate: Date) {
    const user = useUserStore.getState().registeredUsers.find(u => u.id === userId);
    if (!user?.notificationSettings?.pushEnabled || !user?.notificationSettings?.onThisDay) return;

    const nextYear = new Date(eventDate);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    
    // Only schedule if in the future
    if (nextYear <= new Date()) return;

    const scheduleId = `onthisday_${memoryId}_${nextYear.getFullYear()}`;
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "On This Day 📅",
          body: `Remember when you went to ${eventTitle}? Check out your memory!`,
          data: {
            memoryId,
            eventDate: eventDate.toISOString(),
            type: "on_this_day",
            screen: "MemoryDetail"
          },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: nextYear,
        },
        identifier: scheduleId,
      });

      console.log(`📅 Scheduled On This Day notification for ${eventTitle} on ${nextYear.toDateString()}`);
    } catch (error) {
      console.log('Failed to schedule On This Day notification:', error);
    }
  }

  /**
   * Schedule "One Week To Go" notification for future events
   * Triggers 7 days before the event
   */
  async scheduleOneWeekToGoNotification(memoryId: string, userId: string, eventTitle: string, eventDate: Date) {
    const user = useUserStore.getState().registeredUsers.find(u => u.id === userId);
    if (!user?.notificationSettings?.pushEnabled || !user?.notificationSettings?.oneWeekToGo) return;

    const oneWeekBefore = new Date(eventDate);
    oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);
    
    // Only schedule if the notification date is in the future
    if (oneWeekBefore <= new Date()) return;
    
    const scheduleId = `oneweektogo_${memoryId}`;
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "One Week To Go! ⏰",
          body: `${eventTitle} is coming up in a week. Are you excited?`,
          data: {
            memoryId,
            eventDate: eventDate.toISOString(),
            type: "one_week_to_go",
            screen: "MemoryDetail"
          },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: oneWeekBefore,
        },
        identifier: scheduleId,
      });

      console.log(`⏰ Scheduled One Week To Go notification for ${eventTitle} on ${oneWeekBefore.toDateString()}`);
    } catch (error) {
      console.log('Failed to schedule One Week To Go notification:', error);
    }
  }

  /**
   * Schedule Join Anniversary notification (yearly reminder of joining TickBox)
   */
  async scheduleJoinAnniversaryNotification(userId: string, joinDate: Date) {
    const user = useUserStore.getState().registeredUsers.find(u => u.id === userId);
    if (!user?.notificationSettings?.pushEnabled || !user?.notificationSettings?.joinAnniversary) return;

    const nextAnniversary = new Date(joinDate);
    nextAnniversary.setFullYear(new Date().getFullYear() + 1);
    
    // If already past this year's anniversary, schedule for next year
    if (nextAnniversary <= new Date()) {
      nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
    }

    const scheduleId = `joinanniversary_${userId}_${nextAnniversary.getFullYear()}`;
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Happy TickBox Anniversary! 🎉",
          body: "It's been another year of amazing memories. Thanks for being part of our community!",
          data: {
            userId,
            joinDate: joinDate.toISOString(),
            type: "join_anniversary",
            screen: "Dashboard"
          },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: nextAnniversary,
        },
        identifier: scheduleId,
      });

      console.log(`🎉 Scheduled Join Anniversary notification for ${nextAnniversary.toDateString()}`);
    } catch (error) {
      console.log('Failed to schedule Join Anniversary notification:', error);
    }
  }

  /**
   * Schedule Weekly Reminder notification (every Sunday at 6 PM)
   */
  async scheduleWeeklyReminder(userId: string) {
    const user = useUserStore.getState().registeredUsers.find(u => u.id === userId);
    if (!user?.notificationSettings?.pushEnabled || !user?.notificationSettings?.weeklyReminder) return;

    const scheduleId = `weeklyreminder_${userId}`;

    try {
      // Schedule for every Sunday at 6 PM
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Weekly Memory Check-in 📸",
          body: "Don't forget to upload your tickets from this week's events!",
          data: {
            userId,
            type: "weekly_reminder",
            screen: "CreateMemory"
          },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 1, // Sunday
          hour: 18, // 6 PM
          minute: 0,
        },
        identifier: scheduleId,
      });

      console.log(`📅 Scheduled Weekly Reminder for every Sunday at 6 PM`);
    } catch (error) {
      console.log('Failed to schedule Weekly Reminder notification:', error);
    }
  }

  /**
   * Get memories from today's date in previous years (On This Day memories)
   */
  getOnThisDayMemories(userId: string) {
    const memories = useMemoryStore.getState().memories;
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    return memories.filter((memory) => {
      if (memory.userId !== userId) return false;
      const memoryDate = new Date(memory.date);
      return (
        memoryDate.getMonth() === todayMonth &&
        memoryDate.getDate() === todayDay &&
        memoryDate.getFullYear() < today.getFullYear()
      );
    });
  }

  /**
   * Send Throwback notification immediately if user has memories from this day
   * Only sends if there are actual "On This Day" memories to show
   */
  async sendThrowbackNotificationIfMemoriesExist(userId: string) {
    const user = useUserStore.getState().registeredUsers.find(u => u.id === userId);
    if (!user?.notificationSettings?.pushEnabled || !user?.notificationSettings?.onThisDay) return;

    // Check if user has memories from today's date in previous years
    const onThisDayMemories = this.getOnThisDayMemories(userId);

    if (onThisDayMemories.length === 0) {
      console.log(`📅 No On This Day memories for user ${userId}, skipping throwback notification`);
      return;
    }

    // Pick a random memory to feature
    const randomMemory = onThisDayMemories[Math.floor(Math.random() * onThisDayMemories.length)];
    const memoryYear = new Date(randomMemory.date).getFullYear();
    const yearsAgo = new Date().getFullYear() - memoryYear;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Throwback Thursday 📅",
          body: `${yearsAgo} year${yearsAgo > 1 ? 's' : ''} ago: ${randomMemory.title}. Tap to see your memory!`,
          data: {
            userId,
            memoryId: randomMemory.id,
            type: "throwback",
            screen: "Dashboard"
          },
          sound: true,
        },
        trigger: null, // Send immediately
      });

      console.log(`📅 Sent Throwback notification for memory: ${randomMemory.title}`);
    } catch (error) {
      console.log('Failed to send Throwback notification:', error);
    }
  }

  /**
   * Schedule daily check for Throwback Thursday (every Thursday at 12 PM)
   * The actual notification is only sent if user has memories from that day
   */
  async scheduleThrowbackNotification(userId: string) {
    const user = useUserStore.getState().registeredUsers.find(u => u.id === userId);
    if (!user?.notificationSettings?.pushEnabled || !user?.notificationSettings?.onThisDay) return;

    // Cancel any existing throwback schedule
    const scheduleId = `throwback_check_${userId}`;

    try {
      await Notifications.cancelScheduledNotificationAsync(scheduleId);
    } catch (e) {
      // Ignore if doesn't exist
    }

    // Note: For a production app, you would use a background task service
    // to check daily and send notifications only when memories exist.
    // For now, we'll check and send immediately if there are memories today.
    const today = new Date();
    if (today.getDay() === 4) { // Thursday
      await this.sendThrowbackNotificationIfMemoriesExist(userId);
    }

    console.log(`📅 Throwback Thursday check configured for user ${userId}`);
  }

  /**
   * Schedule notifications for all tagged friends in a memory
   */
  scheduleNotificationsForMemory(
    memoryId: string,
    userId: string,
    eventTitle: string,
    eventDate: Date,
    taggedFriends: string[]
  ) {
    // Schedule On This Day notification for the memory owner
    this.scheduleOnThisDayNotification(memoryId, userId, eventTitle, eventDate);
    
    // Schedule One Week To Go notification if it's a future event
    if (eventDate > new Date()) {
      this.scheduleOneWeekToGoNotification(memoryId, userId, eventTitle, eventDate);
    }
  }

  /**
   * Schedule user-specific notifications (join anniversary, weekly reminders, throwbacks)
   */
  scheduleUserNotifications(userId: string, joinDate: Date) {
    this.scheduleJoinAnniversaryNotification(userId, joinDate);
    this.scheduleWeeklyReminder(userId);
    this.scheduleThrowbackNotification(userId);
  }

  /**
   * Get all scheduled notifications for a user
   */
  getScheduledNotifications(userId: string): NotificationSchedule[] {
    return this.schedules.filter(schedule => schedule.userId === userId);
  }

  /**
   * Cancel a scheduled notification
   */
  cancelNotification(scheduleId: string) {
    this.schedules = this.schedules.filter(schedule => schedule.id !== scheduleId);
    console.log(`❌ Cancelled notification: ${scheduleId}`);
  }

  /**
   * Process due notifications (would be called by a background task)
   */
  processDueNotifications(): NotificationSchedule[] {
    const now = new Date();
    const dueNotifications = this.schedules.filter(schedule => 
      new Date(schedule.scheduledDate) <= now
    );

    // Remove processed notifications from queue
    this.schedules = this.schedules.filter(schedule =>
      new Date(schedule.scheduledDate) > now
    );

    dueNotifications.forEach(notification => {
      console.log(`🔔 Processing notification: ${notification.title} - ${notification.message}`);
      // In a real app, this would trigger the actual notification
      this.sendNotification(notification);
    });

    return dueNotifications;
  }

  /**
   * Send notification (placeholder for actual notification sending)
   */
  private sendNotification(notification: NotificationSchedule) {
    // In a real app, this would use Expo Notifications or push notification service
    console.log(`📱 Sending notification to user ${notification.userId}:`, {
      title: notification.title,
      message: notification.message,
      data: notification.data
    });
  }

  /**
   * Clear all notifications for a user (e.g., when they log out)
   */
  clearUserNotifications(userId: string) {
    const beforeCount = this.schedules.length;
    this.schedules = this.schedules.filter(schedule => schedule.userId !== userId);
    const afterCount = this.schedules.length;
    console.log(`🧹 Cleared ${beforeCount - afterCount} notifications for user ${userId}`);
  }
}

// Singleton instance
export const notificationScheduler = new NotificationScheduler();

// Helper function to schedule notifications when creating a memory
export const scheduleMemoryNotifications = (
  memoryId: string,
  userId: string,
  eventTitle: string,
  eventDate: Date,
  taggedFriends: string[] = []
) => {
  notificationScheduler.scheduleNotificationsForMemory(
    memoryId,
    userId,
    eventTitle,
    eventDate,
    taggedFriends
  );
};