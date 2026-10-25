import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import OrderCard from '../../components/OrderCard';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import { orderApi } from '../../api/orderApi';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';

const TABS = [
  { key: 'active', label: 'الطلبات النشطة' },
  { key: 'completed', label: 'المكتملة' },
  { key: 'cancelled', label: 'الملغاة' },
  { key: 'all', label: 'الكل' },
];

export default function OrderHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  const fetchOrders = useCallback(async () => {
    try {
      const response = await orderApi.getMyOrders();
      const responseBody = response?.data || {};
      const responseData =
        responseBody?.data?.orders ||
        responseBody?.data?.items ||
        responseBody?.orders ||
        responseBody?.items ||
        responseBody?.data ||
        [];

      setOrders(Array.isArray(responseData) ? responseData : []);
    } catch (e) {
      console.log('Error fetching orders history:', e);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getOrderId = (item) =>
    item?.id || item?.Id || item?.order_id || item?._id;

  const getOrderStatus = (order) =>
    String(
      order?.status ||
        order?.Status ||
        order?.order_status ||
        order?.orderStatus ||
        ''
    )
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');

  // تصفية الطلبات بناءً على التبويب المحدد
  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders;

    return orders.filter((order) => {
      const status = getOrderStatus(order);
      if (activeTab === 'active') {
        return (
          status === 'pending' ||
          status === 'accepted' ||
          status === 'preparing' ||
          status === 'on_the_way'
        );
      }
      if (activeTab === 'completed') {
        return status === 'delivered' || status === 'completed';
      }
      if (activeTab === 'cancelled') {
        return status === 'cancelled';
      }
      return true;
    });
  }, [orders, activeTab]);

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* شريط التبويبات للتصفية */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item, index) => String(getOrderId(item) || index)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS?.primary || '#F97316', '#1850E2']}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="لا توجد طلبات"
            subtitle={
              activeTab === 'active'
                ? 'لا توجد لديك طلبات جارية حالياً'
                : 'جميع طلباتك ستظهر هنا'
            }
          />
        }
        renderItem={({ item }) => {
          const id = getOrderId(item);
          const status = getOrderStatus(item);
          const isFinished =
            status === 'delivered' ||
            status === 'completed' ||
            status === 'cancelled';

          return (
            <OrderCard
              order={item}
              onPress={() =>
                navigation.navigate(
                  isFinished ? 'OrderDetails' : 'OrderTracking',
                  { orderId: id }
                )
              }
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS?.background || '#F3F4F6' },
  tabContainer: {
    flexDirection: 'row-reverse',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING?.md || 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    justifyContent: 'space-between',
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS?.md || 20,
    backgroundColor: '#F3F4F6',
  },
  activeTab: {
    backgroundColor: COLORS?.primary || '#F97316',
  },
  tabText: {
    fontSize: FONT_SIZES?.xs || 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  list: { padding: SPACING?.md || 16, paddingBottom: SPACING?.xl || 24 },
});