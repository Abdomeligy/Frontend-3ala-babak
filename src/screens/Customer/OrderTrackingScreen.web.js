import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { orderApi } from '../../api/orderApi';
import { useSocket } from '../../context/SocketContext';

// ==========================================
// LEAFLET
// ==========================================

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';

import L from 'leaflet';

// منع Leaflet من محاولة تحميل صور الـ default
delete L.Icon.Default.prototype._getIconUrl;

// ==========================================
// LEAFLET CSS
// ==========================================

const injectLeafletCSS = () => {
  if (typeof document === 'undefined') {
    return;
  }

  const existingLink =
    document.getElementById('leaflet-css');

  if (existingLink) {
    return;
  }

  const link = document.createElement('link');

  link.id = 'leaflet-css';
  link.rel = 'stylesheet';

  // مهم: URL حقيقي وليس Markdown
  link.href =
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

  document.head.appendChild(link);
};

// ==========================================
// CUSTOM MARKERS
// ==========================================

// 🏪 المطعم
const restaurantIcon = L.divIcon({
  className: 'custom-pin-wrap',

  html: `
    <div
      style="
        position: relative;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
      "
    >
      <div
        style="
          position: absolute;
          width: 46px;
          height: 46px;
          background: rgba(16, 185, 129, 0.18);
          border-radius: 50%;
        "
      ></div>

      <div
        style="
          width: 38px;
          height: 38px;
          background: linear-gradient(
            135deg,
            #10B981 0%,
            #059669 100%
          );
          border-radius: 12px;
          transform: rotate(45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 8px 18px rgba(16, 185, 129, 0.4);
          border: 2px solid #FFFFFF;
        "
      >
        <span
          style="
            transform: rotate(-45deg);
            font-size: 18px;
          "
        >
          👨‍🍳
        </span>
      </div>
    </div>
  `,

  iconSize: [50, 50],
  iconAnchor: [25, 25],
  popupAnchor: [0, -20],
});

// 🏠 العميل
const customerIcon = L.divIcon({
  className: 'custom-pin-wrap',

  html: `
    <div
      style="
        position: relative;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
      "
    >
      <div
        style="
          position: absolute;
          width: 46px;
          height: 46px;
          background: rgba(99, 102, 241, 0.18);
          border-radius: 50%;
        "
      ></div>

      <div
        style="
          width: 38px;
          height: 38px;
          background: linear-gradient(
            135deg,
            #6366F1 0%,
            #4F46E5 100%
          );
          border-radius: 12px;
          transform: rotate(45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 8px 18px rgba(99, 102, 241, 0.4);
          border: 2px solid #FFFFFF;
        "
      >
        <span
          style="
            transform: rotate(-45deg);
            font-size: 18px;
          "
        >
          📍
        </span>
      </div>
    </div>
  `,

  iconSize: [50, 50],
  iconAnchor: [25, 25],
  popupAnchor: [0, -20],
});

// 🛵 السائق
const driverIcon = L.divIcon({
  className: 'custom-pin-wrap',

  html: `
    <div
      style="
        position: relative;
        width: 64px;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: center;
      "
    >
      <div
        style="
          position: absolute;
          width: 60px;
          height: 60px;
          background: rgba(249, 115, 22, 0.22);
          border-radius: 50%;
          animation: radarPulse 1.8s infinite ease-out;
        "
      ></div>

      <div
        style="
          position: relative;
          width: 46px;
          height: 46px;
          background: linear-gradient(
            135deg,
            #FF7E47 0%,
            #F97316 100%
          );
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 10px 22px rgba(249, 115, 22, 0.5);
          border: 3px solid #FFFFFF;
          z-index: 2;
        "
      >
        <span style="font-size: 22px;">
          🛵
        </span>
      </div>
    </div>

    <style>
      @keyframes radarPulse {
        0% {
          transform: scale(0.6);
          opacity: 0.9;
        }

        100% {
          transform: scale(1.3);
          opacity: 0;
        }
      }
    </style>
  `,

  iconSize: [64, 64],
  iconAnchor: [32, 32],
  popupAnchor: [0, -25],
});

// ==========================================
// HELPERS
// ==========================================

const isValidCoordinate = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return false;
  }

  const number = Number(value);

  return Number.isFinite(number);
};

// ==========================================
// EXTRACT COORDINATES
// ==========================================

const extractCoordinates = (source) => {
  if (
    !source ||
    typeof source !== 'object'
  ) {
    return null;
  }

  // ========================================
  // latitude / longitude
  // ========================================

  const latitude =
    source.latitude ??
    source.Latitude ??
    source.lat ??
    source.Lat ??
    source.driver_lat ??
    source.driverLatitude ??
    source.driverLat ??
    source.pickupLat ??
    source.dropoffLat;

  const longitude =
    source.longitude ??
    source.Longitude ??
    source.lng ??
    source.Lng ??
    source.lon ??
    source.Long ??
    source.driver_lng ??
    source.driverLongitude ??
    source.driverLng ??
    source.pickupLng ??
    source.dropoffLng;

  if (
    isValidCoordinate(latitude) &&
    isValidCoordinate(longitude)
  ) {
    return {
      latitude: Number(latitude),
      longitude: Number(longitude),
    };
  }

  // ========================================
  // GeoJSON coordinates [lng, lat]
  // ========================================

  if (
    Array.isArray(source.coordinates) &&
    source.coordinates.length >= 2
  ) {
    const lng = Number(
      source.coordinates[0]
    );

    const lat = Number(
      source.coordinates[1]
    );

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      return {
        latitude: lat,
        longitude: lng,
      };
    }
  }

  // ========================================
  // location
  // ========================================

  if (source.location) {
    const nested =
      extractCoordinates(
        source.location
      );

    if (nested) {
      return nested;
    }
  }

  // ========================================
  // coordinates object
  // ========================================

  if (
    source.coordinates &&
    typeof source.coordinates === 'object' &&
    !Array.isArray(source.coordinates)
  ) {
    const nested =
      extractCoordinates(
        source.coordinates
      );

    if (nested) {
      return nested;
    }
  }

  return null;
};

// ==========================================
// EXTRACT ORDER
// ==========================================

const extractOrderData = (response) => {
  console.log(
    '📦 RAW ORDER RESPONSE:',
    response
  );

  let data = response?.data;

  // Axios:
  // response.data.data
  if (
    data?.data &&
    typeof data.data === 'object'
  ) {
    data = data.data;
  }

  // response.data.order
  if (
    data?.order &&
    typeof data.order === 'object'
  ) {
    data = data.order;
  }

  // response.data.formattedOrder
  if (
    data?.formattedOrder &&
    typeof data.formattedOrder === 'object'
  ) {
    data = data.formattedOrder;
  }

  return data || null;
};

// ==========================================
// STATUS
// ==========================================

const STATUS_STEPS = [
  'pending',
  'accepted',
  'preparing',
  'on_the_way',
  'delivered',
];

const STATUS_LABELS = {
  pending: 'قيد الانتظار والموافقة',
  accepted: 'تم قبول الطلب',
  preparing: 'جاري إعداد الوجبة 🍳',
  on_the_way: 'الكابتن في الطريق إليك 🛵',
  delivered: 'تم التوصيل بنجاح 🎉',
  cancelled: 'تم إلغاء الطلب ❌',
};

const CANCELLABLE_STATUSES = [
  'pending',
  'accepted',
];

// ==========================================
// AUTO FIT
// ==========================================

function AutoFitBounds({
  pickup,
  dropoff,
  driver,
}) {
  const map = useMap();

  useEffect(() => {
    const points = [];

    if (
      Array.isArray(pickup) &&
      pickup.length === 2 &&
      Number.isFinite(pickup[0]) &&
      Number.isFinite(pickup[1])
    ) {
      points.push(pickup);
    }

    if (
      Array.isArray(dropoff) &&
      dropoff.length === 2 &&
      Number.isFinite(dropoff[0]) &&
      Number.isFinite(dropoff[1])
    ) {
      points.push(dropoff);
    }

    if (
      Array.isArray(driver) &&
      driver.length === 2 &&
      Number.isFinite(driver[0]) &&
      Number.isFinite(driver[1])
    ) {
      points.push(driver);
    }

    if (points.length === 0) {
      return;
    }

    try {
      if (points.length === 1) {
        map.setView(
          points[0],
          16,
          {
            animate: true,
          }
        );

        return;
      }

      const bounds =
        L.latLngBounds(points);

      map.fitBounds(
        bounds,
        {
          padding: [80, 80],
          maxZoom: 16,
          animate: true,
        }
      );
    } catch (error) {
      console.log(
        '⚠️ AutoFitBounds error:',
        error
      );
    }
  }, [
    pickup?.[0],
    pickup?.[1],
    dropoff?.[0],
    dropoff?.[1],
    driver?.[0],
    driver?.[1],
    map,
  ]);

  return null;
}

// ==========================================
// MAP CONTROLLER
// ==========================================

function MapController({
  pickup,
  dropoff,
  driver,
}) {
  const map = useMap();

  useEffect(() => {
    const centerMap = () => {
      const points = [];

      if (
        pickup &&
        Number.isFinite(pickup[0]) &&
        Number.isFinite(pickup[1])
      ) {
        points.push(pickup);
      }

      if (
        dropoff &&
        Number.isFinite(dropoff[0]) &&
        Number.isFinite(dropoff[1])
      ) {
        points.push(dropoff);
      }

      if (
        driver &&
        Number.isFinite(driver[0]) &&
        Number.isFinite(driver[1])
      ) {
        points.push(driver);
      }

      if (points.length === 0) {
        return;
      }

      if (points.length === 1) {
        map.setView(
          points[0],
          16,
          {
            animate: true,
          }
        );

        return;
      }

      const bounds =
        L.latLngBounds(points);

      map.fitBounds(
        bounds,
        {
          padding: [80, 80],
          maxZoom: 16,
          animate: true,
        }
      );
    };

    if (
      typeof window !== 'undefined'
    ) {
      window.__centerOrderMap =
        centerMap;
    }

    return () => {
      if (
        typeof window !== 'undefined'
      ) {
        delete window.__centerOrderMap;
      }
    };
  }, [
    pickup,
    dropoff,
    driver,
    map,
  ]);

  return null;
}

// ==========================================
// SCREEN
// ==========================================

export default function OrderTrackingScreen({
  route,
  navigation,
}) {
  const { orderId } =
    route.params || {};

  const { socket } =
    useSocket();

  const [order, setOrder] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [cancelling, setCancelling] =
    useState(false);

  // ========================================
  // CSS
  // ========================================

  useEffect(() => {
    injectLeafletCSS();
  }, []);

  // ========================================
  // LOAD ORDER
  // ========================================

  const loadTracking =
    useCallback(
      async () => {
        if (!orderId) {
          console.log(
            '❌ OrderTracking: orderId غير موجود'
          );

          setLoading(false);

          return;
        }

        try {
          console.log(
            `🔍 Loading order #${orderId}`
          );

          const response =
            await orderApi.getOrderById(
              orderId
            );

          const orderData =
            extractOrderData(
              response
            );

          console.log(
            '📦 ORDER DATA:',
            orderData
          );

          if (!orderData) {
            console.log(
              '❌ لم يتم العثور على بيانات الأوردر'
            );

            return;
          }

          setOrder(orderData);

          // ==================================
          // DEBUG COORDINATES
          // ==================================

          console.log(
            '📍 ORDER COORDINATES:',
            {
              pickupLat:
                orderData?.pickupLat,

              pickupLng:
                orderData?.pickupLng,

              dropoffLat:
                orderData?.dropoffLat,

              dropoffLng:
                orderData?.dropoffLng,

              driver_lat:
                orderData?.driver_lat,

              driver_lng:
                orderData?.driver_lng,

              restaurant:
                orderData?.restaurant,

              customer:
                orderData?.customer,

              driver:
                orderData?.driver,

              Driver:
                orderData?.Driver,
            }
          );
        } catch (err) {
          console.log(
            '❌ Error fetching order tracking:',
            err?.response?.data ||
              err?.message ||
              err
          );
        } finally {
          setLoading(false);
        }
      },
      [orderId]
    );

  // ========================================
  // LOAD EFFECT
  // ========================================

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!mounted) {
        return;
      }

      await loadTracking();
    };

    run();

    return () => {
      mounted = false;
    };
  }, [loadTracking]);

  // ========================================
  // SOCKET
  // ========================================

  useEffect(() => {
    if (
      !socket ||
      !orderId
    ) {
      return;
    }

    console.log(
      '🔌 Tracking socket ready:',
      {
        socketId: socket.id,
        orderId,
        connected:
          socket.connected,
      }
    );

    // ======================================
    // JOIN ORDER
    // ======================================

    // الانضمام للغرفة بالحدث المطابق لمعالج السيرفر
    socket.emit(
      'driver_join_order_room',
      {
        orderId:
          String(orderId),
      }
    );

    // توافق مع النسخ القديمة من السيرفر
    socket.emit(
      'join:order',
      {
        orderId:
          String(orderId),
      }
    );

    // ======================================
    // STATUS UPDATE
    // ======================================

    const handleStatusUpdate =
      (data) => {
        console.log(
          '🎉 ORDER STATUS:',
          data
        );

        const newStatus =
          data?.status ||
          data?.orderStatus ||
          data;

        if (!newStatus) {
          return;
        }

        setOrder(
          (prev) =>
            prev
              ? {
                  ...prev,
                  status:
                    newStatus,
                }
              : prev
        );
      };

    // ======================================
    // DRIVER LOCATION
    // ======================================

    const handleLocationUpdate =
      (data) => {
        console.log(
          '📍 DRIVER LOCATION:',
          data
        );

        const coords =
          extractCoordinates(
            data
          );

        if (!coords) {
          console.log(
            '⚠️ Driver location بدون coordinates:',
            data
          );

          return;
        }

        setOrder(
          (prev) => {
            if (!prev) {
              return prev;
            }

            return {
              ...prev,

              driver_lat:
                coords.latitude,

              driver_lng:
                coords.longitude,

              driver:
                prev.driver
                  ? {
                      ...prev.driver,

                      lat:
                        coords.latitude,

                      lng:
                        coords.longitude,

                      latitude:
                        coords.latitude,

                      longitude:
                        coords.longitude,
                    }
                  : {
                      lat:
                        coords.latitude,

                      lng:
                        coords.longitude,

                      latitude:
                        coords.latitude,

                      longitude:
                        coords.longitude,
                    },
            };
          }
        );
      };

    // ======================================
    // PAYMENT
    // ======================================

    const handlePaymentCompleted =
      (data) => {
        console.log(
          '💰 PAYMENT COMPLETED:',
          data
        );

        const paidOrderId =
          data?.orderId ??
          data?.order_id ??
          data?.id;

        if (
          String(
            paidOrderId
          ) !==
          String(orderId)
        ) {
          return;
        }

        setOrder(
          (prev) =>
            prev
              ? {
                  ...prev,

                  payment_status:
                    'paid',

                  status:
                    data?.status ||
                    prev.status ||
                    'accepted',
                }
              : prev
        );
      };

    // ======================================
    // LISTENERS
    // ======================================

    socket.on(
      `order:${orderId}:status`,
      handleStatusUpdate
    );

    socket.on(
      `order:${orderId}:location`,
      handleLocationUpdate
    );

    socket.on(
      `order:${orderId}:driverLocation`,
      handleLocationUpdate
    );

    // الحدث الفعلي الذي يبثه driverTracking.js
    socket.on(
      'driver_live_location',
      handleLocationUpdate
    );

    socket.on(
      'driver:location:update',
      handleLocationUpdate
    );

    socket.on(
      'driver_location_updated',
      handleLocationUpdate
    );

    socket.on(
      'payment_completed',
      handlePaymentCompleted
    );

    // ======================================
    // CLEANUP
    // ======================================

    return () => {
      console.log(
        `🧹 Leaving order room #${orderId}`
      );

      socket.emit(
        'leave:order',
        {
          orderId:
            String(orderId),
        }
      );

      socket.off(
        `order:${orderId}:status`,
        handleStatusUpdate
      );

      socket.off(
        `order:${orderId}:location`,
        handleLocationUpdate
      );

      socket.off(
        `order:${orderId}:driverLocation`,
        handleLocationUpdate
      );

      socket.off(
        'driver_live_location',
        handleLocationUpdate
      );

      socket.off(
        'driver:location:update',
        handleLocationUpdate
      );

      socket.off(
        'driver_location_updated',
        handleLocationUpdate
      );

      socket.off(
        'payment_completed',
        handlePaymentCompleted
      );
    };
  }, [
    socket,
    orderId,
  ]);

  // ========================================
  // CALL DRIVER
  // ========================================

  const callDriver = (
    phone
  ) => {
    if (!phone) {
      return;
    }

    Linking.openURL(
      `tel:${phone}`
    );
  };

  // ========================================
  // CANCEL ORDER
  // ========================================

  const handleCancelOrder =
    () => {
      const executeCancel =
        async () => {
          try {
            setCancelling(true);

            await orderApi.cancelOrder(
              orderId
            );

            setOrder(
              (prev) =>
                prev
                  ? {
                      ...prev,
                      status:
                        'cancelled',
                    }
                  : prev
            );

            if (
              Platform.OS ===
              'web'
            ) {
              window.alert(
                'تم إلغاء الطلب بنجاح'
              );
            } else {
              Alert.alert(
                'تم',
                'تم إلغاء الطلب بنجاح'
              );
            }
          } catch (err) {
            const message =
              err?.response
                ?.data?.message ||
              'تعذر إلغاء الطلب';

            if (
              Platform.OS ===
              'web'
            ) {
              window.alert(
                message
              );
            } else {
              Alert.alert(
                'خطأ',
                message
              );
            }
          } finally {
            setCancelling(
              false
            );
          }
        };

      if (
        Platform.OS === 'web'
      ) {
        const confirmed =
          window.confirm(
            'هل أنت متأكد من إلغاء هذا الطلب؟'
          );

        if (confirmed) {
          executeCancel();
        }

        return;
      }

      Alert.alert(
        'إلغاء الطلب',
        'هل أنت متأكد من إلغاء هذا الطلب؟',
        [
          {
            text: 'تراجع',
            style: 'cancel',
          },
          {
            text: 'إلغاء الطلب',
            style: 'destructive',
            onPress:
              executeCancel,
          },
        ]
      );
    };

  // ========================================
  // IMPORTANT
  // ========================================
  // لا يوجد أي Hook بعد هذا الـ return.
  // ده هو الإصلاح الأساسي للخطأ.
  // ========================================

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#F97316"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          جاري تحميل موقع الطلب...
        </Text>
      </View>
    );
  }

  // ========================================
  // COORDINATES
  // ========================================

  let pickupCoords = null;

  if (
    isValidCoordinate(
      order?.pickupLat
    ) &&
    isValidCoordinate(
      order?.pickupLng
    )
  ) {
    pickupCoords = {
      latitude: Number(
        order.pickupLat
      ),
      longitude: Number(
        order.pickupLng
      ),
    };
  } else {
    pickupCoords =
      extractCoordinates(
        order?.restaurant
      ) ||
      extractCoordinates(
        order?.pickup
      ) ||
      extractCoordinates(
        order?.pickupLocation
      );
  }

  // ========================================

  let dropoffCoords = null;

  if (
    isValidCoordinate(
      order?.dropoffLat
    ) &&
    isValidCoordinate(
      order?.dropoffLng
    )
  ) {
    dropoffCoords = {
      latitude: Number(
        order.dropoffLat
      ),
      longitude: Number(
        order.dropoffLng
      ),
    };
  } else {
    dropoffCoords =
      extractCoordinates(
        order?.customer
      ) ||
      extractCoordinates(
        order?.address
      ) ||
      extractCoordinates(
        order?.deliveryAddress
      ) ||
      extractCoordinates(
        order?.dropoff
      ) ||
      extractCoordinates(
        order?.dropoffLocation
      );
  }

  // ========================================

  let driverCoords = null;

  if (
    isValidCoordinate(
      order?.driver_lat
    ) &&
    isValidCoordinate(
      order?.driver_lng
    )
  ) {
    driverCoords = {
      latitude: Number(
        order.driver_lat
      ),
      longitude: Number(
        order.driver_lng
      ),
    };
  } else {
    driverCoords =
      extractCoordinates(
        order?.driver
      ) ||
      extractCoordinates(
        order?.Driver
      );
  }

  // ========================================
  // MAP POINTS
  // ========================================

  const pickupPoint =
    pickupCoords
      ? [
          pickupCoords.latitude,
          pickupCoords.longitude,
        ]
      : null;

  const dropoffPoint =
    dropoffCoords
      ? [
          dropoffCoords.latitude,
          dropoffCoords.longitude,
        ]
      : null;

  const driverPoint =
    driverCoords
      ? [
          driverCoords.latitude,
          driverCoords.longitude,
        ]
      : null;

  // ========================================
  // DEBUG
  // ========================================

  console.log(
    '🗺️ FINAL MAP COORDINATES:',
    {
      pickupPoint,
      dropoffPoint,
      driverPoint,
    }
  );

  // ========================================
  // STATUS
  // ========================================

  const currentStatus = String(
    order?.status ||
      'pending'
  ).toLowerCase();

  const isCancelled =
    currentStatus ===
    'cancelled';

  const canCancel =
    CANCELLABLE_STATUSES.includes(
      currentStatus
    );

  const currentStepIndex =
    STATUS_STEPS.indexOf(
      currentStatus
    );

  const driver =
    order?.driver ||
    order?.Driver;

  // ========================================
  // MAP CENTER
  // ========================================

  const initialCenter =
    pickupPoint ||
    dropoffPoint ||
    driverPoint || [
      30.0444,
      31.2357,
    ];

  // ========================================
  // RETURN
  // ========================================

  return (
    <View
      style={styles.container}
    >
      {/* ================================== */}
      {/* BACK BUTTON */}
      {/* ================================== */}

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() =>
          navigation.goBack()
        }
        activeOpacity={0.85}
      >
        <Ionicons
          name="arrow-forward"
          size={22}
          color="#1E293B"
        />
      </TouchableOpacity>

      {/* ================================== */}
      {/* CENTER MAP BUTTON */}
      {/* ================================== */}

      <TouchableOpacity
        style={
          styles.centerMapBtn
        }
        onPress={() => {
          if (
            typeof window !==
              'undefined' &&
            window.__centerOrderMap
          ) {
            window.__centerOrderMap();
          }
        }}
        activeOpacity={0.85}
      >
        <Ionicons
          name="locate"
          size={22}
          color="#F97316"
        />
      </TouchableOpacity>

      {/* ================================== */}
      {/* MAP */}
      {/* ================================== */}

      <View
        style={styles.mapWrapper}
      >
        <MapContainer
          center={initialCenter}
          zoom={14}
          style={styles.map}
          zoomControl={false}
        >
          <TileLayer
            attribution="&copy; Google Maps"
            url="https://mt1.google.com/vt/lyrs=m&hl=ar&x={x}&y={y}&z={z}"
            maxZoom={20}
          />

          {/* AUTO FIT */}

          <AutoFitBounds
            pickup={pickupPoint}
            dropoff={dropoffPoint}
            driver={driverPoint}
          />

          <MapController
            pickup={pickupPoint}
            dropoff={dropoffPoint}
            driver={driverPoint}
          />

          {/* ================================== */}
          {/* RESTAURANT */}
          {/* ================================== */}

          {pickupCoords && (
            <Marker
              position={[
                pickupCoords.latitude,
                pickupCoords.longitude,
              ]}
              icon={
                restaurantIcon
              }
            >
              <Popup>
                <div
                  style={{
                    fontFamily:
                      'Cairo, sans-serif',
                    textAlign:
                      'right',
                    direction:
                      'rtl',
                  }}
                >
                  <b
                    style={{
                      color:
                        '#10B981',
                      fontSize:
                        '13px',
                    }}
                  >
                    {order
                      ?.restaurant
                      ?.name ||
                      order
                        ?.restaurant_name ||
                      'المطعم'}
                  </b>

                  <div
                    style={{
                      marginTop:
                        '4px',
                      color:
                        '#64748B',
                      fontSize:
                        '11px',
                    }}
                  >
                    نقطة استلام الطلب
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* ================================== */}
          {/* CUSTOMER */}
          {/* ================================== */}

          {dropoffCoords && (
            <Marker
              position={[
                dropoffCoords.latitude,
                dropoffCoords.longitude,
              ]}
              icon={
                customerIcon
              }
            >
              <Popup>
                <div
                  style={{
                    fontFamily:
                      'Cairo, sans-serif',
                    textAlign:
                      'right',
                    direction:
                      'rtl',
                  }}
                >
                  <b
                    style={{
                      color:
                        '#6366F1',
                      fontSize:
                        '13px',
                    }}
                  >
                    عنوان التوصيل
                  </b>

                  <div
                    style={{
                      marginTop:
                        '4px',
                      color:
                        '#64748B',
                      fontSize:
                        '11px',
                    }}
                  >
                    موقع استلام العميل
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* ================================== */}
          {/* DRIVER */}
          {/* ================================== */}

          {driverCoords && (
            <Marker
              position={[
                driverCoords.latitude,
                driverCoords.longitude,
              ]}
              icon={
                driverIcon
              }
            >
              <Popup>
                <div
                  style={{
                    fontFamily:
                      'Cairo, sans-serif',
                    textAlign:
                      'right',
                    direction:
                      'rtl',
                  }}
                >
                  <b
                    style={{
                      color:
                        '#F97316',
                      fontSize:
                        '13px',
                    }}
                  >
                    مندوب التوصيل
                  </b>

                  <div
                    style={{
                      marginTop:
                        '4px',
                      color:
                        '#64748B',
                      fontSize:
                        '11px',
                    }}
                  >
                    موقع الكابتن الحالي
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* ================================== */}
        {/* NO COORDINATES */}
        {/* ================================== */}

        {!pickupCoords &&
          !dropoffCoords &&
          !driverCoords && (
            <View
              style={
                styles.mapWarning
              }
            >
              <Ionicons
                name="location-outline"
                size={22}
                color="#F97316"
              />

              <Text
                style={
                  styles.mapWarningText
                }
              >
                لم تصل إحداثيات الطلب من السيرفر
              </Text>
            </View>
          )}
      </View>

      {/* ================================== */}
      {/* BOTTOM SHEET */}
      {/* ================================== */}

      <View
        style={
          styles.bottomSheetCard
        }
      >
        <View
          style={
            styles.dragHandle
          }
        />

        {/* ================================== */}
        {/* ETA */}
        {/* ================================== */}

        {!isCancelled && (
          <View
            style={
              styles.etaBanner
            }
          >
            <View
              style={
                styles.etaInfo
              }
            >
              <Text
                style={
                  styles.etaTitle
                }
              >
                الوقت المتوقع للوصول
              </Text>

              <Text
                style={
                  styles.etaTime
                }
              >
                20 - 30 دقيقة
              </Text>
            </View>

            <View
              style={
                styles.etaIconContainer
              }
            >
              <Ionicons
                name="time"
                size={24}
                color="#F97316"
              />
            </View>
          </View>
        )}

        {/* ================================== */}
        {/* STATUS */}
        {/* ================================== */}

        <View
          style={
            styles.statusHeader
          }
        >
          <Text
            style={[
              styles.statusTitle,
              isCancelled &&
                styles.cancelledText,
            ]}
          >
            {STATUS_LABELS[
              currentStatus
            ] ||
              'متابعة الطلب...'}
          </Text>

          <Text
            style={
              styles.orderIdBadge
            }
          >
            #{' '}
            {order?.id ||
              order?.Id ||
              orderId}
          </Text>
        </View>

        {/* ================================== */}
        {/* STEPPER */}
        {/* ================================== */}

        {!isCancelled && (
          <View
            style={
              styles.stepperContainer
            }
          >
            {STATUS_STEPS.map(
              (
                step,
                i
              ) => {
                const isActive =
                  currentStepIndex >=
                    0 &&
                  i <=
                    currentStepIndex;

                return (
                  <React.Fragment
                    key={step}
                  >
                    <View
                      style={[
                        styles.stepDot,
                        isActive &&
                          styles.stepDotActive,
                      ]}
                    >
                      {isActive ? (
                        <Ionicons
                          name="checkmark"
                          size={12}
                          color="#FFFFFF"
                        />
                      ) : (
                        <View
                          style={
                            styles.innerDot
                          }
                        />
                      )}
                    </View>

                    {i <
                      STATUS_STEPS.length -
                        1 && (
                      <View
                        style={[
                          styles.stepLine,
                          i <
                            currentStepIndex &&
                            styles.stepLineActive,
                        ]}
                      />
                    )}
                  </React.Fragment>
                );
              }
            )}
          </View>
        )}

        {/* ================================== */}
        {/* DRIVER CARD */}
        {/* ================================== */}

        {driver &&
          !isCancelled && (
            <View
              style={
                styles.driverBox
              }
            >
              <View
                style={
                  styles.driverInfo
                }
              >
                <View
                  style={
                    styles.avatarWrap
                  }
                >
                  <Ionicons
                    name="person"
                    size={22}
                    color="#F97316"
                  />
                </View>

                <View
                  style={{
                    alignItems:
                      'flex-start',
                  }}
                >
                  <Text
                    style={
                      styles.driverName
                    }
                  >
                    {driver.name ||
                      driver.Name ||
                      'كابتن التوصيل'}
                  </Text>

                  <View
                    style={
                      styles.ratingBadge
                    }
                  >
                    <Ionicons
                      name="star"
                      size={12}
                      color="#F59E0B"
                    />

                    <Text
                      style={
                        styles.ratingText
                      }
                    >
                      4.9 • كابتن متميز
                    </Text>
                  </View>
                </View>
              </View>

              {(driver.phone ||
                driver.phone_number) && (
                <TouchableOpacity
                  style={
                    styles.callButton
                  }
                  onPress={() =>
                    callDriver(
                      driver.phone ||
                        driver.phone_number
                    )
                  }
                  activeOpacity={
                    0.8
                  }
                >
                  <Ionicons
                    name="call"
                    size={18}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

        {/* ================================== */}
        {/* DEBUG COORDINATES */}
        {/* ================================== */}

        {!pickupCoords ||
        !dropoffCoords ? (
          <View
            style={
              styles.debugInfo
            }
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#64748B"
            />

            <Text
              style={
                styles.debugText
              }
            >
              {!pickupCoords &&
              !dropoffCoords
                ? 'موقع المطعم وعنوان التوصيل غير متوفرين'
                : !pickupCoords
                ? 'موقع المطعم غير متوفر'
                : 'موقع عنوان التوصيل غير متوفر'}
            </Text>
          </View>
        ) : null}

        {/* ================================== */}
        {/* CANCEL */}
        {/* ================================== */}

        {canCancel &&
          !isCancelled && (
            <TouchableOpacity
              style={[
                styles.cancelButton,
                cancelling &&
                  styles.cancelDisabled,
              ]}
              onPress={
                handleCancelOrder
              }
              activeOpacity={0.8}
              disabled={
                cancelling
              }
            >
              {cancelling ? (
                <ActivityIndicator
                  color="#EF4444"
                  size="small"
                />
              ) : (
                <>
                  <Ionicons
                    name="close-circle-outline"
                    size={19}
                    color="#EF4444"
                  />

                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    إلغاء الطلب
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
      </View>
    </View>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      '#FFFFFF',
  },

  loadingContainer: {
    flex: 1,
    justifyContent:
      'center',
    alignItems:
      'center',
    backgroundColor:
      '#FFFFFF',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },

  mapWrapper: {
    flex: 1,
    position: 'relative',
  },

  map: {
    width: '100%',
    height: '100%',
  },

  backBtn: {
    position: 'absolute',

    top:
      Platform.OS === 'ios'
        ? 24
        : 20,

    right: 20,

    backgroundColor:
      '#FFFFFF',

    width: 46,
    height: 46,

    borderRadius: 23,

    justifyContent:
      'center',

    alignItems:
      'center',

    zIndex: 2000,

    elevation: 8,

    shadowColor:
      '#000',

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity:
      0.15,

    shadowRadius: 8,
  },

  centerMapBtn: {
    position: 'absolute',

    top:
      Platform.OS === 'ios'
        ? 80
        : 76,

    right: 20,

    backgroundColor:
      '#FFFFFF',

    width: 46,
    height: 46,

    borderRadius: 23,

    justifyContent:
      'center',

    alignItems:
      'center',

    zIndex: 2000,

    elevation: 8,

    shadowColor:
      '#000',

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity:
      0.15,

    shadowRadius: 8,
  },

  mapWarning: {
    position: 'absolute',

    top: 80,
    left: 20,
    right: 20,

    backgroundColor:
      'rgba(255,255,255,0.96)',

    borderRadius: 14,

    paddingVertical: 12,
    paddingHorizontal: 16,

    flexDirection:
      'row-reverse',

    alignItems:
      'center',

    justifyContent:
      'center',

    gap: 8,

    zIndex: 1500,

    elevation: 5,
  },

  mapWarningText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'right',
  },

  bottomSheetCard: {
    backgroundColor:
      '#FFFFFF',

    paddingHorizontal: 22,

    paddingTop: 10,

    paddingBottom: 26,

    borderTopLeftRadius:
      36,

    borderTopRightRadius:
      36,

    elevation: 14,

    shadowColor:
      '#000',

    shadowOffset: {
      width: 0,
      height: -8,
    },

    shadowOpacity:
      0.12,

    shadowRadius: 20,

    zIndex: 100,
  },

  dragHandle: {
    width: 40,
    height: 4,

    backgroundColor:
      '#E2E8F0',

    borderRadius: 2,

    alignSelf:
      'center',

    marginBottom: 16,
  },

  etaBanner: {
    flexDirection:
      'row-reverse',

    justifyContent:
      'space-between',

    alignItems:
      'center',

    backgroundColor:
      '#FFF7ED',

    padding: 14,

    borderRadius: 20,

    marginBottom: 16,

    borderWidth: 1,

    borderColor:
      '#FFEDD5',
  },

  etaInfo: {
    alignItems:
      'flex-start',
  },

  etaTitle: {
    fontSize: 11,
    color: '#C2410C',
    fontWeight: '600',
  },

  etaTime: {
    fontSize: 18,
    fontWeight: '800',
    color: '#9A3412',
    marginTop: 2,
  },

  etaIconContainer: {
    width: 44,
    height: 44,

    borderRadius: 14,

    backgroundColor:
      '#FFFFFF',

    justifyContent:
      'center',

    alignItems:
      'center',

    elevation: 3,
  },

  statusHeader: {
    flexDirection:
      'row-reverse',

    justifyContent:
      'space-between',

    alignItems:
      'center',

    marginBottom: 14,
  },

  statusTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },

  cancelledText: {
    color: '#EF4444',
  },

  orderIdBadge: {
    backgroundColor:
      '#F1F5F9',

    paddingHorizontal: 10,
    paddingVertical: 4,

    borderRadius: 10,

    fontSize: 12,
    fontWeight: '700',

    color: '#64748B',
  },

  stepperContainer: {
    flexDirection:
      'row',

    alignItems:
      'center',

    justifyContent:
      'center',

    marginVertical: 10,

    paddingHorizontal: 6,
  },

  stepDot: {
    width: 22,
    height: 22,

    borderRadius: 11,

    backgroundColor:
      '#F1F5F9',

    justifyContent:
      'center',

    alignItems:
      'center',
  },

  innerDot: {
    width: 7,
    height: 7,

    borderRadius: 3.5,

    backgroundColor:
      '#CBD5E1',
  },

  stepDotActive: {
    backgroundColor:
      '#F97316',
  },

  stepLine: {
    flex: 1,

    height: 4,

    backgroundColor:
      '#F1F5F9',

    marginHorizontal: 3,

    borderRadius: 2,
  },

  stepLineActive: {
    backgroundColor:
      '#F97316',
  },

  driverBox: {
    flexDirection:
      'row-reverse',

    justifyContent:
      'space-between',

    alignItems:
      'center',

    backgroundColor:
      '#F8FAFC',

    borderRadius: 20,

    padding: 14,

    marginTop: 14,

    borderWidth: 1,

    borderColor:
      '#F1F5F9',
  },

  driverInfo: {
    flexDirection:
      'row-reverse',

    alignItems:
      'center',

    gap: 12,
  },

  avatarWrap: {
    width: 48,
    height: 48,

    borderRadius: 24,

    backgroundColor:
      '#FFF7ED',

    justifyContent:
      'center',

    alignItems:
      'center',

    borderWidth: 1,

    borderColor:
      '#FFEDD5',
  },

  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },

  ratingBadge: {
    flexDirection:
      'row-reverse',

    alignItems:
      'center',

    gap: 4,

    marginTop: 2,
  },

  ratingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  callButton: {
    backgroundColor:
      '#10B981',

    width: 42,
    height: 42,

    borderRadius: 21,

    justifyContent:
      'center',

    alignItems:
      'center',

    elevation: 4,
  },

  debugInfo: {
    flexDirection:
      'row-reverse',

    alignItems:
      'center',

    justifyContent:
      'center',

    gap: 6,

    marginTop: 12,

    paddingVertical: 8,

    backgroundColor:
      '#F8FAFC',

    borderRadius: 10,
  },

  debugText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textAlign:
      'center',
  },

  cancelButton: {
    marginTop: 14,

    paddingVertical: 14,

    borderRadius: 18,

    backgroundColor:
      '#FEF2F2',

    alignItems:
      'center',

    justifyContent:
      'center',

    flexDirection:
      'row',

    gap: 6,
  },

  cancelDisabled: {
    opacity: 0.6,
  },

  cancelButtonText: {
    color: '#EF4444',

    fontSize: 14,

    fontWeight: '700',
  },
});