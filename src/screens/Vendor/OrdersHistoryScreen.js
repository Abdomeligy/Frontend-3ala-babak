import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import { vendorApi } from '../../api/vendorApi';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

export default function OrdersHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrdersHistory = useCallback(async () => {
    try {
      let response = null;

      // Use the first API method that exists in the current vendorApi file.
      const apiMethods = [
        'getOrdersHistory',
        'getHistoryOrders',
        'getVendorOrders',
        'getOrders',
        'getMyOrders',
      ];

      for (const methodName of apiMethods) {
        if (typeof vendorApi?.[methodName] === 'function') {
          response = await vendorApi[methodName]({
            page: 1,
            limit: 100,
          });
          break;
        }
      }

      if (!response) {
        throw new Error(
          'No orders-list method was found in vendorApi'
        );
      }

      const payload = response?.data;
      const ordersData =
        payload?.data?.orders ||
        payload?.data?.data ||
        payload?.orders ||
        payload?.data ||
        [];

      setOrders(
        Array.isArray(ordersData)
          ? ordersData
          : []
      );
    } catch (error) {
      console.log(
        'Error fetching orders history:',
        error?.response?.data || error?.message || error
      );
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrdersHistory();
  }, [fetchOrdersHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrdersHistory();
  };

  const getOrderId = (item, index) => (
    item?.Id ||
    item?.id ||
    item?._id ||
    item?.orderId ||
    index
  );

  const getStatus = (item) => (
    String(
      item?.status ||
      item?.Status ||
      'pending'
    ).toLowerCase()
  );

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'accepted': return 'تم القبول';
      case 'preparing': return 'جاري التحضير';
      case 'on_the_way': return 'خرج للتوصيل';
      case 'delivered':
      case 'completed':
        return 'مكتمل';
      case 'cancelled':
      case 'canceled':
        return 'ملغي';
      default:
        return status || 'غير محدد';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return '#10B981';
      case 'cancelled':
      case 'canceled':
        return '#EF4444';
      case 'on_the_way':
        return '#2563EB';
      case 'accepted':
      case 'preparing':
        return '#8B5CF6';
      case 'pending':
      default:
        return '#F97316';
    }
  };

  const getTotal = (item) => {
    const value =
      item?.total_price ??
      item?.totalPrice ??
      item?.TotalPrice ??
      item?.total ??
      item?.GrandTotal ??
      item?.grandTotal ??
      0;

    const number = Number(value);
    return Number.isFinite(number)
      ? number.toFixed(2)
      : '0.00';
  };

  const getCustomerName = (item) => (
    item?.CustomerName ||
    item?.customerName ||
    item?.customer?.Name ||
    item?.customer?.name ||
    'غير متوفر'
  );

  const getCreatedAt = (item) => (
    item?.CreatedAt ||
    item?.createdAt ||
    item?.created_at ||
    null
  );

  const openOrderDetails = (item) => {
    const orderId = getOrderId(item, null);

    if (!orderId) return;

    navigation?.navigate?.(
      'OrderDetailsVendor',
      { orderId }
    );
  };

  const deleteOrder = (item) => {
    const orderId = getOrderId(item, null);
    if (!orderId) return;

    Alert.alert(
      'حذف الطلب',
      `هل تريد حذف الطلب #${orderId}؟
يُسمح بالحذف للطلبات المعلقة أو الملغاة فقط.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await vendorApi.deleteOrder(orderId);
              setOrders((previous) => previous.filter(
                (current) => String(getOrderId(current, null)) !== String(orderId)
              ));
              Alert.alert('تم', 'تم حذف الطلب بنجاح');
            } catch (error) {
              Alert.alert(
                'تعذر الحذف',
                error?.response?.data?.message || 'حدث خطأ أثناء حذف الطلب'
              );
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-forward"
            size={24}
            color="#1F2937"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          سجل الطلبات
        </Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item, index) => (
          String(getOrderId(item, index))
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS?.primary || '#F97316']}
            tintColor={COLORS?.primary || '#F97316'}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="لا يوجد سجل طلبات"
            subtitle="الطلبات ستظهر هنا بعد تحميلها من السيرفر"
          />
        }
        renderItem={({ item }) => {
          const orderId = getOrderId(item, '--');
          const status = getStatus(item);
          const statusColor = getStatusColor(status);
          const createdAt = getCreatedAt(item);

          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openOrderDetails(item)}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>
                  طلب #{orderId}
                </Text>

                <Text
                  style={[
                    styles.statusText,
                    { color: statusColor },
                  ]}
                >
                  {getStatusLabel(status)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  العميل
                </Text>
                <Text style={styles.detailValue}>
                  {getCustomerName(item)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  الإجمالي
                </Text>
                <Text style={styles.totalValue}>
                  {getTotal(item)} جنيه
                </Text>
              </View>

              {item?.payment_status || item?.paymentStatus ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    الدفع
                  </Text>
                  <Text style={styles.detailValue}>
                    {item.payment_status || item.paymentStatus}
                  </Text>
                </View>
              ) : null}

              {createdAt ? (
                <Text style={styles.dateText}>
                  {new Date(createdAt).toLocaleString('ar-EG')}
                </Text>
              ) : null}

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  onPress={() => openOrderDetails(item)}
                  style={styles.detailsButton}
                >
                  <Text style={styles.openDetailsText}>
                    عرض التفاصيل
                  </Text>
                  <Ionicons
                    name="chevron-back"
                    size={18}
                    color={COLORS?.primary || '#F97316'}
                  />
                </TouchableOpacity>

                {(status === 'pending' || status === 'cancelled' || status === 'canceled') && (
                  <TouchableOpacity
                    onPress={() => deleteOrder(item)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={17} color="#FFFFFF" />
                    <Text style={styles.deleteButtonText}>حذف</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS?.background || '#F3F4F6',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: FONT_SIZES?.lg || 18,
    fontWeight: '800',
    color: '#1F2937',
    marginRight: 15,
  },
  list: {
    padding: SPACING?.md || 16,
    paddingBottom: SPACING?.xl || 32,
  },
  card: {
    backgroundColor: COLORS?.white || '#FFFFFF',
    borderRadius: RADIUS?.md || 12,
    padding: SPACING?.md || 16,
    marginBottom: SPACING?.sm || 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING?.xs || 6,
  },
  orderId: {
    fontSize: FONT_SIZES?.md || 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusText: {
    fontSize: FONT_SIZES?.xs || 12,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    color: '#6B7280',
    fontSize: FONT_SIZES?.sm || 14,
  },
  detailValue: {
    color: '#374151',
    fontSize: FONT_SIZES?.sm || 14,
    fontWeight: '600',
  },
  totalValue: {
    color: COLORS?.primary || '#F97316',
    fontSize: FONT_SIZES?.md || 15,
    fontWeight: '800',
  },
  dateText: {
    textAlign: 'right',
    fontSize: FONT_SIZES?.xs || 11,
    color: '#9CA3AF',
    marginTop: SPACING?.xs || 8,
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING?.sm || 10,
    paddingTop: SPACING?.sm || 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailsButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FONT_SIZES?.xs || 12,
  },
  openDetailsText: {
    color: COLORS?.primary || '#F97316',
    fontSize: FONT_SIZES?.sm || 14,
    fontWeight: '700',
    marginLeft: 4,
  },
});
