# Apple Sign In Setup Guide for TickBox

## Current Issue

Apple Sign In is failing because it requires specific configuration in your Apple Developer account and app build settings.

## Why It's Failing

The error "Apple sign in failed. Please try again." indicates one of these issues:

1. **Missing capability in Xcode** - Sign in with Apple capability not enabled
2. **Missing configuration in Apple Developer Portal** - App ID not configured for Sign in with Apple
3. **Missing entitlements** - App doesn't have the proper entitlements file
4. **Testing environment** - TestFlight builds require proper setup

## Setup Steps

### Step 1: Configure Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → Select your App ID (Bundle ID)
4. Scroll down and enable **Sign in with Apple** capability
5. Click **Edit** next to Sign in with Apple
6. Configure as **Enable as primary App ID**
7. Click **Save**

### Step 2: Update App Configuration in Xcode

Since you're using Expo/EAS, you need to create a config plugin or use EAS build configuration:

#### Option A: Using `app.json` (Recommended for Expo)

Add this to your `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "your.bundle.identifier",
      "supportsTablet": true,
      "usesAppleSignIn": true,
      "entitlements": {
        "com.apple.developer.applesignin": ["Default"]
      }
    },
    "plugins": ["expo-apple-authentication"]
  }
}
```

#### Option B: Manual Configuration (if you have native code access)

In Xcode:

1. Open your project in Xcode
2. Select your target → **Signing & Capabilities**
3. Click **+ Capability**
4. Add **Sign in with Apple**
5. Rebuild your app

### Step 3: Verify Package Installation

Make sure `expo-apple-authentication` is properly installed:

```bash
npx expo install expo-apple-authentication
```

### Step 4: Test on Physical Device

**IMPORTANT**: Apple Sign In only works:

- ✅ On physical iOS devices (iPhone/iPad)
- ✅ With a valid provisioning profile
- ✅ When the device is signed into an Apple ID
- ❌ NOT in Expo Go
- ❌ NOT in iOS Simulator (mostly - behavior is unreliable)

### Step 5: TestFlight Testing

For TestFlight builds:

1. Build must include the Sign in with Apple entitlement
2. App ID must have Sign in with Apple enabled
3. Testers must be signed into iCloud on their device
4. First-time users will see Apple's permission prompt

## What the Code Now Does

I've updated the app to handle these scenarios:

### Enhanced Error Handling

- ✅ Checks if Apple Sign In is available before attempting
- ✅ Shows specific error messages for different failure types
- ✅ Logs detailed error information to console for debugging
- ✅ Gracefully handles user cancellation
- ✅ Provides fallback to email sign in

### Better User Experience

- ✅ Clear error message: "Apple Sign In is not properly configured"
- ✅ Suggests using email sign in as alternative
- ✅ Doesn't crash or show confusing errors

## Debugging

### Check Console Logs

When Apple Sign In is attempted, you'll now see:

```
🍎 Starting Apple Sign In...
```

If it fails, you'll see one of:

```
❌ Apple Sign In error:
   Error code: ERR_INVALID_OPERATION
   Error message: [specific error]
```

Common error codes:

- `ERR_INVALID_OPERATION` - Capability not configured
- `ERR_NOT_AVAILABLE` - Not available on this device
- `ERR_REQUEST_CANCELED` - User cancelled (not an error)

### Manual Test

You can check if Apple Sign In is available by running this in your app:

```javascript
const isAvailable = await AppleAuthentication.isAvailableAsync();
console.log("Apple Sign In available:", isAvailable);
```

## Quick Fix for Testing

While you set up Apple Sign In properly, users can:

1. **Use Email Sign Up/Sign In** - Fully functional
2. **Wait for Apple Sign In setup** - Will work once configured

## Production Checklist

Before releasing to App Store:

- [ ] Sign in with Apple enabled in Apple Developer Portal
- [ ] `usesAppleSignIn: true` in app.json
- [ ] Entitlements properly configured
- [ ] Tested on physical device
- [ ] Tested in TestFlight
- [ ] Privacy Policy updated (Apple requires this for Sign in with Apple)

## Why Email Sign In Works But Apple Doesn't

Email sign in is a local implementation using Zustand storage, so it works immediately. Apple Sign In requires:

- Native SDK integration
- Apple Developer account configuration
- Device with Apple ID signed in
- Proper app entitlements

This is why Apple Sign In needs additional setup.

## Alternative: Remove Apple Sign In Button

If you don't want to set up Apple Sign In immediately, you can hide the button:

In `SignInScreen.tsx` and `SignUpScreen.tsx`, comment out the Apple button section:

```typescript
{
  /* Temporarily disabled
{Platform.OS === "ios" && (
  <AppleAuthentication.AppleAuthenticationButton
    ...
  />
)}
*/
}
```

## Support Resources

- [Expo Apple Authentication Docs](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Apple Sign In Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)
- [Apple Developer Documentation](https://developer.apple.com/documentation/sign_in_with_apple)

## Summary

**Current State:**

- ✅ Error handling improved
- ✅ Users get clear guidance
- ✅ App doesn't crash
- ✅ Email sign in works perfectly
- ⚠️ Apple Sign In needs configuration

**Next Steps:**

1. Follow Step 1-2 above to configure Apple Developer Portal and app.json
2. Rebuild with EAS Build
3. Test in TestFlight
4. Apple Sign In will work automatically once configured
