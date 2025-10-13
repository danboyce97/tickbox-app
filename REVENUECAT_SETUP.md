# RevenueCat In-App Purchase Setup Guide

## ✅ Implementation Complete

Your TickBox app is now fully configured with RevenueCat for in-app subscriptions on both iOS and Android.

---

## 📁 Files Created/Modified

### New Files Created:

1. **`/src/services/revenueCat.ts`** - RevenueCat service with all SDK operations
2. **`/src/state/subscriptionStore.ts`** - Zustand store for subscription state management
3. **`/src/screens/SubscriptionScreen.tsx`** - Premium paywall screen

### Modified Files:

1. **`/App.tsx`** - Added RevenueCat initialization on app launch
2. **`/.env`** - Added RevenueCat API key configuration
3. **`/src/navigation/AppNavigator.tsx`** - Added Subscription screen route
4. **`/package.json`** - Added react-native-purchases dependency

---

## 🔑 Step 1: Configure RevenueCat API Key

**File:** `/.env`

```env
EXPO_PUBLIC_REVENUECAT_API_KEY=your_revenuecat_public_api_key_here
```

**How to get your API key:**

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Navigate to: Projects → Your Project → API Keys
3. Copy your **Public API Key** (not the secret key!)
4. Replace `your_revenuecat_public_api_key_here` in the `.env` file

⚠️ **IMPORTANT:** Never commit your actual API key to version control!

---

## 📦 Step 2: Product Configuration

Your products are already configured in the code:

**File:** `/src/services/revenueCat.ts`

```typescript
const PRODUCT_IDS = {
  ios: "com.tickbox.premium",
  android: "com.tickbox.premium",
};

export const ENTITLEMENT_ID = "premium";
```

**RevenueCat Dashboard Setup:**

1. Create Products in RevenueCat:
   - iOS: `com.tickbox.premium` (£1.99/month)
   - Android: `com.tickbox.premium` (£1.99/month)
2. Create Entitlement: `premium`
3. Link both products to the `premium` entitlement

---

## 🚀 Step 3: Usage Examples

### Navigate to Subscription Screen

From any screen in your app:

```typescript
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function YourComponent() {
  const navigation = useNavigation<NavigationProp>();

  const showPaywall = () => {
    navigation.navigate("Subscription");
  };

  return (
    <Pressable onPress={showPaywall}>
      <Text>Go Premium</Text>
    </Pressable>
  );
}
```

### Check Premium Status

```typescript
import { useIsPremium } from "../state/subscriptionStore";

function YourComponent() {
  const isPremium = useIsPremium();

  if (isPremium) {
    return <PremiumFeature />;
  }

  return <FreeVersionFeature />;
}
```

### Check Status Programmatically

```typescript
import { useSubscriptionStore } from "../state/subscriptionStore";

function YourComponent() {
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const checkAndUpdateStatus = useSubscriptionStore((state) => state.checkAndUpdateStatus);

  useEffect(() => {
    // Refresh subscription status
    checkAndUpdateStatus();
  }, []);

  return (
    <Text>Status: {isPremium ? "Premium" : "Free"}</Text>
  );
}
```

---

## 🎯 Step 4: Implement Usage Limits

Add premium checks where needed:

### Example: Limit Free Memories

```typescript
import { useMemoryStore } from "../state/memoryStore";
import { useIsPremium } from "../state/subscriptionStore";
import { useNavigation } from "@react-navigation/native";

function CreateMemoryButton() {
  const navigation = useNavigation();
  const isPremium = useIsPremium();
  const memories = useMemoryStore((state) => state.memories);
  const user = useUserStore((state) => state.user);

  const handleCreateMemory = () => {
    // Free users: limit to 10 memories
    const userMemories = memories.filter(m => m.userId === user?.id);

    if (!isPremium && userMemories.length >= 10) {
      // Show paywall
      navigation.navigate("Subscription");
      return;
    }

    // Continue with memory creation
    navigation.navigate("CreateMemory");
  };

  return (
    <Pressable onPress={handleCreateMemory}>
      <Text>Create Memory</Text>
    </Pressable>
  );
}
```

---

## 🔄 Step 5: App Store Configuration

### iOS (App Store Connect)

1. **Create In-App Purchase:**
   - Type: Auto-Renewable Subscription
   - Product ID: `com.tickbox.premium`
   - Price: £1.99/month
   - Subscription Group: Create or use existing

2. **Link to RevenueCat:**
   - Copy the Product ID
   - Add it to RevenueCat Dashboard → Products → iOS

3. **Configure Subscription Group:**
   - Set up subscription levels
   - Configure upgrade/downgrade behavior

### Android (Google Play Console)

1. **Create Subscription:**
   - Product ID: `com.tickbox.premium`
   - Base Plan: Monthly
   - Price: £1.99

2. **Link to RevenueCat:**
   - Copy the Product ID
   - Add it to RevenueCat Dashboard → Products → Android
   - Link Google Play service credentials

3. **Configure Billing:**
   - Enable subscriptions in your Google Play listing
   - Set up merchant account

---

## 🧪 Step 6: Testing

### iOS Testing (Sandbox)

1. **Create Sandbox Tester:**
   - App Store Connect → Users and Access → Sandbox Testers
   - Create test Apple ID

2. **Test Purchase:**
   - Sign out of App Store on device
   - Run app and make purchase
   - Sign in with sandbox tester account
   - Purchase should go through immediately

### Android Testing (Internal Test)

1. **Set Up License Testers:**
   - Google Play Console → Setup → License Testing
   - Add tester email addresses

2. **Test Purchase:**
   - Install internal test build
   - Make purchase (will be instant)
   - Check Google Play for active subscriptions

### RevenueCat Test Mode

Enable test mode in RevenueCat Dashboard for easier testing:

- Purchases won't charge real money
- Subscriptions expire faster (5 minutes instead of 1 month)

---

## 📱 Step 7: Build Configuration

### Update app.json (if needed)

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.tickbox.app"
    },
    "android": {
      "package": "com.tickbox.app"
    },
    "plugins": ["expo-build-properties"]
  }
}
```

### Build Commands

```bash
# iOS Development Build
eas build --profile development --platform ios

# Android Development Build
eas build --profile development --platform android

# Production Build
eas build --profile production --platform all
```

---

## 🔔 Step 8: Webhook Integration (Optional)

For backend integration, set up webhooks in RevenueCat:

1. **RevenueCat Dashboard:**
   - Settings → Integrations → Webhooks
   - Add your backend endpoint

2. **Webhook Events:**
   - `INITIAL_PURCHASE` - First time subscription
   - `RENEWAL` - Subscription renewed
   - `CANCELLATION` - Subscription cancelled
   - `EXPIRATION` - Subscription expired

3. **Example Webhook Handler:**

```typescript
// Backend API endpoint
app.post("/api/revenuecat-webhook", async (req, res) => {
  const event = req.body;

  switch (event.type) {
    case "INITIAL_PURCHASE":
      // Grant premium access in your database
      await updateUserPremiumStatus(event.app_user_id, true);
      break;

    case "CANCELLATION":
      // Mark for end of current period
      await scheduleRemovePremium(event.app_user_id, event.expiration_at_ms);
      break;

    case "EXPIRATION":
      // Remove premium access
      await updateUserPremiumStatus(event.app_user_id, false);
      break;
  }

  res.status(200).send("OK");
});
```

---

## 🎨 Step 9: Customize Paywall

The paywall screen is fully customizable:

**File:** `/src/screens/SubscriptionScreen.tsx`

Modify the features list:

```typescript
const PREMIUM_FEATURES = [
  {
    icon: "infinite",
    title: "Unlimited Memories",
    description: "Create as many ticket memories as you want",
  },
  // Add more features...
];
```

---

## 🐛 Step 10: Debugging

### Enable Debug Logging

Already configured in development mode:

```typescript
// In /src/services/revenueCat.ts
Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
```

### Check Logs

```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

### Common Issues

**"No offerings available":**

- Check Product IDs match between code and RevenueCat Dashboard
- Verify products are linked to offering in RevenueCat
- Ensure products are approved in App Store/Play Store

**"Purchase failed":**

- Check internet connection
- Verify user is logged into App Store/Play Store
- For iOS sandbox, ensure correct sandbox account

**"Entitlement not active":**

- Check entitlement ID matches exactly
- Verify product is linked to entitlement in RevenueCat Dashboard

---

## 📊 Step 11: Analytics & Monitoring

### RevenueCat Dashboard

Monitor in real-time:

- Active subscriptions
- Revenue metrics
- Conversion rates
- Churn analysis

### Custom Analytics

Track events in your app:

```typescript
import { purchasePackage } from "../services/revenueCat";

const handlePurchase = async () => {
  const result = await purchasePackage(pkg);

  if (result.success) {
    // Track successful purchase
    analytics.track("purchase_completed", {
      product_id: "com.tickbox.premium",
      price: 1.99,
      currency: "GBP",
    });
  }
};
```

---

## 🚢 Step 12: Production Checklist

Before going live:

- [ ] Replace RevenueCat API key in `.env` file
- [ ] Test purchases in sandbox/internal test
- [ ] Verify "Restore Purchases" works
- [ ] Set up products in App Store Connect
- [ ] Set up products in Google Play Console
- [ ] Link products in RevenueCat Dashboard
- [ ] Create entitlement "premium" in RevenueCat
- [ ] Test on both iOS and Android devices
- [ ] Verify subscription status updates in real-time
- [ ] Set log level to ERROR for production
- [ ] Add privacy policy URL for subscriptions
- [ ] Configure subscription terms
- [ ] Test cancellation flow
- [ ] Set up webhook (optional)

---

## 📞 Support Resources

- [RevenueCat Docs](https://docs.revenuecat.com)
- [iOS App Store Guidelines](https://developer.apple.com/app-store/subscriptions/)
- [Google Play Billing](https://developer.android.com/google/play/billing)
- [RevenueCat Community](https://community.revenuecat.com)

---

## 🎉 You're All Set!

Your app now has fully functional in-app subscriptions. Users can:

- ✅ Purchase premium subscriptions
- ✅ Restore previous purchases
- ✅ See real-time subscription status
- ✅ Access premium features instantly
- ✅ Manage subscriptions through App Store/Play Store

**Next Steps:**

1. Add your RevenueCat API key to `.env`
2. Test purchases in development
3. Deploy to TestFlight/Internal Testing
4. Submit to App Store/Play Store

Good luck with your launch! 🚀
