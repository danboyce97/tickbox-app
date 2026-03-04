/**
 * RevenueCat Service - Build 1.0.2
 * 
 * Configuration:
 * - Entitlement ID: TickBox Premium Monthly
 * - Offering ID: default
 * - Package ID: $rc_monthly
 * - Product ID (App Store): 1022A
 * 
 * Handles all RevenueCat SDK operations including:
 * - SDK initialization
 * - Purchase handling with detailed logging
 * - Entitlement checking
 * - Subscription status management
 * - Restore purchases
 */

import { NativeModules } from 'react-native';

// Lazy import to prevent crashes if module not ready
let Purchases: any = null;
let LOG_LEVEL: any = null;
let isModuleAvailable = false;

// Check if native module exists before trying to load
const hasNativeModule = () => {
  try {
    // Check if RNPurchases native module exists
    return !!NativeModules.RNPurchases;
  } catch {
    return false;
  }
};

// Check if we're in development/Expo Go mode
const isDevelopmentMode = () => {
  return __DEV__ || process.env.NODE_ENV === 'development';
};

// Try to load the module safely - only if native module exists
if (hasNativeModule()) {
  try {
    const PurchasesModule = require('react-native-purchases');
    Purchases = PurchasesModule.default;
    LOG_LEVEL = PurchasesModule.LOG_LEVEL;
    isModuleAvailable = true;
    console.log('✅ RevenueCat module loaded successfully');
  } catch (error) {
    console.warn('⚠️ RevenueCat module could not be loaded:', error);
    isModuleAvailable = false;
  }
} else {
  // Only show warning in development mode, and make it less alarming
  if (isDevelopmentMode()) {
    console.log('ℹ️ RevenueCat not available in development mode - premium features disabled');
    console.log('   This is normal when using Expo Go or development builds');
  } else {
    console.warn('⚠️ RevenueCat native module not found - premium features will be unavailable');
  }
  isModuleAvailable = false;
}

// ============================================================================
// CONFIGURATION - Must match RevenueCat Dashboard & App Store Connect
// ============================================================================

// Entitlement ID - MUST match RevenueCat dashboard exactly
export const ENTITLEMENT_ID = 'TickBox Premium Monthly';

// Offering ID - Using default offering
export const OFFERING_ID = 'default';

// Package ID - MUST match RevenueCat dashboard
export const PACKAGE_ID = '$rc_monthly';

// Product ID - MUST match App Store Connect
export const PRODUCT_ID = '1022A';

// Only log configuration if module is available
if (isModuleAvailable) {
  console.log('📋 RevenueCat Configuration:');
  console.log('   Entitlement ID:', ENTITLEMENT_ID);
  console.log('   Offering ID:', OFFERING_ID);
  console.log('   Package ID:', PACKAGE_ID);
  console.log('   Product ID:', PRODUCT_ID);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if RevenueCat module is available
 */
const checkModuleAvailable = (): boolean => {
  if (!isModuleAvailable || !Purchases) {
    // Silently return false - no need to log every time
    return false;
  }
  return true;
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize RevenueCat SDK
 * Should be called once when app starts
 */
export const initializeRevenueCat = async (userId?: string): Promise<void> => {
  if (!checkModuleAvailable()) {
    // Only log in development mode, and make it less alarming
    if (isDevelopmentMode()) {
      console.log('ℹ️ RevenueCat not available in development mode - premium features disabled');
    }
    return;
  }

  console.log('🔧 Initializing RevenueCat SDK...');

  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  
  if (!apiKey || apiKey === 'your_revenuecat_public_api_key_here') {
    console.warn('⚠️ RevenueCat API key not configured in .env file - app will continue without premium features');
    return;
  }

  try {
    // Add extra safety check
    if (!Purchases || typeof Purchases.configure !== 'function') {
      console.warn('⚠️ RevenueCat Purchases.configure is not available - app will continue without premium features');
      return;
    }

    // Configure SDK with your public API key
    Purchases.configure({ 
      apiKey,
      appUserID: userId, // Optional: link user to RevenueCat
    });

    // Set log level to DEBUG for better visibility
    if (LOG_LEVEL) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      console.log('📝 RevenueCat log level set to DEBUG');
    }

    // Set user attributes if needed
    if (userId) {
      await Purchases.setAttributes({
        'user_id': userId,
      });
      console.log('👤 User attributes set for:', userId);
    }

    console.log('✅ RevenueCat initialized successfully');
    console.log('   API Key (last 8 chars):', apiKey.slice(-8));
  } catch (error) {
    console.warn('⚠️ RevenueCat initialization failed - app will continue without premium features:', error);
    // Don't throw - allow app to continue without premium features
  }
};

// ============================================================================
// ENTITLEMENT CHECKING
// ============================================================================

/**
 * Check if user has active premium entitlement
 */
export const checkPremiumStatus = async (): Promise<boolean> => {
  if (!checkModuleAvailable()) {
    return false;
  }

  try {
    if (!Purchases || typeof Purchases.getCustomerInfo !== 'function') {
      return false;
    }
    
    const customerInfo = await Purchases.getCustomerInfo();
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    
    console.log(`💎 Premium status: ${isPremium ? '✅ Active' : '❌ Inactive'}`);
    if (isPremium) {
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      console.log('   Product ID:', entitlement.productIdentifier);
      console.log('   Expires:', entitlement.expirationDate || 'Never');
    }
    
    return isPremium;
  } catch (error) {
    console.warn('⚠️ Error checking premium status:', error);
    return false;
  }
};

/**
 * Get full customer info including entitlements and subscription details
 */
export const getCustomerInfo = async (): Promise<any> => {
  if (!checkModuleAvailable()) {
    return null;
  }

  try {
    if (!Purchases || typeof Purchases.getCustomerInfo !== 'function') {
      return null;
    }
    
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.warn('⚠️ Error getting customer info:', error);
    return null;
  }
};

// ============================================================================
// OFFERINGS & PACKAGES
// ============================================================================

/**
 * Get available offerings (subscription packages)
 * WITH COMPREHENSIVE LOGGING FOR DEBUGGING
 */
export const getOfferings = async (): Promise<any> => {
  if (!checkModuleAvailable()) {
    // Silently return null in development mode
    return null;
  }

  console.log('📦 Fetching offerings from RevenueCat...');

  try {
    if (!Purchases || typeof Purchases.getOfferings !== 'function') {
      console.warn('⚠️ Purchases.getOfferings is not available');
      return null;
    }
    
    const offerings = await Purchases.getOfferings();
    
    console.log('📋 Offerings Response:');
    console.log('   All Offerings:', Object.keys(offerings.all || {}));
    console.log('   Current Offering:', offerings.current?.identifier || 'null');
    
    if (!offerings.current) {
      console.warn('⚠️ No current offering found');
      console.log('   Available offerings:', Object.keys(offerings.all || {}));
      
      // Try to use 'default' offering explicitly
      if (offerings.all && offerings.all['default']) {
        console.log('✅ Found "default" offering explicitly');
        return offerings.all['default'];
      }
      
      return null;
    }
    
    const currentOffering = offerings.current;
    console.log('✅ Current Offering Details:');
    console.log('   Identifier:', currentOffering.identifier);
    console.log('   Description:', currentOffering.serverDescription);
    console.log('   Available Packages:', currentOffering.availablePackages.length);
    
    // Log detailed package information
    console.log('\n📦 Available Packages:');
    currentOffering.availablePackages.forEach((pkg: any, index: number) => {
      console.log(`   [${index}] Package:`);
      console.log('       Identifier:', pkg.identifier);
      console.log('       Package Type:', pkg.packageType);
      console.log('       Product ID:', pkg.product?.identifier);
      console.log('       Price:', pkg.product?.priceString);
      console.log('       Title:', pkg.product?.title);
      console.log('       Description:', pkg.product?.description);
    });
    
    return currentOffering;
  } catch (error) {
    console.warn('⚠️ Error fetching offerings:', error);
    console.warn('   Error details:', JSON.stringify(error, null, 2));
    return null;
  }
};

/**
 * Get the monthly package ($rc_monthly) from default offering
 * WITH DETAILED LOGGING FOR DEBUGGING
 */
export const getMonthlyPackage = async (): Promise<any> => {
  if (!checkModuleAvailable()) {
    // Silently return null in development mode
    return null;
  }

  console.log('\n🔍 Searching for $rc_monthly package...');

  try {
    const offering = await getOfferings();
    
    if (!offering) {
      console.warn('⚠️ No offering available');
      return null;
    }

    if (!offering.availablePackages || !offering.availablePackages.length) {
      console.warn('⚠️ No packages available in offering');
      console.log('   Offering:', offering.identifier);
      return null;
    }

    console.log(`\n🔎 Searching through ${offering.availablePackages.length} packages...`);

    // PRIORITY 1: Find by exact package identifier: $rc_monthly
    const monthlyPackage = offering.availablePackages.find(
      (pkg: any) => pkg.identifier === PACKAGE_ID
    );

    if (monthlyPackage) {
      console.log('✅ FOUND $rc_monthly package!');
      console.log('   Package Identifier:', monthlyPackage.identifier);
      console.log('   Product ID:', monthlyPackage.product?.identifier);
      console.log('   Package Type:', monthlyPackage.packageType);
      console.log('   Price:', monthlyPackage.product?.priceString);
      return monthlyPackage;
    }

    // PRIORITY 2: Find by package type MONTHLY
    const monthlyTypePackage = offering.availablePackages.find(
      (pkg: any) => pkg.packageType === 'MONTHLY'
    );

    if (monthlyTypePackage) {
      console.log('⚠️ $rc_monthly not found, but found MONTHLY type package');
      console.log('   Package Identifier:', monthlyTypePackage.identifier);
      console.log('   Product ID:', monthlyTypePackage.product?.identifier);
      return monthlyTypePackage;
    }

    // PRIORITY 3: Find by Product ID: 1022A
    const productPackage = offering.availablePackages.find(
      (pkg: any) => pkg.product?.identifier === PRODUCT_ID
    );

    if (productPackage) {
      console.log('⚠️ $rc_monthly not found, but found product 1022A');
      console.log('   Package Identifier:', productPackage.identifier);
      return productPackage;
    }

    // No package found
    console.warn('⚠️ Package not found in default offering');
    console.warn('   Searched for:');
    console.warn('     - Package ID: $rc_monthly');
    console.warn('     - Package Type: MONTHLY');
    console.warn('     - Product ID: 1022A');
    console.warn('   Available packages:');
    offering.availablePackages.forEach((pkg: any) => {
      console.warn(`     - ${pkg.identifier} (${pkg.product?.identifier})`);
    });

    return null;
  } catch (error) {
    console.warn('⚠️ Error getting monthly package:', error);
    return null;
  }
};

// ============================================================================
// PURCHASE HANDLING
// ============================================================================

/**
 * Purchase a subscription package
 * Enhanced with comprehensive error handling and logging
 */
export const purchasePackage = async (pkg: any): Promise<{
  success: boolean;
  customerInfo?: any;
  error?: string;
}> => {
  console.log('\n🛒 Starting purchase flow...');
  
  if (!checkModuleAvailable()) {
    if (isDevelopmentMode()) {
      return { 
        success: false, 
        error: 'Premium features are not available in development mode. Build the app with EAS Build to test purchases.' 
      };
    } else {
      return { 
        success: false, 
        error: 'Subscription system not available. Please check your internet connection and try again.' 
      };
    }
  }

  // Validate package
  if (!pkg) {
    console.warn('⚠️ No package provided to purchasePackage');
    return {
      success: false,
      error: 'Invalid subscription package. Please try again or contact support.'
    };
  }

  console.log('📦 Package Details:');
  console.log('   Package ID:', pkg.identifier);
  console.log('   Product ID:', pkg.product?.identifier);
  console.log('   Price:', pkg.product?.priceString);

  try {
    // Check if Purchases.purchasePackage exists
    if (!Purchases || typeof Purchases.purchasePackage !== 'function') {
      console.warn('⚠️ Purchases.purchasePackage is not available');
      return {
        success: false,
        error: 'Subscription system not properly initialized. Please restart the app and try again.'
      };
    }

    console.log('💳 Calling Purchases.purchasePackage...');
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    
    console.log('✅ Purchase API call successful');
    console.log('📋 Customer Info:');
    console.log('   Active Entitlements:', Object.keys(customerInfo.entitlements.active));
    
    // Check if entitlement is now active
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    
    if (isPremium) {
      console.log('✅ PREMIUM ACTIVATED!');
      console.log('   Entitlement:', ENTITLEMENT_ID);
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      console.log('   Product ID:', entitlement.productIdentifier);
      console.log('   Purchased At:', entitlement.latestPurchaseDate);
      return { success: true, customerInfo };
    } else {
      console.warn('⚠️ Purchase completed but entitlement not active');
      console.warn('   Expected:', ENTITLEMENT_ID);
      console.warn('   Received:', Object.keys(customerInfo.entitlements.active));
      return { 
        success: false, 
        error: 'Purchase completed but subscription not activated. Please contact support if this persists.' 
      };
    }
  } catch (error: any) {
    console.warn('⚠️ Purchase failed');
    console.warn('   Error:', error);
    console.warn('   Error Code:', error.code);
    console.warn('   Error Message:', error.message);
    
    // Handle specific error cases
    if (error.userCancelled) {
      console.log('ℹ️ User cancelled purchase');
      return { success: false, error: 'Purchase cancelled' };
    }
    
    if (error.code === 'PURCHASE_NOT_ALLOWED') {
      return { 
        success: false, 
        error: 'Purchases are not allowed on this device. Please check your device settings.' 
      };
    }
    
    if (error.code === 'PAYMENT_PENDING') {
      return { 
        success: false, 
        error: 'Payment is pending. Your subscription will be activated once payment is confirmed.' 
      };
    }
    
    if (error.code === 'PRODUCT_ALREADY_PURCHASED') {
      return { 
        success: false, 
        error: 'You already have an active subscription. Try restoring your purchases.' 
      };
    }

    if (error.code === 'NETWORK_ERROR') {
      return { 
        success: false, 
        error: 'Network error. Please check your internet connection and try again.' 
      };
    }
    
    // Generic error with helpful message
    const errorMessage = error.message || error.toString() || 'Unknown error occurred';
    return { 
      success: false, 
      error: `Purchase failed: ${errorMessage}. Please try again or contact support.` 
    };
  }
};

// ============================================================================
// RESTORE PURCHASES
// ============================================================================

/**
 * Restore previous purchases
 * Important for users who reinstall the app or switch devices
 */
export const restorePurchases = async (): Promise<{
  success: boolean;
  customerInfo?: any;
  error?: string;
}> => {
  console.log('\n🔄 Starting restore flow...');
  
  if (!checkModuleAvailable()) {
    if (isDevelopmentMode()) {
      return { 
        success: false, 
        error: 'Premium features are not available in development mode. Build the app with EAS Build to test purchases.' 
      };
    } else {
      return { 
        success: false, 
        error: 'Subscription system not available. Please check your internet connection and try again.' 
      };
    }
  }

  try {
    // Check if Purchases.restorePurchases exists
    if (!Purchases || typeof Purchases.restorePurchases !== 'function') {
      console.warn('⚠️ Purchases.restorePurchases is not available');
      return {
        success: false,
        error: 'Restore feature not available. Please restart the app and try again.'
      };
    }
    
    console.log('🔄 Calling Purchases.restorePurchases...');
    const customerInfo = await Purchases.restorePurchases();
    
    console.log('✅ Restore API call successful');
    console.log('📋 Customer Info:');
    console.log('   Active Entitlements:', Object.keys(customerInfo.entitlements.active));
    
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    
    if (isPremium) {
      console.log('✅ PURCHASES RESTORED!');
      console.log('   Entitlement:', ENTITLEMENT_ID);
      return { success: true, customerInfo };
    } else {
      console.log('ℹ️ No active purchases to restore');
      console.log('   Available entitlements:', Object.keys(customerInfo.entitlements.active));
      return { 
        success: false, 
        error: 'No active subscription found. If you believe this is an error, please contact support.' 
      };
    }
  } catch (error: any) {
    console.warn('⚠️ Restore failed');
    console.warn('   Error:', error);
    console.warn('   Error Code:', error.code);
    console.warn('   Error Message:', error.message);
    
    // Handle specific error cases
    if (error.code === 'NETWORK_ERROR') {
      return { 
        success: false, 
        error: 'Network error. Please check your internet connection and try again.' 
      };
    }
    
    // Generic error with helpful message
    const errorMessage = error.message || error.toString() || 'Unknown error occurred';
    return { 
      success: false, 
      error: `Restore failed: ${errorMessage}. Please try again or contact support.` 
    };
  }
};

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Login user to RevenueCat
 * Call this when user logs in to your app
 */
export const loginUser = async (userId: string): Promise<void> => {
  if (!checkModuleAvailable()) {
    return;
  }

  try {
    await Purchases.logIn(userId);
    console.log(`✅ User ${userId} logged in to RevenueCat`);
  } catch (error) {
    console.warn('⚠️ Error logging in user:', error);
  }
};

/**
 * Logout user from RevenueCat
 * Call this when user logs out of your app
 */
export const logoutUser = async (): Promise<void> => {
  if (!checkModuleAvailable()) {
    return;
  }

  try {
    await Purchases.logOut();
    console.log('✅ User logged out from RevenueCat');
  } catch (error) {
    console.warn('⚠️ Error logging out user:', error);
  }
};

/**
 * Set up customer info listener
 * This will be called whenever entitlement status changes
 */
export const setupCustomerInfoListener = (
  callback: (customerInfo: any) => void
): void => {
  if (!checkModuleAvailable()) {
    return;
  }

  try {
    if (Purchases && typeof Purchases.addCustomerInfoUpdateListener === 'function') {
      Purchases.addCustomerInfoUpdateListener(callback);
      console.log('✅ Customer info listener set up');
    }
  } catch (error) {
    console.warn('⚠️ Error setting up listener:', error);
  }
};

/**
 * Remove customer info listener
 */
export const removeCustomerInfoListener = (
  callback: (customerInfo: any) => void
): void => {
  if (!checkModuleAvailable()) {
    return;
  }

  try {
    if (Purchases && typeof Purchases.removeCustomerInfoUpdateListener === 'function') {
      Purchases.removeCustomerInfoUpdateListener(callback);
      console.log('✅ Customer info listener removed');
    }
  } catch (error) {
    console.warn('⚠️ Error removing listener:', error);
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format price for display (e.g., "£1.99/month")
 */
export const formatPrice = (pkg: any): string => {
  if (!pkg || !pkg.product || !pkg.product.priceString) {
    return '£1.99/month';
  }
  // Replace $ with £ for UK market
  const priceString = pkg.product.priceString.replace('$', '£');
  return `${priceString}/month`;
};
