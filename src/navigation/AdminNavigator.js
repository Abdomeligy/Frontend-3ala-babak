
import React from 'react';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import AdminDashboardScreen from '../screens/Admin/AdminDashboardScreen';
import AdminDriversScreen from '../screens/Admin/AdminDriversScreen';
import AdminDriverDocumentsScreen from '../screens/Admin/AdminDriverDocumentsScreen';
import AdminWithdrawalsScreen from '../screens/Admin/AdminWithdrawalsScreen';
import AdminLogsScreen from '../screens/Admin/AdminLogsScreen';

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="AdminDashboard"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* ======================================================
          ADMIN DASHBOARD
      ====================================================== */}

      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
      />

      {/* ======================================================
          DRIVERS
      ====================================================== */}

      <Stack.Screen
        name="AdminDrivers"
        component={AdminDriversScreen}
      />

      {/* ======================================================
          DRIVER DOCUMENTS REVIEW
      ====================================================== */}

      <Stack.Screen
        name="AdminDriverDocuments"
        component={AdminDriverDocumentsScreen}
      />

      {/* ======================================================
          WITHDRAWALS
      ====================================================== */}

      <Stack.Screen
        name="AdminWithdrawals"
        component={AdminWithdrawalsScreen}
      />

      {/* ======================================================
          ADMIN LOGS
      ====================================================== */}

      <Stack.Screen
        name="AdminLogs"
        component={AdminLogsScreen}
      />

    </Stack.Navigator>
  );
}
