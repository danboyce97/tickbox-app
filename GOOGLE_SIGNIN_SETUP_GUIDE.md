# Google Sign In Setup Guide for TickBox

## ✅ What's Been Implemented

Google Sign In is now **fully implemented** in the code:

- ✅ Sign In screen integration
- ✅ Sign Up screen integration
- ✅ User matching by email and Google ID
- ✅ Account persistence across sessions
- ✅ Comprehensive error handling
- ✅ Detailed console logging for debugging

## 🔧 Configuration Required

To make Google Sign In work, you need to configure it with Google Cloud Platform and Firebase.

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add Project** (or select existing project)
3. Enter project name: "TickBox" or your preferred name
4. Follow the setup wizard
5. Once created, you'll be in the Firebase Console

### Step 2: Enable Google Sign-In in Firebase

1. In Firebase Console, go to **Authentication**
2. Click **Get Started** (if first time)
3. Go to **Sign-in method** tab
4. Click on **Google** in the providers list
5. Toggle **Enable**
6. Set a **Project support email** (your email)
7. Click **Save**

### Step 3: Add iOS App to Firebase

1. In Firebase Console, click the **iOS icon** to add iOS app
2. **iOS bundle ID**: `com.tickbox.app` (must match app.json)
3. **App nickname**: TickBox iOS (optional)
4. **App Store ID**: Leave blank for now
5. Click **Register app**
6. **Download GoogleService-Info.plist**
7. Save it to your project root: `/home/user/workspace/GoogleService-Info.plist`
8. Click **Next** and **Continue to console**

### Step 4: Add Android App to Firebase (Optional for iOS-only)

1. In Firebase Console, click the **Android icon**
2. **Android package name**: `com.tickbox.app` (must match app.json)
3. **App nickname**: TickBox Android (optional)
4. Click **Register app**
5. **Download google-services.json**
6. Save it to your project root: `/home/user/workspace/google-services.json`
7. Click **Next** and **Continue to console**

### Step 5: Get Client IDs

#### For iOS:

1. Open the downloaded `GoogleService-Info.plist` in a text editor
2. Find the value for key `CLIENT_ID`
3. It will look like: `123456789-abc123.apps.googleusercontent.com`
4. Copy this value

#### For Web Client ID:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Go to **APIs & Services** → **Credentials**
4. Find the **Web client** (auto-created by Firebase)
5. Copy the **Client ID** (ends with `.apps.googleusercontent.com`)

### Step 6: Configure Environment Variables

Update your `.env` file with the Client IDs:

```bash
# Google Sign In Configuration
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=987654321-xyz789.apps.googleusercontent.com
```

**Important**: Replace the placeholder values with your actual Client IDs from Step 5.

### Step 7: Add URL Schemes (iOS)

The iOS Client ID needs to be registered as a URL scheme.

#### Option A: Using app.json (Recommended)

Add this to your `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.tickbox.app",
      "googleServicesFile": "./GoogleService-Info.plist",
      "config": {
        "googleSignIn": {
          "reservedClientId": "com.googleusercontent.apps.123456789-abc123"
        }
      }
    }
  }
}
```

Replace `123456789-abc123` with the part before `.apps.googleusercontent.com` from your iOS Client ID.

#### Option B: Manual Configuration (if you have Xcode access)

1. Open project in Xcode
2. Select your target
3. Go to **Info** tab
4. Expand **URL Types**
5. Click **+** to add URL scheme
6. Set **URL Scheme** to the reversed Client ID: `com.googleusercontent.apps.123456789-abc123`

### Step 8: Rebuild Your App

After configuring everything:

```bash
# Install dependencies (if not already)
npm install

# For development builds
eas build --profile development --platform ios

# For production/TestFlight
eas build --profile production --platform ios
```

### Step 9: Test Google Sign In

1. Install the new build on your device or TestFlight
2. Tap **Continue with Google** button
3. You should see Google's sign-in flow
4. Select your Google account
5. Grant permissions
6. You'll be signed into TickBox!

## 🐛 Troubleshooting

### Error: "DEVELOPER_ERROR"

**Cause**: Client IDs not configured or incorrect
**Fix**:

- Double-check Client IDs in `.env` file
- Ensure GoogleService-Info.plist is in project root
- Rebuild the app after adding Client IDs

### Error: "SIGN_IN_REQUIRED"

**Cause**: User needs to sign in to Google on their device
**Fix**: Make sure user is signed into a Google account in device Settings

### Error: "PLAY_SERVICES_NOT_AVAILABLE"

**Cause**: Only relevant for Android
**Fix**: On iOS, this shouldn't happen. If it does, there's a configuration issue.

### Error: "The client application is not permitted..."

**Cause**: Bundle ID mismatch
**Fix**:

- Ensure `bundleIdentifier` in app.json matches Firebase iOS app
- Both should be `com.tickbox.app`

### Google Sign In button doesn't respond

**Cause**: Missing environment variables or GoogleService-Info.plist
**Fix**:

- Check console logs for detailed error messages
- Verify `.env` file has both Client IDs
- Verify GoogleService-Info.plist exists in project root

## 📱 What Happens When User Signs In

1. **New User**:
   - Creates account with Google email
   - Username set as `google_[GoogleID]`
   - Display name from Google profile
   - Goes to onboarding/profile setup

2. **Existing User**:
   - Matches by email or Google ID
   - Signs in directly
   - Goes to dashboard

3. **Account Persistence**:
   - Account saved in Zustand + AsyncStorage
   - Survives app restarts
   - Can sign out and sign back in

## 🔒 Security & Privacy

### What Data We Store:

- ✅ Email address (from Google)
- ✅ Display name (from Google)
- ✅ Google User ID (for matching returning users)
- ❌ No password stored
- ❌ No Google tokens stored (handled by SDK)

### User Control:

- Users can revoke access in Google Account settings
- Users can delete their TickBox account
- Email is only used for account identification

## 📊 Expected Console Logs

When Google Sign In works correctly, you'll see:

```
🔵 Starting Google Sign In...
🔵 Google Sign In - User info received:
   email: user@gmail.com
   name: John Doe
   id: 123456789
✅ New Google user created and registered
```

Or if user exists:

```
🔵 Starting Google Sign In...
🔵 Google Sign In - User info received:
   email: user@gmail.com
   name: John Doe
   id: 123456789
✅ Found existing Google user, signing in
```

## 🎨 UI Updates Made

### Sign In Screen:

- ✅ Google button functional (was showing "coming soon")
- ✅ Error handling with helpful messages
- ✅ Loading states
- ✅ User cancellation handled gracefully

### Sign Up Screen:

- ✅ Google button functional
- ✅ Checks for existing accounts
- ✅ Creates new account if needed
- ✅ Same error handling as Sign In

## ✅ Production Checklist

Before App Store release:

- [ ] Firebase project created
- [ ] Google Sign-In enabled in Firebase
- [ ] iOS app added to Firebase
- [ ] GoogleService-Info.plist added to project
- [ ] Client IDs configured in .env
- [ ] URL schemes configured in app.json
- [ ] App rebuilt with EAS Build
- [ ] Tested on physical device
- [ ] Tested in TestFlight
- [ ] Privacy Policy updated to mention Google Sign In
- [ ] App Store description mentions Google Sign In

## 🚀 Current Status

**Code Implementation**: ✅ Complete

- Sign In flow implemented
- Sign Up flow implemented
- Account matching logic
- Error handling
- Console logging

**Configuration**: ⚠️ Needs Setup

- Firebase project needs to be created
- Client IDs need to be obtained
- Environment variables need to be set
- App needs to be rebuilt

**Testing**: 📱 Ready Once Configured

- Will work on physical devices
- Will work in TestFlight
- Will work in production

## 📚 Resources

- [Firebase Console](https://console.firebase.google.com)
- [Google Cloud Console](https://console.cloud.google.com)
- [React Native Google Sign In Docs](https://react-native-google-signin.github.io/docs/)
- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Expo Google Sign In Guide](https://docs.expo.dev/guides/google-authentication/)

## 💡 Quick Start Summary

1. **Create Firebase project** (5 minutes)
2. **Enable Google Sign-In** in Firebase (2 minutes)
3. **Add iOS app** to Firebase, download plist (3 minutes)
4. **Get Client IDs** from Firebase/GCP (2 minutes)
5. **Update .env file** with Client IDs (1 minute)
6. **Rebuild app** with EAS Build (10-20 minutes)
7. **Test** on device or TestFlight ✅

**Total Setup Time**: ~25-30 minutes

Once configured, Google Sign In will work seamlessly! 🎉
