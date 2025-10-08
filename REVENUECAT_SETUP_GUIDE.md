# RevenueCat Setup Guide for TickBox

## Current Issue
The error message indicates that the package with ID `$rc_monthly` is not found in your RevenueCat dashboard. This means RevenueCat needs to be properly configured.

## What You Need to Do

### Step 1: Create Product in App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to your app → **In-App Purchases**
3. Click **+** to create a new In-App Purchase
4. Choose **Auto-Renewable Subscription**
5. Set the following:
   - **Product ID**: `1022A` (MUST match exactly - this is already configured in the app)
   - **Reference Name**: "TickBox Premium Monthly"
   - **Duration**: 1 month
   - **Price**: £1.99 (or your preferred price)
6. Save and submit for review

### Step 2: Configure RevenueCat Dashboard
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Navigate to your project
3. Go to **Products** → **iOS**
4. Click **+ New** to add a product
5. Enter **Product ID**: `1022A` (same as App Store Connect)
6. Click **Save**

### Step 3: Create Entitlement
1. In RevenueCat Dashboard, go to **Entitlements**
2. Click **+ New Entitlement**
3. Set:
   - **Identifier**: `TickBox Premium Monthly` (MUST match exactly)
   - **Name**: "TickBox Premium"
4. Attach the product `1022A` to this entitlement
5. Click **Save**

### Step 4: Create Offering with Package
1. In RevenueCat Dashboard, go to **Offerings**
2. Click **+ New Offering** or edit the **default** offering
3. Set **Offering ID**: `default`
4. Click **+ Add Package**
5. Set:
   - **Package ID**: `$rc_monthly` (MUST match exactly - this is what the app searches for)
   - **Product**: Select `1022A` from dropdown
   - **Package Type**: Monthly
6. Click **Save**

### Step 5: Verify Configuration
After setup, your RevenueCat configuration should look like this:

```
Offering: default
  └─ Package: $rc_monthly (Monthly)
      └─ Product: 1022A
          └─ Entitlement: TickBox Premium Monthly
```

## Expected Console Output (After Proper Setup)

Once properly configured, you should see these logs when the app loads:

```
🚀 SUBSCRIPTION SCREEN: Loading Package
📦 Fetching offerings from RevenueCat...
✅ Current Offering Details:
   Identifier: default
   Available Packages: 1

📦 Available Packages:
   [0] Package:
       Identifier: $rc_monthly
       Package Type: MONTHLY
       Product ID: 1022A
       Price: £1.99

✅ FOUND $rc_monthly package!
   Package Identifier: $rc_monthly
   Product ID: 1022A
   Price: £1.99
```

## Current App Configuration

The app is already configured with these values (in `/src/services/revenueCat.ts`):

- **Entitlement ID**: `TickBox Premium Monthly`
- **Offering ID**: `default`
- **Package ID**: `$rc_monthly`
- **Product ID**: `1022A`

**DO NOT CHANGE** these values in the app code. Instead, configure RevenueCat to match these values.

## Troubleshooting

### Issue: "No current offering found"
- Make sure the offering is marked as **Current** in RevenueCat dashboard
- Verify the offering ID is `default`

### Issue: "Package not found"
- Double-check the package ID is exactly `$rc_monthly` (including the `$`)
- Verify the package is attached to the default offering
- Make sure the product `1022A` exists and is attached to the package

### Issue: "Entitlement not active after purchase"
- Verify the entitlement ID is exactly `TickBox Premium Monthly`
- Check that the product `1022A` is properly linked to the entitlement
- Make sure you're testing with a sandbox test user

## Testing Before Full Setup

The app will continue to work without RevenueCat being fully configured:
- The subscription screen will show a placeholder price (£1.99)
- Purchases will be disabled with a friendly message
- All other app features will work normally
- Once RevenueCat is configured, purchases will automatically work

## API Key

Make sure your `.env` file contains:
```
EXPO_PUBLIC_REVENUECAT_API_KEY=your_actual_api_key_here
```

Get your API key from RevenueCat Dashboard → Settings → API Keys → Public App-Specific API Keys

## Need Help?

If you continue having issues:
1. Check the console logs - they provide detailed information about what's missing
2. Verify all IDs match exactly (case-sensitive)
3. Contact RevenueCat support with your app configuration
4. Ensure you're using the correct API key (iOS key for iOS app)
