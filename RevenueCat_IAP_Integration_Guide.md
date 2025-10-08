# RevenueCat In-App Purchases Integration Guide
## TickBox App - Premium Features Implementation

This guide provides comprehensive instructions for integrating RevenueCat in-app purchases into the TickBox app, implementing a freemium model with premium ticket creation.

---

## 🎯 Business Model Overview

**Free Tier:**
- Create up to 3 memory tickets
- Basic app functionality
- Friend connections
- View memories

**Premium Tier ($4.99/month):**
- Unlimited memory ticket creation
- Premium templates and customization
- Priority support
- Advanced features (future)

---

## 📦 1. Package Installation

### Install RevenueCat SDK
```bash
# Install the React Native Purchases SDK
bun add react-native-purchases

# For iOS (if using bare workflow)
cd ios && pod install && cd ..
```

### Update app.json (Expo)
```json
{
  "expo": {
    "plugins": [
      [
        "react-native-purchases",
        {
          "android": {
            "useAmazon": false
          }
        }
      ]
    ]
  }
}
```

---

## ⚙️ 2. RevenueCat Dashboard Setup

### Create RevenueCat Account
1. Visit [app.revenuecat.com](https://app.revenuecat.com)
2. Create account and new project: "TickBox"
3. Note your **API Key** (found in Project Settings)

### Configure Products
1. **Navigate to**: Products → + New Product
2. **Create Product**:
   - **Identifier**: `tickbox_premium_monthly`
   - **Type**: Subscription
   - **Duration**: 1 month
   - **Price**: $4.99

### Configure Entitlements
1. **Navigate to**: Entitlements → + New Entitlement
2. **Create Entitlement**:
   - **Identifier**: `premium`
   - **Attach Products**: `tickbox_premium_monthly`

### App Store Connect Setup (iOS)
1. Create In-App Purchase in App Store Connect
   - **Product ID**: `tickbox_premium_monthly`
   - **Type**: Auto-Renewable Subscription
   - **Price**: $4.99/month
2. Configure subscription group
3. Add to RevenueCat Products section

### Google Play Console Setup (Android)
1. Create subscription in Google Play Console
   - **Product ID**: `tickbox_premium_monthly`  
   - **Price**: $4.99/month
2. Link to RevenueCat Products section

---

## 🔧 3. Implementation

### Create Purchases Service
```typescript
// src/api/purchases-service.ts
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUE_CAT_API_KEY = 'your_revenuecat_api_key_here';

export class PurchasesService {
  static async initialize(userId: string) {
    try {
      if (Platform.OS === 'ios') {
        await Purchases.configure({ apiKey: REVENUE_CAT_API_KEY });
      } else {
        await Purchases.configure({ apiKey: REVENUE_CAT_API_KEY });
      }
      
      // Identify user
      await Purchases.logIn(userId);
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('RevenueCat initialization failed:', error);
    }
  }

  static async getCustomerInfo(): Promise<CustomerInfo> {
    return await Purchases.getCustomerInfo();
  }

  static async getOfferings(): Promise<PurchasesOffering[]> {
    const offerings = await Purchases.getOfferings();
    return offerings.all;
  }

  static async purchasePackage(packageToPurchase: any) {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    } catch (error) {
      throw error;
    }
  }

  static async restorePurchases(): Promise<CustomerInfo> {
    return await Purchases.restorePurchases();
  }

  static async isPremiumUser(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      return customerInfo.entitlements.active['premium'] !== undefined;
    } catch (error) {
      return false;
    }
  }

  static async logOut() {
    await Purchases.logOut();
  }
}
```

### Update User Store with Premium State
```typescript
// Add to src/state/userStore.ts
interface UserState {
  // ... existing properties
  isPremium: boolean;
  ticketCount: number;
  updatePremiumStatus: () => Promise<void>;
  incrementTicketCount: () => void;
  canCreateTicket: () => boolean;
}

// Add to store implementation
updatePremiumStatus: async () => {
  const isPremium = await PurchasesService.isPremiumUser();
  set({ isPremium });
},

incrementTicketCount: () => {
  set((state) => ({ ticketCount: state.ticketCount + 1 }));
},

canCreateTicket: () => {
  const { isPremium, ticketCount } = get();
  return isPremium || ticketCount < 3;
},
```

### Create Upgrade Modal Component
```typescript
// src/components/UpgradeModal.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PurchasesService } from '../api/purchases-service';
import { useUserStore } from '../state/userStore';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ visible, onClose }: UpgradeModalProps) {
  const [offering, setOffering] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const updatePremiumStatus = useUserStore((state) => state.updatePremiumStatus);

  useEffect(() => {
    if (visible) {
      loadOfferings();
    }
  }, [visible]);

  const loadOfferings = async () => {
    try {
      const offerings = await PurchasesService.getOfferings();
      if (offerings.length > 0) {
        setOffering(offerings[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load subscription options');
    }
  };

  const handlePurchase = async () => {
    if (!offering?.availablePackages[0]) return;
    
    setLoading(true);
    try {
      await PurchasesService.purchasePackage(offering.availablePackages[0]);
      await updatePremiumStatus();
      Alert.alert('Success!', 'Welcome to TickBox Premium!');
      onClose();
    } catch (error: any) {
      if (error.userCancelled) {
        // User cancelled, no alert needed
      } else {
        Alert.alert('Purchase Failed', error.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      await PurchasesService.restorePurchases();
      await updatePremiumStatus();
      Alert.alert('Restored', 'Your purchases have been restored!');
      onClose();
    } catch (error) {
      Alert.alert('Restore Failed', 'No purchases found to restore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row justify-between items-center p-6 border-b border-gray-200">
          <Text className="text-xl font-bold">Upgrade to Premium</Text>
          <Pressable onPress={onClose} className="p-2">
            <Ionicons name="close" size={24} color="#666" />
          </Pressable>
        </View>

        {/* Content */}
        <View className="flex-1 px-6 py-8">
          <View className="items-center mb-8">
            <View className="w-24 h-24 bg-blue-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="ticket" size={48} color="#3B82F6" />
            </View>
            <Text className="text-2xl font-bold text-center mb-2">
              Go Premium!
            </Text>
            <Text className="text-gray-600 text-center">
              Create unlimited memories and unlock premium features
            </Text>
          </View>

          {/* Features */}
          <View className="space-y-4 mb-8">
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text className="ml-3 text-gray-900">Unlimited memory tickets</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text className="ml-3 text-gray-900">Premium templates</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text className="ml-3 text-gray-900">Priority support</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text className="ml-3 text-gray-900">Advanced customization</Text>
            </View>
          </View>

          {/* Pricing */}
          {offering && (
            <View className="bg-blue-50 p-4 rounded-xl mb-6">
              <Text className="text-center text-blue-900 font-semibold text-lg">
                {offering.availablePackages[0]?.storeProduct.priceString}/month
              </Text>
              <Text className="text-center text-blue-700 text-sm">
                Cancel anytime
              </Text>
            </View>
          )}

          {/* Purchase Button */}
          <Pressable
            onPress={handlePurchase}
            disabled={loading || !offering}
            className={`py-4 rounded-xl mb-4 ${
              loading ? 'bg-gray-400' : 'bg-blue-600'
            }`}
          >
            <Text className="text-white font-semibold text-center text-lg">
              {loading ? 'Processing...' : 'Start Premium'}
            </Text>
          </Pressable>

          {/* Restore Button */}
          <Pressable
            onPress={handleRestore}
            disabled={loading}
            className="py-2"
          >
            <Text className="text-blue-600 font-medium text-center">
              Restore Purchases
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View className="p-6 border-t border-gray-200">
          <Text className="text-xs text-gray-500 text-center">
            Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
          </Text>
        </View>
      </View>
    </Modal>
  );
}
```

### Update Create Memory Screen with Premium Checks
```typescript
// Add to src/screens/CreateMemoryScreen.tsx

import { useUserStore } from '../state/userStore';
import UpgradeModal from '../components/UpgradeModal';

// Add state
const [showUpgradeModal, setShowUpgradeModal] = useState(false);

// Add premium checks
const canCreateTicket = useUserStore((state) => state.canCreateTicket);
const isPremium = useUserStore((state) => state.isPremium);
const ticketCount = useUserStore((state) => state.ticketCount);
const incrementTicketCount = useUserStore((state) => state.incrementTicketCount);

// Add check before memory creation
const handleCreateMemory = async () => {
  if (!canCreateTicket()) {
    setShowUpgradeModal(true);
    return;
  }

  // Existing memory creation logic...
  
  // After successful creation
  if (!isPremium) {
    incrementTicketCount();
  }
};

// Add to JSX before closing tag
<UpgradeModal 
  visible={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
/>
```

---

## 🔄 4. App.tsx Integration

Update your App.tsx to initialize RevenueCat:

```typescript
// Add to App.tsx
import { PurchasesService } from './src/api/purchases-service';
import { useUserStore } from './src/state/userStore';

// Add inside App component
useEffect(() => {
  const initializeServices = async () => {
    const user = useUserStore.getState().user;
    if (user) {
      await PurchasesService.initialize(user.id);
      await useUserStore.getState().updatePremiumStatus();
    }
  };

  initializeServices();
}, []);
```

---

## 🎛️ 5. Settings Integration

Add premium management to settings:

```typescript
// src/screens/PremiumSettingsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PurchasesService } from '../api/purchases-service';
import { useUserStore } from '../state/userStore';

export default function PremiumSettingsScreen() {
  const isPremium = useUserStore((state) => state.isPremium);
  const ticketCount = useUserStore((state) => state.ticketCount);
  const updatePremiumStatus = useUserStore((state) => state.updatePremiumStatus);
  
  const [customerInfo, setCustomerInfo] = useState<any>(null);

  useEffect(() => {
    loadCustomerInfo();
  }, []);

  const loadCustomerInfo = async () => {
    try {
      const info = await PurchasesService.getCustomerInfo();
      setCustomerInfo(info);
    } catch (error) {
      console.error('Failed to load customer info:', error);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'To cancel your subscription, please go to your device settings:\\n\\niOS: Settings > Apple ID > Subscriptions\\nAndroid: Google Play Store > Account > Subscriptions',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="p-6">
        <Text className="text-2xl font-bold mb-6">Premium Status</Text>
        
        {isPremium ? (
          <View className="bg-green-50 p-4 rounded-xl mb-6">
            <View className="flex-row items-center mb-2">
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text className="ml-2 font-semibold text-green-900">Premium Active</Text>
            </View>
            <Text className="text-green-700">
              You have unlimited access to all premium features!
            </Text>
          </View>
        ) : (
          <View className="bg-yellow-50 p-4 rounded-xl mb-6">
            <View className="flex-row items-center mb-2">
              <Ionicons name="ticket-outline" size={24} color="#F59E0B" />
              <Text className="ml-2 font-semibold text-yellow-900">
                Free Plan ({ticketCount}/3 tickets used)
              </Text>
            </View>
            <Text className="text-yellow-700">
              Upgrade to premium for unlimited tickets and features!
            </Text>
          </View>
        )}

        {isPremium && customerInfo && (
          <View className="space-y-4">
            <View className="bg-gray-50 p-4 rounded-xl">
              <Text className="font-medium text-gray-900 mb-2">Subscription Details</Text>
              <Text className="text-gray-600">
                Next renewal: {
                  customerInfo.entitlements.active.premium?.expirationDate 
                    ? new Date(customerInfo.entitlements.active.premium.expirationDate).toLocaleDateString()
                    : 'N/A'
                }
              </Text>
            </View>
            
            <Pressable
              onPress={handleCancelSubscription}
              className="bg-red-50 p-4 rounded-xl border border-red-200"
            >
              <Text className="text-red-600 font-medium text-center">
                Cancel Subscription
              </Text>
            </Pressable>
          </div>
        )}
      </View>
    </SafeAreaView>
  );
}
```

---

## 🔐 6. Environment Variables

Add to your `.env` file:

```env
REVENUECAT_API_KEY=your_actual_revenuecat_api_key_here
```

Update purchases-service.ts:
```typescript
const REVENUE_CAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || 'your_fallback_key';
```

---

## ✅ 7. Testing Checklist

### Sandbox Testing
- [ ] Create sandbox accounts (iOS/Android)
- [ ] Test subscription purchase flow
- [ ] Test subscription restoration
- [ ] Test premium feature access
- [ ] Test free tier limitations

### Production Testing
- [ ] Verify App Store/Play Console product IDs match
- [ ] Test with real payments (small amounts)
- [ ] Verify webhook endpoints (if using server)
- [ ] Test subscription cancellation flow

---

## 🚨 8. Common Issues & Solutions

### Issue: Purchase fails with "Product not found"
**Solution**: Verify product IDs match exactly between RevenueCat dashboard and store consoles.

### Issue: "Unable to connect to RevenueCat"
**Solution**: Check API key and network connectivity. Ensure SDK is properly initialized.

### Issue: Purchases don't restore
**Solution**: Ensure user is logged into the same Apple ID/Google account used for original purchase.

### Issue: Premium features don't unlock immediately
**Solution**: Add proper loading states and refresh customer info after purchase.

---

## 📱 9. Implementation Priority

1. **Phase 1**: Core purchase flow and premium checks
2. **Phase 2**: Upgrade modal and settings integration
3. **Phase 3**: Advanced features and analytics
4. **Phase 4**: Testing and optimization

---

## 🔗 Additional Resources

- [RevenueCat Documentation](https://docs.revenuecat.com)
- [React Native Purchases SDK](https://github.com/RevenueCat/react-native-purchases)
- [App Store Connect Guide](https://developer.apple.com/app-store-connect/)
- [Google Play Console Guide](https://play.google.com/console)

---

**⚠️ Important Notes:**
- Test thoroughly with sandbox accounts before production
- Always handle purchase errors gracefully
- Implement proper loading states for better UX
- Consider offering a free trial period
- Comply with App Store/Play Store subscription guidelines

This integration will provide a seamless premium upgrade experience while maintaining the free tier functionality that makes TickBox accessible to all users.