import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../../components/LoadingSpinner';
import Button from '../../components/Button';
import RatingStars from '../../components/RatingStars';
import { orderApi } from '../../api/orderApi';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

const STATUS_MAP = {
  pending: { label: 'قيد الانتظار', color: '#F59E0B', bg: '#FEF3C7' },
  accepted: { label: 'تم القبول', color: '#3B82F6', bg: '#DBEAFE' },
  preparing: { label: 'جاري التحضير', color: '#8B5CF6', bg: '#EDE9FE' },
  delivering: { label: 'جاري التوصيل', color: '#06B6D4', bg: '#CFFAFE' },
  delivered: { label: 'تم التوصيل', color: '#10B981', bg: '#D1FAE5' },
  completed: { label: 'مكتمل', color: '#10B981', bg: '#D1FAE5' },
  cancelled: { label: 'ملغي', color: '#EF4444', bg: '#FEE2E2' },
};

export default function OrderDetailsScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // حالة مودال التقييم
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let isMounted = true;

    orderApi
      .getOrderById(orderId)
      .then(({ data }) => {
        if (isMounted) {
          setOrder(data?.data || data);
        }
      })
      .catch((err) => console.log('Error fetching order details:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const handleSendReview = async () => {
    setSubmittingRating(true);
    try {
      if (orderApi?.reviewOrder) {
        await orderApi.reviewOrder(orderId, { rating, comment: reviewComment });
      }
      Alert.alert('شكراً لك', 'تم تسجيل تقييمك بنجاح');
      setOrder((prev) => ({ ...prev, hasReview: true }));
      setShowRatingModal(false);
    } catch (error) {
      Alert.alert('خطأ', error?.response?.data?.message || 'تعذر إرسال التقييم حالياً');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleCallDriver = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const formatOrderDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return '';
      return parsed.toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Text style={styles.errorText}>لم نتمكن من جلب تفاصيل الطلب</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>الرجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const id = order.id || order.Id || orderId;
  const totalPrice = Number(order.total_price || order.totalPrice || order.total || 0);
  const deliveryFee = Number(order.delivery_fee || order.deliveryFee || 0);
  const subtotal = totalPrice - deliveryFee;
  const items = order.items || order.order_items || [];
  const statusKey = order.status || 'pending';
  const statusInfo = STATUS_MAP[statusKey] || STATUS_MAP.pending;
  const vendorName = order.vendor?.name || order.vendorName || order.VendorName || 'المتجر';
  const driver = order.driver || order.Driver;
  const address = order.address || order.Address;

  // إعداد نص العنوان
  const renderAddressText = () => {
    if (!address) return 'عنوان غير محدد';
    if (typeof address === 'string') return address;
    
    const parts = [
      address.title || address.Title,
      address.AddressText || address.street || address.address,
      address.building ? `مبنى ${address.building}` : null,
      address.floor ? `دور ${address.floor}` : null,
      address.apartment ? `شقة ${address.apartment}` : null,
    ].filter(Boolean);

    return parts.join(' - ');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-forward" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تفاصيل الطلب #{id}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status & Vendor Header */}
        <View style={styles.card}>
          <View style={styles.statusHeaderRow}>
            <View style={[styles.badge, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.badgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
            <Text style={styles.vendorTitle}>{vendorName}</Text>
          </View>
          {Boolean(order.createdAt || order.created_at) && (
            <Text style={styles.dateText}>
              تاريخ الطلب: {formatOrderDate(order.createdAt || order.created_at)}
            </Text>
          )}
        </View>

        {/* Driver Information (إن وجد) */}
        {Boolean(driver) && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>مندوب التوصيل</Text>
            <View style={styles.driverRow}>
              <View style={styles.driverInfo}>
                <Ionicons name="person-circle-outline" size={36} color={COLORS?.primary || '#F97316'} />
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>{driver.name || driver.Name || 'المندوب'}</Text>
                  {Boolean(driver.phone || driver.Phone) && (
                    <Text style={styles.driverPhone}>{driver.phone || driver.Phone}</Text>
                  )}
                </View>
              </View>
              {Boolean(driver.phone || driver.Phone) && (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => handleCallDriver(driver.phone || driver.Phone)}
                >
                  <Ionicons name="call" size={18} color="#FFFFFF" />
                  <Text style={styles.callBtnText}>اتصال</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Delivery Address */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>عنوان التوصيل</Text>
          <View style={styles.addressBox}>
            <Ionicons name="location-outline" size={20} color="#6B7280" style={{ marginLeft: 6 }} />
            <Text style={styles.addressText}>{renderAddressText()}</Text>
          </View>
        </View>

        {/* Order Items List */}
        {items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>المنتجات المطلوبة</Text>
            {items.map((item, index) => {
              const itemPrice = Number(item.price || item.Price || 0);
              const qty = item.quantity || item.Quantity || 1;
              return (
                <View key={item.id || index} style={styles.itemRow}>
                  <Text style={styles.itemPrice}>{(itemPrice * qty).toFixed(2)} ج.م</Text>
                  <Text style={styles.itemName}>
                    {qty}x {item.name || item.product_name || item.Name || 'منتج'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Pricing Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>ملخص الحساب</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>
              {(subtotal > 0 ? subtotal : totalPrice).toFixed(2)} ج.م
            </Text>
            <Text style={styles.summaryLabel}>المجموع الفرعي</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{deliveryFee.toFixed(2)} ج.م</Text>
            <Text style={styles.summaryLabel}>رسوم التوصيل</Text>
          </View>

          <View style={[styles.summaryRow, styles.totalDivider]}>
            <Text style={styles.totalValue}>{totalPrice.toFixed(2)} ج.م</Text>
            <Text style={styles.totalLabel}>الإجمالي النهائي</Text>
          </View>
        </View>

        {/* Review Action */}
        {(statusKey === 'delivered' || statusKey === 'completed') && !order.hasReview && (
          <View style={styles.reviewBox}>
            <Button title="قيّم طلبك الآن" onPress={() => setShowRatingModal(true)} />
          </View>
        )}
      </ScrollView>

      {/* Modal التقييم */}
      <Modal visible={showRatingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>تقييم الطلب والمتجر</Text>
            <Text style={styles.modalSubtitle}>كيف كانت تجربتك مع هذا الطلب؟</Text>

            <View style={styles.starsWrapper}>
              <RatingStars rating={rating} onSelectRating={(val) => setRating(val)} size={32} />
            </View>

            <TextInput
              style={styles.commentInput}
              placeholder="اكتب تعليقك هنا (اختياري)..."
              placeholderTextColor="#9CA3AF"
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              numberOfLines={3}
              textAlign="right"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Button title="إرسال" onPress={handleSendReview} loading={submittingRating} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS?.background || '#F3F4F6' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: FONT_SIZES?.md || 16, color: '#6B7280', marginTop: 12, marginBottom: 16 },
  retryBtn: { backgroundColor: COLORS?.primary || '#F97316', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING?.md || 16,
    paddingTop: 44,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitle: { fontSize: FONT_SIZES?.md || 16, fontWeight: '700', color: '#1F2937' },
  content: { padding: SPACING?.md || 16, paddingBottom: 30 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS?.md || 12,
    padding: SPACING?.md || 16,
    marginBottom: SPACING?.md || 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  statusHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vendorTitle: { fontSize: FONT_SIZES?.lg || 18, fontWeight: '700', color: '#1F2937' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  dateText: { fontSize: 12, color: '#9CA3AF', textAlign: 'right', marginTop: 8 },
  sectionLabel: { fontSize: FONT_SIZES?.sm || 14, color: '#6B7280', textAlign: 'right', marginBottom: 10, fontWeight: '600' },
  addressBox: { flexDirection: 'row-reverse', alignItems: 'center' },
  addressText: { fontSize: 14, color: '#374151', textAlign: 'right', flex: 1 },
  driverRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  driverInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  driverDetails: { alignItems: 'flex-end' },
  driverName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  driverPhone: { fontSize: 12, color: '#6B7280' },
  callBtn: {
    flexDirection: 'row-reverse',
    backgroundColor: '#10B981',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  callBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  itemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemName: { fontSize: FONT_SIZES?.md || 15, color: '#374151', textAlign: 'right' },
  itemPrice: { fontSize: FONT_SIZES?.md || 15, fontWeight: '600', color: '#1F2937' },
  summaryRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { color: '#6B7280', fontSize: 14 },
  summaryValue: { color: '#1F2937', fontSize: 14, fontWeight: '600' },
  totalDivider: { borderTopWidth: 1, borderColor: '#E5E7EB', paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: FONT_SIZES?.md || 16, fontWeight: '700', color: '#374151' },
  totalValue: { fontSize: FONT_SIZES?.lg || 18, fontWeight: '700', color: COLORS?.primary || '#F97316' },
  reviewBox: { marginTop: SPACING?.sm || 8 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', color: '#1F2937' },
  modalSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  starsWrapper: { alignItems: 'center', marginBottom: 16 },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#F9FAFB',
    height: 80,
    marginBottom: 20,
    color: '#1F2937',
  },
  modalButtons: { flexDirection: 'row-reverse', alignItems: 'center' },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelBtnText: { color: '#6B7280', fontWeight: '600' },
});