# Apple Sign In with Firebase Setup Guide

This guide will help you configure Apple Sign In to work with Firebase Authentication in your TickBox app.

## ✅ What's Already Done (Code Implementation)

The code integration is **100% complete**:

- ✅ `expo-apple-authentication` package installed
- ✅ App.json configured with `usesAppleSignIn: true` and `expo-apple-authentication` plugin
- ✅ Firebase Apple Auth integration added to `src/services/firebase.ts`
- ✅ SignInScreen updated to use Firebase Apple Auth
- ✅ SignUpScreen updated to use Firebase Apple Auth
- ✅ Proper TypeScript types and error handling
- ✅ User data syncing with Firestore

## 🔧 Required Setup Steps (You Must Do These)

### Step 1: Apple Developer Account Configuration

1. **Go to** [Apple Developer Portal](https://developer.apple.com/account)

2. **Enable Sign in with Apple for your App ID:**
   - Navigate to **Certificates, Identifiers & Profiles** → **Identifiers**
   - Find your app identifier: `com.vibecode.tickboxmemories.e8fhf5`
   - Click on it to edit
   - Scroll down and **check** "Sign in with Apple"
   - Click **Save**

3. **Create a Services ID** (for web authentication, required by Firebase):
   - Go to **Identifiers** → Click the **+** button
   - Select **Services IDs** → Click **Continue**
   - Fill in:
     - **Description**: TickBox Web Auth (or any name you want)
     - **Identifier**: `com.vibecode.tickboxmemories.e8fhf5.web` (must be unique)
   - Click **Continue** then **Register**

4. **Configure the Services ID:**
   - Click on the Services ID you just created
   - **Check** "Sign in with Apple"
   - Click **Configure** next to "Sign in with Apple"
   - In the popup:
     - **Primary App ID**: Select `com.vibecode.tickboxmemories.e8fhf5`
     - **Domains and Subdomains**: Add your Firebase project domain (see Step 2)
     - **Return URLs**: Add your Firebase callback URL (see Step 2)
   - Click **Save** then **Continue** then **Done**

5. **Create a Key for Apple Sign In** (required for server-side verification):
   - Go to **Keys** → Click the **+** button
   - **Key Name**: TickBox Apple Sign In Key
   - **Check** "Sign in with Apple"
   - Click **Configure** → Select your Primary App ID
   - Click **Save** → Click **Continue** → Click **Register**
   - **Download the .p8 key file** (you can only download this ONCE - save it securely!)
   - Note down the **Key ID** shown on the screen

### Step 2: Firebase Console Configuration

1. **Go to** [Firebase Console](https://console.firebase.google.com)

2. **Select your TickBox project**

3. **Enable Apple Sign In:**
   - Go to **Authentication** → **Sign-in method** tab
   - Click on **Apple** in the providers list
   - Toggle **Enable** to ON

4. **Add OAuth Redirect Domain:**
   - Copy the OAuth redirect URI shown in Firebase (looks like: `projectname.firebaseapp.com/__/auth/handler`)
   - You'll need this for Apple Developer configuration

5. **Configure Apple Provider Settings:**
   - **Services ID**: Enter the Services ID you created in Apple Developer Portal
     - Example: `com.vibecode.tickboxmemories.e8fhf5.web`
   - **Apple Team ID**: Find this in Apple Developer Portal under Membership
   - **Key ID**: Enter the Key ID from the .p8 key you created
   - **Private Key**: Open the .p8 file you downloaded and paste the entire contents
   - Click **Save**

6. **Update domains in Apple Developer:**
   - Go back to Apple Developer Portal → Your Services ID
   - Add Firebase auth domain to **Domains and Subdomains**: `<your-project-id>.firebaseapp.com`
   - Add to **Return URLs**: `https://<your-project-id>.firebaseapp.com/__/auth/handler`
   - Click **Save**

### Step 3: Build Configuration

1. **EAS Build:**
   - The app.json is already configured with:
     ```json
     "ios": {
       "usesAppleSignIn": true,
       "bundleIdentifier": "com.vibecode.tickboxmemories.e8fhf5"
     }
     ```
   - When you run `eas build`, EAS will automatically handle the Apple Sign In capability

2. **Test the Build:**
   - Apple Sign In only works on **physical iOS devices** and **production builds**
   - It will NOT work in Expo Go or iOS Simulator
   - To test:
     ```bash
     eas build --platform ios --profile development
     ```
   - Install the build on a physical iOS device

### Step 4: Verify Setup

After completing all steps, test Apple Sign In:

1. **On a physical iOS device** with your development build installed:
   - Open the app
   - Navigate to Sign In screen
   - Tap "Sign in with Apple"
   - Complete the Apple Sign In flow
   - Check the logs in `expo.log` for success messages

2. **Verify in Firebase:**
   - Go to Firebase Console → Authentication → Users
   - You should see your Apple user listed
   - Provider should show "apple.com"

3. **Verify in Firestore:**
   - Go to Firebase Console → Firestore Database
   - Check the "users" collection
   - Your Apple user document should exist with all fields

## 🔍 Troubleshooting

### "Apple Sign In is not available"
- **Cause**: Running in Expo Go or Simulator
- **Solution**: Build with EAS and test on physical device

### "Invalid Client"
- **Cause**: Services ID or OAuth redirect URL mismatch
- **Solution**: Double-check Services ID in Firebase matches Apple Developer Portal

### "Invalid Grant"
- **Cause**: Private key or Key ID is incorrect
- **Solution**: Re-create the key in Apple Developer Portal and update Firebase

### "Missing Identity Token"
- **Cause**: Apple Developer configuration incomplete
- **Solution**: Ensure App ID has "Sign in with Apple" enabled

### Firebase Auth Error
- **Cause**: Firebase not properly configured
- **Solution**: Verify Apple provider is enabled in Firebase Console

## 📝 Important Notes

1. **Apple Sign In Requirements:**
   - Must be tested on a physical iOS device (not simulator)
   - Won't work in Expo Go - requires custom build
   - User's Apple ID must have 2FA enabled

2. **Data Privacy:**
   - Users can choose to hide their email from your app
   - Firebase will create a relay email like: `privaterelay@appleid.com`
   - Your code handles this gracefully with fallback emails

3. **User Experience:**
   - First-time sign in: Apple prompts for name and email
   - Subsequent sign ins: Silent authentication (no popup)
   - Name is only available on first sign in

4. **Security:**
   - Never commit your .p8 private key to version control
   - Store it securely - you cannot re-download it
   - If lost, you must create a new key

## 🎯 What Happens When User Signs In

1. User taps "Sign in with Apple"
2. Native Apple authentication dialog appears
3. User authenticates with Face ID/Touch ID
4. App receives identity token from Apple
5. Identity token is sent to Firebase
6. Firebase validates token with Apple servers
7. Firebase creates/signs in user
8. App creates/retrieves user document in Firestore
9. User is logged in and redirected to app

## 🔗 Helpful Links

- [Apple Developer Portal](https://developer.apple.com/account)
- [Firebase Console](https://console.firebase.google.com)
- [Apple Sign In Docs](https://developer.apple.com/sign-in-with-apple/)
- [Firebase Apple Auth Docs](https://firebase.google.com/docs/auth/ios/apple)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)

## ✅ Checklist

Use this to track your setup progress:

- [ ] Enable "Sign in with Apple" for App ID in Apple Developer
- [ ] Create Services ID in Apple Developer
- [ ] Configure Services ID with Firebase domains
- [ ] Create and download .p8 key
- [ ] Note Key ID and Team ID
- [ ] Enable Apple provider in Firebase Console
- [ ] Add Services ID to Firebase
- [ ] Add Team ID to Firebase
- [ ] Add Key ID to Firebase
- [ ] Paste private key contents to Firebase
- [ ] Save Firebase configuration
- [ ] Update Apple Services ID with Firebase callback URL
- [ ] Build app with EAS (`eas build --platform ios`)
- [ ] Test on physical iOS device
- [ ] Verify user appears in Firebase Auth
- [ ] Verify user document in Firestore

---

**Need help?** Check the Vibecode support docs or contact support.
