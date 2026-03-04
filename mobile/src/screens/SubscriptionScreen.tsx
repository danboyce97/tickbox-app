/**
 * Subscription/Paywall Screen
 * 
 * Shows when user hits free usage limit
 * Allows user to purchase premium subscription
 */

import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../contexts/ThemeContext";
import GradientBackground from "../components/GradientBackground";
import { RootStackParamList } from "../navigation/AppNavigator";
import { 
  getMonthlyPackage, 
  purchasePackage, 
  restorePurchases,
  formatPrice 
} from "../services/revenueCat";

// Check if we're in development mode
const isDevelopmentMode = () => {
  return __DEV__ || process.env.NODE_ENV === 'development';
};
import { useSubscriptionStore } from "../state/subscriptionStore";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PREMIUM_FEATURES = [
  {
    icon: "infinite",
    title: "Unlimited Memories",
    description: "Create as many ticket memories as you want"
  },
  {
    icon: "images",
    title: "Access to New Templates",
    description: "Exclusive ticket designs and layouts"
  },
];

export default function SubscriptionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const checkAndUpdateStatus = useSubscriptionStore((state) => state.checkAndUpdateStatus);
  
  const [packageInfo, setPackageInfo] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    loadPackage();
  }, []);

  const loadPackage = async () => {
    try {
      setIsLoading(true);
      const pkg = await getMonthlyPackage();
      
      if (pkg) {
        console.log('✅ Package loaded successfully');
        setPackageInfo(pkg);
      } else {
        // Fallback for when RevenueCat isn't available (development/testing)
        setPackageInfo({
          identifier: '$rc_monthly',
          packageType: 'MONTHLY',
          product: {
            identifier: '1022B',
            priceString: '£1.99'
          }
        });
      }
    } catch (error) {
      console.warn("⚠️ Error in loadPackage:", error);
      // Set fallback package for testing
      setPackageInfo({
        identifier: '$rc_monthly',
        packageType: 'MONTHLY',
        product: {
          identifier: '1022B',
          priceString: '£1.99'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    // Check if package is available
    if (!packageInfo) {
      Alert.alert(
        "Subscription Unavailable",
        "We're having trouble loading subscription options. Please make sure you have an internet connection and try again.",
        [
          {
            text: "Retry",
            onPress: () => loadPackage(),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
      return;
    }

    try {
      setIsPurchasing(true);
      const result = await purchasePackage(packageInfo);
      
      if (result.success) {
        // Update local state
        await checkAndUpdateStatus();
        
        Alert.alert(
          "🎉 Welcome to Premium!",
          "Your subscription is now active. Enjoy unlimited access!",
          [
            {
              text: "Get Started",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // Only show error if not cancelled by user
        if (result.error !== "Purchase cancelled") {
          // Check if this is a development mode issue
          if (result.error?.includes('development mode')) {
            Alert.alert(
              "Development Mode", 
              "Premium features are not available in development mode. Build the app with EAS Build to test purchases."
            );
          } else if (result.error?.includes('not available') || result.error?.includes('not initialized')) {
            Alert.alert(
              "Setup In Progress", 
              "RevenueCat subscriptions are being configured. Purchases will be available soon. For now, you can continue using the app."
            );
          } else {
            Alert.alert(
              "Purchase Failed", 
              result.error || "Something went wrong. Please try again or contact support."
            );
          }
        }
      }
    } catch (error: any) {
      console.warn("⚠️ Purchase error:", error);
      Alert.alert(
        "Setup In Progress", 
        "Subscriptions are being configured and will be available soon. You can continue using the app in the meantime."
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsRestoring(true);
      const result = await restorePurchases();
      
      if (result.success) {
        // Update local state
        await checkAndUpdateStatus();
        
        Alert.alert(
          "✅ Purchases Restored",
          "Your premium subscription has been restored!",
          [
            {
              text: "Continue",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // Check if this is a development mode issue
        if (result.error?.includes('development mode')) {
          Alert.alert(
            "Development Mode", 
            "Premium features are not available in development mode. Build the app with EAS Build to test purchases."
          );
        } else {
          Alert.alert(
            "No Purchases Found",
            result.error || "We couldn't find any previous purchases. If you believe this is an error, please contact support."
          );
        }
      }
    } catch (error: any) {
      console.warn("Restore error:", error);
      Alert.alert(
        "Error", 
        error.message || "Could not restore purchases. Please check your internet connection and try again."
      );
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between">
          <Pressable onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color={colors.textSecondary} />
          </Pressable>
          <Text style={{ color: colors.text }} className="text-xl font-bold">
            Go Premium
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Development Mode Banner */}
        {isDevelopmentMode() && (
          <View 
            style={{ backgroundColor: colors.warning + "20", borderColor: colors.warning + "40" }} 
            className="mx-6 mb-4 p-3 rounded-lg border"
          >
            <View className="flex-row items-center">
              <Ionicons name="information-circle" size={20} color={colors.warning} />
              <Text style={{ color: colors.warning }} className="ml-2 text-sm font-medium">
                Development Mode
              </Text>
            </View>
            <Text style={{ color: colors.textSecondary }} className="text-xs mt-1">
              Premium features are not available in development mode. Build with EAS Build to test purchases.
            </Text>
          </View>
        )}

        {/* Hero Section */}
        <View className="px-6 py-8 items-center">
          <View 
            style={{ backgroundColor: colors.primary + "20" }} 
            className="w-24 h-24 rounded-full items-center justify-center mb-6"
          >
            <Ionicons name="ticket" size={48} color={colors.primary} />
          </View>
          
          <Text style={{ color: colors.text }} className="text-3xl font-bold text-center mb-3">
            Unlock Premium
          </Text>
          
          <Text style={{ color: colors.textSecondary }} className="text-center text-lg mb-2">
            Get unlimited access to all features
          </Text>
          
          {isLoading ? (
            <View className="mt-4">
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : packageInfo ? (
            <View className="flex-row items-baseline mt-2">
              <Text style={{ color: colors.primary }} className="text-4xl font-bold">
                {formatPrice(packageInfo)}
              </Text>
            </View>
          ) : (
            <Pressable onPress={loadPackage} className="mt-4">
              <Text style={{ color: colors.primary }} className="font-semibold">
                Tap to Retry
              </Text>
            </Pressable>
          )}
        </View>

        {/* Features List */}
        <View className="px-6 mb-8">
          <Text style={{ color: colors.text }} className="text-xl font-semibold mb-4">
            Premium Features
          </Text>
          
          {PREMIUM_FEATURES.map((feature, index) => (
            <View 
              key={index}
              className="flex-row items-start mb-4"
            >
              <View 
                style={{ backgroundColor: colors.primary + "20" }} 
                className="w-12 h-12 rounded-full items-center justify-center mr-4"
              >
                <Ionicons 
                  name={feature.icon as any} 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="text-lg font-semibold mb-1">
                  {feature.title}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Purchase Button */}
        <View className="px-6 pb-6">
          <GradientBackground style={{ borderRadius: 12, marginBottom: 12 }}>
            <Pressable
              onPress={handlePurchase}
              disabled={isLoading || isPurchasing || !packageInfo || isDevelopmentMode()}
              style={{ 
                paddingVertical: 18, 
                alignItems: "center",
                opacity: (isLoading || isPurchasing || !packageInfo || isDevelopmentMode()) ? 0.6 : 1
              }}
            >
              {isPurchasing ? (
                <ActivityIndicator color="white" />
              ) : isLoading ? (
                <Text className="text-white text-center font-bold text-lg">
                  Loading...
                </Text>
              ) : !packageInfo ? (
                <Text className="text-white text-center font-bold text-lg">
                  Retry Loading
                </Text>
              ) : isDevelopmentMode() ? (
                <Text className="text-white text-center font-bold text-lg">
                  Not Available in Dev Mode
                </Text>
              ) : (
                <Text className="text-white text-center font-bold text-lg">
                  Start Premium
                </Text>
              )}
            </Pressable>
          </GradientBackground>

          {/* Restore Button */}
          <Pressable
            onPress={handleRestore}
            disabled={isRestoring || isDevelopmentMode()}
            style={{
              paddingVertical: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              marginBottom: 12,
              opacity: (isRestoring || isDevelopmentMode()) ? 0.6 : 1,
            }}
          >
            {isRestoring ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={{ color: colors.primary }} className="font-semibold">
                Restore Purchases
              </Text>
            )}
          </Pressable>

          {/* Terms */}
          <Text style={{ color: colors.textMuted }} className="text-xs text-center">
            Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}