import React from 'react';

import { Platform } from 'react-native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import {
  Ionicons,
} from '@expo/vector-icons';

import { COLORS } from '../constants/colors';

// ============================================================
// VENDOR SCREENS
// ============================================================

import VendorDashboardScreen from '../screens/Vendor/VendorDashboardScreen';
import VendorOrdersScreen from '../screens/Vendor/VendorOrdersScreen';
import VendorProductsScreen from '../screens/Vendor/VendorProductsScreen';
import VendorReviewsScreen from '../screens/Vendor/VendorReviewsScreen';
import VendorProfileScreen from '../screens/Vendor/VendorProfileScreen';

// ============================================================
// VENDOR STACK SCREENS
// ============================================================

import EditProductScreen from '../screens/Vendor/EditProductScreen';
import OrderDetailsVendorScreen from '../screens/Vendor/OrderDetailsVendorScreen';
import StoreProfileScreen from '../screens/Vendor/StoreProfileScreen';
import MapPickerScreen from '../screens/Vendor/MapPickerScreen';
import StarStatsScreen from '../screens/Vendor/StarStatsScreen';
import OrdersHistoryScreen from '../screens/Vendor/OrdersHistoryScreen';

// ============================================================
// ACCOUNT
// ============================================================

import DeleteAccountScreen from '../screens/Account/DeleteAccountScreen';

// ============================================================
// NAVIGATORS
// ============================================================

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ============================================================
// VENDOR TAB ICONS
// ============================================================

const VENDOR_TAB_ICONS = {
  DashboardTab: {
    active: 'stats-chart',
    inactive: 'stats-chart-outline',
  },

  OrdersTab: {
    active: 'receipt',
    inactive: 'receipt-outline',
  },

  ProductsTab: {
    active: 'fast-food',
    inactive: 'fast-food-outline',
  },

  ReviewsTab: {
    active: 'star',
    inactive: 'star-outline',
  },

  ProfileTab: {
    active: 'storefront',
    inactive: 'storefront-outline',
  },
};

// ============================================================
// VENDOR TABS
// ============================================================

function VendorTabs() {
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

          height: 60,

          paddingBottom: 8,

          paddingTop: 6,

          ...Platform.select({
            web: {
              boxShadow:
                '0px -2px 4px rgba(0, 0, 0, 0.1)',
            },

            default: {
              elevation: 10,

              shadowColor: '#000',

              shadowOffset: {
                width: 0,
                height: -2,
              },

              shadowOpacity: 0.1,

              shadowRadius: 4,
            },
          }),
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },

        tabBarIcon: ({
          focused,
          color,
          size,
        }) => {
          const iconConfig =
            VENDOR_TAB_ICONS[route.name];

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
      {/* ======================================================
          DASHBOARD
      ====================================================== */}

      <Tab.Screen
        name="DashboardTab"
        component={VendorDashboardScreen}
        options={{
          title: 'الرئيسية',
        }}
      />

      {/* ======================================================
          ORDERS
      ====================================================== */}

      <Tab.Screen
        name="OrdersTab"
        component={VendorOrdersScreen}
        options={{
          title: 'الطلبات',
        }}
      />

      {/* ======================================================
          PRODUCTS
      ====================================================== */}

      <Tab.Screen
        name="ProductsTab"
        component={VendorProductsScreen}
        options={{
          title: 'المنتجات',
        }}
      />

      {/* ======================================================
          REVIEWS
      ====================================================== */}

      <Tab.Screen
        name="ReviewsTab"
        component={VendorReviewsScreen}
        options={{
          title: 'التقييمات',
        }}
      />

      {/* ======================================================
          PROFILE / STORE
      ====================================================== */}

      <Tab.Screen
        name="ProfileTab"
        component={VendorProfileScreen}
        options={{
          title: 'المتجر',
        }}
      />
    </Tab.Navigator>
  );
}

// ============================================================
// VENDOR NAVIGATOR
// ============================================================

export default function VendorNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* ======================================================
          MAIN VENDOR TABS
      ====================================================== */}

      <Stack.Screen
        name="VendorTabs"
        component={VendorTabs}
      />

      {/* ======================================================
          STORE PROFILE
      ====================================================== */}

      <Stack.Screen
        name="StoreProfile"
        component={StoreProfileScreen}
      />

      {/* ======================================================
          MAP PICKER
      ====================================================== */}

      <Stack.Screen
        name="MapPicker"
        component={MapPickerScreen}
      />

      {/* ======================================================
          STAR STATS
      ====================================================== */}

      <Stack.Screen
        name="StarStatsScreen"
        component={StarStatsScreen}
      />

      {/* ======================================================
          ORDERS HISTORY
      ====================================================== */}

      <Stack.Screen
        name="OrdersHistory"
        component={OrdersHistoryScreen}
      />

      {/* ======================================================
          EDIT PRODUCT
      ====================================================== */}

      <Stack.Screen
        name="EditProduct"
        component={EditProductScreen}
      />

      {/* ======================================================
          ORDER DETAILS
      ====================================================== */}

      <Stack.Screen
        name="OrderDetailsVendor"
        component={OrderDetailsVendorScreen}
      />

      {/* ======================================================
          DELETE ACCOUNT
      ====================================================== */}

      <Stack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
      />
    </Stack.Navigator>
  );
}