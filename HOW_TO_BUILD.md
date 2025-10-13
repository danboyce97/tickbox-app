# 🚀 EAS Build Instructions for TickBox

## ✅ Code is Ready - You Need to Build

All code changes are complete. The app is configured correctly and ready for a native build.

**Why you need to build:** StoreKit and RevenueCat native modules must be compiled into the app. The current TestFlight build doesn't have these native modules, which is why purchases fail.

## 📋 Prerequisites

### 1. Install EAS CLI (if not already installed)

```bash
npm install -g eas-cli
```

### 2. Login to EAS

```bash
eas login
# Enter your Expo account credentials
```

### 3. Verify Login

```bash
eas whoami
# Should show your username
```

## 🏗️ Building the App

### Step 1: Navigate to Project

```bash
cd /path/to/your/tickbox/project
```

### Step 2: Configure EAS (First Time Only)

```bash
eas build:configure
```

This will create `eas.json` if you don't have one.

### Step 3: Run Production Build

```bash
eas build --platform ios --profile production
```

**What happens:**

- EAS will ask for your Apple Developer credentials
- It will compile all native modules including RevenueCat
- Build takes 15-30 minutes
- You'll get a download link when complete

### Step 4: Wait for Build

Monitor progress at: https://expo.dev/accounts/[your-account]/projects/tickbox/builds

### Step 5: Download or Submit to TestFlight

#### Option A: Auto-submit to TestFlight

```bash
eas submit --platform ios --latest
```

#### Option B: Manual download and upload

1. Download IPA from EAS dashboard
2. Upload to App Store Connect using Transporter app

## 📱 After Build Completes

### Verify in TestFlight

1. **Install new build**
2. **Check logs** (if you have debugging enabled):

   ```
   ✅ RevenueCat module loaded successfully
   ✅ RevenueCat initialized successfully
   ```

3. **Test subscription flow**:
   - Open app → Go to Subscription screen
   - Should show "£1.99/month" (or your price)
   - Tap "Subscribe"
   - Apple purchase sheet should appear
   - Complete purchase with sandbox account
   - Should see "Welcome to Premium!" message

### Expected Behavior After Native Build

| Feature             | Before (Current)       | After (Native Build)  |
| ------------------- | ---------------------- | --------------------- |
| App Launch          | ✅ Works               | ✅ Works              |
| RevenueCat Module   | ❌ Not available       | ✅ Available          |
| Subscription Screen | ⚠️ Shows fallback UI   | ✅ Shows real pricing |
| Subscribe Button    | ⏸️ "Setup In Progress" | ✅ Opens Apple sheet  |
| Purchase Flow       | ❌ Fails               | ✅ Works completely   |
| Restore Purchases   | ❌ Fails               | ✅ Works completely   |

## 🐛 Troubleshooting

### Build Fails: "Bundle identifier not registered"

**Fix:** Register `com.tickbox.app` in Apple Developer Portal

### Build Fails: "Missing credentials"

**Fix:** Run `eas credentials` to configure Apple credentials

### Build Succeeds but Purchases Still Fail

**Fix:** Verify Product ID "1022A" matches exactly in:

- App Store Connect
- RevenueCat Dashboard
- Code (already correct)

### "Package not found" Error After Build

**Fix:** In RevenueCat Dashboard:

1. Go to Offerings → default
2. Verify package "$rc_monthly" exists
3. Verify it's linked to product "1022A"
4. Make sure "default" offering is marked as current

## 📊 What's Included in This Build

### Native Modules That Will Be Compiled:

- ✅ RevenueCat SDK (`react-native-purchases@9.5.1`)
- ✅ Apple StoreKit integration
- ✅ Apple Sign In (`expo-apple-authentication`)
- ✅ All Expo native modules

### Configuration:

- ✅ Bundle ID: `com.tickbox.app`
- ✅ RevenueCat API Key: `appl_bhecBvklgbcJVceikPBgvNiyXVd`
- ✅ Product ID: `1022A`
- ✅ Entitlement ID: `TickBox Premium Monthly`

## 🎯 Quick Build Command

If you just want to build and submit in one go:

```bash
# Build and auto-submit to TestFlight
eas build --platform ios --profile production --auto-submit
```

## ⏱️ Timeline

1. **Start build**: 2 minutes (setup)
2. **Building**: 15-30 minutes (EAS compiles everything)
3. **Upload to TestFlight**: 5-10 minutes (Apple processing)
4. **Ready to test**: ~30-45 minutes total

## ✅ Post-Build Verification

After the build is in TestFlight:

### 1. Install on Test Device

```
TestFlight → TickBox → Install
```

### 2. Check Console (Optional)

If debugging is enabled, you should see:

```
✅ RevenueCat module loaded successfully
📋 RevenueCat Configuration:
   Entitlement ID: TickBox Premium Monthly
   Package ID: $rc_monthly
   Product ID: 1022A
✅ RevenueCat initialized successfully
```

### 3. Test Purchase

- Sign out of real Apple ID on device
- Open TickBox → Subscription screen
- Tap "Subscribe"
- Sign in with **Sandbox test account** when prompted
- Complete purchase
- Verify "Welcome to Premium!" appears
- Check that premium features unlock

### 4. Test Restore

- Delete app
- Reinstall from TestFlight
- Open app → Subscription screen
- Tap "Restore Purchases"
- Verify premium restores without new purchase

## 🎉 Success Criteria

You'll know it's working when:

- ✅ No "module not available" warnings
- ✅ Subscription screen shows real pricing
- ✅ Tapping Subscribe opens Apple purchase sheet
- ✅ Purchase completes successfully
- ✅ Premium features unlock immediately
- ✅ Status persists across app restarts

## 📞 Need Help?

If you encounter any issues during the build:

1. **Check EAS Build Logs**:
   - Go to expo.dev builds page
   - Click on your build
   - Check logs for errors

2. **Common Issues**:
   - Missing Apple credentials → Run `eas credentials`
   - Bundle ID issues → Verify in Apple Developer Portal
   - Build timeouts → Retry the build

3. **After Build Issues**:
   - "Package not found" → Verify RevenueCat dashboard configuration
   - Purchase fails → Check Product ID matches everywhere
   - Restore fails → Make sure you completed a purchase first

---

## 🚀 Ready to Build?

Run this command now:

```bash
eas build --platform ios --profile production
```

Then come back here and let me know when the build completes! I'll help you troubleshoot if needed.

---

**Note**: I cannot run this command for you because it requires your Expo and Apple Developer account credentials. You must run it from your local machine or CI/CD pipeline.
