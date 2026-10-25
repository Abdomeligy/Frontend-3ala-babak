import React, { useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';

import LoadingSpinner from '../../components/LoadingSpinner';
import Button from '../../components/Button';
import { vendorApi } from '../../api/vendorApi';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

export default function OrderDetailsVendorScreen({ route, navigation }) {
  const { orderId } = route.params || {};

  const [order, setOrder] = useState(null);
  const [updating, setUpdating] = useState(false);

  // ============================================================
  // LOAD ORDER
  // ============================================================

  useEffect(() => {
    if (!orderId) {
      console.log('🔴 GET ORDER: Missing orderId');
      return;
    }

    console.log('🔵 BEFORE GET ORDER:', {
      orderId,
    });

    vendorApi
      .getOrderById(orderId)
      .then(({ data }) => {
        console.log('🟢 AFTER GET ORDER');

        // لا نطبع بيانات العميل كاملة حتى لا تظهر بيانات حساسة
        console.log('🟢 ORDER DATA:', {
          orderId: data?.data?.Id,
          status: data?.data?.status,
          restaurantId: data?.data?.restaurant_id,
          customerId: data?.data?.user_id,
          assignedDriverId: data?.data?.AssignedDriverId,
        });

        setOrder(data?.data || data);
      })
      .catch((error) => {
        console.log('🔴 GET ORDER ERROR:', error);
        console.log('🔴 MESSAGE:', error?.message);
        console.log('🔴 RESPONSE:', error?.response?.data);

        Alert.alert(
          'خطأ',
          'تعذر تحميل تفاصيل الطلب'
        );
      });
  }, [orderId]);

  // ============================================================
  // UPDATE ORDER STATUS
  // ============================================================

  const updateStatus = async (newStatus) => {
    if (!orderId) {
      console.log(
        '🔴 UPDATE STATUS: Missing orderId'
      );

      return;
    }

    if (updating) {
      console.log(
        '🟠 UPDATE STATUS: Already updating'
      );

      return;
    }

    console.log(
      '🟡 UPDATE ORDER STATUS:',
      {
        orderId,
        currentStatus: order?.status,
        newStatus,
      }
    );

    setUpdating(true);

    try {
      const response =
        await vendorApi.updateOrderStatus(
          orderId,
          newStatus
        );

      console.log(
        '🟢 UPDATE ORDER STATUS SUCCESS:',
        response?.data
      );

      setOrder((prev) => (
        prev
          ? {
              ...prev,
              status: newStatus,
            }
          : prev
      ));

      Alert.alert(
        'تم بنجاح',
        `تم تحديث حالة الطلب إلى: ${getStatusLabel(
          newStatus
        )}`
      );
    } catch (e) {
      console.log(
        '🔴 ERROR UPDATING ORDER STATUS:',
        e?.response?.data ||
          e?.message ||
          e
      );

      const serverMsg =
        e?.response?.data?.message ||
        e?.message ||
        'تعذر تحديث حالة الطلب';

      Alert.alert(
        'خطأ',
        serverMsg
      );
    } finally {
      setUpdating(false);
    }
  };

  // ============================================================
  // ACCEPT ORDER
  // ============================================================
  //
  // ملحوظة (فيكس #1853):
  //
  // الباك إند (vendorController.js) عنده دورة حياة واحدة فقط
  // للمطعم:
  //
  //   pending -> preparing
  //
  // "restaurant_accepted" و"ready_for_pickup" مش موجودين خالص
  // في عمود status (ENUM) ولا في VENDOR_ALLOWED_ORDER_STATUSES،
  // فأي محاولة إرسالهم كانت بترجع 403 دايمًا بغض النظر عن حالة
  // الطلب. زرار "قبول الطلب" هو نفسه فعليًا خطوة "بدء التحضير"
  // من ناحية الباك إند، فبقى بيبعت 'preparing' مباشرة.
  // ============================================================

  const acceptOrder = () => {
    console.log(
      '🟢 ACCEPT ORDER PRESSED:',
      {
        orderId,
        currentStatus: order?.status,
      }
    );

    if (!orderId) {
      console.log(
        '🔴 ACCEPT ORDER: Missing orderId'
      );

      return;
    }

    if (order?.status !== 'pending') {
      console.log(
        '🔴 ACCEPT ORDER: Invalid current status:',
        order?.status
      );

      Alert.alert(
        'تنبيه',
        'لا يمكن قبول الطلب في حالته الحالية.'
      );

      return;
    }

    // ==========================================================
    // WEB
    // ==========================================================

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'هل تريد قبول الطلب والبدء في تجهيزه؟'
      );

      console.log(
        '🟡 WEB ACCEPT CONFIRM:',
        confirmed
      );

      if (confirmed) {
        updateStatus('preparing');
      }

      return;
    }

    // ==========================================================
    // MOBILE
    // ==========================================================

    Alert.alert(
      'قبول الطلب',
      'هل تريد قبول الطلب والبدء في تجهيزه؟',
      [
        {
          text: 'تراجع',
          style: 'cancel',
        },
        {
          text: 'قبول الطلب',
          onPress: () => {
            console.log(
              '🟢 ACCEPT ORDER CONFIRMED'
            );

            updateStatus('preparing');
          },
        },
      ]
    );
  };

  // ============================================================
  // STATUS LABEL
  // ============================================================
  //
  // مطابقة enum عمود orders.status في الداتابيز بالظبط:
  // pending, accepted, preparing, on_the_way, delivered, cancelled
  // ============================================================

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'طلب جديد';

      case 'accepted':
        return 'تم تعيين السائق';

      case 'preparing':
        return 'جاري التحضير';

      case 'on_the_way':
        return 'خرج للتوصيل';

      case 'delivered':
        return 'تم التسليم';

      case 'cancelled':
        return 'ملغي';

      default:
        return status || 'غير محدد';
    }
  };

  // ============================================================
  // DATE FORMAT
  // ============================================================

  const formatDate = (value) => {
    if (!value) {
      return 'غير متوفر';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ============================================================
  // FIRST VALID VALUE
  // ============================================================

  const firstValue = (...values) => (
    values.find((value) => (
      value !== undefined &&
      value !== null &&
      typeof value !== 'object' &&
      String(value).trim() !== ''
    )) || null
  );

  // ============================================================
  // LOADING
  // ============================================================

  if (!order) {
    return <LoadingSpinner />;
  }

  // ============================================================
  // DATA
  // ============================================================

  const customer =
    order.customer ||
    {};

  const address =
    order.deliveryAddress ||
    order.shippingAddress ||
    order.address ||
    {};

  const restaurant =
    order.restaurantDetails ||
    order.restaurant ||
    {};

  const driver =
    order.driverDetails ||
    order.driver ||
    {};

  const items =
    order.items ||
    order.orderItems ||
    order.order_items ||
    [];

  // ============================================================
  // ORDER NUMBER
  // ============================================================

  const orderNumber = firstValue(
    order.Id,
    order.id,
    order.orderId,
    orderId
  );

  // ============================================================
  // CUSTOMER
  // ============================================================

  const customerName = firstValue(
    order.CustomerName,
    order.customerName,
    customer.Name,
    customer.name
  ) || 'غير متوفر';

  const customerPhone = firstValue(
    order.CustomerPhone,
    order.customerPhone,
    customer.Phone,
    customer.phone,
    customer.Mobile,
    customer.mobile
  ) || 'غير متوفر';

  const customerEmail = firstValue(
    order.CustomerEmail,
    order.customerEmail,
    customer.Email,
    customer.email
  ) || 'غير متوفر';

  // ============================================================
  // RESTAURANT
  // ============================================================

  const restaurantName = firstValue(
    order.RestaurantName,
    restaurant.Name,
    restaurant.name
  ) || 'غير متوفر';

  // ============================================================
  // ADDRESS
  // ============================================================

  const addressText = firstValue(
    order.address,
    order.Address,
    order.fullAddress,
    order.FullAddress,
    address.Address,
    address.address,
    address.AddressText,
    address.FullAddress,
    address.fullAddress,
    address.Description,
    address.description
  ) || 'العنوان غير متوفر';

  const area = firstValue(
    order.area,
    order.Area,
    order.region,
    order.Region,
    address.Area,
    address.area,
    address.Region,
    address.region,
    address.District,
    address.district
  ) || 'غير متوفر';

  const latitude = firstValue(
    address.Latitude,
    address.latitude,
    order.latitude,
    order.Latitude
  ) || 'غير متوفر';

  const longitude = firstValue(
    address.Longitude,
    address.longitude,
    order.longitude,
    order.Longitude
  ) || 'غير متوفر';

  // ============================================================
  // DRIVER
  // ============================================================

  const driverName = firstValue(
    driver.Name,
    driver.name,
    driver.FullName,
    driver.fullName,
    driver.UserName,
    driver.username
  ) || 'لم يتم تعيين سائق';

  const driverPhone = firstValue(
    driver.Phone,
    driver.phone,
    driver.Mobile,
    driver.mobile
  ) || 'غير متوفر';

  const driverId = firstValue(
    order.AssignedDriverId,
    order.assignedDriverId,
    driver.Id,
    driver.id
  ) || 'لم يتم التعيين';

  // ============================================================
  // PRICES
  // ============================================================

  const totalPrice = Number(
    firstValue(
      order.total_price,
      order.totalPrice,
      order.total,
      order.GrandTotal,
      order.grandTotal
    ) || 0
  );

  const deliveryFee = Number(
    firstValue(
      order.delivery_fee,
      order.deliveryFee,
      order.DeliveryFee,
      order.deliveryCost,
      order.delivery_cost
    ) || 0
  );

  const serviceFee = Number(
    firstValue(
      order.service_fee,
      order.serviceFee,
      order.ServiceFee,
      order.application_fee,
      order.applicationFee,
      order.serviceCharge,
      order.service_charge
    ) || 0
  );

  const discountAmount = Number(
    firstValue(
      order.discount_amount,
      order.discountAmount,
      order.DiscountAmount
    ) || 0
  );

  const subtotal = Number(
    firstValue(
      order.subtotal,
      order.subTotal,
      order.Subtotal,
      order.itemsPrice,
      order.items_price
    ) ||
      Math.max(
        totalPrice -
          deliveryFee -
          serviceFee +
          discountAmount,
        0
      )
  );

  // ============================================================
  // PAYMENT
  // ============================================================

  const paymentStatus =
    firstValue(
      order.payment_status,
      order.paymentStatus
    ) || 'غير متوفر';

  const transactionId =
    firstValue(
      order.order_reference,
      order.orderReference,
      order.transaction_id,
      order.transactionId
    ) || 'غير متوفر';

  const orderSource =
    firstValue(
      order.order_source,
      order.orderSource
    ) || 'غير متوفر';

  const paymentMethod =
    firstValue(
      order.payment_method,
      order.paymentMethod
    );

  const getPaymentMethodLabel = (method) => {
    const normalized =
      String(method || '').toLowerCase();

    if (normalized === 'cash') {
      return 'نقدي (كاش)';
    }

    if (normalized === 'wallet') {
      return 'محفظة إلكترونية';
    }

    if (
      normalized === 'online' ||
      normalized === 'card'
    ) {
      return 'دفع أونلاين';
    }

    return 'غير محدد';
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >

      {/* ======================================================
          ORDER HEADER
      ======================================================= */}

      <View style={styles.card}>

        <View style={styles.headerRow}>

          <Text style={styles.title}>
            طلب #{orderNumber}
          </Text>

          <View style={styles.statusBadge}>

            <Text style={styles.status}>
              {getStatusLabel(order.status)}
            </Text>

          </View>

        </View>

        <InfoRow
          label="تاريخ الطلب"
          value={formatDate(
            order.CreatedAt ||
            order.createdAt
          )}
        />

        <InfoRow
          label="آخر تحديث"
          value={formatDate(
            order.UpdatedAt ||
            order.updatedAt
          )}
        />

        <InfoRow
          label="نوع الطلب"
          value={
            order.OrderType ||
            order.orderType ||
            'غير متوفر'
          }
        />

      </View>

      {/* ======================================================
          CUSTOMER
      ======================================================= */}

      <SectionTitle title="بيانات صاحب الطلب" />

      <View style={styles.card}>

        <InfoRow
          label="الاسم"
          value={customerName}
        />

        <InfoRow
          label="الهاتف"
          value={customerPhone}
        />

        <InfoRow
          label="البريد الإلكتروني"
          value={customerEmail}
        />

        <InfoRow
          label="معرّف العميل"
          value={
            order.user_id ||
            order.userId ||
            customer.Id ||
            customer.id ||
            'غير متوفر'
          }
        />

      </View>

      {/* ======================================================
          DELIVERY ADDRESS
      ======================================================= */}

      <SectionTitle title="عنوان التوصيل" />

      <View style={styles.card}>

        <InfoRow
          label="العنوان"
          value={addressText}
        />

        <InfoRow
          label="المنطقة"
          value={area}
        />

        <InfoRow
          label="الهاتف في العنوان"
          value={
            address.Phone ||
            address.phone ||
            customerPhone
          }
        />

        <InfoRow
          label="خط العرض"
          value={latitude}
        />

        <InfoRow
          label="خط الطول"
          value={longitude}
        />

      </View>

      {/* ======================================================
          RESTAURANT
      ======================================================= */}

      <SectionTitle title="بيانات المطعم" />

      <View style={styles.card}>

        <InfoRow
          label="اسم المطعم"
          value={restaurantName}
        />

        <InfoRow
          label="معرّف المطعم"
          value={
            order.restaurant_id ||
            order.restaurantId ||
            restaurant.Id ||
            restaurant.id ||
            'غير متوفر'
          }
        />

        <InfoRow
          label="عنوان المطعم"
          value={
            restaurant.Address ||
            restaurant.address ||
            'غير متوفر'
          }
        />

        <InfoRow
          label="هاتف المطعم"
          value={
            restaurant.Phone ||
            restaurant.phone ||
            'غير متوفر'
          }
        />

      </View>

      {/* ======================================================
          DELIVERY
      ======================================================= */}

      <SectionTitle title="بيانات التوصيل" />

      <View style={styles.card}>

        <InfoRow
          label="السائق"
          value={driverName}
        />

        <InfoRow
          label="هاتف السائق"
          value={driverPhone}
        />

        <InfoRow
          label="معرّف السائق"
          value={driverId}
        />

      </View>

      {/* ======================================================
          ORDER ITEMS
      ======================================================= */}

      <SectionTitle title="محتويات الطلب" />

      <View style={styles.card}>

        {items.length === 0 ? (

          <Text style={styles.emptyText}>
            لا توجد منتجات في هذا الطلب
          </Text>

        ) : (

          items.map((item, index) => {

            const quantity = Number(
              firstValue(
                item.quantity,
                item.qty,
                item.Quantity
              ) || 1
            );

            const price = Number(
              firstValue(
                item.price,
                item.Price,
                item.unitPrice
              ) || 0
            );

            const itemName = firstValue(
              item.ItemName,
              item.itemName,
              item.name,
              item.Name,
              item.productName,
              item.product?.name,
              item.product?.Name
            ) || 'منتج';

            return (

              <View
                key={
                  item.Id ||
                  item.id ||
                  index
                }
                style={styles.itemRow}
              >

                <View style={styles.itemInfo}>

                  <Text style={styles.itemName}>
                    {itemName}
                  </Text>

                  <Text style={styles.itemMeta}>
                    الكمية: {quantity} ×{' '}
                    {price.toFixed(2)} ج.م
                  </Text>

                </View>

                <Text style={styles.itemPrice}>
                  {(quantity * price).toFixed(2)} ج.م
                </Text>

              </View>

            );
          })

        )}

      </View>

      {/* ======================================================
          PRICE SUMMARY
      ======================================================= */}

      <SectionTitle title="ملخص الحساب" />

      <View style={styles.card}>

        <InfoRow
          label="قيمة المنتجات"
          value={`${subtotal.toFixed(2)} ج.م`}
        />

        <InfoRow
          label="رسوم التوصيل"
          value={`${deliveryFee.toFixed(2)} ج.م`}
        />

        <InfoRow
          label="رسوم الخدمة"
          value={`${serviceFee.toFixed(2)} ج.م`}
        />

        {discountAmount > 0 && (

          <InfoRow
            label="الخصم"
            value={`-${discountAmount.toFixed(2)} ج.م`}
          />

        )}

        <InfoRow
          label="الإجمالي النهائي"
          value={`${totalPrice.toFixed(2)} ج.م`}
          strong
        />

      </View>

      {/* ======================================================
          PAYMENT
      ======================================================= */}

      <SectionTitle title="الدفع" />

      <View style={styles.card}>

        <InfoRow
          label="طريقة الدفع"
          value={getPaymentMethodLabel(
            paymentMethod
          )}
        />

        <InfoRow
          label="حالة الدفع"
          value={paymentStatus}
        />

        <InfoRow
          label="رقم المعاملة"
          value={transactionId}
        />

        <InfoRow
          label="مصدر الطلب"
          value={orderSource}
        />

      </View>

      {/* ======================================================
          VENDOR ACTIONS
      ======================================================= */}

      {/*
        FLOW (فيكس #1853 — مطابق لباك إند vendorController.js):

        pending
          ↓  (المطعم يضغط "قبول الطلب" -> status = 'preparing')
        preparing
          ↓  (السائق / نظام الديسباتش يكمل preparing -> on_the_way)
        on_the_way
          ↓
        delivered

        المطعم عنده إجراء واحد بس متاح له: نقل الطلب من
        pending إلى preparing. أي خطوة بعد كده (on_the_way,
        delivered) بتتم من السائق أو النظام، مش من شاشة المطعم.

        accepted:
        معناها أن الديسباتش قام بتعيين/قبول السائق،
        وليست قبول المطعم.
      */}

      {/* ======================================================
          ACCEPT ORDER (pending -> preparing)
      ======================================================= */}

      {order.status === 'pending' && (

        <View style={styles.actionContainer}>

          <Button
            title="قبول الطلب"
            onPress={acceptOrder}
            loading={updating}
          />

          <View style={styles.actionHint}>

            <Text style={styles.actionHintText}>
              بعد قبول الطلب سيبدأ التحضير مباشرة.
            </Text>

          </View>

        </View>

      )}

      {/* ======================================================
          NO ACTION REQUIRED
          (preparing, on_the_way, delivered, cancelled)
      ====================================================== */}

      {(
        order.status === 'preparing' ||
        order.status === 'accepted' ||
        order.status === 'on_the_way' ||
        order.status === 'delivered' ||
        order.status === 'cancelled'
      ) && (

        <View style={styles.infoBox}>

          <Text style={styles.infoBoxTitle}>
            حالة الطلب
          </Text>

          <Text style={styles.infoBoxText}>
            {getStatusLabel(order.status)}
          </Text>

          <Text style={styles.infoBoxHint}>
            لا توجد إجراءات مطلوبة من المطعم في هذه المرحلة.
          </Text>

        </View>

      )}

    </ScrollView>
  );
}

// ============================================================
// SECTION TITLE
// ============================================================

function SectionTitle({ title }) {
  return (
    <Text style={styles.sectionTitle}>
      {title}
    </Text>
  );
}

// ============================================================
// INFO ROW
// ============================================================

function InfoRow({
  label,
  value,
  strong = false,
}) {
  return (
    <View style={styles.infoRow}>

      <Text
        style={[
          styles.infoValue,
          strong && styles.strongValue,
        ]}
      >
        {String(
          value ?? 'غير متوفر'
        )}
      </Text>

      <Text
        style={[
          styles.infoLabel,
          strong && styles.strongLabel,
        ]}
      >
        {label}
      </Text>

    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  container: {
    flexGrow: 1,

    padding:
      SPACING?.lg ||
      20,

    paddingBottom: 40,

    backgroundColor:
      COLORS?.background ||
      '#F3F4F6',
  },

  card: {
    backgroundColor:
      COLORS?.white ||
      '#FFFFFF',

    borderRadius:
      RADIUS?.md ||
      12,

    padding:
      SPACING?.lg ||
      20,

    marginBottom:
      SPACING?.lg ||
      20,

    elevation: 2,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity: 0.05,

    shadowRadius: 3,
  },

  headerRow: {
    flexDirection: 'row',

    justifyContent:
      'space-between',

    alignItems: 'center',

    marginBottom:
      SPACING?.sm ||
      8,
  },

  title: {
    flex: 1,

    fontSize:
      FONT_SIZES?.xl ||
      20,

    fontWeight: '700',

    textAlign: 'right',

    color: '#1F2937',
  },

  statusBadge: {
    paddingHorizontal: 10,

    paddingVertical: 6,

    borderRadius: 8,

    backgroundColor:
      '#FFF7ED',
  },

  status: {
    color:
      COLORS?.primary ||
      '#F97316',

    textAlign: 'left',

    marginRight:
      SPACING?.sm ||
      8,

    fontWeight: '700',

    fontSize:
      FONT_SIZES?.sm ||
      14,
  },

  sectionTitle: {
    fontSize:
      FONT_SIZES?.md ||
      16,

    fontWeight: '700',

    marginBottom:
      SPACING?.sm ||
      8,

    textAlign: 'right',

    color: '#1F2937',
  },

  infoRow: {
    flexDirection: 'row',

    justifyContent:
      'space-between',

    alignItems:
      'flex-start',

    borderBottomWidth: 1,

    borderBottomColor:
      '#F1F5F9',

    paddingVertical:
      SPACING?.xs ||
      8,

    gap: 12,
  },

  infoLabel: {
    flex: 1,

    textAlign: 'right',

    color: '#6B7280',

    fontSize:
      FONT_SIZES?.sm ||
      14,
  },

  infoValue: {
    flex: 1.5,

    textAlign: 'left',

    color: '#374151',

    fontSize:
      FONT_SIZES?.sm ||
      14,
  },

  strongLabel: {
    color: '#111827',

    fontWeight: '700',
  },

  strongValue: {
    color:
      COLORS?.primary ||
      '#F97316',

    fontWeight: '700',
  },

  itemRow: {
    flexDirection: 'row',

    justifyContent:
      'space-between',

    alignItems:
      'center',

    paddingVertical:
      SPACING?.sm ||
      10,

    borderBottomWidth: 1,

    borderBottomColor:
      '#E5E7EB',
  },

  itemInfo: {
    flex: 1,

    alignItems:
      'flex-end',
  },

  itemName: {
    fontSize:
      FONT_SIZES?.md ||
      15,

    color: '#374151',

    fontWeight: '600',

    textAlign: 'right',
  },

  itemMeta: {
    marginTop: 4,

    fontSize:
      FONT_SIZES?.xs ||
      12,

    color: '#6B7280',

    textAlign: 'right',
  },

  itemPrice: {
    marginRight:
      SPACING?.sm ||
      8,

    fontSize:
      FONT_SIZES?.md ||
      15,

    fontWeight: '700',

    color: '#1F2937',
  },

  emptyText: {
    textAlign: 'right',

    color: '#6B7280',

    paddingVertical:
      SPACING?.sm ||
      8,
  },

  actionContainer: {
    marginTop: 4,

    marginBottom: 12,
  },

  actionHint: {
    marginTop: 10,

    alignItems: 'center',
  },

  actionHintText: {
    color: '#6B7280',

    fontSize:
      FONT_SIZES?.xs ||
      12,

    textAlign: 'center',
  },

  infoBox: {
    backgroundColor:
      '#FFFFFF',

    borderRadius:
      RADIUS?.md ||
      12,

    padding:
      SPACING?.lg ||
      20,

    marginBottom: 20,

    borderWidth: 1,

    borderColor:
      '#E5E7EB',

    alignItems:
      'center',
  },

  infoBoxTitle: {
    fontSize: 16,

    fontWeight: '700',

    color: '#1F2937',

    marginBottom: 6,
  },

  infoBoxText: {
    fontSize: 15,

    fontWeight: '700',

    color:
      COLORS?.primary ||
      '#F97316',

    marginBottom: 6,
  },

  infoBoxHint: {
    fontSize: 13,

    color: '#6B7280',

    textAlign: 'center',

    lineHeight: 20,
  },

});