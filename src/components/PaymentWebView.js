import React from 'react';
import {
  Platform,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

/**
 * PaymentWebView
 *
 * يعمل على:
 * - Web   → iframe
 * - iOS  → react-native-webview
 * - Android → react-native-webview
 *
 * ملاحظة:
 * على Web لا نعتمد على تغيير URL داخل iframe لأن Paymob
 * Cross-Origin، وبالتالي تأكيد الدفع الأساسي يتم من:
 *
 * Paymob Webhook
 *       ↓
 * Backend
 *       ↓
 * payment_completed
 *       ↓
 * Socket
 *       ↓
 * Frontend
 */
export default function PaymentWebView({
  paymentUrl,
  onNavigationChange,
}) {
  // ==============================
  // NO PAYMENT URL
  // ==============================

  if (!paymentUrl) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ==============================
  // WEB
  // ==============================

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          src={paymentUrl}
          title="Paymob Checkout"
          style={styles.iframe}
          allow="payment *"
        />
      </View>
    );
  }

  // ==============================
  // MOBILE
  // ==============================

  const { WebView } = require('react-native-webview');

  return (
    <View style={styles.container}>
      <WebView
        source={{
          uri: paymentUrl,
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
        }}
        onNavigationStateChange={onNavigationChange}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
          </View>
        )}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
        setSupportMultipleWindows={false}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  webview: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
});