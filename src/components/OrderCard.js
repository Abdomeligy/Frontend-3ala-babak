import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, RADIUS, SPACING } from '../constants/theme';

const STATUS_LABELS = {
  pending: { label: 'قيد الانتظار', color: '#F59E0B' },
  accepted: { label: 'تم القبول', color: '#3B82F6' },
  preparing: { label: 'جاري التحضير', color: '#8B5CF6' },
  on_the_way: { label: 'في الطريق', color: '#10B981' },
  delivered: { label: 'تم التوصيل', color: '#059669' },
  cancelled: { label: 'ملغي', color: '#EF4444' },
};

export default function OrderCard({ order, onPress }) {
  const statusInfo = STATUS_LABELS[order?.status] || {
    label: order?.status || 'مجهول',
    color: COLORS?.primary || '#F97316',
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        <Text style={styles.orderId}>طلب #{order.Id || order.id}</Text>
        <Text style={[styles.status, { color: statusInfo.color }]}>
          {statusInfo.label}
        </Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.price}>{Number(order.total_price || order.total || 0).toFixed(2)} ج.م</Text>
        <Text style={styles.date}>{order.CreatedAt || order.createdAt || 'الآن'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS?.white || '#FFFFFF',
    borderRadius: RADIUS?.md || 12,
    padding: SPACING?.md || 16,
    marginBottom: SPACING?.sm || 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING?.xs || 4,
  },
  orderId: { fontSize: FONT_SIZES?.md || 15, fontWeight: '700', color: '#111827' },
  status: { fontSize: FONT_SIZES?.sm || 13, fontWeight: '700' },
  price: { fontSize: FONT_SIZES?.sm || 14, color: COLORS?.primary || '#F97316', fontWeight: '700' },
  date: { fontSize: FONT_SIZES?.xs || 12, color: '#9CA3AF' },
});