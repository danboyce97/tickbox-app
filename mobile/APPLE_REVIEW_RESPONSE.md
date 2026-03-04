# Response to Apple App Review - Tracking Permission Issue

## Issue Summary
Apple flagged our app for having `NSUserTrackingUsageDescription` in the Info.plist but not showing the App Tracking Transparency (ATT) prompt to users.

## Resolution
We have **removed** the `NSUserTrackingUsageDescription` from our app's Info.plist because **we do not track users**.

## What We Changed
- **Removed**: `NSUserTrackingUsageDescription` from app.json (which generates Info.plist)
- **File**: `/ios/TickBox/Info.plist` will be regenerated without tracking permission
- **Build**: Creating new build #64 with this fix

## Why We Don't Need This Permission

Our app **does not**:
1. ❌ Access the device's Advertising Identifier (IDFA)
2. ❌ Track users across apps or websites owned by other companies
3. ❌ Share user data with data brokers
4. ❌ Use advertising SDKs (Facebook Ads, Google Ads, etc.)
5. ❌ Collect data for advertising or marketing purposes

## What Data We DO Collect

Our app **only** collects data necessary for core functionality:
1. ✅ User account information (email, username, profile photo)
2. ✅ User-uploaded photos and memories
3. ✅ Friend connections between users
4. ✅ In-app activity (likes, tags, notifications)

**All data is:**
- Stored in our Firebase backend
- Used solely for app functionality
- Never shared with third parties for advertising
- Never used to track users across other apps/websites

## Suggested Response to Apple

---

**Subject: Response to Rejection - Tracking Permission**

Dear App Review Team,

Thank you for your feedback regarding the App Tracking Transparency permission.

We have investigated this issue and have **removed the NSUserTrackingUsageDescription** from our app's Info.plist in the new build we are submitting.

**Why we removed it:**
- Our app does not track users across apps or websites
- We do not access the device's Advertising Identifier (IDFA)
- We do not use any advertising or analytics SDKs that require tracking permission
- All data we collect is strictly necessary for app functionality (user accounts, photos, social features)

**Data we collect:**
- User account information (email, username)
- User-uploaded photos and event memories
- Friend connections and in-app social interactions
- All data is stored in our Firebase backend for app functionality only

We mistakenly included the tracking permission description in a previous build but have now removed it as it is not applicable to our app.

Please review our updated build #64 which no longer includes NSUserTrackingUsageDescription in the Info.plist.

Thank you for your time and consideration.

Best regards,
[Your Name]
TickBox Team

---

## Next Steps

1. ✅ **DONE**: Removed `NSUserTrackingUsageDescription` from app.json
2. ⏳ **TODO**: Create new iOS build with `eas build --platform ios`
3. ⏳ **TODO**: Submit new build to App Store Connect
4. ⏳ **TODO**: Respond to Apple's rejection with the message above
5. ⏳ **TODO**: Mark build as ready for review

## Technical Details

**Before:**
```json
"NSUserTrackingUsageDescription": "We use tracking to provide you with personalized offers and improve your experience."
```

**After:**
```json
// Removed - not present in Info.plist anymore
```

**Files Modified:**
- `/home/user/workspace/app.json` - Removed tracking permission line
- `/home/user/workspace/package.json` - Removed expo-tracking-transparency package
- `/home/user/workspace/src/screens/OnboardingScreen.tsx` - Removed tracking code

## Verification

You can verify the permission is removed by:
1. Building the app with EAS
2. Checking the generated Info.plist doesn't contain NSUserTrackingUsageDescription
3. The ATT prompt will not appear (which is correct for our use case)

## Additional Documentation

See `APP_TRACKING_TRANSPARENCY_EXPLANATION.md` for detailed technical explanation of why the prompt wasn't appearing and why removal is the correct solution.
