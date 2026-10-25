import React, { useEffect } from 'react';

import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

export default function PaymentSuccessScreen({ navigation }) {

  useEffect(() => {

    console.log(
      '💳 PaymentSuccessScreen opened'
    );

    const timer = setTimeout(() => {

      console.log(
        '💰 Navigating to WalletTab'
      );

      navigation.replace(
        'CustomerTabs',
        {
          screen: 'WalletTab',
        }
      );

    }, 1200);

    return () => {
      clearTimeout(timer);
    };

  }, [navigation]);

  return (
    <View style={styles.container}>

      {/* SUCCESS ICON */}

      <Text style={styles.icon}>
        ✅
      </Text>

      {/* TITLE */}

      <Text style={styles.title}>
        تم شحن المحفظة بنجاح!
      </Text>

      {/* SUBTITLE */}

      <Text style={styles.subtitle}>
        جاري تحويلك إلى المحفظة...
      </Text>

      {/* LOADING */}

      <ActivityIndicator
        size="small"
        color="#F97316"
        style={styles.loader}
      />

    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,

    backgroundColor: '#F9FAFB',

    justifyContent: 'center',

    alignItems: 'center',

    padding: 24,
  },

  icon: {
    fontSize: 64,

    marginBottom: 20,
  },

  title: {
    fontSize: 24,

    fontWeight: '700',

    color: '#111827',

    textAlign: 'center',
  },

  subtitle: {
    marginTop: 10,

    fontSize: 16,

    color: '#6B7280',

    textAlign: 'center',
  },

  loader: {
    marginTop: 20,
  },

});