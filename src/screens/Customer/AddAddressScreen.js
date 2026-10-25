import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import LoadingSpinner from '../../components/LoadingSpinner';
import { userApi } from '../../api/userApi';
import { COLORS } from '../../constants/colors';

import {
  FONT_SIZES,
  SPACING,
  RADIUS,
} from '../../constants/theme';

// ============================================================
// ALERT HELPER
// ============================================================

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(
        message
          ? `${title}\n\n${message}`
          : title
      );
    }
  } else {
    Alert.alert(title, message);
  }
};

// ============================================================
// ADDRESS HELPERS
// ============================================================

const normalizeId = (address) => {
  if (!address) return null;

  return (
    address?.id ??
    address?._id ??
    address?.Id ??
    address?.ID ??
    address?.addressId ??
    address?.AddressId ??
    null
  );
};

// ============================================================
// GET COORDINATES
// ============================================================

const getAddressCoordinates = (address) => {
  if (!address) return null;

  const latitude =
    address?.Latitude ??
    address?.latitude ??
    address?.lat ??
    address?.Lat;

  const longitude =
    address?.Longitude ??
    address?.longitude ??
    address?.lng ??
    address?.Lng;

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (
    !Number.isFinite(parsedLatitude) ||
    !Number.isFinite(parsedLongitude)
  ) {
    return null;
  }

  return {
    latitude: parsedLatitude,
    longitude: parsedLongitude,
  };
};

// ============================================================
// GET TITLE
// ============================================================

const getAddressTitle = (address) => {
  if (!address) return '';

  return String(
    address?.title ??
    address?.Title ??
    address?.name ??
    address?.Name ??
    ''
  ).trim();
};

// ============================================================
// GET ADDRESS TEXT
// ============================================================

const getAddressText = (address) => {
  if (!address) return '';

  return String(
    address?.AddressText ??
    address?.addressText ??
    address?.address ??
    address?.street ??
    address?.Street ??
    ''
  ).trim();
};

// ============================================================
// GET AREA (المنطقة / الحي)
// ============================================================

const getAddressArea = (address) => {
  if (!address) return '';

  return String(
    address?.Area ??
    address?.area ??
    ''
  ).trim();
};

// ============================================================
// EXTRACT ADDRESS FROM ADD/UPDATE RESPONSE
// ============================================================

const extractAddressFromResponse = (response) => {
  const data =
    response?.data?.data ??
    response?.data ??
    null;

  if (!data) {
    return null;
  }

  if (data?.address) {
    return data.address;
  }

  if (data?.userAddress) {
    return data.userAddress;
  }

  if (data?.createdAddress) {
    return data.createdAddress;
  }

  if (data?.savedAddress) {
    return data.savedAddress;
  }

  if (
    data?.id ||
    data?._id ||
    data?.Id ||
    data?.addressId ||
    data?.AddressId
  ) {
    return data;
  }

  return null;
};

// ============================================================
// EXTRACT ADDRESSES ARRAY
// ============================================================

const extractAddressesArray = (response) => {
  const data =
    response?.data?.data ??
    response?.data ??
    null;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.addresses)) {
    return data.addresses;
  }

  if (Array.isArray(data?.userAddresses)) {
    return data.userAddresses;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

// ============================================================
// FIND SAVED ADDRESS
// ============================================================

const findSavedAddress = ({
  addresses,
  savedAddress,
  payload,
}) => {
  if (!Array.isArray(addresses)) {
    return null;
  }

  // ==========================================================
  // 1. SEARCH BY ID
  // ==========================================================

  const savedId =
    normalizeId(savedAddress);

  if (savedId != null) {
    const byId = addresses.find((item) => {
      const itemId =
        normalizeId(item);

      return (
        itemId != null &&
        String(itemId) ===
          String(savedId)
      );
    });

    if (byId) {
      return byId;
    }
  }

  // ==========================================================
  // 2. SEARCH BY TITLE + COORDINATES
  // ==========================================================

  const payloadTitle = String(
    payload?.title || ''
  ).trim();

  const payloadAddress = String(
    payload?.addressText || ''
  ).trim();

  const payloadLatitude = Number(
    payload?.latitude
  );

  const payloadLongitude = Number(
    payload?.longitude
  );

  const matched = addresses.find(
    (item) => {
      const itemTitle =
        getAddressTitle(item);

      const itemAddress =
        getAddressText(item);

      const itemCoordinates =
        getAddressCoordinates(item);

      if (!itemCoordinates) {
        return false;
      }

      const sameTitle =
        itemTitle ===
        payloadTitle;

      const sameAddress =
        itemAddress ===
        payloadAddress;

      const sameCoordinates =
        Math.abs(
          itemCoordinates.latitude -
            payloadLatitude
        ) < 0.00001 &&
        Math.abs(
          itemCoordinates.longitude -
            payloadLongitude
        ) < 0.00001;

      return (
        sameCoordinates &&
        (
          sameTitle ||
          sameAddress
        )
      );
    }
  );

  if (matched) {
    return matched;
  }

  return null;
};

// ============================================================
// NORMALIZE FINAL ADDRESS
// ============================================================

const normalizeFinalAddress = ({
  address,
  payload,
}) => {
  const source =
    address || {};

  const id =
    normalizeId(source);

  const coordinates =
    getAddressCoordinates(
      source
    );

  const finalTitle =
    getAddressTitle(source) ||
    payload?.title ||
    '';

  const finalAddressText =
    getAddressText(source) ||
    payload?.addressText ||
    '';

  const finalArea =
    getAddressArea(source) ||
    payload?.area ||
    '';

  const finalLatitude =
    coordinates?.latitude ??
    Number(payload?.latitude);

  const finalLongitude =
    coordinates?.longitude ??
    Number(payload?.longitude);

  return {
    ...source,

    // ========================================================
    // ID
    // ========================================================

    id:
      id ??
      source?.id ??
      undefined,

    _id:
      source?._id ??
      id ??
      undefined,

    // ========================================================
    // TITLE
    // ========================================================

    title:
      finalTitle,

    Title:
      finalTitle,

    // ========================================================
    // ADDRESS
    // ========================================================

    AddressText:
      finalAddressText,

    addressText:
      finalAddressText,

    address:
      finalAddressText,

    // ========================================================
    // AREA (المنطقة / الحي)
    // ========================================================

    Area:
      finalArea,

    area:
      finalArea,

    // ========================================================
    // COORDINATES
    // ========================================================

    latitude:
      finalLatitude,

    longitude:
      finalLongitude,

    Latitude:
      finalLatitude,

    Longitude:
      finalLongitude,
  };
};

// ============================================================
// COMPONENT
// ============================================================

export default function AddAddressScreen({
  navigation,
  route,
}) {
  // ==========================================================
  // EDIT MODE
  // ==========================================================

  const addressToEdit =
    route?.params?.addressToEdit ||
    null;

  const isEditMode =
    Boolean(addressToEdit);

  const addressId =
    normalizeId(addressToEdit);

  // ==========================================================
  // RETURN DESTINATION
  // ==========================================================

  /*
    لو جايين من Checkout:

    Checkout
       ↓
    AddressesScreen
       ↓
    AddAddressScreen
       ↓
    حفظ
       ↓
    Checkout

    وفي حالة إضافة عنوان جديد:
    Checkout هو الـ default destination
    حتى لو لم يتم تمرير returnTo.
  */

  const returnTo =
    route?.params?.returnTo ||
    'Checkout';

  /*
    مهم:

    - إضافة عنوان جديد => ترجع Checkout دائمًا.
    - تعديل عنوان => ترجع Checkout فقط
      لو جاي من Checkout.
  */

  const shouldReturnToCheckout =
    !isEditMode ||
    route?.params?.returnTo ===
      'Checkout' ||
    route?.params?.returnToCheckout ===
      true ||
    (
      route?.params?.isSelecting ===
        true &&
      !route?.params?.returnTo
    );

  // ==========================================================
  // INITIAL DATA
  // ==========================================================

  const [title, setTitle] =
    useState(
      addressToEdit?.title ||
        addressToEdit?.Title ||
        ''
    );

  const [addressText, setAddressText] =
    useState(
      addressToEdit?.AddressText ||
        addressToEdit?.addressText ||
        addressToEdit?.address ||
        addressToEdit?.street ||
        ''
    );

  const [area, setArea] =
    useState(
      addressToEdit?.Area ||
        addressToEdit?.area ||
        ''
    );

  const [building, setBuilding] =
    useState(
      addressToEdit?.building ||
        ''
    );

  const [floor, setFloor] =
    useState(
      addressToEdit?.floor ||
        ''
    );

  const [apartment, setApartment] =
    useState(
      addressToEdit?.apartment ||
        ''
    );

  const [notes, setNotes] =
    useState(
      addressToEdit?.notes ||
        ''
    );

  const [isDefault, setIsDefault] =
    useState(
      Boolean(
        Number(
          addressToEdit?.isDefault
        ) === 1 ||
          Number(
            addressToEdit?.IsDefault
          ) === 1 ||
          addressToEdit?.isDefault ===
            true ||
          addressToEdit?.IsDefault ===
            true
      )
    );

  // ==========================================================
  // INITIAL COORDINATES
  // ==========================================================

  const getInitialCoordinates =
    () => {
      const latitude =
        addressToEdit?.Latitude ??
        addressToEdit?.latitude;

      const longitude =
        addressToEdit?.Longitude ??
        addressToEdit?.longitude;

      if (
        latitude != null &&
        longitude != null
      ) {
        const parsedLatitude =
          Number(latitude);

        const parsedLongitude =
          Number(longitude);

        if (
          Number.isFinite(
            parsedLatitude
          ) &&
          Number.isFinite(
            parsedLongitude
          )
        ) {
          return {
            latitude:
              parsedLatitude,

            longitude:
              parsedLongitude,
          };
        }
      }

      return null;
    };

  const [coordinates, setCoordinates] =
    useState(
      getInitialCoordinates()
    );

  const [submitting, setSubmitting] =
    useState(false);

  // ==========================================================
  // RECEIVE LOCATION FROM MAP PICKER
  // ==========================================================

  useEffect(() => {
    const selectedLocation =
      route?.params
        ?.selectedLocation;

    if (
      !selectedLocation ||
      selectedLocation.latitude ==
        null ||
      selectedLocation.longitude ==
        null
    ) {
      return;
    }

    const latitude = Number(
      selectedLocation.latitude
    );

    const longitude = Number(
      selectedLocation.longitude
    );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    setCoordinates({
      latitude,
      longitude,
    });

    // ========================================================
    // ADDRESS FROM MAP
    // ========================================================

    const mapAddress =
      selectedLocation
        ?.formattedAddress ||
      selectedLocation
        ?.addressText ||
      selectedLocation
        ?.address ||
      '';

    if (
      mapAddress &&
      !String(addressText).trim()
    ) {
      setAddressText(
        String(mapAddress).trim()
      );
    }

    // ========================================================
    // CLEAN PARAM
    // ========================================================

    navigation.setParams({
      selectedLocation:
        undefined,
    });
  }, [
    route?.params?.selectedLocation,
    navigation,
    addressText,
  ]);

  // ==========================================================
  // OPEN MAP PICKER
  // ==========================================================

  const handleOpenMapPicker =
    () => {
      navigation.navigate(
        'MapPicker',
        {
          initialLocation:
            coordinates,

          returnTo:
            'AddAddressScreen',
        }
      );
    };

  // ==========================================================
  // NAVIGATE AFTER SAVE
  // ==========================================================

  const navigateAfterSave =
    async ({
      response,
      payload,
    }) => {
      // ======================================================
      // TRY RESPONSE FIRST
      // ======================================================

      const savedAddressFromResponse =
        extractAddressFromResponse(
          response
        );

      let finalAddress =
        savedAddressFromResponse;

      // ======================================================
      // REFRESH FROM SERVER
      // ======================================================

      try {
        if (
          userApi?.getAddresses
        ) {
          const addressesResponse =
            await userApi.getAddresses();

          const addresses =
            extractAddressesArray(
              addressesResponse
            );

          const foundAddress =
            findSavedAddress({
              addresses,
              savedAddress:
                savedAddressFromResponse,
              payload,
            });

          if (foundAddress) {
            finalAddress =
              foundAddress;
          }
        }
      } catch (refreshError) {
        console.log(
          '⚠️ Could not refresh addresses after save:',
          refreshError?.response
            ?.data ||
            refreshError?.message ||
            refreshError
        );
      }

      // ======================================================
      // NORMALIZE FINAL ADDRESS
      // ======================================================

      finalAddress =
        normalizeFinalAddress({
          address: finalAddress,
          payload,
        });

      // ======================================================
      // VERIFY ADDRESS ID
      // ======================================================

      const finalAddressId =
        normalizeId(
          finalAddress
        );

      /*
        Checkout يحتاج ID حقيقي للعنوان
        علشان يقدر يعمل estimatePrice.
      */

      if (
        !finalAddressId
      ) {
        throw new Error(
          'تم حفظ العنوان بنجاح، ولكن تعذر الحصول على معرّف العنوان من السيرفر'
        );
      }

      // ======================================================
      // EDIT MODE
      // ======================================================

      if (isEditMode) {
        /*
          لو التعديل جاي من Checkout
          نرجع Checkout مباشرة.
        */

        if (
          shouldReturnToCheckout
        ) {
          navigation.navigate(
            returnTo,
            {
              selectedAddress:
                finalAddress,

              addressSavedAt:
                Date.now(),
            }
          );

          return;
        }

        // ====================================================
        // NORMAL EDIT FLOW
        // ====================================================

        showAlert(
          'نجاح',
          'تم تحديث العنوان بنجاح'
        );

        navigation.goBack();

        return;
      }

      // ======================================================
      // NEW ADDRESS
      // ======================================================

      /*
        هنا التعديل الأساسي:

        سواء كان returnTo موجود أو لا،
        إضافة عنوان جديد بعد نجاح الحفظ
        ترجع إلى Checkout.

        المسار:

        حفظ العنوان
             ↓
        API Success
             ↓
        الحصول على ID
             ↓
        Checkout
             ↓
        selectedAddress
             ↓
        إعادة حساب التوصيل
      */

      navigation.navigate(
        'Checkout',
        {
          selectedAddress:
            finalAddress,

          addressSavedAt:
            Date.now(),
        }
      );
    };

  // ==========================================================
  // SAVE ADDRESS
  // ==========================================================

  const handleSaveAddress =
    async () => {
      const cleanTitle =
        String(
          title || ''
        ).trim();

      const cleanAddressText =
        String(
          addressText || ''
        ).trim();

      const cleanArea =
        String(
          area || ''
        ).trim();

      // ========================================================
      // TITLE VALIDATION
      // ========================================================

      if (!cleanTitle) {
        showAlert(
          'تنبيه',
          'يرجى إدخال اسم للعنوان (مثل: المنزل، العمل)'
        );

        return;
      }

      // ========================================================
      // AREA VALIDATION
      // ========================================================

      if (!cleanArea) {
        showAlert(
          'تنبيه',
          'يرجى إدخال المنطقة / الحي'
        );

        return;
      }

      // ========================================================
      // ADDRESS VALIDATION
      // ========================================================

      if (!cleanAddressText) {
        showAlert(
          'تنبيه',
          'يرجى إدخال تفاصيل العنوان أو اسم الشارع'
        );

        return;
      }

      // ========================================================
      // COORDINATES VALIDATION
      // ========================================================

      const latitude =
        Number(
          coordinates?.latitude
        );

      const longitude =
        Number(
          coordinates?.longitude
        );

      const hasValidCoordinates =
        Number.isFinite(latitude) &&
        Number.isFinite(longitude);

      if (
        !hasValidCoordinates
      ) {
        showAlert(
          'تنبيه',
          'يرجى تحديد موقع العنوان على الخريطة قبل الحفظ، عشان نقدر نحسب مسافة ورسوم التوصيل بدقة'
        );

        return;
      }

      // ========================================================
      // START SUBMIT
      // ========================================================

      if (submitting) {
        return;
      }

      setSubmitting(true);

      try {
        // ======================================================
        // PAYLOAD
        // ======================================================

        const payload = {
          // --------------------------------------------------
          // TITLE
          // --------------------------------------------------

          title:
            cleanTitle,

          Title:
            cleanTitle,

          // --------------------------------------------------
          // ADDRESS
          // --------------------------------------------------

          addressText:
            cleanAddressText,

          AddressText:
            cleanAddressText,

          address:
            cleanAddressText,

          street:
            cleanAddressText,

          // --------------------------------------------------
          // AREA (المنطقة / الحي)
          // --------------------------------------------------

          area:
            cleanArea,

          Area:
            cleanArea,

          // --------------------------------------------------
          // BUILDING
          // --------------------------------------------------

          building:
            String(
              building || ''
            ).trim(),

          // --------------------------------------------------
          // FLOOR
          // --------------------------------------------------

          floor:
            String(
              floor || ''
            ).trim(),

          // --------------------------------------------------
          // APARTMENT
          // --------------------------------------------------

          apartment:
            String(
              apartment || ''
            ).trim(),

          // --------------------------------------------------
          // NOTES
          // --------------------------------------------------

          notes:
            String(
              notes || ''
            ).trim(),

          // --------------------------------------------------
          // DEFAULT
          // --------------------------------------------------

          isDefault:
            Boolean(isDefault),

          IsDefault:
            Boolean(isDefault),

          // --------------------------------------------------
          // LATITUDE
          // --------------------------------------------------

          latitude,

          Latitude:
            latitude,

          // --------------------------------------------------
          // LONGITUDE
          // --------------------------------------------------

          longitude,

          Longitude:
            longitude,
        };

        // ======================================================
        // UPDATE EXISTING ADDRESS
        // ======================================================

        if (isEditMode) {
          if (
            !userApi?.updateAddress
          ) {
            throw new Error(
              'دالة تحديث العنوان غير معرفة في API'
            );
          }

          if (!addressId) {
            throw new Error(
              'معرّف العنوان غير موجود'
            );
          }

          const response =
            await userApi.updateAddress(
              addressId,
              payload
            );

          await navigateAfterSave({
            response,
            payload,
          });

          return;
        }

        // ======================================================
        // ADD NEW ADDRESS
        // ======================================================

        if (
          !userApi?.addAddress
        ) {
          throw new Error(
            'دالة إضافة العنوان غير معرفة في API'
          );
        }

        const response =
          await userApi.addAddress(
            payload
          );

        /*
          بعد نجاح الحفظ:

          1. نجيب العنوان من السيرفر.
          2. نضمن وجود ID.
          3. نرجع Checkout مباشرة.
          4. نرسل selectedAddress.
        */

        await navigateAfterSave({
          response,
          payload,
        });

      } catch (error) {
        console.log(
          '❌ Error saving address:',
          error?.response?.data ||
            error?.message ||
            error
        );

        const errorMsg =
          error?.response?.data
            ?.message ||
          error?.response?.data
            ?.error ||
          error?.message ||
          'فشل حفظ العنوان، يرجى المحاولة مرة أخرى';

        showAlert(
          'خطأ',
          errorMsg
        );
      } finally {
        setSubmitting(false);
      }
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      {/* ====================================================
          HEADER
      ==================================================== */}

      <View style={styles.header}>
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
          style={styles.headerTitle}
        >
          {isEditMode
            ? 'تعديل العنوان'
            : 'إضافة عنوان جديد'}
        </Text>

        <View
          style={{
            width: 24,
          }}
        />
      </View>

      {/* ====================================================
          CONTENT
      ==================================================== */}

      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* ==================================================
            TITLE
        ================================================== */}

        <Text style={styles.label}>
          تسمية العنوان *
        </Text>

        <View
          style={
            styles.quickTagsContainer
          }
        >
          {[
            'المنزل',
            'العمل',
            'السكن',
            'عنوان آخر',
          ].map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagBtn,
                title === tag &&
                  styles.tagBtnActive,
              ]}
              onPress={() =>
                setTitle(tag)
              }
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tagText,
                  title === tag &&
                    styles.tagTextActive,
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View
          style={styles.inputGroup}
        >
          <TextInput
            style={styles.input}
            placeholder="مثال: بيت العائلة، الشقة"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            textAlign="right"
          />
        </View>

        {/* ==================================================
            AREA (المنطقة / الحي)
        ================================================== */}

        <View
          style={styles.inputGroup}
        >
          <Text style={styles.label}>
            المنطقة / الحي *
          </Text>

          <View
            style={
              styles.inputWithIcon
            }
          >
            <Ionicons
              name="pin-outline"
              size={20}
              color="#6B7280"
            />

            <TextInput
              style={[
                styles.input,
                styles.flexInput,
              ]}
              placeholder="مثال: بركة السبع، المنصورة"
              placeholderTextColor="#9CA3AF"
              value={area}
              onChangeText={setArea}
              textAlign="right"
            />
          </View>
        </View>

        {/* ==================================================
            ADDRESS
        ================================================== */}

        <View
          style={styles.inputGroup}
        >
          <Text style={styles.label}>
            العنوان / اسم الشارع *
          </Text>

          <View
            style={
              styles.inputWithIcon
            }
          >
            <Ionicons
              name="location-outline"
              size={20}
              color="#6B7280"
            />

            <TextInput
              style={[
                styles.input,
                styles.flexInput,
              ]}
              placeholder="مثال: شارع الجلاء - بجوار مسجد النور"
              placeholderTextColor="#9CA3AF"
              value={addressText}
              onChangeText={
                setAddressText
              }
              textAlign="right"
            />
          </View>
        </View>

        {/* ==================================================
            MAP PICKER
        ================================================== */}

        <TouchableOpacity
          style={
            styles.mapPickerBtn
          }
          activeOpacity={0.85}
          onPress={
            handleOpenMapPicker
          }
        >
          <Ionicons
            name="map-outline"
            size={20}
            color={
              COLORS?.primary ||
              '#F97316'
            }
          />

          <Text
            style={
              styles.mapPickerText
            }
          >
            {coordinates
              ? 'تم تحديد الموقع ✓ (اضغط للتعديل)'
              : 'اختر الموقع على الخريطة'}
          </Text>
        </TouchableOpacity>

        {/* ==================================================
            COORDINATES
        ================================================== */}

        {coordinates && (
          <View
            style={
              styles.coordinatesBox
            }
          >
            <Ionicons
              name="navigate-outline"
              size={18}
              color={
                COLORS?.primary ||
                '#F97316'
              }
            />

            <Text
              style={
                styles.coordinatesText
              }
            >
              الموقع المحدد:{' '}
              {Number(
                coordinates.latitude
              ).toFixed(5)}
              {' , '}
              {Number(
                coordinates.longitude
              ).toFixed(5)}
            </Text>
          </View>
        )}

        {/* ==================================================
            BUILDING / FLOOR
        ================================================== */}

        <View
          style={styles.rowInputs}
        >
          <View
            style={[
              styles.inputGroup,
              styles.halfInput,
            ]}
          >
            <Text
              style={styles.label}
            >
              رقم المبنى / العقار
            </Text>

            <TextInput
              style={styles.input}
              placeholder="مثال: 12"
              placeholderTextColor="#9CA3AF"
              value={building}
              onChangeText={
                setBuilding
              }
              textAlign="right"
            />
          </View>

          <View
            style={[
              styles.inputGroup,
              styles.halfInput,
            ]}
          >
            <Text
              style={styles.label}
            >
              الطابق (الدور)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="مثال: 3"
              placeholderTextColor="#9CA3AF"
              value={floor}
              onChangeText={
                setFloor
              }
              textAlign="right"
            />
          </View>
        </View>

        {/* ==================================================
            APARTMENT
        ================================================== */}

        <View
          style={styles.inputGroup}
        >
          <Text style={styles.label}>
            رقم الشقة
          </Text>

          <TextInput
            style={styles.input}
            placeholder="مثال: 5"
            placeholderTextColor="#9CA3AF"
            value={apartment}
            onChangeText={
              setApartment
            }
            textAlign="right"
          />
        </View>

        {/* ==================================================
            NOTES
        ================================================== */}

        <View
          style={styles.inputGroup}
        >
          <Text style={styles.label}>
            ملاحظات إضافية للمندوب (اختياري)
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.textArea,
            ]}
            placeholder="علامة مميزة، الاتصال عند الوصول..."
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlign="right"
          />
        </View>

        {/* ==================================================
            DEFAULT ADDRESS
        ================================================== */}

        <View
          style={styles.switchRow}
        >
          <Text
            style={styles.switchLabel}
          >
            تعيين كعنوان افتراضي للتوصيل
          </Text>

          <Switch
            value={isDefault}
            onValueChange={
              setIsDefault
            }
            trackColor={{
              false: '#D1D5DB',
              true: '#FFEDD5',
            }}
            thumbColor={
              isDefault
                ? COLORS?.primary ||
                  '#F97316'
                : '#F3F4F6'
            }
          />
        </View>
      </ScrollView>

      {/* ====================================================
          SAVE FOOTER
      ==================================================== */}

      <View
        style={styles.footer}
      >
        <TouchableOpacity
          style={[
            styles.saveBtn,
            submitting &&
              styles.disabledBtn,
          ]}
          activeOpacity={0.85}
          onPress={
            handleSaveAddress
          }
          disabled={submitting}
        >
          {submitting ? (
            <LoadingSpinner
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={22}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.saveText
                }
              >
                {isEditMode
                  ? 'حفظ التعديلات'
                  : 'حفظ العنوان'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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

  scrollContent: {
    padding:
      SPACING?.md || 16,

    paddingBottom: 120,
  },

  label: {
    fontSize:
      FONT_SIZES?.sm || 14,

    fontWeight: '600',

    color: '#374151',

    marginBottom: 6,

    textAlign: 'right',
  },

  quickTagsContainer: {
    flexDirection:
      'row-reverse',

    gap: 8,

    marginBottom: 12,
  },

  tagBtn: {
    backgroundColor:
      '#FFFFFF',

    borderWidth: 1,

    borderColor:
      '#E5E7EB',

    paddingVertical: 6,

    paddingHorizontal: 12,

    borderRadius:
      RADIUS?.sm || 8,
  },

  tagBtnActive: {
    backgroundColor:
      '#FFF7ED',

    borderColor:
      COLORS?.primary ||
      '#F97316',
  },

  tagText: {
    fontSize: 13,

    color: '#4B5563',
  },

  tagTextActive: {
    color:
      COLORS?.primary ||
      '#F97316',

    fontWeight: '700',
  },

  inputGroup: {
    marginBottom:
      SPACING?.md || 16,
  },

  rowInputs: {
    flexDirection:
      'row-reverse',

    gap: 12,
  },

  halfInput: {
    flex: 1,
  },

  input: {
    backgroundColor:
      '#FFFFFF',

    borderWidth: 1,

    borderColor:
      '#E5E7EB',

    borderRadius:
      RADIUS?.md || 10,

    paddingHorizontal: 12,

    paddingVertical: 10,

    fontSize: 14,

    color: '#1F2937',
  },

  inputWithIcon: {
    flexDirection:
      'row-reverse',

    alignItems: 'center',

    backgroundColor:
      '#FFFFFF',

    borderWidth: 1,

    borderColor:
      '#E5E7EB',

    borderRadius:
      RADIUS?.md || 10,

    paddingHorizontal: 12,
  },

  flexInput: {
    borderWidth: 0,

    flex: 1,

    paddingHorizontal: 8,
  },

  textArea: {
    height: 80,

    textAlignVertical:
      'top',
  },

  mapPickerBtn: {
    flexDirection:
      'row-reverse',

    alignItems: 'center',

    backgroundColor:
      '#FFFFFF',

    borderWidth: 1,

    borderColor:
      '#E5E7EB',

    borderRadius:
      RADIUS?.md || 10,

    padding: 12,

    gap: 8,

    marginBottom: 10,
  },

  mapPickerText: {
    flex: 1,

    fontSize: 14,

    color: '#374151',

    fontWeight: '600',

    textAlign: 'right',
  },

  coordinatesBox: {
    flexDirection:
      'row-reverse',

    alignItems: 'center',

    justifyContent:
      'center',

    backgroundColor:
      '#FFF7ED',

    borderWidth: 1,

    borderColor:
      '#FED7AA',

    borderRadius:
      RADIUS?.md || 10,

    paddingVertical: 9,

    paddingHorizontal: 12,

    gap: 6,

    marginBottom: 16,
  },

  coordinatesText: {
    fontSize: 12,

    color: '#9A3412',

    fontWeight: '600',

    textAlign: 'center',
  },

  switchRow: {
    flexDirection:
      'row-reverse',

    justifyContent:
      'space-between',

    alignItems: 'center',

    backgroundColor:
      '#FFFFFF',

    padding:
      SPACING?.md || 16,

    borderRadius:
      RADIUS?.md || 10,

    borderWidth: 1,

    borderColor:
      '#E5E7EB',

    marginTop: 8,
  },

  switchLabel: {
    flex: 1,

    fontSize: 14,

    fontWeight: '600',

    color: '#1F2937',

    textAlign: 'right',

    marginRight: 10,
  },

  footer: {
    position: 'absolute',

    bottom: 0,

    left: 0,

    right: 0,

    backgroundColor:
      '#FFFFFF',

    padding:
      SPACING?.md || 16,

    borderTopWidth: 1,

    borderColor:
      '#E5E7EB',
  },

  saveBtn: {
    flexDirection:
      'row-reverse',

    backgroundColor:
      COLORS?.primary ||
      '#F97316',

    paddingVertical: 14,

    borderRadius:
      RADIUS?.md || 12,

    alignItems: 'center',

    justifyContent:
      'center',

    gap: 8,

    elevation: 3,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.1,

    shadowRadius: 3,
  },

  disabledBtn: {
    opacity: 0.7,
  },

  saveText: {
    color: '#FFFFFF',

    fontSize:
      FONT_SIZES?.md || 16,

    fontWeight: '700',
  },
});