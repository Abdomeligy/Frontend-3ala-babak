import React, { useEffect, useRef, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { vendorApi } from '../../api/vendorApi';
import { useVendorStore } from '../../context/VendorStoreContext';
import { COLORS } from '../../constants/colors';

import {
  FONT_SIZES,
  SPACING,
  RADIUS,
} from '../../constants/theme';

// ============================================================
// STORE PROFILE SCREEN
// ============================================================

export default function StoreProfileScreen({ navigation, route }) {
  const { updateStore, refreshStore } = useVendorStore();

  // ==========================================================
  // STATE
  // ==========================================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState(null);

  // ==========================================================
  // FORM & IMAGE
  // ==========================================================

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [businessType, setBusinessType] = useState('restaurant');
  const [deliveryType, setDeliveryType] = useState('SELF');

  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const [storeImage, setStoreImage] = useState(null);
  const [existingLogo, setExistingLogo] = useState('');

  // ==========================================================
  // PENDING LOCATION EDIT
  // ==========================================================
  //
  // بيتفعل لما نستقبل نتيجة من MapPicker.
  // بيمنع loadStore() من الكتابة فوق العنوان/الإحداثيات
  // بقيم قديمة من السيرفر لو الصفحة عملها remount بعد
  // الرجوع من الخريطة قبل ما نضغط "حفظ".
  //
  // ==========================================================

  const pendingLocationEditRef = useRef(false);

  // ==========================================================
  // DEFAULT LOCATION
  // بركة السبع - المنوفية
  // ==========================================================

  const DEFAULT_LOCATION = {
    latitude: 30.636226,
    longitude: 31.09569,
  };

  // ==========================================================
  // LOAD STORE
  // ==========================================================

  const loadStore = async () => {
    try {
      setLoading(true);

      console.log('🏪 Loading store profile...');

      const response = await vendorApi.getMyStore();

      console.log(
        '🏪 Store profile response:',
        response?.data
      );

      const data = response?.data;

      const restaurant =
        data?.restaurant ||
        data?.store ||
        data?.data?.restaurant ||
        data?.data?.store ||
        data?.data ||
        data;

      if (!restaurant || typeof restaurant !== 'object') {
        throw new Error('بيانات المتجر غير موجودة');
      }

      setStore(restaurant);

      setName(
        restaurant.Name ??
          restaurant.name ??
          ''
      );

      setEmail(
        restaurant.Email ??
          restaurant.email ??
          ''
      );

      setPhone(
        restaurant.Phone ??
          restaurant.phone ??
          ''
      );

      if (
        !pendingLocationEditRef.current
      ) {

        setAddress(
          restaurant.Address ??
            restaurant.address ??
            ''
        );

      }

      setBusinessType(
        restaurant.BusinessType ??
          restaurant.businessType ??
          'restaurant'
      );

      setDeliveryType(
        restaurant.DeliveryType ??
          restaurant.deliveryType ??
          'SELF'
      );

      if (
        !pendingLocationEditRef.current
      ) {

        setLatitude(
          restaurant.Latitude != null
            ? String(restaurant.Latitude)
            : restaurant.latitude != null
            ? String(restaurant.latitude)
            : ''
        );

        setLongitude(
          restaurant.Longitude != null
            ? String(restaurant.Longitude)
            : restaurant.longitude != null
            ? String(restaurant.longitude)
            : ''
        );

      }

      const logoUrl =
        restaurant.Logo ??
        restaurant.logo ??
        restaurant.imageUrl ??
        restaurant.ImageUrl ??
        restaurant.Image ??
        restaurant.image ??
        restaurant.avatar ??
        restaurant.Avatar ??
        '';

      setExistingLogo(logoUrl);

      setStoreImage(null);

    } catch (error) {
      console.log(
        '❌ Store profile error:',
        error?.response?.data ||
          error?.message ||
          error
      );

      Alert.alert(
        'خطأ',
        'تعذر تحميل بيانات المتجر'
      );

    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadStore();
  }, []);

  // ==========================================================
  // RECEIVE LOCATION FROM MAP PICKER
  // ==========================================================
  //
  // MapPicker يرجع:
  //
  // {
  //   mapPickerResult: {
  //     latitude,
  //     longitude,
  //     address
  //   }
  // }
  //
  // ==========================================================

  useEffect(() => {
    const result = route?.params?.mapPickerResult;

    if (!result) {
      return;
    }

    console.log(
      '📍 Received MapPicker result:',
      result
    );

    const selectedLatitude = Number(
      result?.latitude ??
        result?.Latitude
    );

    const selectedLongitude = Number(
      result?.longitude ??
        result?.Longitude
    );

    // --------------------------------------------------------
    // Validate coordinates
    // --------------------------------------------------------

    const validLatitude =
      Number.isFinite(selectedLatitude) &&
      selectedLatitude >= -90 &&
      selectedLatitude <= 90;

    const validLongitude =
      Number.isFinite(selectedLongitude) &&
      selectedLongitude >= -180 &&
      selectedLongitude <= 180;

    if (!validLatitude || !validLongitude) {
      console.log(
        '❌ Invalid MapPicker coordinates:',
        result
      );

      Alert.alert(
        'خطأ',
        'الموقع الذي تم اختياره غير صحيح'
      );

      navigation.setParams({
        mapPickerResult: undefined,
      });

      return;
    }

    // --------------------------------------------------------
    // UPDATE LATITUDE
    // --------------------------------------------------------

    const newLatitude = String(
      selectedLatitude
    );

    // --------------------------------------------------------
    // UPDATE LONGITUDE
    // --------------------------------------------------------

    const newLongitude = String(
      selectedLongitude
    );

    console.log(
      '📍 Updating store location:',
      {
        latitude: newLatitude,
        longitude: newLongitude,
      }
    );

    pendingLocationEditRef.current = true;

    setLatitude(newLatitude);
    setLongitude(newLongitude);

    // --------------------------------------------------------
    // UPDATE ADDRESS
    // --------------------------------------------------------

    const returnedAddress =
      result?.address ??
      result?.Address ??
      result?.formattedAddress ??
      result?.displayName ??
      '';

    if (
      typeof returnedAddress === 'string' &&
      returnedAddress.trim().length > 0
    ) {
      const newAddress =
        returnedAddress.trim();

      console.log(
        '📍 Updating store address:',
        newAddress
      );

      setAddress(newAddress);
    }

    // --------------------------------------------------------
    // CLEAR PARAM
    // --------------------------------------------------------
    //
    // مهم جدًا حتى لا يتم تطبيق نفس النتيجة مرة أخرى
    // عند إعادة الرندر.
    //
    // --------------------------------------------------------

    navigation.setParams({
      mapPickerResult: undefined,
    });

  }, [
    route?.params?.mapPickerResult,
    navigation,
  ]);

  // ==========================================================
  // HANDLE BACK
  // ==========================================================

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      navigation.navigate(
        'VendorTabs',
        {
          screen: 'ProfileTab',
        }
      );
    }
  };

  // ==========================================================
  // PICK IMAGE
  // ==========================================================

  const handleChooseImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'تنبيه',
          'عذراً، نحتاج إلى إذن الوصول إلى معرض الصور لتغيير شعار المتجر!'
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (
        !result.canceled &&
        result.assets &&
        result.assets.length > 0
      ) {
        setStoreImage(
          result.assets[0].uri
        );
      }

    } catch (error) {
      console.log(
        '❌ Image picker error:',
        error
      );

      Alert.alert(
        'خطأ',
        'تعذر اختيار صورة المتجر'
      );
    }
  };

  // ==========================================================
  // OPEN MAP PICKER
  // ==========================================================

  const handleChooseLocation = () => {
    let currentLatitude =
      Number(latitude);

    let currentLongitude =
      Number(longitude);

    // --------------------------------------------------------
    // Validate current coordinates
    // --------------------------------------------------------

    const validLatitude =
      Number.isFinite(currentLatitude) &&
      currentLatitude >= -90 &&
      currentLatitude <= 90;

    const validLongitude =
      Number.isFinite(currentLongitude) &&
      currentLongitude >= -180 &&
      currentLongitude <= 180;

    if (
      !validLatitude ||
      !validLongitude
    ) {
      currentLatitude =
        DEFAULT_LOCATION.latitude;

      currentLongitude =
        DEFAULT_LOCATION.longitude;
    }

    if (!navigation?.navigate) {
      Alert.alert(
        'خطأ',
        'تعذر فتح الخريطة'
      );

      return;
    }

    // --------------------------------------------------------
    // IMPORTANT
    // لا نرسل أي callback داخل navigation params
    // --------------------------------------------------------

    const returnTo =
      route?.name || 'StoreProfile';

    console.log(
      '📍 Opening MapPicker:',
      {
        initialLocation: {
          latitude: currentLatitude,
          longitude: currentLongitude,
        },
        initialAddress:
          address?.trim() || '',
        returnTo,
      }
    );

    navigation.navigate(
      'MapPicker',
      {
        initialLocation: {
          latitude: currentLatitude,
          longitude: currentLongitude,
        },

        initialAddress:
          address?.trim() || '',

        returnTo,
      }
    );
  };

  // ==========================================================
  // APPEND LOGO TO FORM DATA
  // ==========================================================

  const appendLogoToFormData = async (
    formData,
    uri
  ) => {
    const uriParts =
      uri.split('.');

    const fileExtRaw =
      uriParts.length > 0
        ? uriParts[
            uriParts.length - 1
          ]
        : 'jpg';

    const fileExt =
      fileExtRaw
        .split('?')[0]
        .toLowerCase();

    const normalizedType =
      fileExt === 'png'
        ? 'png'
        : 'jpeg';

    const fileName =
      `store_logo.${normalizedType}`;

    const mimeType =
      `image/${normalizedType}`;

    if (Platform.OS === 'web') {
      const response =
        await fetch(uri);

      const blob =
        await response.blob();

      const file =
        new File(
          [blob],
          fileName,
          {
            type:
              blob.type ||
              mimeType,
          }
        );

      formData.append(
        'logo',
        file
      );

    } else {
      formData.append(
        'logo',
        {
          uri,
          name: fileName,
          type: mimeType,
        }
      );
    }
  };

  // ==========================================================
  // VALIDATE LOCATION
  // ==========================================================

  const validateLocation = () => {
    if (
      latitude === '' ||
      longitude === ''
    ) {
      return false;
    }

    const parsedLatitude =
      Number(latitude);

    const parsedLongitude =
      Number(longitude);

    if (
      !Number.isFinite(parsedLatitude) ||
      !Number.isFinite(parsedLongitude)
    ) {
      return false;
    }

    if (
      parsedLatitude < -90 ||
      parsedLatitude > 90
    ) {
      return false;
    }

    if (
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      return false;
    }

    return true;
  };

  // ==========================================================
  // SAVE STORE
  // ==========================================================

  const handleSave = async () => {

    // --------------------------------------------------------
    // NAME
    // --------------------------------------------------------

    if (!name.trim()) {
      Alert.alert(
        'تنبيه',
        'من فضلك أدخل اسم المتجر'
      );

      return;
    }

    // --------------------------------------------------------
    // PHONE
    // --------------------------------------------------------

    if (!phone.trim()) {
      Alert.alert(
        'تنبيه',
        'من فضلك أدخل رقم الهاتف'
      );

      return;
    }

    // --------------------------------------------------------
    // ADDRESS
    // --------------------------------------------------------

    if (!address.trim()) {
      Alert.alert(
        'تنبيه',
        'من فضلك قم بتحديد عنوان المتجر من الخريطة'
      );

      return;
    }

    // --------------------------------------------------------
    // LOCATION
    // --------------------------------------------------------

    if (!validateLocation()) {
      Alert.alert(
        'تنبيه',
        'من فضلك قم باختيار موقع المتجر من الخريطة'
      );

      return;
    }

    const parsedLatitude =
      Number(latitude);

    const parsedLongitude =
      Number(longitude);

    try {
      setSaving(true);

      const formData =
        new FormData();

      // ------------------------------------------------------
      // BASIC DATA
      // ------------------------------------------------------

      formData.append(
        'name',
        name.trim()
      );

      formData.append(
        'email',
        email.trim() || ''
      );

      formData.append(
        'phone',
        phone.trim()
      );

      // ------------------------------------------------------
      // ADDRESS
      // ------------------------------------------------------

      formData.append(
        'address',
        address.trim()
      );

      // ------------------------------------------------------
      // BUSINESS TYPE
      // ------------------------------------------------------

      formData.append(
        'businessType',
        businessType.trim() ||
          'restaurant'
      );

      // ------------------------------------------------------
      // DELIVERY TYPE
      // ------------------------------------------------------

      formData.append(
        'deliveryType',
        deliveryType.trim() ||
          'SELF'
      );

      // ------------------------------------------------------
      // LATITUDE
      // ------------------------------------------------------

      formData.append(
        'latitude',
        String(parsedLatitude)
      );

      // ------------------------------------------------------
      // LONGITUDE
      // ------------------------------------------------------

      formData.append(
        'longitude',
        String(parsedLongitude)
      );

      // ------------------------------------------------------
      // LOGO
      // ------------------------------------------------------

      if (storeImage) {
        await appendLogoToFormData(
          formData,
          storeImage
        );
      }

      // ------------------------------------------------------
      // DEBUG
      // ------------------------------------------------------

      console.log(
        '💾 Updating store with:',
        {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          businessType,
          deliveryType,
          latitude: parsedLatitude,
          longitude: parsedLongitude,
          hasLogo: !!storeImage,
        }
      );

      // ------------------------------------------------------
      // API
      // ------------------------------------------------------

      const response =
        await vendorApi.updateMyStore(
          formData
        );

      console.log(
        '✅ Store updated response:',
        response?.data
      );

      // ------------------------------------------------------
      // EXTRACT UPDATED STORE
      // ------------------------------------------------------

      const responseData =
        response?.data;

      const updatedStore =
        responseData?.restaurant ||
        responseData?.store ||
        responseData?.data?.restaurant ||
        responseData?.data?.store ||
        responseData?.data ||
        responseData;

      // ------------------------------------------------------
      // UPDATE LOCAL / CONTEXT STORE
      // ------------------------------------------------------

      if (
        updatedStore &&
        typeof updatedStore === 'object'
      ) {
        pendingLocationEditRef.current = false;

        updateStore(
          updatedStore
        );

        setStore(
          updatedStore
        );

        // ----------------------------------------------------
        // Keep local fields synchronized
        // ----------------------------------------------------

        const updatedAddress =
          updatedStore.Address ??
          updatedStore.address;

        const updatedLatitude =
          updatedStore.Latitude ??
          updatedStore.latitude;

        const updatedLongitude =
          updatedStore.Longitude ??
          updatedStore.longitude;

        if (
          updatedAddress != null &&
          String(updatedAddress).trim()
        ) {
          setAddress(
            String(updatedAddress)
          );
        }

        if (
          updatedLatitude != null
        ) {
          setLatitude(
            String(updatedLatitude)
          );
        }

        if (
          updatedLongitude != null
        ) {
          setLongitude(
            String(updatedLongitude)
          );
        }

        // ----------------------------------------------------
        // Logo
        // ----------------------------------------------------

        const newLogoUrl =
          updatedStore.Logo ??
          updatedStore.logo ??
          updatedStore.imageUrl ??
          updatedStore.ImageUrl ??
          updatedStore.Image ??
          updatedStore.image ??
          '';

        if (newLogoUrl) {
          setExistingLogo(
            newLogoUrl
          );
        }
      } else {

        // ----------------------------------------------------
        // FALLBACK
        // ----------------------------------------------------

        console.log(
          '🔄 Reloading store after update...'
        );

        const freshStore =
          await refreshStore(false);

        if (freshStore) {
          pendingLocationEditRef.current = false;

          setStore(
            freshStore
          );

          const freshAddress =
            freshStore.Address ??
            freshStore.address;

          const freshLatitude =
            freshStore.Latitude ??
            freshStore.latitude;

          const freshLongitude =
            freshStore.Longitude ??
            freshStore.longitude;

          if (
            freshAddress != null
          ) {
            setAddress(
              String(freshAddress)
            );
          }

          if (
            freshLatitude != null
          ) {
            setLatitude(
              String(freshLatitude)
            );
          }

          if (
            freshLongitude != null
          ) {
            setLongitude(
              String(freshLongitude)
            );
          }

          const newLogoUrl =
            freshStore.Logo ??
            freshStore.logo ??
            freshStore.imageUrl ??
            freshStore.ImageUrl ??
            freshStore.Image ??
            freshStore.image ??
            '';

          if (newLogoUrl) {
            setExistingLogo(
              newLogoUrl
            );
          }
        }
      }

      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      Alert.alert(
        'تم بنجاح',
        'تم حفظ بيانات المتجر والعنوان والموقع بنجاح'
      );

      // --------------------------------------------------------
      // ارجع لصفحة المتجر (ProfileTab) فورًا بمجرد نجاح الحفظ
      // --------------------------------------------------------

      if (navigation?.navigate) {

        navigation.navigate(
          'VendorTabs',
          {
            screen: 'ProfileTab',
          }
        );

      }

    } catch (error) {
      console.log(
        '❌ Update store error:',
        error?.response?.data ||
          error?.message ||
          error
      );

      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        null;

      Alert.alert(
        'خطأ',
        backendMessage ||
          'تعذر حفظ بيانات المتجر'
      );

    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
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
      style={styles.screen}
      contentContainerStyle={
        styles.container
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={
        false
      }
    >

      {/* ================================================== */}
      {/* TOP BAR */}
      {/* ================================================== */}

      <View
        style={styles.topBar}
      >
        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={
            handleBack
          }
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-forward"
            size={24}
            color="#1F2937"
          />
        </TouchableOpacity>
      </View>

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <View
        style={styles.header}
      >
        <TouchableOpacity
          style={
            styles.imagePickerWrapper
          }
          onPress={
            handleChooseImage
          }
          activeOpacity={0.8}
        >
          {storeImage ? (
            <Image
              source={{
                uri: storeImage,
              }}
              style={
                styles.storeAvatar
              }
            />
          ) : existingLogo ? (
            <Image
              source={{
                uri: existingLogo,
              }}
              style={
                styles.storeAvatar
              }
            />
          ) : (
            <View
              style={
                styles.iconWrapper
              }
            >
              <Ionicons
                name="storefront-outline"
                size={42}
                color={
                  COLORS?.primary ||
                  '#F97316'
                }
              />
            </View>
          )}

          <View
            style={
              styles.cameraBadge
            }
          >
            <Ionicons
              name="camera"
              size={14}
              color="#FFFFFF"
            />
          </View>
        </TouchableOpacity>

        <Text
          style={styles.title}
        >
          بيانات المتجر
        </Text>

        <Text
          style={styles.subtitle}
        >
          قم بتعديل بيانات متجرك
        </Text>
      </View>

      {/* ================================================== */}
      {/* STORE NAME */}
      {/* ================================================== */}

      <View style={styles.field}>
        <Text
          style={styles.label}
        >
          اسم المتجر *
        </Text>

        <View
          style={
            styles.inputWrapper
          }
        >
          <Ionicons
            name="storefront-outline"
            size={20}
            color="#9CA3AF"
          />

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="اسم المتجر"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            textAlign="right"
          />
        </View>
      </View>

      {/* ================================================== */}
      {/* PHONE */}
      {/* ================================================== */}

      <View style={styles.field}>
        <Text
          style={styles.label}
        >
          رقم الهاتف *
        </Text>

        <View
          style={
            styles.inputWrapper
          }
        >
          <Ionicons
            name="call-outline"
            size={20}
            color="#9CA3AF"
          />

          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="رقم الهاتف"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            style={styles.input}
            textAlign="right"
          />
        </View>
      </View>

      {/* ================================================== */}
      {/* EMAIL */}
      {/* ================================================== */}

      <View style={styles.field}>
        <Text
          style={styles.label}
        >
          البريد الإلكتروني
        </Text>

        <View
          style={
            styles.inputWrapper
          }
        >
          <Ionicons
            name="mail-outline"
            size={20}
            color="#9CA3AF"
          />

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="البريد الإلكتروني"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            textAlign="right"
          />
        </View>
      </View>

      {/* ================================================== */}
      {/* ADDRESS */}
      {/* ================================================== */}

      <View style={styles.field}>
        <Text
          style={styles.label}
        >
          العنوان *
        </Text>

        <View
          style={[
            styles.inputWrapper,
            styles.textAreaWrapper,
          ]}
        >
          <Ionicons
            name="location-outline"
            size={20}
            color="#9CA3AF"
          />

          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="عنوان المتجر"
            placeholderTextColor="#9CA3AF"
            style={[
              styles.input,
              styles.textArea,
            ]}
            multiline
            textAlign="right"
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* ================================================== */}
      {/* BUSINESS TYPE */}
      {/* ================================================== */}

      <View style={styles.field}>
        <Text
          style={styles.label}
        >
          نوع النشاط
        </Text>

        <View
          style={
            styles.inputWrapper
          }
        >
          <Ionicons
            name="business-outline"
            size={20}
            color="#9CA3AF"
          />

          <TextInput
            value={businessType}
            onChangeText={
              setBusinessType
            }
            placeholder="restaurant"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            textAlign="right"
          />
        </View>
      </View>

      {/* ================================================== */}
      {/* DELIVERY TYPE */}
      {/* ================================================== */}

      <View style={styles.field}>
        <Text
          style={styles.label}
        >
          نوع التوصيل
        </Text>

        <View
          style={
            styles.deliveryRow
          }
        >
          <TouchableOpacity
            style={[
              styles.deliveryOption,
              deliveryType ===
                'SELF' &&
                styles.deliveryOptionActive,
            ]}
            onPress={() =>
              setDeliveryType(
                'SELF'
              )
            }
            activeOpacity={0.8}
          >
            <Ionicons
              name="bicycle-outline"
              size={20}
              color={
                deliveryType ===
                'SELF'
                  ? '#FFFFFF'
                  : '#374151'
              }
            />

            <Text
              style={[
                styles.deliveryText,
                deliveryType ===
                  'SELF' &&
                  styles.deliveryTextActive,
              ]}
            >
              توصيل المتجر
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deliveryOption,
              deliveryType ===
                'PLATFORM' &&
                styles.deliveryOptionActive,
            ]}
            onPress={() =>
              setDeliveryType(
                'PLATFORM'
              )
            }
            activeOpacity={0.8}
          >
            <Ionicons
              name="car-outline"
              size={20}
              color={
                deliveryType ===
                'PLATFORM'
                  ? '#FFFFFF'
                  : '#374151'
              }
            />

            <Text
              style={[
                styles.deliveryText,
                deliveryType ===
                  'PLATFORM' &&
                  styles.deliveryTextActive,
              ]}
            >
              توصيل على بابك
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================================================== */}
      {/* STORE LOCATION */}
      {/* ================================================== */}

      <View
        style={
          styles.locationSection
        }
      >
        <View
          style={
            styles.sectionTitleWrapper
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
              styles.sectionTitle
            }
          >
            موقع المتجر
          </Text>
        </View>

        {/* ------------------------------------------------ */}
        {/* OPEN MAP */}
        {/* ------------------------------------------------ */}

        <TouchableOpacity
          style={
            styles.mapButton
          }
          onPress={
            handleChooseLocation
          }
          activeOpacity={0.85}
        >
          <View
            style={
              styles.mapIconWrapper
            }
          >
            <Ionicons
              name="map"
              size={30}
              color="#FFFFFF"
            />
          </View>

          <View
            style={
              styles.mapButtonInfo
            }
          >
            <Text
              style={
                styles.mapButtonTitle
              }
            >
              اختيار موقع المتجر
            </Text>

            <Text
              style={
                styles.mapButtonSubtitle
              }
            >
              اضغط لتحديد موقع المتجر على الخريطة
            </Text>
          </View>

          <Ionicons
            name="chevron-back-outline"
            size={22}
            color="#6B7280"
          />
        </TouchableOpacity>

        {/* ------------------------------------------------ */}
        {/* SELECTED LOCATION */}
        {/* ------------------------------------------------ */}

        {latitude &&
        longitude ? (
          <View
            style={
              styles.selectedLocationCard
            }
          >
            <View
              style={
                styles.selectedLocationIcon
              }
            >
              <Ionicons
                name="location"
                size={22}
                color="#10B981"
              />
            </View>

            <View
              style={
                styles.selectedLocationInfo
              }
            >
              <Text
                style={
                  styles.selectedLocationTitle
                }
              >
                تم تحديد موقع المتجر
              </Text>

              {address?.trim() ? (
                <Text
                  style={
                    styles.selectedAddressText
                  }
                  numberOfLines={2}
                >
                  {address.trim()}
                </Text>
              ) : null}

              <Text
                style={
                  styles.coordinatesText
                }
              >
                {Number(
                  latitude
                ).toFixed(6)}

                {'   ,   '}

                {Number(
                  longitude
                ).toFixed(6)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={
                handleChooseLocation
              }
              style={
                styles.changeLocationButton
              }
              activeOpacity={0.7}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={
                  COLORS?.primary ||
                  '#F97316'
                }
              />
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={
              styles.noLocationCard
            }
          >
            <Ionicons
              name="location-outline"
              size={24}
              color="#9CA3AF"
            />

            <Text
              style={
                styles.noLocationText
              }
            >
              لم يتم تحديد موقع المتجر بعد
            </Text>
          </View>
        )}
      </View>

      {/* ================================================== */}
      {/* SAVE */}
      {/* ================================================== */}

      <TouchableOpacity
        style={[
          styles.saveButton,
          saving &&
            styles.saveButtonDisabled,
        ]}
        onPress={
          handleSave
        }
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
          />
        ) : (
          <Ionicons
            name="checkmark-circle-outline"
            size={22}
            color="#FFFFFF"
          />
        )}

        <Text
          style={styles.saveText}
        >
          {saving
            ? 'جاري الحفظ...'
            : 'حفظ بيانات المتجر'}
        </Text>
      </TouchableOpacity>

      {/* ================================================== */}
      {/* STORE ID */}
      {/* ================================================== */}

      {store?.Id ||
      store?.id ? (
        <Text
          style={styles.storeId}
        >
          رقم المتجر: #
          {store?.Id ||
            store?.id}
        </Text>
      ) : null}
    </ScrollView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor:
      COLORS?.background ||
      '#F3F4F6',
  },

  container: {
    padding:
      SPACING?.lg || 20,
    paddingBottom: 50,
  },

  topBar: {
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    marginBottom: 5,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

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
      FONT_SIZES?.sm || 14,
    color: '#6B7280',
  },

  header: {
    alignItems: 'center',
    marginBottom: 25,
  },

  imagePickerWrapper: {
    position: 'relative',
    marginBottom: 12,
  },

  iconWrapper: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#FFF3EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  storeAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
    borderColor:
      COLORS?.primary ||
      '#F97316',
  },

  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor:
      COLORS?.primary ||
      '#F97316',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  title: {
    fontSize:
      FONT_SIZES?.xl || 22,
    fontWeight: '800',
    color: '#1F2937',
  },

  subtitle: {
    marginTop: 5,
    fontSize:
      FONT_SIZES?.sm || 13,
    color: '#6B7280',
  },

  field: {
    marginBottom: 16,
  },

  label: {
    fontSize:
      FONT_SIZES?.sm || 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 7,
    textAlign: 'right',
  },

  inputWrapper: {
    minHeight: 52,
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius:
      RADIUS?.sm || 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 13,
  },

  input: {
    flex: 1,
    minHeight: 48,
    marginRight: 10,
    fontSize:
      FONT_SIZES?.md || 15,
    color: '#1F2937',
  },

  textAreaWrapper: {
    minHeight: 110,
    alignItems:
      'flex-start',
    paddingTop: 13,
  },

  textArea: {
    minHeight: 90,
  },

  deliveryRow: {
    flexDirection:
      'row-reverse',
    gap: 10,
  },

  deliveryOption: {
    flex: 1,
    minHeight: 52,
    borderRadius:
      RADIUS?.sm || 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    justifyContent:
      'center',
    gap: 7,
  },

  deliveryOptionActive: {
    backgroundColor:
      COLORS?.primary ||
      '#F97316',
    borderColor:
      COLORS?.primary ||
      '#F97316',
  },

  deliveryText: {
    fontSize:
      FONT_SIZES?.sm || 13,
    fontWeight: '600',
    color: '#374151',
  },

  deliveryTextActive: {
    color: '#FFFFFF',
  },

  locationSection: {
    marginTop: 5,
    marginBottom: 22,
  },

  sectionTitleWrapper: {
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize:
      FONT_SIZES?.md || 16,
    fontWeight: '800',
    color: '#1F2937',
  },

  mapButton: {
    minHeight: 82,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius:
      RADIUS?.md || 12,
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  mapIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor:
      COLORS?.primary ||
      '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },

  mapButtonInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },

  mapButtonTitle: {
    fontSize:
      FONT_SIZES?.md || 15,
    fontWeight: '800',
    color: '#1F2937',
  },

  mapButtonSubtitle: {
    marginTop: 4,
    fontSize:
      FONT_SIZES?.xs || 12,
    color: '#6B7280',
    textAlign: 'right',
  },

  selectedLocationCard: {
    marginTop: 10,
    minHeight: 85,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius:
      RADIUS?.md || 12,
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },

  selectedLocationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  selectedLocationInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },

  selectedLocationTitle: {
    fontSize:
      FONT_SIZES?.sm || 13,
    fontWeight: '800',
    color: '#065F46',
  },

  selectedAddressText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#047857',
    fontWeight: '600',
    textAlign: 'right',
  },

  coordinatesText: {
    marginTop: 4,
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'right',
  },

  changeLocationButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  noLocationCard: {
    marginTop: 10,
    minHeight: 62,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius:
      RADIUS?.md || 12,
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    justifyContent:
      'center',
    gap: 8,
  },

  noLocationText: {
    fontSize:
      FONT_SIZES?.sm || 13,
    color: '#6B7280',
    fontWeight: '600',
  },

  saveButton: {
    minHeight: 55,
    borderRadius:
      RADIUS?.md || 12,
    backgroundColor:
      COLORS?.primary ||
      '#F97316',
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    justifyContent:
      'center',
    gap: 9,
    marginTop: 8,
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize:
      FONT_SIZES?.md || 15,
    fontWeight: '800',
  },

  storeId: {
    textAlign: 'center',
    marginTop: 15,
    fontSize:
      FONT_SIZES?.xs || 12,
    color: '#9CA3AF',
  },
});