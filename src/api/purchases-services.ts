import Purchases, { CustomerInfo, PurchasesOffering } from "react-native-purchases";
import { Platform } from "react-native";

const REVENUE_CAT_API_KEY = "appl_bhecBvkIgbcJVceikPBgvNiyXVd";

export class PurchasesService {
  static async initialize(userId: string) {
    try {
      if (Platform.OS === "ios") {
        await Purchases.configure({ apiKey: REVENUE_CAT_API_KEY });
      } else {
        await Purchases.configure({ apiKey: REVENUE_CAT_API_KEY });
      }

      // Identify user
      await Purchases.logIn(userId);
      console.log("RevenueCat initialized successfully");
    } catch (error) {
      console.error("RevenueCat initialization failed:", error);
    }
  }

  static async getCustomerInfo(): Promise<CustomerInfo> {
    return await Purchases.getCustomerInfo();
  }

  static async getOfferings(): Promise<PurchasesOffering | null> {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
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
      return customerInfo.entitlements.active["premium"] !== undefined;
    } catch (error) {
      return false;
    }
  }

  static async logOut() {
    await Purchases.logOut();
  }
}
