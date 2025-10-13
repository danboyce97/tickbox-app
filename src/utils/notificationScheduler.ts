/**
 * Notification Scheduler
 *
 * In a real app, this would integrate with:
 * - Expo Notifications for local notifications
 * - Push notification service for server-side scheduling
 * - Background tasks for notification processing
 *
 * For this demo, we simulate the scheduling logic.
 */

export interface NotificationSchedule {
  id: string;
  type: "onThisDay" | "oneWeekToGo" | "eventTag" | "friendRequest" | "memoryLiked";
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
  scheduleOnThisDayNotification(memoryId: string, userId: string, eventTitle: string, eventDate: Date) {
    const nextYear = new Date(eventDate);
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const scheduleId = `onthisday_${memoryId}_${nextYear.getFullYear()}`;

    const schedule: NotificationSchedule = {
      id: scheduleId,
      type: "onThisDay",
      userId,
      memoryId,
      scheduledDate: nextYear.toISOString(),
      title: "On This Day",
      message: `Remember when you went to ${eventTitle}? Check out your memory!`,
      data: {
        memoryId,
        eventDate: eventDate.toISOString(),
        type: "onThisDay",
      },
    };

    this.schedules.push(schedule);
    console.log(`📅 Scheduled On This Day notification for ${eventTitle} on ${nextYear.toDateString()}`);
  }

  /**
   * Schedule "One Week To Go" notification for future events
   * Triggers 7 days before the event
   */
  scheduleOneWeekToGoNotification(memoryId: string, userId: string, eventTitle: string, eventDate: Date) {
    const oneWeekBefore = new Date(eventDate);
    oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);

    // Only schedule if the notification date is in the future
    if (oneWeekBefore <= new Date()) return;

    const scheduleId = `oneweektogo_${memoryId}`;

    const schedule: NotificationSchedule = {
      id: scheduleId,
      type: "oneWeekToGo",
      userId,
      memoryId,
      scheduledDate: oneWeekBefore.toISOString(),
      title: "One Week To Go!",
      message: `${eventTitle} is coming up in a week. Are you excited?`,
      data: {
        memoryId,
        eventDate: eventDate.toISOString(),
        type: "oneWeekToGo",
      },
    };

    this.schedules.push(schedule);
    console.log(`⏰ Scheduled One Week To Go notification for ${eventTitle} on ${oneWeekBefore.toDateString()}`);
  }

  /**
   * Schedule notification when tagged in a memory
   */
  scheduleEventTagNotification(memoryId: string, taggedUserId: string, taggerUserId: string, eventTitle: string) {
    const scheduleId = `eventtag_${memoryId}_${taggedUserId}`;

    const schedule: NotificationSchedule = {
      id: scheduleId,
      type: "eventTag",
      userId: taggedUserId,
      memoryId,
      friendId: taggerUserId,
      scheduledDate: new Date().toISOString(), // Immediate
      title: "You've been tagged!",
      message: `You've been tagged in a memory for ${eventTitle}`,
      data: {
        memoryId,
        taggerUserId,
        type: "eventTag",
      },
    };

    this.schedules.push(schedule);
    console.log(`🏷️ Scheduled event tag notification for memory: ${eventTitle}`);
  }

  /**
   * Schedule notifications for all tagged friends in a memory
   */
  scheduleNotificationsForMemory(
    memoryId: string,
    userId: string,
    eventTitle: string,
    eventDate: Date,
    taggedFriends: string[],
  ) {
    // Schedule On This Day notification for the memory owner
    this.scheduleOnThisDayNotification(memoryId, userId, eventTitle, eventDate);

    // Schedule One Week To Go notification if it's a future event
    if (eventDate > new Date()) {
      this.scheduleOneWeekToGoNotification(memoryId, userId, eventTitle, eventDate);
    }

    // Schedule event tag notifications for all tagged friends
    taggedFriends.forEach((friendId) => {
      this.scheduleEventTagNotification(memoryId, friendId, userId, eventTitle);
    });
  }

  /**
   * Get all scheduled notifications for a user
   */
  getScheduledNotifications(userId: string): NotificationSchedule[] {
    return this.schedules.filter((schedule) => schedule.userId === userId);
  }

  /**
   * Cancel a scheduled notification
   */
  cancelNotification(scheduleId: string) {
    this.schedules = this.schedules.filter((schedule) => schedule.id !== scheduleId);
    console.log(`❌ Cancelled notification: ${scheduleId}`);
  }

  /**
   * Process due notifications (would be called by a background task)
   */
  processDueNotifications(): NotificationSchedule[] {
    const now = new Date();
    const dueNotifications = this.schedules.filter((schedule) => new Date(schedule.scheduledDate) <= now);

    // Remove processed notifications from queue
    this.schedules = this.schedules.filter((schedule) => new Date(schedule.scheduledDate) > now);

    dueNotifications.forEach((notification) => {
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
      data: notification.data,
    });
  }

  /**
   * Clear all notifications for a user (e.g., when they log out)
   */
  clearUserNotifications(userId: string) {
    const beforeCount = this.schedules.length;
    this.schedules = this.schedules.filter((schedule) => schedule.userId !== userId);
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
  taggedFriends: string[] = [],
) => {
  notificationScheduler.scheduleNotificationsForMemory(memoryId, userId, eventTitle, eventDate, taggedFriends);
};
