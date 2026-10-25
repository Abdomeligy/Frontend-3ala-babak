import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import OrderCard from '../../components/OrderCard';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import { driverApi } from '../../api/driverApi';
import { orderApi } from '../../api/orderApi';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/theme';

export default function DriverOrderHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDriverOrders = useCallback(async () => {
    try {
      // تجربة طلب endpoint السائق المخصص أولاً ثم الـ API العام كـ Fallback
      let res;
      if (driverApi?.getOrders) {
        res = await driverApi.getOrders();
      } else if (orderApi?.getDriverOrders) {
        res = await orderApi.getDriverOrders();
      } else {
        res = await orderApi.getMyOrders();
      }

      const orderData = res?.data?.orders || res?.data?.data || res?.data || [];
      setOrders(Array.isArray(orderData) ? orderData : []);
    } catch (error) {
      console.log('Error fetching driver orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDriverOrders();
  }, [fetchDriverOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDriverOrders();
  };

  const getOrderId = (item, index) => item?.id || item?.Id || item?._id || index;

  if (loading && !refreshing) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item, index) => String(getOrderId(item, index))}
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
            icon="time-outline"
            title="لسه معملتش أي توصيلة"
            subtitle="طلبات التوصيل المكتملة ستظهر هنا"
          />
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => {
              if (navigation?.navigate) {
                navigation.navigate('ActiveDelivery', { orderId: getOrderId(item) });
              }
            }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS?.background || '#F3F4F6',
  },
  list: {
    padding: SPACING?.md || 16,
    paddingBottom: SPACING?.lg || 24,
  },
});