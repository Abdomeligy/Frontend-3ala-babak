import React, { useMemo } from 'react';

import { NavigationContainer } from '@react-navigation/native';

import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';

import { useAuth } from '../context/AuthContext';

import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import DriverNavigator from './DriverNavigator';
import VendorNavigator from './VendorNavigator';
import AdminNavigator from './AdminNavigator';

import { COLORS } from '../constants/colors';


// ============================================================
// DEEP LINKING
// ============================================================

const linking = {

  prefixes: [
    '3alababakfresh://',

    ...(Platform.OS === 'web' &&
    typeof window !== 'undefined'
      ? [window.location.origin]
      : []),
  ],

  config: {

    screens: {

      // ======================================================
      // CUSTOMER
      // ======================================================

      CustomerNavigator: {

        screens: {

          CustomerTabs: {

            screens: {

              HomeTab: 'home',

              SearchTab: 'search',

              OrdersTab: 'orders',

              WalletTab: 'wallet',

              ProfileTab: 'profile',
            },
          },

          PaymentSuccess: 'payment-success',

          VendorDetails: 'vendor/:id',

          ProductDetails: 'product/:id',

          Cart: 'cart',

          Checkout: 'checkout',

          OrderTracking: 'order-tracking',

          OrderDetails: 'order/:id',

          Favorites: 'favorites',

          Notifications: 'notifications',

          Addresses: 'addresses',

          AddAddressScreen: 'add-address',

          MapPicker: 'map-picker',

          HelpSupport: 'help-support',
        },
      },


      // ======================================================
      // DRIVER
      // ======================================================

      DriverNavigator: 'driver',


      // ======================================================
      // VENDOR
      // ======================================================

      VendorNavigator: 'vendor',


      // ======================================================
      // ADMIN
      // ======================================================

      AdminNavigator: 'admin',


      // ======================================================
      // AUTH
      // ======================================================

      AuthNavigator: 'auth',
    },
  },
};


// ============================================================
// ROLE NORMALIZER
// ============================================================
//
// مهما كان شكل Role القادم من الـ Backend:
//
// role
// Role
// userRole
// UserRole
// userType
// UserType
// type
// Type
//
// String / Object / Array
//
// نحوله لقيمة موحدة.
// ============================================================

function normalizeRole(user) {

  if (!user) {
    return '';
  }


  // ==========================================================
  // GET ROLE
  // ==========================================================

  let role =
    user.role ??
    user.Role ??
    user.userRole ??
    user.UserRole ??
    user.userType ??
    user.UserType ??
    user.type ??
    user.Type ??
    '';


  // ==========================================================
  // ROLE OBJECT
  // ==========================================================

  if (
    role &&
    typeof role === 'object' &&
    !Array.isArray(role)
  ) {

    role =
      role.name ??
      role.Name ??
      role.role ??
      role.Role ??
      role.type ??
      role.Type ??
      '';
  }


  // ==========================================================
  // ROLE ARRAY
  // ==========================================================

  if (Array.isArray(role)) {

    role = role[0] ?? '';


    if (
      role &&
      typeof role === 'object'
    ) {

      role =
        role.name ??
        role.Name ??
        role.role ??
        role.Role ??
        role.type ??
        role.Type ??
        '';
    }
  }


  // ==========================================================
  // FINAL OBJECT CHECK
  // ==========================================================

  if (
    role &&
    typeof role === 'object'
  ) {

    role =
      role.name ??
      role.Name ??
      role.role ??
      role.Role ??
      role.type ??
      role.Type ??
      '';
  }


  // ==========================================================
  // NORMALIZE
  // ==========================================================

  return String(role)

    .toLowerCase()

    .trim()

    .replace(/[_-]+/g, ' ')

    .replace(/\s+/g, ' ');
}


// ============================================================
// ROLE CHECKERS
// ============================================================

const isCustomerRole = (role) => {

  return [
    'customer',
    'user',
    'client',
  ].includes(role);
};


const isDriverRole = (role) => {

  return [
    'driver',
    'delivery',
    'captain',
    'delivery driver',
  ].includes(role);
};


const isVendorRole = (role) => {

  return [
    'vendor',
    'restaurant',
    'store',
    'pharmacy',
    'shop',
    'merchant',

    'restaurant owner',

    'store owner',

    'shop owner',

    'pharmacy owner',
  ].includes(role);
};


const isAdminRole = (role) => {

  return [
    'admin',
    'administrator',
    'superadmin',
    'super admin',
  ].includes(role);
};


// ============================================================
// ROOT NAVIGATOR
// ============================================================

export default function RootNavigator() {

  const {
    user,
    loading,
    logout,
  } = useAuth();


  // ==========================================================
  // AUTH LOADING
  // ==========================================================
  //
  // مهم:
  // RootNavigator لا يحتوي على Splash.
  //
  // أثناء استرجاع بيانات تسجيل الدخول من التخزين
  // نعرض Loader بسيط فقط.
  //
  // الـ Splash الأساسي موجود في App.js.
  // ==========================================================

  if (loading) {

    return (

      <View style={styles.loadingContainer}>

        <ActivityIndicator
          size="large"
          color={
            COLORS?.primary ||
            '#1850E2'
          }
        />

      </View>

    );
  }


  // ==========================================================
  // ACTIVE ROLE
  // ==========================================================

  const activeRole = useMemo(() => {

    const role = normalizeRole(user);


    console.log(
      '================================='
    );

    console.log(
      '👤 CURRENT USER:',
      user
    );

    console.log(
      '🔑 ACTIVE ROLE:',
      role
    );

    console.log(
      '================================='
    );


    return role;

  }, [user]);


  // ==========================================================
  // RENDER NAVIGATOR BY ROLE
  // ==========================================================

  const renderNavigatorByRole = () => {


    // ========================================================
    // NOT AUTHENTICATED
    // ========================================================

    if (!user) {

      console.log(
        '➡️ No authenticated user - opening AuthNavigator'
      );


      return (
        <AuthNavigator />
      );
    }


    // ========================================================
    // ADMIN
    // ========================================================

    if (isAdminRole(activeRole)) {

      console.log(
        '🛡️ ADMIN ACCOUNT DETECTED'
      );

      console.log(
        '➡️ Opening AdminNavigator'
      );


      return (
        <AdminNavigator />
      );
    }


    // ========================================================
    // CUSTOMER
    // ========================================================

    if (isCustomerRole(activeRole)) {

      console.log(
        '👤 CUSTOMER ACCOUNT DETECTED'
      );

      console.log(
        '➡️ Opening CustomerNavigator'
      );


      return (
        <CustomerNavigator />
      );
    }


    // ========================================================
    // DRIVER
    // ========================================================

    if (isDriverRole(activeRole)) {

      console.log(
        '🚗 DRIVER ACCOUNT DETECTED'
      );

      console.log(
        '➡️ Opening DriverNavigator'
      );


      return (
        <DriverNavigator />
      );
    }


    // ========================================================
    // VENDOR
    // ========================================================

    if (isVendorRole(activeRole)) {

      console.log(
        '🏪 VENDOR ACCOUNT DETECTED'
      );

      console.log(
        '➡️ Opening VendorNavigator'
      );


      return (
        <VendorNavigator />
      );
    }


    // ========================================================
    // UNKNOWN ROLE
    // ========================================================

    console.log(
      '❌ UNKNOWN ROLE:',
      activeRole
    );


    return (

      <View style={styles.centerContainer}>

        <Text
          style={styles.unsupportedTitle}
        >
          نوع الحساب غير معروف
        </Text>


        <Text
          style={styles.unsupportedText}
        >

          Role المستلم من السيرفر:

          {'\n\n'}

          {activeRole || 'غير موجود'}

          {'\n\n'}

          يرجى تسجيل الخروج والمحاولة مرة أخرى.

        </Text>


        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          activeOpacity={0.8}
        >

          <Text
            style={styles.logoutButtonText}
          >
            تسجيل الخروج
          </Text>

        </TouchableOpacity>

      </View>

    );
  };


  // ==========================================================
  // NAVIGATION CONTAINER
  // ==========================================================

  return (

    <NavigationContainer
      linking={linking}

      fallback={

        <View style={styles.loadingContainer}>

          <ActivityIndicator
            size="large"
            color={
              COLORS?.primary ||
              '#1850E2'
            }
          />

        </View>

      }
    >

      {renderNavigatorByRole()}

    </NavigationContainer>

  );
}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  // ==========================================================
  // LOADING
  // ==========================================================

  loadingContainer: {

    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

    backgroundColor: '#FFFFFF',
  },


  // ==========================================================
  // CENTER
  // ==========================================================

  centerContainer: {

    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

    padding: 24,

    backgroundColor: '#FFFFFF',
  },


  // ==========================================================
  // UNKNOWN ROLE TITLE
  // ==========================================================

  unsupportedTitle: {

    fontSize: 20,

    fontWeight: 'bold',

    color: '#1F2937',

    marginBottom: 10,

    textAlign: 'center',
  },


  // ==========================================================
  // UNKNOWN ROLE TEXT
  // ==========================================================

  unsupportedText: {

    fontSize: 14,

    color: '#6B7280',

    textAlign: 'center',

    marginBottom: 24,

    lineHeight: 22,
  },


  // ==========================================================
  // LOGOUT BUTTON
  // ==========================================================

  logoutButton: {

    backgroundColor:
      COLORS?.danger ||
      COLORS?.primary ||
      '#DC2626',

    paddingVertical: 12,

    paddingHorizontal: 28,

    borderRadius: 24,

    elevation: 2,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.1,

    shadowRadius: 4,
  },


  // ==========================================================
  // LOGOUT TEXT
  // ==========================================================

  logoutButtonText: {

    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: 'bold',
  },

});