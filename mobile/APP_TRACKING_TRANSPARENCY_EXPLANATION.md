# App Tracking Transparency (ATT) Explanation

## The Issue Apple Is Reporting

Apple's App Review is flagging your app because you have `NSUserTrackingUsageDescription` in your app.json but the ATT permission prompt is not appearing to users.

## Why The Prompt Doesn't Appear

**Critical Understanding**: The ATT prompt ONLY appears when you:
1. Access the device's Advertising Identifier (IDFA)
2. Use certain tracking APIs (like Facebook SDK, Google Analytics with IDFA, etc.)
3. Explicitly call `requestTrackingPermissionsAsync()` from expo-tracking-transparency

## Current Situation

Your app currently:
- ❌ Does NOT use any advertising SDKs
- ❌ Does NOT access IDFA
- ❌ Does NOT track users across apps or websites
- ✅ HAS the permission description in app.json
- ❌ Does NOT request the permission (no code calling the tracking API)

## Apple's Requirement

If you have `NSUserTrackingUsageDescription` in your Info.plist (which comes from app.json), Apple requires you to EITHER:

**Option A: Remove the permission description if you're not tracking**
- Remove `NSUserTrackingUsageDescription` from app.json
- Tell Apple in your rejection response that you don't do any tracking

**Option B: Implement tracking and request permission**
- Requires using `expo-tracking-transparency` package
- Requires a NEW BUILD (not an OTA update)
- Must call `requestTrackingPermissionsAsync()` somewhere in your app

## Why expo-tracking-transparency Failed

The `expo-tracking-transparency` package requires:
1. Installation via `bun add expo-tracking-transparency`
2. **A NEW NATIVE BUILD** (not just Metro bundler restart)
3. The package creates native iOS modules that need to be compiled

In the Vibecode development environment, you're running a pre-built native app, so the native module isn't available, causing the error: "Cannot find native module 'ExpoTrackingTransparency'"

## Recommended Solution

**OPTION 1: Remove Tracking Permission (RECOMMENDED)**

Since your app doesn't actually do any tracking, the cleanest solution is:

1. Remove `NSUserTrackingUsageDescription` from app.json
2. In your App Store Connect rejection response, explain:
   - "We do not track users across apps or websites"
   - "We do not access the device's Advertising Identifier (IDFA)"
   - "We have removed the NSUserTrackingUsageDescription from our Info.plist"
   - "Our app only collects data necessary for app functionality (user accounts, uploaded photos)"

**OPTION 2: Implement Tracking Permission**

If you genuinely want to track users (for ads, analytics, etc.):

1. Keep `NSUserTrackingUsageDescription` in app.json
2. Create a new TestFlight build with:
   ```bash
   eas build --platform ios --profile preview
   ```
3. Test the build in TestFlight (not in Vibecode)
4. The tracking prompt will appear on first launch or during onboarding

However, this requires:
- Actually implementing tracking functionality
- Using the collected data for ads/analytics
- Complying with Apple's ATT policies

## What Happened With Your Test

When you "submitted the build and created a new test account", the prompt didn't appear because:
1. The `expo-tracking-transparency` package wasn't properly compiled into the native build
2. OR you tested in Vibecode (which uses a pre-built app without the tracking module)
3. OR the build was created before the tracking code was added

## Next Steps

**Immediate Action:**
1. Remove `NSUserTrackingUsageDescription` from app.json (line 27)
2. Create a new build
3. Respond to Apple's rejection explaining you don't do tracking

**If you actually want tracking:**
1. Keep `NSUserTrackingUsageDescription` in app.json
2. Add tracking implementation code
3. Create a NEW build via EAS
4. Test in TestFlight (NOT in Vibecode development)
5. Verify the prompt appears on first launch

## Files to Check

- `/home/user/workspace/app.json` - Line 27: NSUserTrackingUsageDescription
- `/home/user/workspace/src/screens/OnboardingScreen.tsx` - Tracking code was added but removed
- `/home/user/workspace/package.json` - expo-tracking-transparency was added then removed

## Summary

**The permission prompt will NEVER appear in your current setup** because:
1. Your app doesn't use tracking APIs
2. You removed the tracking code (correctly, since it was causing errors)
3. The description alone doesn't trigger the prompt

**Apple wants you to either:**
- Remove the description if you're not tracking (RECOMMENDED)
- OR implement actual tracking and request permission properly
