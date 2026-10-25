import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from '../screens/Auth/WelcomeScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import OtpVerificationScreen from '../screens/Auth/OtpVerificationScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/Auth/ResetPasswordScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >

      {/* Welcome */}
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
      />

      {/* Login */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
      />

      {/* Register */}
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
      />

      {/* Forgot Password */}
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
      />

      {/* OTP */}
      <Stack.Screen
        name="OtpVerification"
        component={OtpVerificationScreen}
      />

      {/* Reset Password */}
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
      />

    </Stack.Navigator>
  );
}