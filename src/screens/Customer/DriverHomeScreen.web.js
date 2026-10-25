import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { driverApi } from '../../api/driverApi';
import { useSocket } from '../../context/SocketContext';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

export default function DriverHomeScreen({ navigation }) {
  const { socket, connected } = useSocket();
  const [isOnline, setIsOnline] = useState(false);
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── 1. الاستماع لطلبات Socket الجديدة ──
  useEffect(() => {
    if (!socket || !isOnline) return;

    socket.on('new_order_available', (orderData) => {
      setIncomingOrder(orderData);
    });

    return () => {
      socket.off('new_order_available');
    };
  }, [socket, isOnline]);

  // ── 2. تغيير حالة المتوفر / غير متوفر ──
  const toggleOnlineStatus = async (value) => {
    try {
      setIsOnline(value);
      await driverApi.setAvailability(value ? 'available' : 'offline');
    } catch (error) {
      console.log('Error updating status:', error);
      setIsOnline(!value);
      Alert.alert('خطأ', 'تعذر تغيير حالة الاتصال، يرجى التحقق من الشبكة');
    }
  };

  // ── 3. قبول الطلب ──
  const handleAcceptOrder = async () => {
    if (!incomingOrder) return;
    const orderId = incomingOrder.id || incomingOrder.Id || incomingOrder._id;

    setLoading(true);
    try {
      await driverApi.acceptOrder(orderId);
      setIncomingOrder(null);
      navigation.navigate('ActiveDelivery', { orderId });
    } catch (error) {
      Alert.alert('خطأ', error?.response?.data?.message || 'تعذر قبول الطلب، ربما تم قبوله بواسطة كابتن آخر');
      setIncomingOrder(null);
    } finally {
      setLoading(false);
    }
  };

  // ── 4. رفض الطلب ──
  const handleDeclineOrder = async () => {
    if (!incomingOrder) return;
    const orderId = incomingOrder.id || incomingOrder.Id || incomingOrder._id;

    try {
      await driverApi.declineOrder(orderId);
      setIncomingOrder(null);
    } catch (error) {
      setIncomingOrder(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* الشريط العلوي للحالة */}
      <View style={styles.statusHeader}>
        <View style={styles.statusInfo}>
          <Ionicons
            name={connected ? 'wifi' : 'wifi-outline'}
            size={20}
            color={connected ? COLORS?.success || '#10B981' : '#6B7280'}
          />
          <Text style={styles.statusText}>
            {isOnline ? 'أنت متصل الآن (جاهز للطلبات)' : 'أنت غير متصل'}
          </Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={toggleOnlineStatus}
          trackColor={{ false: '#D1D5DB', true: COLORS?.primary || '#1850E2' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* منطقة عرض التنبيهات والخريطة */}
      {Platform.OS === 'web' && (
        <View style={styles.webNotice}>
          <Text style={styles.webNoticeText}>تنويه: الخريطة التفاعلية غير متاحة على متصفح الويب.</Text>
        </View>
      )}

      {/* كارت طلب جديد وارد */}
      {incomingOrder ? (
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Ionicons name="notifications-circle" size={32} color="#F97316" />
            <Text style={styles.orderTitle}>طلب توصيل جديد!</Text>
          </View>

          <View style={styles.orderDetails}>
            <Text style={styles.detailText}>
              المتجر: {incomingOrder.vendorName || incomingOrder.VendorName || 'متجر محلي'}
            </Text>
            <Text style={styles.detailText}>
              عنوان التوصيل: {incomingOrder.deliveryAddress || 'عنوان العميل'}
            </Text>
            <Text style={styles.priceText}>
              قيمة التوصيل: {incomingOrder.deliveryFee || 20} ج.م
            </Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.declineBtn} onPress={handleDeclineOrder}>
              <Text style={styles.declineText}>رفض</Text>
            </TouchableOpacity>

            <View style={{ flex: 1, marginRight: 10 }}>
              <Button title="قبول الطلب" onPress={handleAcceptOrder} loading={loading} />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.idleState}>
          <Ionicons name="car-sport-outline" size={72} color="#9CA3AF" />
          <Text style={styles.idleTitle}>
            {isOnline ? 'في انتظار طلبات جديدة...' : 'قم بتفعيل زر الاتصال للبدء في استقبال الطلبات'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS?.background || '#F3F4F6', padding: SPACING?.md || 16 },
  statusHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS?.md || 12,
    padding: SPACING?.md || 16,
    elevation: 2,
    marginBottom: SPACING?.md || 16,
  },
  statusInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  statusText: { fontSize: FONT_SIZES?.md || 15, fontWeight: '700', color: '#1F2937' },
  webNotice: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  webNoticeText: { color: '#92400E', fontSize: 13, fontWeight: '600' },
  idleState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  idleTitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS?.md || 16,
    padding: SPACING?.md || 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F97316',
    marginTop: 'auto',
  },
  orderHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 12 },
  orderTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  orderDetails: { marginBottom: 16 },
  detailText: { fontSize: 14, color: '#4B5563', textAlign: 'right', marginBottom: 4 },
  priceText: { fontSize: 16, color: '#F97316', fontWeight: '700', textAlign: 'right', marginTop: 6 },
  actionsRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  declineBtn: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADIUS?.md || 8,
    alignItems: 'center',
  },
  declineText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});