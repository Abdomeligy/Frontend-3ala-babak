import React from 'react';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../constants/colors';

// ============================================================
// CUSTOMER SCREENS
// ============================================================

import HomeScreen from '../screens/Customer/HomeScreen';
import SearchScreen from '../screens/Customer/SearchScreen';
import OrderHistoryScreen from '../screens/Customer/OrderHistoryScreen';
import WalletScreen from '../screens/Customer/WalletScreen';
import ProfileScreen from '../screens/Customer/ProfileScreen';

import VendorDetailsScreen from '../screens/Customer/VendorDetailsScreen';
import ProductDetailsScreen from '../screens/Customer/ProductDetailsScreen';
import CartScreen from '../screens/Customer/CartScreen';
import CheckoutScreen from '../screens/Customer/CheckoutScreen';
import OrderTrackingScreen from '../screens/Customer/OrderTrackingScreen';
import OrderDetailsScreen from '../screens/Customer/OrderDetailsScreen';
import FavoritesScreen from '../screens/Customer/FavoritesScreen';
import NotificationsScreen from '../screens/Customer/NotificationsScreen';
import AddAddressScreen from '../screens/Customer/AddAddressScreen';
import AddressesScreen from '../screens/Customer/AddressesScreen';
import MapPickerScreen from '../screens/Customer/MapPickerScreen';
import HelpSupportScreen from '../screens/Customer/HelpSupportScreen';

// ============================================================
// ACCOUNT
// ============================================================

import DeleteAccountScreen from '../screens/Account/DeleteAccountScreen';

// ============================================================
// PAYMENT SUCCESS
// ============================================================

import PaymentSuccessScreen from '../screens/Customer/PaymentSuccessScreen';

// ============================================================
// NAVIGATORS
// ============================================================

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ============================================================
// TAB ICONS
// ============================================================

const TAB_ICONS = {
  HomeTab: {
    active: 'home',
    inactive: 'home-outline',
  },

  SearchTab: {
    active: 'search',
    inactive: 'search-outline',
  },

  OrdersTab: {
    active: 'receipt',
    inactive: 'receipt-outline',
  },

  WalletTab: {
    active: 'wallet',
    inactive: 'wallet-outline',
  },

  ProfileTab: {
    active: 'person',
    inactive: 'person-outline',
  },
};

// ============================================================
// CUSTOMER TABS
// ============================================================

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarActiveTintColor:
          COLORS?.primary || '#1850E2',

        tabBarInactiveTintColor:
          COLORS?.gray || '#8E8E93',

        tabBarStyle: {
          borderTopWidth: 0,

          elevation: 10,

          boxShadow:
            '0px -2px 4px rgba(0, 0, 0, 0.1)',

          height: 60,

          paddingBottom: 8,

          paddingTop: 6,
        },

        tabBarIcon: ({
          focused,
          color,
          size,
        }) => {
          const iconConfig =
            TAB_ICONS[route.name];

          const iconName =
            iconConfig
              ? focused
                ? iconConfig.active
                : iconConfig.inactive
              : 'square-outline';

          return (
            <Ionicons
              name={iconName}
              size={size || 24}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'الرئيسية',
        }}
      />

      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          title: 'بحث',
        }}
      />

      <Tab.Screen
        name="OrdersTab"
        component={OrderHistoryScreen}
        options={{
          title: 'الطلبات',
        }}
      />

      <Tab.Screen
        name="WalletTab"
        component={WalletScreen}
        options={{
          title: 'المحفظة',
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'حسابي',
        }}
      />
    </Tab.Navigator>
  );
}

// ============================================================
// CUSTOMER NAVIGATOR
// ============================================================

export default function CustomerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* ======================================================
          CUSTOMER TABS
      ====================================================== */}

      <Stack.Screen
        name="CustomerTabs"
        component={CustomerTabs}
      />

      {/* ======================================================
          VENDOR DETAILS
      ====================================================== */}

      <Stack.Screen
        name="VendorDetails"
        component={VendorDetailsScreen}
      />

      {/* ======================================================
          PRODUCT DETAILS
      ====================================================== */}

      <Stack.Screen
        name="ProductDetails"
        component={ProductDetailsScreen}
      />

      {/* ======================================================
          CART
      ====================================================== */}

      <Stack.Screen
        name="Cart"
        component={CartScreen}
      />

      {/* ======================================================
          CHECKOUT
      ====================================================== */}

      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
      />

      {/* ======================================================
          ORDER TRACKING
      ====================================================== */}

      <Stack.Screen
        name="OrderTracking"
        component={OrderTrackingScreen}
      />

      {/* ======================================================
          ORDER DETAILS
      ====================================================== */}

      <Stack.Screen
        name="OrderDetails"
        component={OrderDetailsScreen}
      />

      {/* ======================================================
          FAVORITES
      ====================================================== */}

      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
      />

      {/* ======================================================
          NOTIFICATIONS
      ====================================================== */}

      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />

      {/* ======================================================
          ADDRESSES
      ====================================================== */}

      <Stack.Screen
        name="Addresses"
        component={AddressesScreen}
      />

      {/* ======================================================
          ADD ADDRESS
      ====================================================== */}

      <Stack.Screen
        name="AddAddressScreen"
        component={AddAddressScreen}
      />

      {/* ======================================================
          MAP PICKER
      ====================================================== */}

      <Stack.Screen
        name="MapPicker"
        component={MapPickerScreen}
      />

      {/* ======================================================
          HELP & SUPPORT
      ====================================================== */}

      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
      />

      {/* ======================================================
          DELETE ACCOUNT
      ====================================================== */}

      <Stack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
      />

      {/* ======================================================
          PAYMENT SUCCESS
      ====================================================== */}

      <Stack.Screen
        name="PaymentSuccess"
        component={PaymentSuccessScreen}
      />
    </Stack.Navigator>
  );
}