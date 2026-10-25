import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, StatusBar, Alert, Linking, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import { orderApi } from '../../api/orderApi';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

const NEXT_STATUS = {
  accepted: 'preparing',
  preparing: 'on_the_way',
  on_the_way: 'delivered',
};

const STATUS_LABELS = {
  accepted: 'تأكيد وصول للمتجر / تحضير',
  preparing: 'الطلب جاهز - بدء الرحلة للزبون',
  on_the_way: 'تأكيد التسليم للزبون ✅',
};

// ============================================================
// OPEN STREET MAP HTML FOR ACTIVE DELIVERY
// ============================================================
const MAP_HTML = `
<!DOCTYPE html>
<html lang="ar">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<title>Active Delivery Map</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #f1f1f1; touch-action: none; font-family: Arial, sans-serif; }
  #map { position: relative; width: 100%; height: 100%; overflow: hidden; background: #e9e9e9; }
  #tiles { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: hidden; }
  .tile { position: absolute; width: 256px; height: 256px; user-select: none; -webkit-user-drag: none; pointer-events: none; }
  .marker { position: absolute; transform: translate(-50%, -100%); z-index: 100; pointer-events: auto; }
  
  .driver-marker {
    width: 46px; height: 46px; border-radius: 50%; background: #03A9F4; border: 3px solid white;
    box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 24px;
  }
  .store-marker {
    width: 44px; height: 44px; border-radius: 50%; background: #F59E0B; border: 3px solid white;
    box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 22px;
  }
  .customer-marker {
    width: 44px; height: 44px; border-radius: 50%; background: #10B981; border: 3px solid white;
    box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 22px;
  }
</style>
</head>
<body>
<div id="map">
  <div id="tiles"></div>
  <div id="markers"></div>
</div>
<script>
(function() {
  const TILE_SIZE = 256;
  let zoom = 15;
  let center = { latitude: 30.638936, longitude: 31.076906 };
  let driver = null;
  let pickup = null;
  let dropoff = null;
  let mapWidth = window.innerWidth;
  let mapHeight = window.innerHeight;

  const tilesEl = document.getElementById('tiles');
  const markersEl = document.getElementById('markers');

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function latLngToWorld(lat, lng, z) {
    const scale = TILE_SIZE * Math.pow(2, z);
    const safeLat = clamp(lat, -85, 85);
    const x = (lng + 180) / 360 * scale;
    const sinLat = Math.sin(safeLat * Math.PI / 180);
    const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
    return { x, y };
  }

  function worldToScreen(wx, wy) {
    const cw = latLngToWorld(center.latitude, center.longitude, zoom);
    return { x: wx - cw.x + mapWidth / 2, y: wy - cw.y + mapHeight / 2 };
  }

  function createTile(z, x, y) {
    const maxT = Math.pow(2, z);
    let nx = x;
    while (nx < 0) nx += maxT;
    while (nx >= maxT) nx -= maxT;
    if (y < 0 || y >= maxT) return null;
    const img = document.createElement('img');
    img.className = 'tile';
    img.src = 'https://tile.openstreetmap.org/' + z + '/' + nx + '/' + y + '.png';
    return img;
  }

  function drawTiles() {
    tilesEl.innerHTML = '';
    const cw = latLngToWorld(center.latitude, center.longitude, zoom);
    const ctx = Math.floor(cw.x / TILE_SIZE);
    const cty = Math.floor(cw.y / TILE_SIZE);
    const rx = Math.ceil(mapWidth / TILE_SIZE) + 1;
    const ry = Math.ceil(mapHeight / TILE_SIZE) + 1;

    for (let tx = ctx - rx; tx <= ctx + rx; tx++) {
      for (let ty = cty - ry; ty <= cty + ry; ty++) {
        const t = createTile(zoom, tx, ty);
        if (!t) continue;
        const s = worldToScreen(tx * TILE_SIZE, ty * TILE_SIZE);
        t.style.left = s.x + 'px';
        t.style.top = s.y + 'px';
        tilesEl.appendChild(t);
      }
    }
  }

  function renderMarker(lat, lng, html) {
    if (!lat || !lng) return;
    const w = latLngToWorld(lat, lng, zoom);
    const s = worldToScreen(w.x, w.y);
    const m = document.createElement('div');
    m.className = 'marker';
    m.innerHTML = html;
    m.style.left = s.x + 'px';
    m.style.top = s.y + 'px';
    markersEl.appendChild(m);
  }

  function render() {
    drawTiles();
    markersEl.innerHTML = '';
    if (pickup) renderMarker(pickup.lat, pickup.lng, '<div class="store-marker">🏪</div>');
    if (dropoff) renderMarker(dropoff.lat, dropoff.lng, '<div class="customer-marker">🏠</div>');
    if (driver) renderMarker(driver.lat, driver.lng, '<div class="driver-marker">🛵</div>');
  }

  window.addEventListener('message', function(e) {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'location_sync') {
        if (data.driver) {
          driver = data.driver;
          center = { latitude: driver.lat, longitude: driver.lng };
        }
        if (data.pickup) pickup = data.pickup;
        if (data.dropoff) dropoff = data.dropoff;
        render();
      }
    } catch(err) {}
  });

  window.addEventListener('resize', function() {
    mapWidth = window.innerWidth;
    mapHeight = window.innerHeight;
    render();
  });

  render();
})();
</script>
</body>
</html>
`;

export default function ActiveDeliveryScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const { socket } = useSocket();
  const { user } = useAuth();
  const driverId = user?.driverId;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const webViewRef = useRef(null);
  const driverLocationRef = useRef(null);

  // إرسال الإحداثيات المحدثة إلى خريطة OpenStreetMap
  const syncMapData = useCallback(() => {
    if (!webViewRef.current || !mapReady) return;

    const pickupLat = Number(order?.pickup_lat || order?.pickupLat);
    const pickupLng = Number(order?.pickup_lng || order?.pickupLng);
    const dropoffLat = Number(order?.dropoff_lat || order?.dropoffLat);
    const dropoffLng = Number(order?.dropoff_lng || order?.dropoffLng);

    const payload = {
      type: 'location_sync',
      driver: driverLocationRef.current,
      pickup: (pickupLat && pickupLng) ? { lat: pickupLat, lng: pickupLng } : null,
      dropoff: (dropoffLat && dropoffLng) ? { lat: dropoffLat, lng: dropoffLng } : null,
    };

    webViewRef.current.postMessage(JSON.stringify(payload));
  }, [mapReady, order]);

  // جلب تفاصيل الطلب مع فك تغليف كائنات الـ API بأمان
  useEffect(() => {
    let isMounted = true;
    if (!orderId) {
      setLoading(false);
      return;
    }

    orderApi
      .getOrderById(orderId)
      .then((res) => {
        if (!isMounted) return;
        const fetchedOrder =
          res?.data?.data?.order ||
          res?.data?.data ||
          res?.data?.order ||
          res?.data ||
          {};

        setOrder(fetchedOrder);
      })
      .catch((err) => console.log('Error fetching active order:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  // تحديث موقع السائق وبثه للسيرفر وللخريطة
  useEffect(() => {
    let intervalId;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (initial?.coords) {
        driverLocationRef.current = {
          lat: initial.coords.latitude,
          lng: initial.coords.longitude,
        };
        syncMapData();
      }

      intervalId = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const { latitude, longitude, heading, speed } = loc.coords;

          driverLocationRef.current = { lat: latitude, lng: longitude };
          syncMapData();

          if (socket && driverId) {
            socket.emit('driver_location_update', {
              driverId,
              lat: latitude,
              lng: longitude,
              orderId,
              bearing: heading || 0,
              speed: speed || 0,
            });
          }
        } catch (e) {
          console.log('Active location tracking error:', e);
        }
      }, 5000);
    })();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [socket, driverId, orderId, syncMapData]);

  useEffect(() => {
    syncMapData();
  }, [syncMapData]);

  const handleNextStatus = async () => {
    const currentStatus = order?.status || 'accepted';
    const nextStatus = NEXT_STATUS[currentStatus];

    if (!nextStatus) {
      navigation.navigate('DriverHome');
      return;
    }

    setUpdating(true);
    try {
      if (orderApi?.updateOrderStatus) {
        await orderApi.updateOrderStatus(orderId, nextStatus);
      }

      if (nextStatus === 'delivered') {
        Alert.alert('تم التوصيل بنجاح! 🎉', 'تم إنهاء الرحلة وإضافة مستحقاتك لمحفظتك.');
        navigation.navigate('DriverHome');
      } else {
        setOrder((prev) => ({ ...prev, status: nextStatus }));
      }
    } catch (e) {
      Alert.alert('خطأ', 'تعذر تحديث حالة الطلب، حاول مرة أخرى');
    } finally {
      setUpdating(false);
    }
  };

  const openNavigationApp = (lat, lng, label) => {
    if (!lat || !lng) {
      Alert.alert('تنبيه', 'إحداثيات الموقع غير متوفرة');
      return;
    }
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });
    Linking.openURL(url);
  };

  if (loading) return <LoadingSpinner />;

  // استخراج القيم المالية وطريقة الدفع من جدول orders بصيغ متعددة
  const currentStatus = order?.status || 'accepted';

  const totalPrice = Number(
    order?.total_price ??
    order?.totalPrice ??
    order?.priceBreakdown?.totalPrice ??
    order?.expectedTotalPrice ??
    order?.total ??
    0
  );

  const deliveryFee = Number(
    order?.delivery_fee ??
    order?.deliveryFee ??
    order?.priceBreakdown?.finalDeliveryFee ??
    order?.priceBreakdown?.baseDeliveryFee ??
    20
  );

  const paymentMethod = String(
    order?.payment_method ??
    order?.paymentMethod ??
    'cash'
  ).toLowerCase();

  const isCash = paymentMethod === 'cash';

  const pickupLat = Number(order?.pickup_lat || order?.pickupLat);
  const pickupLng = Number(order?.pickup_lng || order?.pickupLng);
  const dropoffLat = Number(order?.dropoff_lat || order?.dropoffLat);
  const dropoffLng = Number(order?.dropoff_lng || order?.dropoffLng);

  const isGoingToStore = currentStatus === 'accepted' || currentStatus === 'preparing';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* خريطة OpenStreetMap التفاعلية */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: MAP_HTML }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onLoadEnd={() => {
            setMapReady(true);
            syncMapData();
          }}
          style={styles.map}
        />

        {/* زر التوجيه عبر خرائط الهاتف الخارجية */}
        <View style={styles.navButtonContainer}>
          <Button
            title={isGoingToStore ? "الاتجاه للمتجر 🏪" : "الاتجاه للعميل 🏠"}
            onPress={() => {
              if (isGoingToStore) {
                openNavigationApp(pickupLat, pickupLng, order?.restaurant_name || "المتجر");
              } else {
                openNavigationApp(dropoffLat, dropoffLng, order?.user_name || "العميل");
              }
            }}
            variant="secondary"
          />
        </View>
      </View>

      {/* البطاقة السفلية: الحسابات والبيانات */}
      <View style={styles.footer}>
        <View style={styles.headerInfo}>
          <Text style={styles.orderNumber}>طلب #{orderId || '---'}</Text>
          <Text style={styles.targetName}>
            {isGoingToStore ? (order?.restaurant_name || 'المتجر') : (order?.user_name || 'العميل')}
          </Text>
        </View>

        {/* كارت الحسابات المالية وطريقة الدفع */}
        <View style={styles.amountCard}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>المطلوب تحصيله:</Text>
            <Text style={[styles.amountValue, { color: isCash ? '#DC2626' : '#10B981' }]}>
              {isCash ? `${totalPrice.toFixed(2)} ج.م (كاش)` : 'مدفوع إلكترونياً'}
            </Text>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.feeLabel}>أجرتك من التوصيل:</Text>
            <Text style={styles.feeValue}>{deliveryFee.toFixed(2)} ج.م</Text>
          </View>
        </View>

        {/* زر الترقية للحالة التالية */}
        <Button
          title={STATUS_LABELS[currentStatus] || 'تحديث حالة الطلب'}
          onPress={handleNextStatus}
          loading={updating}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  mapContainer: { flex: 1, backgroundColor: '#E5E7EB', position: 'relative' },
  map: { flex: 1 },
  navButtonContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    left: 20,
    zIndex: 10,
  },
  footer: {
    padding: SPACING?.lg || 20,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS?.lg || 20,
    borderTopRightRadius: RADIUS?.lg || 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerInfo: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: FONT_SIZES?.md || 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  targetName: {
    fontSize: FONT_SIZES?.sm || 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  amountCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  amountRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 3,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  feeLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
});