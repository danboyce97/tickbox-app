# EXACT TESTING INSTRUCTIONS FOR PERMISSION PROMPTS

## Why "New Account" Doesn't Work

**CRITICAL UNDERSTANDING:**
- iOS permissions are granted per **APP**, not per **USER ACCOUNT**
- When you create a new account in the same app install, iOS already has the permission stored
- The prompt will NOT appear again even with a new account

## How to Test Properly (Choose ONE method)

### Method 1: Fresh Install in Vibecode (Quick Test)
1. In Vibecode app, **tap the app settings**
2. **Tap "Clear App Data"** or "Reset App"
3. **Force close** the Vibecode app completely
4. **Reopen** Vibecode
5. **Load your app** fresh
6. Go through signup → Create NEW account
7. When you reach profile setup and tap "Choose from Library"
8. **Permission dialog SHOULD appear**

### Method 2: TestFlight on Physical Device (Real Test)
1. **Delete TickBox app completely** from your test iPhone
2. **Go to Settings** → **General** → **Transfer or Reset iPhone** → **Reset** → **Reset Location & Privacy** (this clears all permission decisions)
3. **Restart your iPhone**
4. **Install from TestFlight**
5. **Open app** and create brand new account
6. When you reach profile setup and tap "Choose from Library"
7. **Permission dialog MUST appear**

### Method 3: Use iOS Simulator (Development Test)
1. Open Xcode
2. **Reset simulator**: Device → Erase All Content and Settings
3. Run your app in the fresh simulator
4. Create new account
5. Permission prompt will appear

## What to Check in Logs

After adding the logging code, when you tap "Choose from Library", you should see:

```
📸 ProfileSetup: Requesting photo library permission...
📸 ProfileSetup: Permission result: {
  status: "undetermined",  // First time - should trigger system dialog
  granted: false,
  canAskAgain: true
}
```

**Then after user responds to iOS dialog:**
```
📸 ProfileSetup: Permission result: {
  status: "granted",  // Or "denied" if user tapped Don't Allow
  granted: true,      // Or false
  canAskAgain: false
}
```

If you see `status: "granted"` IMMEDIATELY without "undetermined" first, it means:
- Permission was already granted
- App is reusing previous permission decision
- iOS is NOT showing the dialog (this is expected behavior after first grant)

## What Apple Testers Will See

Apple testers:
1. Install your app on a **completely fresh test device**
2. Create account
3. Go through onboarding
4. Reach ProfileSetupScreen
5. Tap "Add Profile Photo" → "Choose from Library"
6. **SEE THE iOS PERMISSION DIALOG** (because device has never seen your app before)
7. Tap "Allow"
8. Photo picker opens

This is the standard iOS flow and should work correctly.

## If Permission Dialog Still Doesn't Appear in Fresh Install

Then there would be a real bug. But I need you to confirm:

**Test with Method 2 above** (delete app, reset privacy settings, reinstall from TestFlight)

Then tell me:
1. Did you see the permission dialog?
2. What did the logs show? (Check expo.log file)
3. Did the photo picker open?

## Current Status

✅ Code is correct - calls `requestMediaLibraryPermissionsAsync()`
✅ Configuration is correct - expo-image-picker plugin is set up
✅ Permission descriptions are detailed and Apple-compliant
✅ Logging is now added to debug the flow

The permission prompt **WILL** appear on a fresh install. If it's not appearing for you, you're likely testing with an app install that already has permission granted.
