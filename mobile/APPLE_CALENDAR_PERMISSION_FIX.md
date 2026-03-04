# Apple App Store Issue Fix - NSCalendarsUsageDescription

## Issue from Apple (ITMS-90683)
Apple rejected the build because the app's Info.plist was missing the `NSCalendarsUsageDescription` key. This is required because the app uses APIs that access calendar data (specifically for push notification scheduling).

## What Was Fixed

### Added NSCalendarsUsageDescription to app.json
**File**: `app.json` (line 22)

Added the following privacy description to the iOS `infoPlist` section:
```json
"NSCalendarsUsageDescription": "TickBox needs access to your calendar to schedule event reminders and notify you about upcoming memories."
```

## Why This Was Needed

Your app uses the **Expo Notifications** API to schedule notifications for:
- "On This Day" reminders (annual memory anniversaries)
- "One Week To Go" notifications (for upcoming events)
- "Join Anniversary" notifications (yearly TickBox membership celebration)
- "Weekly Reminders" (every Sunday at 6 PM)

The notification scheduling code (in `/src/utils/notificationScheduler.ts`) uses date-based triggers that internally reference iOS calendar APIs, which requires this privacy declaration.

## Verification

✅ **Push Notifications Are Fully Configured:**
- Service file: `/src/services/pushNotifications.ts`
- Scheduler: `/src/utils/notificationScheduler.ts`
- All notification types implemented
- Permission handling in place

✅ **App Is Running Without Errors:**
- Metro bundler running successfully
- No runtime errors related to permissions
- All features displaying correctly

## Next Steps for App Store Submission

1. **Build a new version** with this fix:
   ```bash
   eas build --platform ios --profile production
   ```

2. **Increment the build number** if needed (currently at build 15)

3. **Upload to App Store Connect**

4. **Resubmit for review** - Apple will now accept the build with the proper calendar usage description

## All Required Privacy Descriptions (Complete)

Your app now includes all necessary privacy usage descriptions:
- ✅ NSPhotoLibraryUsageDescription
- ✅ NSPhotoLibraryAddUsageDescription
- ✅ NSCameraUsageDescription
- ✅ NSContactsUsageDescription
- ✅ NSLocationWhenInUseUsageDescription
- ✅ NSUserTrackingUsageDescription
- ✅ **NSCalendarsUsageDescription** (newly added)

## Summary

The Apple rejection issue has been resolved. The app now includes the required `NSCalendarsUsageDescription` privacy declaration for notification scheduling. No other code changes were made - this was purely a configuration update to satisfy Apple's privacy requirements.
