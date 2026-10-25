import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

const DEFAULT_ACCEPT_TIMEOUT = 180;
const SERVER_RESPONSE_TIMEOUT_MS = 10000;

export default function IncomingOrderScreen({ route, navigation }) {
  const { order } = route.params || {};
  const { socket } = useSocket();
  const { user } = useAuth();
  const driverId = user?.driverId;

  const initialTimeout = Number(
    order?.timeout ||
    order?.timeoutSeconds ||
    order?.expiresIn ||
    DEFAULT_ACCEPT_TIMEOUT
  );

  const [secondsLeft, setSecondsLeft] = useState(initialTimeout);
  const [loadingAccept, setLoadingAccept] = useState(false);
  const timeoutIdRef = useRef(null);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (navigation?.canGoBack()) navigation.goBack();
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, navigation]);

  const orderId = order?.id || order?.Id || order?.order_id;
  const vendorName =
    order?.vendorName ||
    order?.vendor_name ||
    order?.vendor?.name ||
    order?.restaurantName ||
    'متجر محلي';

  const distance =
    order?.distanceKm ||
    order?.distance ||
    (order?.distanceMeters ? (order.distanceMeters / 1000).toFixed(1) : '2.5');

  const driverShare =
    order?.driverShare ||
    order?.driver_share ||
    order?.deliveryFee ||
    order?.delivery_fee ||
    '20';

  useEffect(() => {
    if (!socket || !orderId) return;
    // الانضمام لغرفة الطلب مباشرة
    socket.emit('join_order', orderId);
    socket.emit('driver_join_order_room', { orderId });
  }, [socket, orderId]);

  const handleAccept = () => {
    console.log('🔵 ACCEPT PRESSED:', { orderId, driverId, connected: socket?.connected });

    if (!orderId || !socket) {
      Alert.alert('خطأ', 'بيانات الطلب غير مكتملة');
      return;
    }

    setLoadingAccept(true);

    const cleanup = () => {
      socket.off('race_resolved', onResolved);
      socket.off('order_accept_success', onResolved);
      socket.off('race_lost', onLost);
      socket.off('order_accept_failed', onLost);
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };

    const onResolved = (payload) => {
      if (String(payload?.orderId) !== String(orderId)) return;
      cleanup();
      setLoadingAccept(false);
      navigation.replace('ActiveDelivery', { orderId });
    };

    const onLost = (payload) => {
      if (String(payload?.orderId) !== String(orderId)) return;
      cleanup();
      setLoadingAccept(false);
      Alert.alert('عذراً', payload?.message || 'تم قبول الطلب بواسطة كابتن آخر أو انتهت صلاحيته');
      if (navigation?.canGoBack()) navigation.goBack();
    };

    socket.on('race_resolved', onResolved);
    socket.on('order_accept_success', onResolved);
    socket.on('race_lost', onLost);
    socket.on('order_accept_failed', onLost);

    timeoutIdRef.current = setTimeout(() => {
      cleanup();
      setLoadingAccept(false);
      Alert.alert('خطأ', 'لم يصل رد من السيرفر، حاول مرة أخرى');
      if (navigation?.canGoBack()) navigation.goBack();
    }, SERVER_RESPONSE_TIMEOUT_MS);

    // إرسال طلب القبول بدون قطع أو تنظيف للسوكيت
    socket.emit('driver_accept_order', { orderId, driverId });
  };

  const handleDecline = () => {
    if (socket && orderId) {
      socket.emit('driver_reject_order', { orderId, driverId });
    }
    if (navigation?.canGoBack()) navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* شريط العداد */}
      <View style={styles.timerContainer}>
        <Ionicons name="timer-outline" size={28} color={COLORS?.danger || '#EF4444'} />
        <Text style={styles.timer}>{secondsLeft} ثانية</Text>
      </View>

      <Text style={styles.title}>وصلك طلب توصيل جديد! 🛵</Text>

      {/* تفاصيل الطلب */}
      <View style={styles.card}>
        <Text style={styles.vendorName}>{vendorName}</Text>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={18} color="#6B7280" />
          <Text style={styles.distance}>المسافة الإجمالية: {distance} كم</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={18} color="#10B981" />
          <Text style={styles.earning}>ربحك المتوقع: {driverShare} ج.م</Text>
        </View>
      </View>

      {/* أزرار الإجراءات */}
      <Button
        title="قبول الطلب"
        onPress={handleAccept}
        loading={loadingAccept}
      />
      <View style={{ height: SPACING?.sm || 8 }} />
      <Button
        title="رفض"
        onPress={handleDecline}
        variant="outline"
        disabled={loadingAccept}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING?.lg || 20,
    backgroundColor: COLORS?.background || '#F3F4F6',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING?.md || 16,
  },
  timer: {
    fontSize: FONT_SIZES?.xxl || 28,
    fontWeight: '700',
    color: COLORS?.danger || '#EF4444',
  },
  title: {
    fontSize: FONT_SIZES?.xl || 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING?.lg || 24,
    color: '#1F2937',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS?.lg || 16,
    padding: SPACING?.lg || 20,
    marginBottom: SPACING?.lg || 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  vendorName: {
    fontSize: FONT_SIZES?.lg || 18,
    fontWeight: '700',
    textAlign: 'right',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  distance: {
    color: '#6B7280',
    fontSize: FONT_SIZES?.sm || 14,
  },
  earning: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: FONT_SIZES?.md || 16,
  },
});