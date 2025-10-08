/**
 * Subscription Store
 * 
 * Manages subscription state using Zustand with AsyncStorage persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  checkPremiumStatus, 
  getCustomerInfo,
  ENTITLEMENT_ID 
} from '../services/revenueCat';

export interface SubscriptionState {
  isPremium: boolean;
  isLoading: boolean;
  customerInfo: any | null;
  lastChecked: string | null;
  
  // Actions
  setPremiumStatus: (isPremium: boolean) => void;
  setCustomerInfo: (customerInfo: any | null) => void;
  setLoading: (isLoading: boolean) => void;
  checkAndUpdateStatus: () => Promise<void>;
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      isPremium: false,
      isLoading: false,
      customerInfo: null,
      lastChecked: null,

      setPremiumStatus: (isPremium) => {
        set({ isPremium, lastChecked: new Date().toISOString() });
      },

      setCustomerInfo: (customerInfo) => {
        if (customerInfo) {
          const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
          set({ 
            customerInfo, 
            isPremium, 
            lastChecked: new Date().toISOString() 
          });
        } else {
          set({ customerInfo: null, isPremium: false });
        }
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      checkAndUpdateStatus: async () => {
        try {
          set({ isLoading: true });
          
          const [isPremium, customerInfo] = await Promise.all([
            checkPremiumStatus(),
            getCustomerInfo(),
          ]);

          set({ 
            isPremium, 
            customerInfo,
            lastChecked: new Date().toISOString(),
            isLoading: false 
          });

          return;
        } catch (error) {
          console.error('Error checking subscription status:', error);
          set({ isLoading: false });
        }
      },

      reset: () => {
        set({
          isPremium: false,
          isLoading: false,
          customerInfo: null,
          lastChecked: null,
        });
      },
    }),
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these fields
      partialize: (state) => ({
        isPremium: state.isPremium,
        lastChecked: state.lastChecked,
      }),
    }
  )
);

/**
 * Hook to check if user should see premium features
 */
export const useIsPremium = () => {
  return useSubscriptionStore((state) => state.isPremium);
};

/**
 * Hook to get subscription loading state
 */
export const useSubscriptionLoading = () => {
  return useSubscriptionStore((state) => state.isLoading);
};