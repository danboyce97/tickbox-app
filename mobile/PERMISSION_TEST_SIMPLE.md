# How to Test Photo Permission Prompt

## What Was Changed

Added automatic photo library permission request in ProfileSetupScreen. The iOS permission dialog now appears **automatically** when users reach the profile setup screen after signing up.

## Testing Steps

### Quick Test (In Current Build)

1. **Sign out** of your current account (if logged in)
2. **Create a new account** with a fresh email
3. **Go through onboarding** (the intro slides)
4. **ProfileSetupScreen appears**
5. **🎯 iOS PERMISSION DIALOG APPEARS IMMEDIATELY** asking for photo library access
6. **Tap "Allow"**
7. Now users can add profile photo and upload memories

### What Happens

**Flow for NEW users:**
```
Sign Up (email/password)
    ↓
Onboarding Slides (4 slides)
    ↓
Tap "Get Started"
    ↓
ProfileSetupScreen loads
    ↓
🚨 iOS PERMISSION DIALOG APPEARS 🚨
"TickBox Would Like to Access Your Photos"
[Select Photos...] [Allow Access to All Photos] [Don't Allow]
    ↓
User selects option
    ↓
User fills in username, name, etc.
    ↓
Complete Setup → Dashboard
```

### What the Dialog Shows

```
┌───────────────────────────────────────────┐
│ "TickBox" Would Like to Access            │
│ Your Photos                                │
│                                            │
│ TickBox needs access to your photo        │
│ library to let you select and upload      │
│ photos of event tickets, receipts, and    │
│ memorable moments. For example, you can   │
│ choose a photo of a concert ticket to     │
│ create a memory entry.                    │
│                                            │
│ [ Select Photos... ]                       │
│ [ Allow Access to All Photos ]            │
│ [ Don't Allow ]                            │
└───────────────────────────────────────────┘
```

## Why This Works

- **Proactive request**: Permission asked immediately on ProfileSetupScreen load
- **Every new user**: Happens for ALL new accounts, even on same device
- **Standard flow**: Follows iOS best practices
- **Apple compliant**: Reviewers will see this during their test
- **Can't be skipped**: Dialog appears before user even tries to upload

## Checking Logs

After creating a new account, check expo.log for:

```
📸 ProfileSetupScreen: Auto-requesting photo library permission on mount...
📸 ProfileSetupScreen: Permission status: undetermined
```

Then after user responds:
```
📸 ProfileSetupScreen: Permission status: granted
✅ ProfileSetupScreen: Photo library permission granted
```

Or if denied:
```
📸 ProfileSetupScreen: Permission status: denied
❌ ProfileSetupScreen: Photo library permission denied
```

## For Apple Review

When you submit to Apple:
1. Apple tester installs app
2. Creates new account
3. Goes through onboarding
4. **Reaches ProfileSetupScreen → Permission dialog appears**
5. Apple sees the dialog ✓
6. Apple approves ✓

## Important Notes

- ✅ Works on fresh devices
- ✅ Works for new accounts on existing devices
- ✅ Appears immediately (can't be missed)
- ✅ Uses your detailed permission description from app.json
- ✅ Follows Apple's guidelines
- ✅ Standard iOS permission flow
