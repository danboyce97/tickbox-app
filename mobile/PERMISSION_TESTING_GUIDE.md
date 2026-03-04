# Testing Camera/Photo Permissions - Apple Review Perspective

## What Apple Testers Will Do

1. **Install app from TestFlight** (fresh device, no previous install)
2. **Create new account** → Sign up with email/password
3. **Go through onboarding** → See intro slides, tap "Get Started"
4. **Profile Setup Screen appears** → Required fields: username, name
5. **Tap "Add Profile Photo"** button
6. **Alert appears**: "Select Photo" with options:
   - Take Photo
   - Choose from Library
   - Cancel
7. **Tap "Choose from Library"**
8. **🚨 THIS IS WHERE iOS PERMISSION DIALOG SHOULD APPEAR 🚨**

## Expected Result

```
┌─────────────────────────────────────────────┐
│  "TickBox" Would Like to Access              │
│  Your Photos                                  │
│                                               │
│  TickBox needs access to your photo library  │
│  to let you select and upload photos of      │
│  event tickets, receipts, and memorable      │
│  moments. For example, you can choose a      │
│  photo of a concert ticket to create a       │
│  memory entry.                                │
│                                               │
│  [ Select Photos... ]                         │
│  [ Allow Access to All Photos ]              │
│  [ Don't Allow ]                              │
└─────────────────────────────────────────────┘
```

## What Could Be Wrong

Let me check several possibilities:

### 1. Testing on Same Device
If you're testing on a device that already had TickBox installed:
- iOS remembers the permission decision
- Prompt won't show again (this is iOS behavior, not a bug)
- Check: Settings → TickBox → Photos

### 2. Wrong Test Account Flow
If you're signing in with an existing account:
- User already went through onboarding
- ProfileSetupScreen might be skipped
- You need to test with: **Sign Up → New Account → First Time Flow**

### 3. Vibecode Development Environment
If you're testing in Vibecode preview app (not TestFlight):
- Vibecode's wrapper app might already have permissions
- This wouldn't reflect what Apple sees in TestFlight
- You need to test in actual TestFlight build

### 4. Permission Already Granted
If device has blanket photo permission for all apps:
- Some enterprise/test devices are configured this way
- Check: Settings → Privacy & Security → Photos

## The Real Test

To verify this works the way Apple will test it:

1. **Get a completely fresh device** or reset privacy settings:
   ```
   Settings → General → Transfer or Reset iPhone →
   Reset → Reset Location & Privacy
   ```

2. **Delete TickBox completely** if installed

3. **Install from TestFlight**

4. **Create NEW account** (don't sign in to existing)
   - Email: test+$(date +%s)@example.com
   - Go through full signup flow

5. **Complete onboarding** (intro slides)

6. **On Profile Setup screen**, tap "Add Profile Photo"

7. **Tap "Choose from Library"**

8. **Permission dialog MUST appear here**

## Code Analysis

Let me verify the code path:

**ProfileSetupScreen.tsx lines 125-131:**
```typescript
const handleImagePicker = async () => {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permissionResult.granted === false) {
    Alert.alert("Permission required", "Permission to access photo library is required!");
    return;
  }
```

This code:
✅ Calls `requestMediaLibraryPermissionsAsync()`
✅ This triggers iOS system permission dialog
✅ If denied, shows alert
✅ If granted, opens photo picker

## What Apple Actually Sees

When Apple tests your app:
- They use completely fresh test devices
- No previous permissions granted
- First time they tap "Choose from Library" → System dialog appears
- This is the standard iOS flow

## Possible Issue: Permission Already Granted

**If Apple is complaining, it might be because:**

1. You submitted the build
2. Apple tester installed it
3. **Tester already granted permission during their first test**
4. Tester created second test account
5. Permission doesn't prompt again (iOS already has the permission)
6. Apple thinks prompt never appeared

**Solution:** In your response to Apple:
"The photo library permission prompt appears when users first attempt to upload a photo. Since iOS remembers permission decisions per app, the prompt only appears once per device. If testers have already granted permission in a previous test session, the prompt will not appear again unless the app is deleted and reinstalled."

## Let me verify something...
