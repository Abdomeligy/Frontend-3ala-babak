import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';

import { vendorApi } from '../../api/vendorApi';

import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/theme';

import { useSocket } from '../../context/SocketContext';


// ============================================================
// STATUS NORMALIZER
// ============================================================

const normalizeStatus = (status) => {
  if (!status) {
    return null;
  }

  return String(status)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
};


// ============================================================
// ORDER ID EXTRACTOR
// ============================================================

const getEventOrderId = (data) => {
  if (!data) {
    return null;
  }

  const orderId =
    data?.orderId ??
    data?.order_id ??
    data?.OrderId ??
    data?.id ??
    data?.Id ??
    data?.order?.id ??
    data?.order?.Id;

  if (
    orderId === undefined ||
    orderId === null ||
    orderId === ''
  ) {
    return null;
  }

  return String(orderId);
};


// ============================================================
// STATUS FROM EVENT
// ============================================================

const getEventStatus = (eventName, data) => {
  const backendStatus =
    data?.status ??
    data?.orderStatus ??
    data?.order_status ??
    data?.newStatus ??
    data?.new_status ??
    data?.OrderStatus ??
    data?.order?.status ??
    data?.order?.Status;

  if (backendStatus) {
    return normalizeStatus(backendStatus);
  }

  switch (eventName) {
    case 'order_accepted':
      return 'accepted';

    case 'order_preparing':
      return 'preparing';

    case 'order_on_the_way':
      return 'on_the_way';

    case 'order_delivered':
      return 'delivered';

    case 'order_cancelled':
      return 'cancelled';

    default:
      return null;
  }
};


// ============================================================
// ORDER ID
// ============================================================

const getOrderIdValue = (order) => {
  return (
    order?.id ??
    order?.Id ??
    order?.orderId ??
    order?.OrderId ??
    null
  );
};


// ============================================================
// COMPONENT
// ============================================================

export default function VendorOrdersScreen({ navigation }) {

  // ==========================================================
  // SOCKET
  // ==========================================================

  const {
    socket,
    connected,
  } = useSocket();


  // ==========================================================
  // STATE
  // ==========================================================

  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  // الطلب الذي يتم حذفه حاليًا
  const [deletingOrderId, setDeletingOrderId] = useState(null);


  // ==========================================================
  // FETCH VENDOR ORDERS
  //
  // GET /api/vendor/orders
  // ==========================================================
const fetchOrders = useCallback(async () => {
  try {
    console.log('📦 Vendor Orders: Fetching orders...');

    const response = await vendorApi.getOrders();

    console.log('🟢 GET VENDOR ORDERS RESPONSE:', response?.data);

    const responseData = response?.data || response;

    // حسب شكل Response من الـ backend
    const ordersData =
      responseData?.data?.orders ||
      responseData?.orders ||
      responseData?.data ||
      [];

    const normalizedOrders =
      Array.isArray(ordersData)
        ? ordersData
        : [];

    setOrders(normalizedOrders);

    console.log(
      '✅ Vendor Orders Loaded:',
      normalizedOrders.length
    );

  } catch (error) {
    console.log(
      '❌ Error fetching vendor orders:',
      error?.response?.data ||
      error?.message ||
      error
    );
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    fetchOrders();

  }, [fetchOrders]);


  // ==========================================================
  // REFRESH
  // ==========================================================

  const onRefresh = useCallback(() => {

    setRefreshing(true);

    fetchOrders();

  }, [fetchOrders]);


  // ==========================================================
  // DELETE ORDER
  //
  // DELETE /api/vendor/orders/:orderId
  // ==========================================================

  const handleDeleteOrder = useCallback((order) => {

    const orderId = getOrderIdValue(order);

    if (
      orderId === undefined ||
      orderId === null ||
      orderId === ''
    ) {

      Alert.alert(
        'خطأ',
        'لم يتم العثور على رقم الطلب.'
      );

      return;
    }


    // منع الضغط المتكرر
    if (
      deletingOrderId !== null &&
      String(deletingOrderId) === String(orderId)
    ) {
      return;
    }


    Alert.alert(
      'حذف الطلب',
      `هل أنت متأكد من حذف الطلب #${orderId}؟\n\nلا يمكن التراجع عن هذه العملية.`,
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },

        {
          text: 'حذف',
          style: 'destructive',

          onPress: async () => {

            try {

              setDeletingOrderId(orderId);


              console.log(
                '🗑️ Vendor: Deleting order:',
                orderId
              );


              // ==================================================
              // DELETE API
              // ==================================================

              const response =
                await vendorApi.deleteOrder(
                  orderId
                );


              console.log(
                '✅ Vendor: Order deleted:',
                response?.data
              );


              // ==================================================
              // REMOVE FROM CURRENT LIST
              // ==================================================

              setOrders((currentOrders) => {

                return currentOrders.filter(
                  (currentOrder) => {

                    const currentOrderId =
                      getOrderIdValue(
                        currentOrder
                      );

                    return (
                      String(currentOrderId) !==
                      String(orderId)
                    );

                  }
                );

              });


              Alert.alert(
                'تم الحذف',
                `تم حذف الطلب #${orderId} بنجاح.`
              );

            } catch (error) {

              console.log(
                '❌ Vendor: Delete order error:',
                error?.response?.data ||
                error?.message ||
                error
              );


              const backendMessage =
                error?.response?.data?.message ||
                error?.response?.data?.error;


              Alert.alert(
                'تعذر حذف الطلب',
                backendMessage ||
                'حدث خطأ أثناء حذف الطلب. حاول مرة أخرى.'
              );

            } finally {

              setDeletingOrderId(null);

            }

          },

        },

      ]

    );

  }, [
    deletingOrderId,
  ]);


  // ==========================================================
  // SOCKET ORDER EVENT HANDLER
  // ==========================================================

  useEffect(() => {

    if (!socket) {

      console.log(
        '⚠️ Vendor Orders: Socket instance not available'
      );

      return;
    }


    if (!connected) {

      console.log(
        '⚠️ Vendor Orders: Socket not connected yet'
      );

      return;
    }


    console.log(
      '🟢 Vendor Orders: Socket connected',
      socket.id
    );


    // ========================================================
    // GENERIC ORDER EVENT HANDLER
    // ========================================================

    const handleOrderEvent = (
      eventName,
      data
    ) => {

      console.log(
        '\n🏪 ======================================='
      );

      console.log(
        `🏪 VENDOR ORDER EVENT: ${eventName}`
      );

      console.log(
        '🏪 Data:',
        data
      );

      console.log(
        '🏪 =======================================\n'
      );


      // ======================================================
      // ORDER ID
      // ======================================================

      const eventOrderId =
        getEventOrderId(data);


      if (!eventOrderId) {

        console.warn(
          `⚠️ ${eventName}: orderId غير موجود`,
          data
        );


        // لو الـ event ناقص ID،
        // نعيد تحميل الطلبات احتياطيًا.

        fetchOrders();

        return;
      }


      // ======================================================
      // STATUS
      // ======================================================

      const newStatus =
        getEventStatus(
          eventName,
          data
        );


      if (!newStatus) {

        console.warn(
          `⚠️ ${eventName}: status غير موجود`,
          data
        );

        fetchOrders();

        return;
      }


      console.log(
        '🔄 Updating vendor order:',
        {
          orderId: eventOrderId,
          status: newStatus,
        }
      );


      // ======================================================
      // UPDATE LOCAL STATE
      // ======================================================

      let orderFound = false;


      setOrders((currentOrders) => {

        const updatedOrders =
          currentOrders.map((order) => {

            const currentOrderId =
              String(
                order?.id ??
                order?.Id ??
                ''
              );


            if (
              currentOrderId !==
              eventOrderId
            ) {

              return order;
            }


            orderFound = true;


            console.log(
              '✅ Vendor order updated locally:',
              {
                orderId: eventOrderId,
                oldStatus:
                  order?.status ??
                  order?.Status,
                newStatus,
              }
            );


            return {
              ...order,

              status: newStatus,

              // احتفاظ بالـ original fields
              Status: newStatus,

              // لو الباك إند أرسل بيانات إضافية
              ...(data?.order || {}),
            };

          });


        return updatedOrders;

      });


      // ======================================================
      // ORDER NOT FOUND
      // ======================================================

      if (!orderFound) {

        console.log(
          'ℹ️ Order not found in current vendor list.'
        );

        console.log(
          '🔄 Fetching vendor orders again...'
        );

        fetchOrders();

      }

    };


    // ========================================================
    // EVENT WRAPPERS
    // ========================================================

    const handleOrderStatusUpdated = (data) => {

      handleOrderEvent(
        'order_status_updated',
        data
      );

    };


    const handleOrderAccepted = (data) => {

      handleOrderEvent(
        'order_accepted',
        data
      );

    };


    const handleOrderPreparing = (data) => {

      handleOrderEvent(
        'order_preparing',
        data
      );

    };


    const handleOrderOnTheWay = (data) => {

      handleOrderEvent(
        'order_on_the_way',
        data
      );

    };


    const handleOrderDelivered = (data) => {

      handleOrderEvent(
        'order_delivered',
        data
      );

    };


    const handleOrderCancelled = (data) => {

      handleOrderEvent(
        'order_cancelled',
        data
      );

    };


    // ========================================================
    // REGISTER SOCKET LISTENERS
    // ========================================================

    socket.on(
      'order_status_updated',
      handleOrderStatusUpdated
    );

    socket.on(
      'order_accepted',
      handleOrderAccepted
    );

    socket.on(
      'order_preparing',
      handleOrderPreparing
    );

    socket.on(
      'order_on_the_way',
      handleOrderOnTheWay
    );

    socket.on(
      'order_delivered',
      handleOrderDelivered
    );

    socket.on(
      'order_cancelled',
      handleOrderCancelled
    );


    console.log(
      '👂 Vendor Order Socket Listeners Registered'
    );


    // ========================================================
    // CLEANUP
    // ========================================================

    return () => {

      console.log(
        '🧹 Removing Vendor Order Socket Listeners'
      );


      socket.off(
        'order_status_updated',
        handleOrderStatusUpdated
      );

      socket.off(
        'order_accepted',
        handleOrderAccepted
      );

      socket.off(
        'order_preparing',
        handleOrderPreparing
      );

      socket.off(
        'order_on_the_way',
        handleOrderOnTheWay
      );

      socket.off(
        'order_delivered',
        handleOrderDelivered
      );

      socket.off(
        'order_cancelled',
        handleOrderCancelled
      );

    };

  }, [
    socket,
    connected,
    fetchOrders,
  ]);


  // ==========================================================
  // ORDER ID
  // ==========================================================

  const getOrderId = (
    item,
    index
  ) => {

    return (
      item?.id ??
      item?.Id ??
      index
    );

  };


  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading &&
    !refreshing
  ) {

    return <LoadingSpinner />;

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <View style={styles.container}>

      {/* ====================================================
          SOCKET STATUS
      ==================================================== */}

      {!connected && (

        <View style={styles.socketWarning}>

          <Ionicons
            name="cloud-offline-outline"
            size={18}
            color="#92400E"
          />

          <Text style={styles.socketWarningText}>
            جاري الاتصال بالتحديثات المباشرة...
          </Text>

        </View>

      )}


      <FlatList

        data={orders}

        keyExtractor={(
          item,
          index
        ) =>
          String(
            getOrderId(
              item,
              index
            )
          )
        }

        contentContainerStyle={
          styles.list
        }

        showsVerticalScrollIndicator={
          false
        }

        refreshControl={

          <RefreshControl

            refreshing={
              refreshing
            }

            onRefresh={
              onRefresh
            }

            colors={[
              COLORS?.primary ||
              '#F97316'
            ]}

            tintColor={
              COLORS?.primary ||
              '#F97316'
            }

          />

        }

        ListEmptyComponent={

          <EmptyState

            icon="receipt-outline"

            title="لا توجد طلبات حتى الآن"

            subtitle="ستظهر طلبات الزبائن الواردة هنا فور إتمامها"

          />

        }


        renderItem={({ item }) => {

          const orderId =
            getOrderIdValue(item);

          const isDeleting =
            deletingOrderId !== null &&
            String(deletingOrderId) ===
            String(orderId);


          return (

            <TouchableOpacity

              style={
                styles.orderCard
              }

              onPress={() => {

                // لا نفتح التفاصيل أثناء الحذف
                if (isDeleting) {
                  return;
                }

                navigation.navigate(
                  'OrderDetailsVendor',
                  {
                    orderId,
                  }
                );

              }}

              activeOpacity={
                0.85
              }

            >

              {/* ============================================
                  HEADER
              ============================================ */}

              <View
                style={
                  styles.orderHeader
                }
              >

                <Text
                  style={
                    styles.orderId
                  }
                >
                  طلب #
                  {orderId}
                </Text>


                <Text
                  style={
                    styles.orderStatus
                  }
                >
                  {item?.status ??
                    item?.Status ??
                    'جديد'}
                </Text>

              </View>


              {/* ============================================
                  CUSTOMER
              ============================================ */}

              <Text
                style={
                  styles.clientName
                }
              >
                العميل:{' '}

                {item?.CustomerName  ??
                  item?.User?.name ??
                  item?.user?.name ??
                  'زبون'}

              </Text>


              {/* ============================================
                  FOOTER
              ============================================ */}

              <View
                style={
                  styles.orderFooter
                }
              >

                <Text
                  style={
                    styles.orderTotal
                  }
                >

                  الإجمالي:{' '}

                  {Number(
                    item?.total_price ??
                    item?.totalAmount ??
                    0
                  ).toFixed(2)}

                  {' '}جنيه

                </Text>


                <Ionicons
                  name="chevron-back"
                  size={18}
                  color="#9CA3AF"
                />

              </View>


              {/* ============================================
                  DELETE BUTTON
                  يظهر هنا فقط داخل OrdersTab
              ============================================ */}

              <View
                style={
                  styles.actionsContainer
                }
              >

                <TouchableOpacity

                  style={[
                    styles.deleteButton,

                    isDeleting &&
                    styles.deleteButtonDisabled,
                  ]}

                  activeOpacity={
                    0.8
                  }

                  disabled={
                    isDeleting
                  }

                  onPress={(event) => {

                    // منع الضغط من فتح تفاصيل الطلب
                    event?.stopPropagation?.();

                    handleDeleteOrder(
                      item
                    );

                  }}

                >

                  {isDeleting ? (

                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />

                  ) : (

                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color="#FFFFFF"
                    />

                  )}


                  <Text
                    style={
                      styles.deleteButtonText
                    }
                  >
                    {isDeleting
                      ? 'جاري الحذف...'
                      : 'حذف الطلب'}
                  </Text>

                </TouchableOpacity>

              </View>

            </TouchableOpacity>

          );

        }}

      />

    </View>

  );

}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,

    backgroundColor:
      COLORS?.background ||
      '#F3F4F6',
  },


  list: {
    padding:
      SPACING?.md ||
      16,
  },


  socketWarning: {
    flexDirection:
      'row',

    alignItems:
      'center',

    justifyContent:
      'center',

    gap:
      7,

    paddingVertical:
      8,

    backgroundColor:
      '#FEF3C7',

    borderBottomWidth:
      1,

    borderBottomColor:
      '#FDE68A',
  },


  socketWarningText: {
    fontSize:
      12,

    fontWeight:
      '600',

    color:
      '#92400E',
  },


  orderCard: {
    backgroundColor:
      '#FFFFFF',

    borderRadius:
      12,

    padding:
      16,

    marginBottom:
      12,

    elevation:
      2,

    shadowColor:
      '#000',

    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity:
      0.2,

    shadowRadius:
      1.41,
  },


  orderHeader: {
    flexDirection:
      'row-reverse',

    justifyContent:
      'space-between',

    marginBottom:
      8,
  },


  orderId: {
    fontSize:
      16,

    fontWeight:
      '700',

    color:
      '#111827',
  },


  orderStatus: {
    fontSize:
      13,

    fontWeight:
      '600',

    color:
      COLORS?.primary ||
      '#F97316',
  },


  clientName: {
    fontSize:
      14,

    color:
      '#4B5563',

    textAlign:
      'right',

    marginBottom:
      12,
  },


  orderFooter: {
    flexDirection:
      'row-reverse',

    justifyContent:
      'space-between',

    alignItems:
      'center',

    borderTopWidth:
      1,

    borderTopColor:
      '#F3F4F6',

    paddingTop:
      8,
  },


  orderTotal: {
    fontSize:
      15,

    fontWeight:
      '700',

    color:
      '#111827',
  },


  // ==========================================================
  // DELETE ACTION
  // ==========================================================

  actionsContainer: {
    marginTop:
      14,

    paddingTop:
      12,

    borderTopWidth:
      1,

    borderTopColor:
      '#F3F4F6',

    alignItems:
      'stretch',
  },


  deleteButton: {
    minHeight:
      44,

    borderRadius:
      10,

    backgroundColor:
      '#DC2626',

    flexDirection:
      'row',

    alignItems:
      'center',

    justifyContent:
      'center',

    gap:
      8,

    paddingHorizontal:
      16,
  },


  deleteButtonDisabled: {
    opacity:
      0.65,
  },


  deleteButtonText: {
    color:
      '#FFFFFF',

    fontSize:
      14,

    fontWeight:
      '700',
  },

});