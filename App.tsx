import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AppNavigator from "./src/navigation/AppNavigator";
import { ThemeProvider, useTheme } from "./src/contexts/ThemeContext";
import { initializeRevenueCat, setupCustomerInfoListener } from "./src/services/revenueCat";
import { useSubscriptionStore } from "./src/state/subscriptionStore";
import { useUserStore } from "./src/state/userStore";

function ThemedApp() {
  const { isDark } = useTheme();
  const user = useUserStore((state) => state.user);
  const checkAndUpdateStatus = useSubscriptionStore((state) => state.checkAndUpdateStatus);
  const setCustomerInfo = useSubscriptionStore((state) => state.setCustomerInfo);
  
  useEffect(() => {
    // Initialize RevenueCat when user is available
    const initRevenueCat = async () => {
      if (!user?.id) return;
      
      try {
        // Add significant delay to ensure native modules are fully ready
        // Increased to 2 seconds for better reliability
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await initializeRevenueCat(user.id);
        
        // Check initial subscription status
        await checkAndUpdateStatus();
        
        // Set up listener for subscription changes
        const listener = (customerInfo: any) => {
          setCustomerInfo(customerInfo);
        };
        
        setupCustomerInfoListener(listener);
        
      } catch (error) {
        // Silently handle errors - app continues without premium features
        console.log('RevenueCat initialization skipped or failed - continuing without premium features');
      }
    };

    initRevenueCat();
  }, [user?.id]);
  
  return (
    <>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style={isDark ? "light" : "dark"} />
      </NavigationContainer>
    </>
  );
}

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project. 
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

export default function App() {
  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
