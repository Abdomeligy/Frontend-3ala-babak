import React, {
  useState,
  useCallback,
} from 'react';

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  useFocusEffect,
} from '@react-navigation/native';

import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';

import { userApi } from '../../api/userApi';

import { COLORS } from '../../constants/colors';

import {
  FONT_SIZES,
  SPACING,
  RADIUS,
} from '../../constants/theme';

// ============================================================
// COMPONENT
// ============================================================

export default function AddressesScreen({
  navigation,
  route,
}) {
  const [addresses, setAddresses] = useState([]);

  const [loading, setLoading] = useState(true);

  const [updatingId, setUpdatingId] = useState(null);

  // ==========================================================
  // ROUTE STATE
  // ==========================================================

  /*
    لو الشاشة مفتوحة من Checkout:

    returnTo    = Checkout
    isSelecting = true

    وبالتالي:
    - اختيار عنوان موجود يرجع إلى Checkout
    - إضافة عنوان جديد تفتح AddAddressScreen
      مع تعليمات الرجوع إلى Checkout
    - تعديل عنوان يرجع إلى Checkout بعد الحفظ
  */

  const returnTo =
    route?.params?.returnTo || null;

  const isSelectingMode =
    Boolean(
      returnTo ||
      route?.params?.isSelecting
    );

  // ==========================================================
  // GET ADDRESS ID
  // ==========================================================

  const getAddressId = (item) => {
    return (
      item?._id ||
      item?.id ||
      item?.Id ||
      null
    );
  };

  // ==========================================================
  // CHECK DEFAULT
  // ==========================================================

  const isAddressDefault = (item) => {
    return Boolean(
      Number(item?.isDefault) === 1 ||
        Number(item?.IsDefault) === 1 ||
        item?.isDefault === true ||
        item?.IsDefault === true
    );
  };

  // ==========================================================
  // FETCH ADDRESSES
  // ==========================================================

  const fetchAddresses = useCallback(
    async () => {
      try {
        if (!userApi?.getAddresses) {
          console.log(
            'userApi.getAddresses is not defined'
          );

          setAddresses([]);
          return;
        }

        const res =
          await userApi.getAddresses();

        const root =
          res?.data;

        const list =
          root?.data?.addresses ||
          root?.data?.items ||
          root?.data ||
          root?.addresses ||
          root?.items ||
          [];

        setAddresses(
          Array.isArray(list)
            ? list
            : []
        );

      } catch (err) {
        console.log(
          'Error loading addresses:',
          err?.response?.data ||
            err?.message ||
            err
        );

        setAddresses([]);

      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ==========================================================
  // REFRESH WHEN SCREEN GETS FOCUS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAddresses();
    }, [fetchAddresses])
  );

  // ==========================================================
  // SELECT ADDRESS
  // ==========================================================

  const handleSelectAddress = (item) => {
    /*
      لو الشاشة مش مفتوحة في وضع اختيار عنوان،
      الضغط على العنوان لا يعمل.
    */

    if (!isSelectingMode) {
      return;
    }

    const targetScreen =
      returnTo || 'Checkout';

    /*
      استخدمنا صيغة:

      navigation.navigate(name, params)

      بدل:

      navigation.navigate({
        name,
        params,
        merge: true
      })

      لأن الصيغة الثانية أصبحت Deprecated.
    */

    navigation.navigate(
      targetScreen,
      {
        selectedAddress: item,
        addressSelectedAt: Date.now(),
      }
    );
  };

  // ==========================================================
  // SET DEFAULT ADDRESS
  // ==========================================================

  const handleSetDefault = async (item) => {
    const addressId =
      getAddressId(item);

    if (!addressId) {
      if (Platform.OS === 'web') {
        window.alert(
          'تعذر تحديد معرّف العنوان'
        );
      } else {
        Alert.alert(
          'خطأ',
          'تعذر تحديد معرّف العنوان'
        );
      }

      return;
    }

    const currentIsDefault =
      isAddressDefault(item);

    if (
      String(updatingId) ===
        String(addressId) ||
      currentIsDefault
    ) {
      return;
    }

    setUpdatingId(addressId);

    const previousAddresses =
      [...addresses];

    // ========================================================
    // OPTIMISTIC UPDATE
    // ========================================================

    setAddresses((prev) =>
      prev.map((addr) => {
        const currentId =
          getAddressId(addr);

        const isTarget =
          String(currentId) ===
          String(addressId);

        return {
          ...addr,

          isDefault:
            isTarget ? 1 : 0,

          IsDefault:
            isTarget ? 1 : 0,
        };
      })
    );

    try {
      if (
        !userApi?.setDefaultAddress
      ) {
        throw new Error(
          'دالة تعيين العنوان الافتراضي غير موجودة في userApi'
        );
      }

      await userApi.setDefaultAddress(
        addressId
      );

    } catch (error) {
      console.log(
        'Error setting default address:',
        error?.response?.data ||
          error?.message ||
          error
      );

      if (Platform.OS === 'web') {
        window.alert(
          'فشل تعيين العنوان كافتراضي'
        );
      } else {
        Alert.alert(
          'خطأ',
          'فشل تعيين العنوان كافتراضي'
        );
      }

      setAddresses(
        previousAddresses
      );

    } finally {
      setUpdatingId(null);
    }
  };

  // ==========================================================
  // EDIT ADDRESS
  // ==========================================================

  const handleEditAddress = (item) => {
    /*
      مهم جدًا:

      لو جايين من Checkout،
      AddAddressScreen لازم يعرف
      إنه بعد الحفظ يرجع إلى Checkout.
    */

    const params = {
      addressToEdit: item,

      ...(isSelectingMode
        ? {
            returnTo:
              returnTo || 'Checkout',

            isSelecting: true,

            returnToCheckout: true,
          }
        : {}),
    };

    try {
      navigation.navigate(
        'AddAddressScreen',
        params
      );
    } catch (err) {
      navigation.navigate(
        'AddAddress',
        params
      );
    }
  };

  // ==========================================================
  // DELETE ADDRESS
  // ==========================================================

  const handleDeleteAddress = (item) => {
    const addressId =
      getAddressId(item);

    if (!addressId) {
      if (Platform.OS === 'web') {
        window.alert(
          'تعذر تحديد معرّف العنوان للحذف'
        );
      } else {
        Alert.alert(
          'خطأ',
          'تعذر تحديد معرّف العنوان للحذف'
        );
      }

      return;
    }

    const performDelete =
      async () => {
        try {
          setLoading(true);

          if (
            !userApi?.deleteAddress
          ) {
            throw new Error(
              'دالة الحذف غير موجودة في userApi'
            );
          }

          await userApi.deleteAddress(
            addressId
          );

          await fetchAddresses();

          if (Platform.OS === 'web') {
            window.alert(
              'تم حذف العنوان بنجاح'
            );
          } else {
            Alert.alert(
              'نجاح',
              'تم حذف العنوان بنجاح'
            );
          }

        } catch (err) {
          console.log(
            'Error deleting address details:',
            err?.response?.data ||
              err?.message ||
              err
          );

          const errorMsg =
            err?.response?.data
              ?.message ||
            'تعذر حذف العنوان، يرجى المحاولة لاحقاً';

          if (Platform.OS === 'web') {
            window.alert(
              errorMsg
            );
          } else {
            Alert.alert(
              'خطأ',
              errorMsg
            );
          }

        } finally {
          setLoading(false);
        }
      };

    // ========================================================
    // WEB CONFIRMATION
    // ========================================================

    if (Platform.OS === 'web') {
      const confirmed =
        window.confirm(
          'هل أنت متأكد من رغبتك في حذف هذا العنوان؟'
        );

      if (confirmed) {
        performDelete();
      }

      return;
    }

    // ========================================================
    // MOBILE CONFIRMATION
    // ========================================================

    Alert.alert(
      'حذف العنوان',
      'هل أنت متأكد من رغبتك في حذف هذا العنوان؟',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },

        {
          text: 'حذف',
          style: 'destructive',
          onPress:
            performDelete,
        },
      ]
    );
  };

  // ==========================================================
  // DISPLAY ADDRESS
  // ==========================================================

  const getDisplayAddress = (item) => {
    const mainText =
      item?.AddressText ||
      item?.addressText ||
      item?.address ||
      item?.street ||
      '';

    if (mainText) {
      const extraParts = [];

      if (item?.building) {
        extraParts.push(
          `مبنى ${item.building}`
        );
      }

      if (item?.floor) {
        extraParts.push(
          `دور ${item.floor}`
        );
      }

      if (item?.apartment) {
        extraParts.push(
          `شقة ${item.apartment}`
        );
      }

      return extraParts.length > 0
        ? `${mainText} - ${extraParts.join(
            '، '
          )}`
        : mainText;
    }

    return 'تفاصيل العنوان غير مسجلة';
  };

  // ==========================================================
  // ADD NEW ADDRESS
  // ==========================================================

  const handleNavigateToAdd = () => {
    /*
      لو المستخدم داخل من Checkout:

      Checkout
        ↓
      Addresses
        ↓
      AddAddressScreen
        ↓
      حفظ العنوان
        ↓
      Checkout

      لذلك لازم نمرر معلومات الرجوع
      بشكل واضح إلى AddAddressScreen.
    */

    const params = isSelectingMode
      ? {
          returnTo:
            returnTo || 'Checkout',

          isSelecting: true,

          returnToCheckout: true,
        }
      : {};

    try {
      navigation.navigate(
        'AddAddressScreen',
        params
      );
    } catch (err) {
      navigation.navigate(
        'AddAddress',
        params
      );
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <LoadingSpinner />
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <View
      style={styles.container}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      {/* ====================================================
          HEADER
      ==================================================== */}

      <View
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() =>
            navigation.goBack()
          }
          hitSlop={{
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
          }}
        >
          <Ionicons
            name="arrow-forward"
            size={24}
            color="#1F2937"
          />
        </TouchableOpacity>

        <Text
          style={
            styles.headerTitle
          }
        >
          عناويني
        </Text>

        <View
          style={{
            width: 24,
          }}
        />
      </View>

      {/* ====================================================
          ADDRESS LIST
      ==================================================== */}

      <FlatList
        data={addresses}
        extraData={{
          addresses,
          updatingId,
        }}
        keyExtractor={(
          item,
          index
        ) =>
          String(
            getAddressId(item) ||
              index
          )
        }
        contentContainerStyle={
          styles.list
        }
        showsVerticalScrollIndicator={
          false
        }
        ListEmptyComponent={
          <EmptyState
            icon="location-outline"
            title="لسه مفيش عناوين محفوظة"
            subtitle="أضف عنوان توصيل ليسهل عليك الطلب سريعاً"
          />
        }
        renderItem={({
          item,
        }) => {
          const addressId =
            getAddressId(item);

          const isDefault =
            isAddressDefault(
              item
            );

          const fullAddressText =
            getDisplayAddress(
              item
            );

          const isUpdatingThis =
            String(
              updatingId
            ) ===
            String(
              addressId
            );

          return (
            <View
              style={[
                styles.card,
                isDefault &&
                  styles.defaultCard,
              ]}
            >
              {/* ==================================================
                  ADDRESS INFORMATION
              ================================================== */}

              <TouchableOpacity
                style={
                  styles.addressTouchable
                }
                activeOpacity={
                  isSelectingMode
                    ? 0.7
                    : 1
                }
                disabled={
                  !isSelectingMode
                }
                onPress={() =>
                  handleSelectAddress(
                    item
                  )
                }
              >
                <Ionicons
                  name="location-sharp"
                  size={26}
                  color={
                    isDefault
                      ? COLORS?.primary ||
                        '#F97316'
                      : '#6B7280'
                  }
                  style={
                    styles.locationIcon
                  }
                />

                <View
                  style={
                    styles.addressInfo
                  }
                >
                  <View
                    style={
                      styles.titleRow
                    }
                  >
                    <Text
                      style={
                        styles.titleText
                      }
                    >
                      {item?.title ||
                        item?.Title ||
                        item?.name ||
                        'العنوان'}
                    </Text>

                    {isDefault && (
                      <View
                        style={
                          styles.defaultBadge
                        }
                      >
                        <Text
                          style={
                            styles.defaultBadgeText
                          }
                        >
                          الافتراضي
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={
                      styles.addressText
                    }
                    numberOfLines={2}
                  >
                    {
                      fullAddressText
                    }
                  </Text>
                </View>
              </TouchableOpacity>

              {/* ==================================================
                  ACTIONS
              ================================================== */}

              <View
                style={
                  styles.actionsRow
                }
              >
                {/* DEFAULT */}

                <TouchableOpacity
                  disabled={
                    isUpdatingThis ||
                    isDefault
                  }
                  onPress={() =>
                    handleSetDefault(
                      item
                    )
                  }
                  style={
                    styles.actionBtn
                  }
                  hitSlop={{
                    top: 8,
                    bottom: 8,
                    left: 8,
                    right: 8,
                  }}
                >
                  {isUpdatingThis ? (
                    <ActivityIndicator
                      size="small"
                      color="#FF8A00"
                    />
                  ) : (
                    <Ionicons
                      name={
                        isDefault
                          ? 'star'
                          : 'star-outline'
                      }
                      size={20}
                      color={
                        isDefault
                          ? '#FF8A00'
                          : '#9CA3AF'
                      }
                    />
                  )}
                </TouchableOpacity>

                {/* EDIT */}

                <TouchableOpacity
                  disabled={
                    isUpdatingThis
                  }
                  onPress={() =>
                    handleEditAddress(
                      item
                    )
                  }
                  style={
                    styles.actionBtn
                  }
                  hitSlop={{
                    top: 8,
                    bottom: 8,
                    left: 8,
                    right: 8,
                  }}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color="#3B82F6"
                  />
                </TouchableOpacity>

                {/* DELETE */}

                <TouchableOpacity
                  disabled={
                    isUpdatingThis
                  }
                  onPress={() =>
                    handleDeleteAddress(
                      item
                    )
                  }
                  style={
                    styles.actionBtn
                  }
                  hitSlop={{
                    top: 8,
                    bottom: 8,
                    left: 8,
                    right: 8,
                  }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color="#EF4444"
                  />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* ====================================================
          ADD ADDRESS BUTTON
      ==================================================== */}

      <TouchableOpacity
        style={styles.addBtn}
        activeOpacity={0.85}
        onPress={
          handleNavigateToAdd
        }
      >
        <Ionicons
          name="add"
          size={24}
          color="#FFFFFF"
        />

        <Text
          style={styles.addText}
        >
          إضافة عنوان جديد
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        COLORS?.background ||
        '#F3F4F6',
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      flexDirection:
        'row-reverse',

      justifyContent:
        'space-between',

      alignItems: 'center',

      paddingHorizontal:
        SPACING?.md || 16,

      paddingTop: 44,

      paddingBottom: 16,

      backgroundColor:
        '#FFFFFF',

      borderBottomWidth: 1,

      borderColor:
        '#E5E7EB',
    },

    headerTitle: {
      fontSize:
        FONT_SIZES?.md || 16,

      fontWeight: '700',

      color: '#1F2937',
    },

    // ========================================================
    // LIST
    // ========================================================

    list: {
      padding:
        SPACING?.md || 16,

      paddingBottom: 100,
    },

    // ========================================================
    // CARD
    // ========================================================

    card: {
      flexDirection:
        'row-reverse',

      alignItems: 'center',

      backgroundColor:
        '#FFFFFF',

      borderRadius:
        RADIUS?.md || 12,

      padding:
        SPACING?.md || 16,

      marginBottom:
        SPACING?.sm || 12,

      elevation: 2,

      shadowColor: '#000',

      shadowOffset: {
        width: 0,
        height: 1,
      },

      shadowOpacity: 0.05,

      shadowRadius: 3,

      borderWidth: 1,

      borderColor:
        '#F3F4F6',
    },

    defaultCard: {
      borderColor:
        COLORS?.primary ||
        '#F97316',

      backgroundColor:
        '#FFF7ED',
    },

    // ========================================================
    // ADDRESS TOUCHABLE
    // ========================================================

    addressTouchable: {
      flex: 1,

      flexDirection:
        'row-reverse',

      alignItems: 'center',

      minWidth: 0,
    },

    locationIcon: {
      marginLeft: 12,
    },

    addressInfo: {
      flex: 1,

      paddingLeft: 8,

      minWidth: 0,
    },

    // ========================================================
    // TITLE
    // ========================================================

    titleRow: {
      flexDirection:
        'row-reverse',

      alignItems: 'center',

      marginBottom: 4,
    },

    titleText: {
      fontSize:
        FONT_SIZES?.md || 15,

      fontWeight: '700',

      color: '#111827',

      flexShrink: 1,
    },

    defaultBadge: {
      backgroundColor:
        '#FFEDD5',

      paddingHorizontal: 8,

      paddingVertical: 2,

      borderRadius: 6,

      marginRight: 8,
    },

    defaultBadgeText: {
      fontSize: 11,

      color: '#C2410C',

      fontWeight: '700',
    },

    // ========================================================
    // ADDRESS TEXT
    // ========================================================

    addressText: {
      textAlign: 'right',

      color: '#4B5563',

      fontSize: 14,

      lineHeight: 20,

      flexShrink: 1,
    },

    // ========================================================
    // ACTIONS
    // ========================================================

    actionsRow: {
      flexDirection:
        'row-reverse',

      alignItems: 'center',

      gap: 6,

      marginLeft: 4,
    },

    actionBtn: {
      padding: 6,
    },

    // ========================================================
    // ADD BUTTON
    // ========================================================

    addBtn: {
      position: 'absolute',

      bottom:
        SPACING?.md || 16,

      left:
        SPACING?.md || 16,

      right:
        SPACING?.md || 16,

      flexDirection:
        'row-reverse',

      backgroundColor:
        COLORS?.primary ||
        '#F97316',

      padding:
        SPACING?.md || 16,

      borderRadius:
        RADIUS?.md || 12,

      alignItems: 'center',

      justifyContent:
        'center',

      elevation: 4,

      shadowColor: '#000',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.15,

      shadowRadius: 4,
    },

    addText: {
      color: '#FFFFFF',

      fontWeight: '700',

      fontSize:
        FONT_SIZES?.md || 16,

      marginRight:
        SPACING?.xs || 4,
    },
  });