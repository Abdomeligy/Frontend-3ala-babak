import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ActiveDeliveryScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="map-outline" size={64} color="#9CA3AF" />
      <Text style={styles.title}>خريطة التوصيل المباشر</Text>
      <Text style={styles.subtitle}>
        {Platform.OS === 'web'
          ? 'تتبع الخريطة غير مدعوم على المتصفح حالياً. يرجى فتح التطبيق من الهاتفي المحمول.'
          : 'جاري تحميل موقع الكابتن على الخريطة...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});