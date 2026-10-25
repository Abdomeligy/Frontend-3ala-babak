import React from 'react';

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
// DRIVER SCREENS
// ============================================================

import DriverHomeScreen
  from '../screens/Driver/DriverHomeScreen';

import DriverOrderHistoryScreen
  from '../screens/Driver/DriverOrderHistoryScreen';

import DriverWalletScreen
  from '../screens/Driver/DriverWalletScreen';

import DriverProfileScreen
  from '../screens/Driver/DriverProfileScreen';

import DriverNotificationsScreen
  from '../screens/Driver/DriverNotificationsScreen';

import IncomingOrderScreen
  from '../screens/Driver/IncomingOrderScreen';

import ActiveDeliveryScreen
  from '../screens/Driver/ActiveDeliveryScreen';

import DriverDocumentsScreen
  from '../screens/Driver/DriverDocumentsScreen';


// ============================================================
// ACCOUNT
// ============================================================

import DeleteAccountScreen
  from '../screens/Account/DeleteAccountScreen';


// ============================================================
// NAVIGATORS
// ============================================================

const Tab = createBottomTabNavigator();

const Stack = createNativeStackNavigator();


// ============================================================
// DRIVER TAB ICONS
// ============================================================

const DRIVER_TAB_ICONS = {

  MapTab: {
    active: 'map',
    inactive: 'map-outline',
  },

  HistoryTab: {
    active: 'time',
    inactive: 'time-outline',
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
// DRIVER TABS
// ============================================================

function DriverTabs() {

  return (

    <Tab.Navigator

      screenOptions={({ route }) => ({

        headerShown: false,

        tabBarActiveTintColor:
          COLORS?.primary ||
          '#1850E2',

        tabBarInactiveTintColor:
          COLORS?.gray ||
          '#8E8E93',

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
            DRIVER_TAB_ICONS[
              route.name
            ];

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
          MAP
      ====================================================== */}

      <Tab.Screen
        name="MapTab"
        component={DriverHomeScreen}
        options={{
          title: 'الخريطة',
        }}
      />


      {/* ======================================================
          HISTORY
      ====================================================== */}

      <Tab.Screen
        name="HistoryTab"
        component={DriverOrderHistoryScreen}
        options={{
          title: 'السجل',
        }}
      />


      {/* ======================================================
          WALLET
      ====================================================== */}

      <Tab.Screen
        name="WalletTab"
        component={DriverWalletScreen}
        options={{
          title: 'المحفظة',
        }}
      />


      {/* ======================================================
          PROFILE
      ====================================================== */}

      <Tab.Screen
        name="ProfileTab"
        component={DriverProfileScreen}
        options={{
          title: 'حسابي',
        }}
      />

    </Tab.Navigator>

  );
}


// ============================================================
// DRIVER NAVIGATOR
// ============================================================

export default function DriverNavigator() {

  return (

    <Stack.Navigator

      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}

    >

      {/* ======================================================
          DRIVER TABS
      ====================================================== */}

      <Stack.Screen
        name="DriverTabs"
        component={DriverTabs}
      />


      {/* ======================================================
          DRIVER NOTIFICATIONS
      ====================================================== */}

      <Stack.Screen
        name="DriverNotifications"
        component={
          DriverNotificationsScreen
        }
      />


      {/* ======================================================
          INCOMING ORDER
      ====================================================== */}

      <Stack.Screen
        name="IncomingOrder"
        component={
          IncomingOrderScreen
        }
        options={{
          presentation: 'modal',
          animation: 'fade_from_bottom',
        }}
      />


      {/* ======================================================
          ACTIVE DELIVERY
      ====================================================== */}

      <Stack.Screen
        name="ActiveDelivery"
        component={
          ActiveDeliveryScreen
        }
      />


      {/* ======================================================
          DRIVER DOCUMENTS
      ====================================================== */}

      <Stack.Screen
        name="DriverDocuments"
        component={
          DriverDocumentsScreen
        }
      />


      {/* ======================================================
          DELETE ACCOUNT
      ====================================================== */}

      <Stack.Screen
        name="DeleteAccount"
        component={
          DeleteAccountScreen
        }
      />

    </Stack.Navigator>

  );
}