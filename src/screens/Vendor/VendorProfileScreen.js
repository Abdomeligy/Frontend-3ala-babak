import React, {
  useState,
  useCallback,
  useEffect,
} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../context/AuthContext';
import { vendorApi } from '../../api/vendorApi';
import { useVendorStore } from '../../context/VendorStoreContext';

import { COLORS } from '../../constants/colors';

import {
  FONT_SIZES,
  SPACING,
  RADIUS,
} from '../../constants/theme';

// ============================================================
// VENDOR PROFILE SCREEN
// ============================================================

export default function VendorProfileScreen({
  navigation,
}) {
  const {
    user,
    logout,
  } = useAuth();

  const {
    store,
    loadingStore,
    refreshStore,
    updateStore,
  } = useVendorStore();

  // ==========================================================
  // STORE STATUS
  // ==========================================================

  const rawIsOpen =
    store?.isOpen ??
    store?.IsOpen ??
    store?.is_open ??
    false;

  const serverIsOpen =
    rawIsOpen === true ||
    rawIsOpen === 1 ||
    rawIsOpen === '1' ||
    rawIsOpen === 'true' ||
    String(rawIsOpen).trim().toLowerCase() === 'true';

  const [
    localIsOpen,
    setLocalIsOpen,
  ] = useState(serverIsOpen);

  const [
    updatingStatus,
    setUpdatingStatus,
  ] = useState(false);

  // ==========================================================
  // SYNC LOCAL STATUS WITH SERVER
  // ==========================================================

  useEffect(() => {
    setLocalIsOpen(serverIsOpen);
  }, [serverIsOpen]);

  // ==========================================================
  // LOAD STORE
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      if (
        typeof refreshStore === 'function'
      ) {
        refreshStore(true);
      }
    }, [refreshStore])
  );

  // ==========================================================
  // UPDATE STORE STATUS
  // ==========================================================

  const handleToggleStoreStatus = async (
    newValue
  ) => {
    if (updatingStatus) {
      return;
    }

    const previousState = localIsOpen;

    const newStatusValue =
      newValue ? 1 : 0;

    // Optimistic UI
    setLocalIsOpen(newValue);
    setUpdatingStatus(true);

    try {
      console.log(
        '🔄 Updating store status:',
        newStatusValue
      );

      const response =
        await vendorApi.updateStoreStatus({
          isOpen: newStatusValue,
        });

      console.log(
        '✅ Store status updated:',
        response?.data
      );

      // تحديث الـ Global Store
      if (
        typeof updateStore === 'function'
      ) {
        try {
          updateStore((previous) => {
            if (!previous) {
              return previous;
            }

            return {
              ...previous,

              isOpen:
                newStatusValue,

              IsOpen:
                newStatusValue,

              is_open:
                newStatusValue,
            };
          });
        } catch (updateError) {
          console.log(
            '⚠️ updateStore callback failed:',
            updateError
          );

          // بعض الـ Contexts تتوقع object وليس callback
          try {
            updateStore({
              ...store,

              isOpen:
                newStatusValue,

              IsOpen:
                newStatusValue,

              is_open:
                newStatusValue,
            });
          } catch (fallbackError) {
            console.log(
              '⚠️ Global store update skipped:',
              fallbackError
            );
          }
        }
      }

    } catch (error) {
      console.log(
        '❌ Error toggling store status:',
        error?.response?.data ||
          error?.message ||
          error
      );

      // Rollback
      setLocalIsOpen(previousState);

      if (Platform.OS === 'web') {
        if (
          typeof window !== 'undefined' &&
          window.alert
        ) {
          window.alert(
            'تعذر تحديث حالة المتجر، حاول مرة أخرى.'
          );
        }
      } else {
        Alert.alert(
          'خطأ',
          'تعذر تحديث حالة المتجر، حاول مرة أخرى.'
        );
      }

    } finally {
      setUpdatingStatus(false);
    }
  };

  // ==========================================================
  // STORE DATA
  // ==========================================================

  const storeName =
    store?.Name ||
    store?.name ||
    store?.restaurantName ||
    store?.storeName ||
    user?.vendorProfile?.name ||
    user?.name ||
    user?.Name ||
    'اسم المتجر';

  const storePhone =
    store?.Phone ||
    store?.phone ||
    store?.phoneNumber ||
    user?.phone ||
    user?.phoneNumber ||
    '';

  const storeId =
    store?.Id ||
    store?.id ||
    store?.restaurantId ||
    store?.storeId ||
    null;

  const businessType =
    store?.BusinessType ||
    store?.businessType ||
    'restaurant';

  const cuisineType =
    store?.CuisineType ||
    store?.cuisineType ||
    '';

  const categoryId =
    store?.CategoryId ||
    store?.categoryId ||
    null;

  const storeLogo =
    store?.Logo ||
    store?.logo ||
    store?.imageUrl ||
    store?.ImageUrl ||
    store?.image ||
    store?.avatar ||
    null;

  // ==========================================================
  // STORE TYPE
  // ==========================================================

  const rawStoreType =
    store?.businessType ??
    store?.BusinessType ??
    store?.business_type ??
    store?.StoreType ??
    store?.storeType ??
    businessType;

  const normalizedStoreType =
    String(rawStoreType)
      .trim()
      .toLowerCase();

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
    businessType ||
    'متجر';

  // ==========================================================
  // DELIVERY TYPE
  // ==========================================================

  const rawDeliveryType =
    store?.deliveryType ??
    store?.DeliveryType ??
    store?.delivery_type ??
    'SELF';

  const normalizedDeliveryType =
    String(rawDeliveryType)
      .trim()
      .toLowerCase();

  const deliveryTypeLabels = {
    self: 'توصيل المتجر (خاص بك)',
    own: 'توصيل المتجر (خاص بك)',
    store: 'توصيل المتجر (خاص بك)',
    platform: 'توصيل على بابك (منصة)',
  };

  const deliveryTypeLabel =
    deliveryTypeLabels[
      normalizedDeliveryType
    ] ||
    'توصيل المتجر (خاص بك)';

  // ==========================================================
  // NAVIGATION HELPERS
  // ==========================================================

  const navigateTo = (screen) => {
    if (
      navigation &&
      typeof navigation.navigate === 'function'
    ) {
      navigation.navigate(screen);
    }
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined' &&
        window.confirm
          ? window.confirm(
              'هل أنت متأكد من أنك تريد تسجيل الخروج؟'
            )
          : true;

      if (confirmed) {
        logout();
      }

      return;
    }

    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من أنك تريد تسجيل الخروج؟',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'تسجيل الخروج',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  // ==========================================================
  // DELETE ACCOUNT
  // ==========================================================

  const handleDeleteAccount = () => {
    navigateTo('DeleteAccount');
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loadingStore) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={
            COLORS?.primary ||
            '#F97316'
          }
        />

        <Text style={styles.loadingText}>
          جاري تحميل بيانات المتجر...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
      showsVerticalScrollIndicator={false}
    >

      {/* ==================================================
          HEADER
      ================================================== */}

      <View style={styles.header}>

        <View style={styles.avatarWrapper}>

          {storeLogo ? (
            <Image
              source={{
                uri: storeLogo,
              }}
              style={
                styles.storeAvatarImage
              }
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name="storefront-outline"
              size={56}
              color={
                COLORS?.primary ||
                '#F97316'
              }
            />
          )}

        </View>

        <Text style={styles.name}>
          {storeName}
        </Text>

        {Boolean(storePhone) && (
          <Text style={styles.phone}>
            {storePhone}
          </Text>
        )}

        <Text style={styles.businessType}>
          {storeTypeLabel}
        </Text>

      </View>

      {/* ==================================================
          STORE STATUS
      ================================================== */}

      <View style={styles.statusCard}>

        <View style={styles.statusLeft}>

          <Switch
            value={localIsOpen}
            onValueChange={
              handleToggleStoreStatus
            }
            disabled={updatingStatus}
            trackColor={{
              false: '#D1D5DB',
              true:
                COLORS?.primary ||
                '#F97316',
            }}
            thumbColor="#FFFFFF"
          />

          {updatingStatus && (
            <ActivityIndicator
              size="small"
              color={
                COLORS?.primary ||
                '#F97316'
              }
              style={
                styles.statusLoader
              }
            />
          )}

        </View>

        <View style={styles.statusInfo}>

          <Text style={styles.statusTitle}>
            حالة المتجر
          </Text>

          <Text
            style={[
              styles.statusSubtitle,
              {
                color: localIsOpen
                  ? '#10B981'
                  : '#EF4444',
              },
            ]}
          >
            {localIsOpen
              ? 'المتجر يستقبل الطلبات الآن 🟢'
              : 'المتجر مغلق حالياً 🔴'}
          </Text>

        </View>

      </View>

      {/* ==================================================
          STORE INFO
      ================================================== */}

      {store && (
        <View
          style={
            styles.storeInfoCard
          }
        >

          <Text
            style={
              styles.storeInfoTitle
            }
          >
            بيانات المتجر
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              اسم المتجر
            </Text>

            <Text style={styles.infoValue}>
              {storeName}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              نوع النشاط
            </Text>

            <Text style={styles.infoValue}>
              {storeTypeLabel}
            </Text>
          </View>

          {cuisineType ? (
            <View style={styles.infoRow}>
              <Text
                style={styles.infoLabel}
              >
                نوع المطبخ
              </Text>

              <Text
                style={styles.infoValue}
              >
                {cuisineType}
              </Text>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              طريقة التوصيل
            </Text>

            <Text style={styles.infoValue}>
              {deliveryTypeLabel}
            </Text>
          </View>

          {categoryId ? (
            <View style={styles.infoRow}>
              <Text
                style={styles.infoLabel}
              >
                التصنيف
              </Text>

              <Text
                style={styles.infoValue}
              >
                {categoryId}
              </Text>
            </View>
          ) : null}

          {storeId ? (
            <View style={styles.infoRow}>
              <Text
                style={styles.infoLabel}
              >
                رقم المتجر
              </Text>

              <Text
                style={styles.infoValue}
              >
                #{storeId}
              </Text>
            </View>
          ) : null}

        </View>
      )}

      {/* ==================================================
          MENU
      ================================================== */}

      <View style={styles.menuGroup}>

        {/* STORE PROFILE */}

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() =>
            navigateTo('StoreProfile')
          }
          activeOpacity={0.7}
        >

          <View style={styles.menuRight}>

            <Ionicons
              name="storefront-outline"
              size={22}
              color={
                COLORS?.secondary ||
                '#1F2937'
              }
            />

            <Text
              style={styles.menuLabel}
            >
              تعديل بيانات المتجر
            </Text>

          </View>

          <Ionicons
            name="chevron-back-outline"
            size={18}
            color={
              COLORS?.gray ||
              '#9CA3AF'
            }
          />

        </TouchableOpacity>

        {/* STAR STATS */}

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() =>
            navigateTo(
              'StarStatsScreen'
            )
          }
          activeOpacity={0.7}
        >

          <View style={styles.menuRight}>

            <Ionicons
              name="star-outline"
              size={22}
              color={
                COLORS?.secondary ||
                '#1F2937'
              }
            />

            <Text
              style={styles.menuLabel}
            >
              تقييمات العملاء
            </Text>

          </View>

          <Ionicons
            name="chevron-back-outline"
            size={18}
            color={
              COLORS?.gray ||
              '#9CA3AF'
            }
          />

        </TouchableOpacity>

        {/* ORDERS HISTORY */}

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() =>
            navigateTo(
              'OrdersHistory'
            )
          }
          activeOpacity={0.7}
        >

          <View style={styles.menuRight}>

            <Ionicons
              name="receipt-outline"
              size={22}
              color={
                COLORS?.secondary ||
                '#1F2937'
              }
            />

            <Text
              style={styles.menuLabel}
            >
              سجل الطلبات
            </Text>

          </View>

          <Ionicons
            name="chevron-back-outline"
            size={18}
            color={
              COLORS?.gray ||
              '#9CA3AF'
            }
          />

        </TouchableOpacity>

      </View>

      {/* ==================================================
          LOGOUT
      ================================================== */}

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.7}
      >

        <Ionicons
          name="log-out-outline"
          size={20}
          color={
            COLORS?.danger ||
            '#EF4444'
          }
        />

        <Text
          style={styles.logoutText}
        >
          تسجيل الخروج
        </Text>

      </TouchableOpacity>

      {/* ==================================================
          DELETE ACCOUNT
      ================================================== */}

      <TouchableOpacity
        style={
          styles.deleteAccountBtn
        }
        onPress={
          handleDeleteAccount
        }
        activeOpacity={0.7}
      >

        <Ionicons
          name="trash-outline"
          size={17}
          color="#9CA3AF"
        />

        <Text
          style={
            styles.deleteAccountText
          }
        >
          حذف الحساب
        </Text>

      </TouchableOpacity>

    </ScrollView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  container: {
    flexGrow: 1,

    backgroundColor:
      COLORS?.background ||
      '#F3F4F6',

    padding:
      SPACING?.lg ||
      20,

    paddingBottom: 40,
  },

  // ==========================================================
  // LOADING
  // ==========================================================

  loadingContainer: {
    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

    backgroundColor:
      COLORS?.background ||
      '#F3F4F6',
  },

  loadingText: {
    marginTop: 12,

    fontSize:
      FONT_SIZES?.sm ||
      14,

    color: '#6B7280',
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    alignItems: 'center',

    marginBottom:
      SPACING?.lg ||
      20,

    marginTop:
      SPACING?.md ||
      16,
  },

  avatarWrapper: {
    width: 90,
    height: 90,

    borderRadius: 45,

    backgroundColor:
      '#FFF3EB',

    justifyContent: 'center',

    alignItems: 'center',

    marginBottom:
      SPACING?.xs ||
      8,

    overflow: 'hidden',

    borderWidth: 2,

    borderColor:
      COLORS?.primary ||
      '#F97316',
  },

  storeAvatarImage: {
    width: '100%',
    height: '100%',
  },

  name: {
    fontSize:
      FONT_SIZES?.xl ||
      20,

    fontWeight: '700',

    color: '#1F2937',

    textAlign: 'center',
  },

  phone: {
    fontSize:
      FONT_SIZES?.sm ||
      14,

    color: '#6B7280',

    marginTop: 3,
  },

  businessType: {
    fontSize:
      FONT_SIZES?.xs ||
      12,

    color:
      COLORS?.primary ||
      '#F97316',

    fontWeight: '700',

    marginTop: 5,
  },

  // ==========================================================
  // STATUS
  // ==========================================================

  statusCard: {
    flexDirection:
      'row-reverse',

    justifyContent:
      'space-between',

    alignItems: 'center',

    backgroundColor:
      COLORS?.white ||
      '#FFFFFF',

    padding:
      SPACING?.md ||
      16,

    borderRadius:
      RADIUS?.md ||
      12,

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

    shadowRadius: 2,
  },

  statusInfo: {
    alignItems: 'flex-end',

    flex: 1,

    marginRight: 12,
  },

  statusTitle: {
    fontSize:
      FONT_SIZES?.md ||
      15,

    fontWeight: '700',

    color: '#1F2937',
  },

  statusSubtitle: {
    fontSize:
      FONT_SIZES?.xs ||
      12,

    marginTop: 4,

    fontWeight: '600',

    textAlign: 'right',
  },

  statusLeft: {
    flexDirection: 'row',

    justifyContent:
      'center',

    alignItems: 'center',
  },

  statusLoader: {
    marginLeft: 8,
  },

  // ==========================================================
  // STORE INFO
  // ==========================================================

  storeInfoCard: {
    backgroundColor:
      '#FFF7ED',

    borderWidth: 1,

    borderColor:
      '#FDBA74',

    borderRadius:
      RADIUS?.md ||
      12,

    padding:
      SPACING?.md ||
      16,

    marginBottom:
      SPACING?.lg ||
      20,
  },

  storeInfoTitle: {
    fontSize:
      FONT_SIZES?.md ||
      15,

    fontWeight: '800',

    color: '#C2410C',

    marginBottom: 10,

    textAlign: 'right',
  },

  infoRow: {
    flexDirection:
      'row-reverse',

    justifyContent:
      'space-between',

    alignItems: 'center',

    paddingVertical: 8,

    borderBottomWidth: 1,

    borderBottomColor:
      '#FED7AA',
  },

  infoLabel: {
    fontSize:
      FONT_SIZES?.sm ||
      13,

    color: '#78716C',
  },

  infoValue: {
    fontSize:
      FONT_SIZES?.sm ||
      13,

    color: '#292524',

    fontWeight: '600',

    maxWidth: '65%',

    textAlign: 'right',
  },

  // ==========================================================
  // MENU
  // ==========================================================

  menuGroup: {
    marginBottom: 0,
  },

  menuRow: {
    flexDirection:
      'row-reverse',

    alignItems: 'center',

    justifyContent:
      'space-between',

    backgroundColor:
      COLORS?.white ||
      '#FFFFFF',

    padding:
      SPACING?.md ||
      16,

    borderRadius:
      RADIUS?.sm ||
      8,

    elevation: 1,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity: 0.03,

    shadowRadius: 2,

    marginBottom: 8,
  },

  menuRight: {
    flexDirection:
      'row-reverse',

    alignItems: 'center',
  },

  menuLabel: {
    fontSize:
      FONT_SIZES?.md ||
      15,

    color: '#374151',

    fontWeight: '500',

    marginRight: 12,
  },

  // ==========================================================
  // LOGOUT
  // ==========================================================

  logoutBtn: {
    flexDirection:
      'row-reverse',

    justifyContent:
      'center',

    alignItems: 'center',

    marginTop:
      SPACING?.xl ||
      32,

    padding:
      SPACING?.md ||
      16,

    backgroundColor:
      '#FEF2F2',

    borderRadius:
      RADIUS?.sm ||
      8,

    borderWidth: 1,

    borderColor:
      '#FECACA',
  },

  logoutText: {
    color:
      COLORS?.danger ||
      '#EF4444',

    fontWeight: '700',

    fontSize:
      FONT_SIZES?.md ||
      15,

    marginRight: 8,
  },

  // ==========================================================
  // DELETE ACCOUNT
  // ==========================================================

  deleteAccountBtn: {
    flexDirection:
      'row-reverse',

    alignItems: 'center',

    justifyContent: 'center',

    marginTop: 14,

    padding: 10,
  },

  deleteAccountText: {
    color: '#9CA3AF',

    fontWeight: '600',

    fontSize:
      FONT_SIZES?.sm ||
      13,

    textDecorationLine:
      'underline',

    marginRight: 6,
  },

});