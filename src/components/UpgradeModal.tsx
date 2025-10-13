import React, { useEffect, useState } from "react";
import { View, Text, Modal, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PurchasesService } from "../api/purchases-services"

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ visible, onClose }: UpgradeModalProps) {
  const [offering, setOffering] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const updatePremiumStatus = useuserStore((state: { updatePremiumStatus: any }) => state.updatePremiumStatus);

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
      Alert.alert("Error", "Failed to load subscription options");
    }
  };

  const handlePurchase = async () => {
    if (!offering?.availablePackages[0]) return;

    setLoading(true);
    try {
      await PurchasesService.purchasePackage(offering.availablePackages[0]);
      await updatePremiumStatus();
      Alert.alert("Success!", "Welcome to TickBox Premium!");
      onClose();
    } catch (error: any) {
      if (error.userCancelled) {
        // User cancelled, no alert needed
      } else {
        Alert.alert("Purchase Failed", error.message || "Something went wrong");
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
      Alert.alert("Restored", "Your purchases have been restored!");
      onClose();
    } catch (error) {
      Alert.alert("Restore Failed", "No purchases found to restore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
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
            <Text className="text-2xl font-bold text-center mb-2">Go Premium!</Text>
            <Text className="text-gray-600 text-center">Create unlimited memories and unlock premium features</Text>
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
              <Text className="text-center text-blue-700 text-sm">Cancel anytime</Text>
            </View>
          )}

          {/* Purchase Button */}
          <Pressable
            onPress={handlePurchase}
            disabled={loading || !offering}
            className={`py-4 rounded-xl mb-4 ${loading ? "bg-gray-400" : "bg-blue-600"}`}
          >
            <Text className="text-white font-semibold text-center text-lg">
              {loading ? "Processing..." : "Start Premium"}
            </Text>
          </Pressable>

          {/* Restore Button */}
          <Pressable onPress={handleRestore} disabled={loading} className="py-2">
            <Text className="text-blue-600 font-medium text-center">Restore Purchases</Text>
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
function useuserStore(arg0: (state: { updatePremiumStatus: any; }) => any) {
  throw new Error("Function not implemented.");
}

