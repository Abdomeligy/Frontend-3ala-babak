import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, SPACING } from '../constants/theme';

export default function CartSummary({
  subtotal = 0,
  serviceFee = 5,
  discount = 0,
}) {
  const numSubtotal = Number(subtotal || 0);
  const numService = Number(serviceFee || 0);
  const numDiscount = Number(discount || 0);

  // حساب الإجمالي بدون رسوم توصيل
  const finalTotal = Math.max(0, numSubtotal + numService - numDiscount);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>المجموع الفرعي (Subtotal)</Text>
        <Text style={styles.value}>{numSubtotal.toFixed(2)} ج.م</Text>
      </View>

      {numService > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>رسوم الخدمة (Service Fee)</Text>
          <Text style={styles.value}>{numService.toFixed(2)} ج.م</Text>
        </View>
      )}

      {numDiscount > 0 && (
        <View style={styles.row}>
          <Text style={[styles.label, styles.discountText]}>الخصم (Discount)</Text>
          <Text style={[styles.value, styles.discountText]}>-{numDiscount.toFixed(2)} ج.م</Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.totalLabel}>الإجمالي النهائي (Total)</Text>
        <Text style={styles.totalValue}>{finalTotal.toFixed(2)} ج.م</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: SPACING?.md || 16,
    borderRadius: 12,
    marginBottom: SPACING?.md || 16,
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: FONT_SIZES?.sm || 14,
    color: '#6B7280',
  },
  value: {
    fontSize: FONT_SIZES?.sm || 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  discountText: {
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: FONT_SIZES?.md || 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: FONT_SIZES?.lg || 18,
    fontWeight: '700',
    color: COLORS?.primary || '#F97316',
  },
});