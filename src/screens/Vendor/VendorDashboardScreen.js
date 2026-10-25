import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';

import { useAuth } from '../../context/AuthContext';
import { vendorApi } from '../../api/vendorApi';
import { useVendorStore } from '../../context/VendorStoreContext';

import { COLORS } from '../../constants/colors';

import {
  FONT_SIZES,
  SPACING,
  RADIUS,
} from '../../constants/theme';

export default function VendorDashboardScreen() {
  const { user } = useAuth();
  const { store, updateStore, refreshStore } = useVendorStore();

  // ============================================================
  // STATE
  // ============================================================

  const [stats, setStats] = useState({
    todayOrders: '0',
    todayRevenue: '0 ج.م',
    rating: '0',
  });

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  // ============================================================
  // STORE STATUS
  // ============================================================

  const rawIsOpen =
    store?.isOpen ??
    store?.IsOpen ??
    store?.is_open ??
    false;

  const normalizedIsOpen =
    rawIsOpen === true ||
    rawIsOpen === 1 ||
    rawIsOpen === '1' ||
    rawIsOpen === 'true' ||
    String(rawIsOpen).trim().toLowerCase() ===
      'true';

  // ============================================================
  // STORE DATA
  // ============================================================

  const fetchMyStore = useCallback(async () => {
    if (typeof refreshStore === 'function') {
      await refreshStore(false);
    }
  }, [refreshStore]);

  // ============================================================
  // TOGGLE STORE STATUS
  // ============================================================

  const toggleStoreStatus = useCallback(async () => {
    try {
      const newStatus = !normalizedIsOpen ? 1 : 0;
      
      updateStore((prevStore) => ({
        ...prevStore,
        isOpen: newStatus,
        IsOpen: newStatus,
        is_open: newStatus,
      }));

      const response = await vendorApi.updateStoreStatus({ isOpen: newStatus });
      
      console.log('🔄 Store status updated successfully:', response?.data);
    } catch (error) {
      console.log('❌ Error updating store status:', error?.response?.data || error?.message);
      
      fetchMyStore();
    }
  }, [normalizedIsOpen, updateStore, fetchMyStore]);

  // ============================================================
  // GET DASHBOARD STATS
  // ============================================================

  const fetchDashboardStats = useCallback(
    async () => {
      try {
        const response =
          await vendorApi.getDashboardStats();

        console.log(
          '📊 VENDOR DASHBOARD RESPONSE:',
          JSON.stringify(
            response?.data,
            null,
            2
          )
        );

        const responseData =
          response?.data || {};

        const orders =
          responseData?.orders || {};

        const restaurant =
          responseData?.restaurant ||
          responseData?.Restaurant ||
          responseData?.data?.restaurant ||
          {};

        setStats({
          todayOrders: String(
            orders?.total ??
            orders?.todayOrders ??
            0
          ),

          todayRevenue:
            `${orders?.revenue ??
              orders?.todayRevenue ??
              0} ج.م`,

          rating: String(
            restaurant?.ratingAvg ??
            restaurant?.RatingAvg ??
            0
          ),
        });

      } catch (error) {
        console.log(
          '⚠️ Vendor stats are not available:',
          error?.response?.data ||
          error?.message ||
          error
        );
      }
    },
    []
  );

  // ============================================================
  // LOAD DASHBOARD
  // ============================================================

  const fetchDashboard = useCallback(
    async () => {
      setLoading(true);

      try {
        await Promise.all([
          typeof refreshStore === 'function' ? refreshStore(true) : Promise.resolve(),
          fetchDashboardStats(),
        ]);
      } catch (error) {
        console.log(
          '❌ Dashboard loading error:',
          error
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      refreshStore,
      fetchDashboardStats,
    ]
  );

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ============================================================
  // REFRESH
  // ============================================================

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    fetchDashboard();
  }, [fetchDashboard]);

  // ============================================================
  // VENDOR NAME
  // ============================================================

  const vendorName =
    user?.name ||
    user?.Name ||
    user?.fullName ||
    user?.FullName ||
    'تاجر';

  // ============================================================
  // STORE NAME
  // ============================================================

  const storeName =
    store?.name ||
    store?.Name ||
    store?.RestaurantName ||
    store?.restaurantName ||
    store?.storeName ||
    store?.StoreName ||
    'متجري';

  // ============================================================
  // STORE LOGO / IMAGE
  // ============================================================

  const storeLogo =
    store?.logo ||
    store?.Logo ||
    store?.imageUrl ||
    store?.ImageUrl ||
    store?.image ||
    store?.Image ||
    store?.storeLogo ||
    store?.StoreLogo ||
    null;

  // ============================================================
  // STORE TYPE
  // ============================================================

  const rawStoreType =
    store?.businessType ??
    store?.BusinessType ??
    store?.business_type ??
    store?.StoreType ??
    store?.storeType ??
    '';

  const normalizedStoreType =
    String(rawStoreType)
      .trim()
      .toLowerCase();

  // ============================================================
  // STORE TYPE LABELS
  // ============================================================

  const storeTypeLabels = {
    restaurant: 'مطعم',
    pharmacy: 'صيدلية',
    supermarket: 'سوبر ماركت',
    bookstore: 'مكتبة',
    electronics: 'إلكترونيات',
  };

  const storeTypeLabel =
    storeTypeLabels[
      normalizedStoreType
    ] ||
    'غير محدد';

  // ============================================================
  // DELIVERY TYPE (نوع التوصيل للتاجر)
  // ============================================================
// ============================================================
  // DELIVERY TYPE (نوع التوصيل للتاجر)
  // ============================================================

  const rawDeliveryType = String(
    store?.deliveryType ??
    store?.DeliveryType ??
    store?.delivery_type ??
    'store'
  ).trim().toLowerCase();

  const deliveryTypeLabels = {
    store: 'توصيل المتجر (خاص بك)',
    self: 'توصيل المتجر (خاص بك)',
    platform: 'توصيل على بابك (تطبيق)',
  };

  const deliveryTypeLabel =
     deliveryTypeLabels[rawDeliveryType] || 'توصيل المتجر (خاص بك)';

  // ============================================================
  // ADDRESS
  // ============================================================

  const storeAddress =
    store?.address ||
    store?.Address ||
    store?.StoreAddress ||
    store?.storeAddress ||
    '';

  // ============================================================
  // STORE ID
  // ============================================================

  const storeId =
    store?.id ||
    store?.Id ||
    store?.RestaurantId ||
    store?.restaurantId ||
    null;

  // ============================================================
  // STATS
  // ============================================================

  const statItems = [
    {
      label: 'طلبات اليوم',
      value: stats.todayOrders,
    },

    {
      label: 'إيرادات اليوم',
      value: stats.todayRevenue,
    },

    {
      label: 'التقييم العام',
      value: stats.rating,
    },
  ];

  // ============================================================
  // LOADING
  // ============================================================

  if (loading && !store) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color={
            COLORS?.primary ||
            '#F97316'
          }
        />

        <Text
          style={
            styles.loadingText
          }
        >
          جاري تحميل بيانات متجرك...
        </Text>
      </View>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.contentContainer
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[
            COLORS?.primary ||
            '#F97316',
          ]}
        />
      }
    >

      {/* ========================================================
          GREETING
      ======================================================== */}

      <Text
        style={
          styles.greeting
        }
      >
        أهلاً، {vendorName}
      </Text>

      {/* ========================================================
          STORE CARD
      ======================================================== */}

      <View
        style={
          styles.storeCard
        }
      >
        <View
          style={
            styles.storeHeader
          }
        >

          {/* STATUS (Interactive Button) */}

          <Pressable
            onPress={toggleStoreStatus}
            style={[
              styles.statusBadge,

              normalizedIsOpen
                ? styles.openBadge
                : styles.closedBadge,
            ]}
          >
            <Text
              style={
                styles.statusText
              }
            >
              {normalizedIsOpen
                ? '🟢 مفتوح'
                : '🔴 مغلق'}
            </Text>
          </Pressable>

          {/* STORE INFO & LOGO */}

          <View
            style={
              styles.storeInfoRight
            }
          >
            <View
              style={
                styles.storeInfo
              }
            >
              <Text
                style={
                  styles.storeName
                }
              >
                {storeName}
              </Text>

              <Text
                style={
                  styles.storeType
                }
              >
                نوع المتجر:{' '}
                <Text
                  style={
                    styles.storeTypeValue
                  }
                >
                  {storeTypeLabel}
                </Text>
              </Text>
            </View>

            {/* STORE LOGO */}

            <View
              style={
                styles.logoContainer
              }
            >
              {storeLogo ? (
                <Image
                  source={{ uri: storeLogo }}
                  style={styles.storeLogo}
                />
              ) : (
                <View
                  style={
                    styles.placeholderLogo
                  }
                >
                  <Text
                    style={
                      styles.placeholderText
                    }
                  >
                    🏪
                  </Text>
                </View>
              )}
            </View>

          </View>

        </View>

        {/* DELIVERY TYPE (معروض للتاجر فقط في صفحته الرئيسية) */}
        <View style={styles.deliveryBadgeContainer}>
          <Text style={styles.deliveryBadgeText}>
            🚚 طريقة التوصيل: <Text style={styles.deliveryBadgeValue}>{deliveryTypeLabel}</Text>
          </Text>
        </View>

        {/* ADDRESS */}

        {storeAddress ? (
          <Text
            style={
              styles.address
            }
          >
            📍 {storeAddress}
          </Text>
        ) : null}

      </View>

      {/* ========================================================
          STATS
      ======================================================== */}

      <View
        style={
          styles.statsRow
        }
      >
        {statItems.map(
          (item) => (
            <View
              key={
                item.label
              }
              style={
                styles.statCard
              }
            >
              <Text
                style={
                  styles.statValue
                }
              >
                {item.value}
              </Text>

              <Text
                style={
                  styles.statLabel
                }
              >
                {item.label}
              </Text>
            </View>
          )
        )}
      </View>

      {/* ========================================================
          STORE ID
      ======================================================== */}

      {storeId ? (
        <Text
          style={
            styles.storeId
          }
        >
          Store ID: {storeId}
        </Text>
      ) : null}

      {/* ========================================================
          DEVELOPMENT DEBUG
      ======================================================== */}

      {__DEV__ && store ? (
        <View
          style={
            styles.debugCard
          }
        >
          <Text
            style={
              styles.debugTitle
            }
          >
            بيانات المتجر
          </Text>

          <Text
            style={
              styles.debugText
            }
          >
            Name:{' '}
            {storeName}
          </Text>

          <Text
            style={
              styles.debugText
            }
          >
            Logo:{' '}
            {storeLogo ? 'AVAILABLE' : 'EMPTY'}
          </Text>

          <Text
            style={
              styles.debugText
            }
          >
            BusinessType:{' '}
            {normalizedStoreType ||
              'EMPTY'}
          </Text>

          <Text
            style={
              styles.debugText
            }
          >
            DeliveryType:{' '}
            {rawDeliveryType ||
              'EMPTY'}
          </Text>

          <Text
            style={
              styles.debugText
            }
          >
            Display:{' '}
            {storeTypeLabel}
          </Text>

          <Text
            style={
              styles.debugText
            }
          >
            IsOpen:{' '}
            {String(rawIsOpen)}
          </Text>

          <Text
            style={
              styles.debugText
            }
          >
            ID:{' '}
            {String(
              storeId ||
              'EMPTY'
            )}
          </Text>
        </View>
      ) : null}

    </ScrollView>
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

  contentContainer: {
    padding:
      SPACING?.md ||
      16,

    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,

    alignItems:
      'center',

    justifyContent:
      'center',

    backgroundColor:
      COLORS?.background ||
      '#F3F4F6',
  },

  loadingText: {
    marginTop:
      SPACING?.sm ||
      8,

    fontSize:
      FONT_SIZES?.md ||
      15,

    color:
      COLORS?.gray ||
      '#6B7280',
  },

  greeting: {
    fontSize:
      FONT_SIZES?.xl ||
      20,

    fontWeight:
      '700',

    textAlign:
      'right',

    marginBottom:
      SPACING?.lg ||
      24,

    color:
      '#1F2937',

    marginTop: 12,
  },

  storeCard: {
    backgroundColor:
      COLORS?.white ||
      '#FFFFFF',

    borderRadius:
      RADIUS?.md ||
      12,

    padding:
      SPACING?.md ||
      16,

    marginBottom:
      SPACING?.lg ||
      24,

    elevation: 2,

    shadowColor:
      '#000',

    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity:
      0.05,

    shadowRadius: 2,
  },

  storeHeader: {
    flexDirection:
      'row-reverse',

    alignItems:
      'center',

    justifyContent:
      'space-between',
  },

  storeInfoRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
  },

  storeInfo: {
    flex: 1,

    alignItems:
      'flex-end',
  },

  logoContainer: {
    marginLeft: 12,
  },

  storeLogo: {
    width: 55,
    height: 55,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  placeholderLogo: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  placeholderText: {
    fontSize: 22,
  },

  storeName: {
    fontSize:
      FONT_SIZES?.lg ||
      18,

    fontWeight:
      '700',

    color:
      '#111827',

    textAlign:
      'right',
  },

  storeType: {
    marginTop: 5,

    fontSize:
      FONT_SIZES?.sm ||
      13,

    color:
      COLORS?.gray ||
      '#6B7280',

    textAlign:
      'right',
  },

  storeTypeValue: {
    fontWeight:
      '700',

    color:
      '#1F2937',
  },

  deliveryBadgeContainer: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'flex-end',
  },

  deliveryBadgeText: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'right',
  },

  deliveryBadgeValue: {
    fontWeight: '700',
    color: COLORS?.primary || '#F97316',
  },

  statusBadge: {
    paddingHorizontal:
      10,

    paddingVertical:
      6,

    borderRadius:
      20,
  },

  openBadge: {
    backgroundColor:
      '#DCFCE7',
  },

  closedBadge: {
    backgroundColor:
      '#FEE2E2',
  },

  statusText: {
    fontSize: 12,

    fontWeight:
      '700',

    color:
      '#374151',
  },

  address: {
    marginTop: 8,

    textAlign:
      'right',

    fontSize:
      FONT_SIZES?.sm ||
      13,

    color:
      COLORS?.gray ||
      '#6B7280',
  },

  statsRow: {
    flexDirection:
      'row-reverse',

    flexWrap:
      'wrap',

    justifyContent:
      'space-between',

    gap: 8,
  },

  statCard: {
    width: '31%',

    minWidth: 100,

    backgroundColor:
      COLORS?.white ||
      '#FFFFFF',

    borderRadius:
      RADIUS?.md ||
      12,

    padding:
      SPACING?.md ||
      16,

    alignItems:
      'center',

    marginBottom:
      SPACING?.sm ||
      12,

    elevation: 2,

    shadowColor:
      '#000',

    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity:
      0.05,

    shadowRadius: 2,
  },

  statValue: {
    fontSize:
      FONT_SIZES?.lg ||
      17,

    fontWeight:
      '700',

    color:
      COLORS?.primary ||
      '#F97316',
  },

  statLabel: {
    fontSize:
      FONT_SIZES?.xs ||
      12,

    color:
      COLORS?.gray ||
      '#6B7280',

    marginTop:
      SPACING?.xs ||
      4,

    textAlign:
      'center',
  },

  storeId: {
    marginTop: 8,

    textAlign:
      'center',

    fontSize: 11,

    color:
      '#9CA3AF',
  },

  debugCard: {
    marginTop: 20,

    padding: 12,

    backgroundColor:
      '#FEF3C7',

    borderRadius: 10,

    borderWidth: 1,

    borderColor:
      '#F59E0B',
  },

  debugTitle: {
    fontWeight:
      '700',

    textAlign:
      'right',

    marginBottom: 8,

    color:
      '#92400E',
  },

  debugText: {
    fontSize: 12,

    textAlign:
      'right',

    marginBottom: 4,

    color:
      '#78350F',
  },

});