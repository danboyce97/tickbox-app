import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PurchasesService } from '../api/purchases-service';
import { useUserStore } from '../state/userStore';

export default function PremiumSettingsScreen() {
  const isPremium = useUserStore((state: { isPremium: any; }) => state.isPremium);
  const ticketCount = useUserStore((state: { ticketCount: any; }) => state.ticketCount);
  const updatePremiumStatus = useUserStore((state: { updatePremiumStatus: any; }) => state.updatePremiumStatus);
  
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
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}