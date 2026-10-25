import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  Text,
  Switch,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import InputField from '../../components/InputField';
import Button from '../../components/Button';

import { vendorApi } from '../../api/vendorApi';

import { COLORS } from '../../constants/colors';
import {
  FONT_SIZES,
  SPACING,
  RADIUS,
} from '../../constants/theme';

// ============================================================
// HELPERS
// ============================================================

/**
 * Alert.alert بتاعة React Native متعملش حاجة على الويب
 * (react-native-web معندهاش Dialog حقيقي، والـ onPress
 * بتاع الأزرار مبيتنفذش خالص).
 *
 * الدالة دي بتستخدم window.alert على الويب وتنفذ onConfirm
 * فورًا، وعلى الموبايل بتستخدم Alert.alert العادية.
 */
const showAlert = (title, message, onConfirm) => {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n\n${message}`);

    if (onConfirm) {
      onConfirm();
    }
  } else {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'حسنًا',
          onPress: onConfirm,
        },
      ],
      {
        cancelable: false,
      }
    );
  }
};

const getProductId = (product) => {
  return (
    product?.id ??
    product?.Id ??
    product?._id ??
    product?.menuItemId ??
    product?.MenuItemId ??
    null
  );
};

const getProductValue = (product, ...keys) => {
  for (const key of keys) {
    if (
      product?.[key] !== undefined &&
      product?.[key] !== null
    ) {
      return product[key];
    }
  }

  return null;
};

const normalizeImageUrl = (url) => {
  if (!url) {
    return null;
  }

  const value = String(url).trim();

  if (!value) {
    return null;
  }

  return value;
};

const isTemporaryBlobUrl = (url) => {
  if (!url) {
    return false;
  }

  return String(url)
    .trim()
    .toLowerCase()
    .startsWith('blob:');
};

const getExtensionFromMimeType = (mimeType) => {
  const type = String(
    mimeType || ''
  ).toLowerCase();

  if (type.includes('png')) {
    return 'png';
  }

  if (type.includes('webp')) {
    return 'webp';
  }

  if (
    type.includes('jpeg') ||
    type.includes('jpg')
  ) {
    return 'jpg';
  }

  return 'jpg';
};

// ============================================================
// COMPONENT
// ============================================================

export default function EditProductScreen({
  route,
  navigation,
}) {
  const isMounted = useRef(true);

  const existingProduct =
    route?.params?.product || null;

  const productId =
    getProductId(existingProduct);

  // ==========================================================
  // UNMOUNT TRACKING
  // ==========================================================

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ==========================================================
  // INITIAL VALUES
  // ==========================================================

  const initialName =
    getProductValue(
      existingProduct,
      'Name',
      'name'
    ) || '';

  const initialDescription =
    getProductValue(
      existingProduct,
      'Description',
      'description'
    ) || '';

  const initialPrice =
    getProductValue(
      existingProduct,
      'Price',
      'price'
    );

  const initialImage =
    getProductValue(
      existingProduct,
      'ImageUrl',
      'imageUrl',
      'image_url',
      'ImageURL'
    );

  const initialPrescription =
    getProductValue(
      existingProduct,
      'RequiresPrescription',
      'requiresPrescription'
    );

  const normalizedInitialImage =
    isTemporaryBlobUrl(initialImage)
      ? null
      : normalizeImageUrl(initialImage);

  // ==========================================================
  // STATE
  // ==========================================================

  const [name, setName] = useState(
    String(initialName)
  );

  const [description, setDescription] =
    useState(
      String(initialDescription)
    );

  const [price, setPrice] = useState(
    initialPrice !== null &&
    initialPrice !== undefined
      ? String(initialPrice)
      : ''
  );

  const [imageUri, setImageUri] =
    useState(normalizedInitialImage);

  const [selectedImage, setSelectedImage] =
    useState(null);

  const [
    requiresPrescription,
    setRequiresPrescription,
  ] = useState(
    Boolean(initialPrescription)
  );

  const [loading, setLoading] =
    useState(false);

  // ==========================================================
  // PICK IMAGE
  // ==========================================================

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker
          .requestMediaLibraryPermissionsAsync();

      if (
        permission.status !==
        'granted'
      ) {
        Alert.alert(
          'إذن مطلوب',
          'نحتاج لإذن الوصول للمعرض لاختيار صورة المنتج'
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes: ['images'],

            allowsEditing: true,

            aspect: [1, 1],

            quality: 0.8,

            exif: false,
          }
        );

      if (
        result.canceled ||
        !result.assets ||
        result.assets.length === 0
      ) {
        return;
      }

      const asset =
        result.assets[0];

      if (!asset?.uri) {
        Alert.alert(
          'خطأ',
          'تعذر الحصول على الصورة المختارة'
        );

        return;
      }

      // الصورة تظهر فورًا في شاشة التعديل
      setImageUri(asset.uri);

      // الاحتفاظ بالملف لرفعه
      setSelectedImage(asset);

    } catch (error) {
      console.log(
        'Image picker error:',
        error
      );

      Alert.alert(
        'خطأ',
        'حدث خطأ أثناء اختيار الصورة'
      );
    }
  };

  // ==========================================================
  // APPEND IMAGE TO FORM DATA
  // ==========================================================

  const appendImageToFormData = async (
    formData
  ) => {
    if (!selectedImage?.uri) {
      return;
    }

    const uri =
      selectedImage.uri;

    const mimeType =
      selectedImage.mimeType ||
      'image/jpeg';

    const extension =
      getExtensionFromMimeType(
        mimeType
      );

    const fileName =
      selectedImage.fileName ||
      `product_${Date.now()}.${extension}`;

    // ========================================================
    // WEB
    // ========================================================

    if (Platform.OS === 'web') {
      try {
        const response =
          await fetch(uri);

        if (!response.ok) {
          throw new Error(
            `Failed to read image: ${response.status}`
          );
        }

        const blob =
          await response.blob();

        formData.append(
          'image',
          blob,
          fileName
        );

        return;

      } catch (error) {
        console.log(
          'Web image blob conversion error:',
          error
        );

        throw new Error(
          'تعذر تجهيز صورة المنتج للرفع'
        );
      }
    }

    // ========================================================
    // ANDROID / IOS
    // ========================================================

    formData.append(
      'image',
      {
        uri,
        name: fileName,
        type: mimeType,
      }
    );
  };

  // ==========================================================
  // BUILD FORM DATA
  // ==========================================================

  const buildFormData = async () => {
    const formData =
      new FormData();

    formData.append(
      'name',
      String(name).trim()
    );

    formData.append(
      'description',
      String(
        description || ''
      ).trim()
    );

    const numericPrice =
      Number(
        String(price).trim()
      );

    if (
      !Number.isFinite(
        numericPrice
      ) ||
      numericPrice < 0
    ) {
      throw new Error(
        'السعر غير صحيح'
      );
    }

    formData.append(
      'price',
      String(numericPrice)
    );

    formData.append(
      'requiresPrescription',
      requiresPrescription
        ? 'true'
        : 'false'
    );

    await appendImageToFormData(
      formData
    );

    return formData;
  };

  // ==========================================================
  // BUILD UPDATED PRODUCT
  // ==========================================================

  const buildUpdatedProduct = (
    updatedProduct,
    serverImageUrl
  ) => {
    const safeServerImageUrl =
      serverImageUrl &&
      !isTemporaryBlobUrl(
        serverImageUrl
      )
        ? String(
            serverImageUrl
          ).trim()
        : null;

    const localImageUrl =
      imageUri &&
      !isTemporaryBlobUrl(
        imageUri
      )
        ? imageUri
        : null;

    const safeImageUrl =
      safeServerImageUrl ||
      localImageUrl ||
      null;

    return {
      ...existingProduct,

      id:
        updatedProduct?.id ??
        updatedProduct?.Id ??
        existingProduct?.id ??
        productId,

      Id:
        updatedProduct?.Id ??
        updatedProduct?.id ??
        existingProduct?.Id ??
        productId,

      name:
        updatedProduct?.name ??
        updatedProduct?.Name ??
        name,

      Name:
        updatedProduct?.Name ??
        updatedProduct?.name ??
        name,

      description:
        updatedProduct?.description ??
        updatedProduct?.Description ??
        description,

      Description:
        updatedProduct?.Description ??
        updatedProduct?.description ??
        description,

      price:
        updatedProduct?.price ??
        updatedProduct?.Price ??
        Number(price),

      Price:
        updatedProduct?.Price ??
        updatedProduct?.price ??
        Number(price),

      requiresPrescription:
        updatedProduct?.requiresPrescription ??
        updatedProduct?.RequiresPrescription ??
        requiresPrescription,

      RequiresPrescription:
        updatedProduct?.RequiresPrescription ??
        updatedProduct?.requiresPrescription ??
        requiresPrescription,

      imageUrl:
        safeImageUrl,

      ImageUrl:
        safeImageUrl,

      image_url:
        safeImageUrl,

      ImageURL:
        safeImageUrl,
    };
  };

  // ==========================================================
  // SAVE
  // ==========================================================

  const handleSave = async () => {
    // ========================================================
    // VALIDATE NAME
    // ========================================================

    if (!String(name).trim()) {
      Alert.alert(
        'تنبيه',
        'برجاء إدخال اسم المنتج'
      );

      return;
    }

    // ========================================================
    // VALIDATE PRICE
    // ========================================================

    const numericPrice =
      Number(
        String(price).trim()
      );

    if (
      !Number.isFinite(
        numericPrice
      ) ||
      numericPrice < 0
    ) {
      Alert.alert(
        'تنبيه',
        'برجاء إدخال سعر صحيح'
      );

      return;
    }

    // ========================================================
    // VALIDATE PRODUCT ID
    // ========================================================

    if (
      existingProduct &&
      !productId
    ) {
      Alert.alert(
        'خطأ',
        'تعذر تحديد رقم المنتج'
      );

      return;
    }

    // ========================================================
    // PREVENT DOUBLE SAVE
    // ========================================================

    if (loading) {
      return;
    }

    setLoading(true);

    try {
      // ======================================================
      // CREATE PRODUCT
      // ======================================================

      if (!existingProduct) {
        const formData =
          await buildFormData();

        const createResponse =
          await vendorApi.createProduct(
            formData
          );

        // ======================================================
        // EXTRACT CREATED PRODUCT FROM RESPONSE
        // ======================================================

        const createResponseRoot =
          createResponse?.data;

        const createResponseData =
          createResponseRoot?.data ??
          createResponseRoot;

        const createdProduct =
          createResponseData?.product ??
          createResponseData?.menuItem ??
          createResponseData;

        // ======================================================
        // GET SERVER IMAGE URL
        // ======================================================

        const createdImageUrl =
          getProductValue(
            createdProduct,
            'imageUrl',
            'ImageUrl',
            'image_url',
            'ImageURL'
          );

        const validCreatedImageUrl =
          createdImageUrl &&
          !isTemporaryBlobUrl(
            createdImageUrl
          )
            ? String(
                createdImageUrl
              ).trim()
            : null;

        const finalCreatedImageUri =
          validCreatedImageUrl ||
          (
            imageUri &&
            !isTemporaryBlobUrl(
              imageUri
            )
              ? imageUri
              : null
          );

        // ======================================================
        // BUILD PRODUCT FOR NAVIGATION
        // ======================================================

        const newProductForNavigation =
          buildUpdatedProduct(
            createdProduct,
            finalCreatedImageUri
          );

        showAlert(
          'نجاح',
          'تم إضافة المنتج بنجاح',
          () => {
            if (isMounted.current) {
              navigation.navigate(
                'VendorTabs',
                {
                  screen: 'ProductsTab',
                  params: {
                    updatedProduct:
                      newProductForNavigation,
                  },
                }
              );
            }
          }
        );

        return;
      }

      // ======================================================
      // UPDATE PRODUCT
      // ======================================================

      const formData =
        await buildFormData();

      const response =
        await vendorApi.updateProduct(
          productId,
          formData
        );

      // ======================================================
      // EXTRACT RESPONSE
      // ======================================================

      const responseRoot =
        response?.data;

      const responseData =
        responseRoot?.data ??
        responseRoot;

      const updatedProduct =
        responseData?.product ??
        responseData?.menuItem ??
        responseData;

      // ======================================================
      // GET SERVER IMAGE URL
      // ======================================================

      const returnedImageUrl =
        getProductValue(
          updatedProduct,
          'imageUrl',
          'ImageUrl',
          'image_url',
          'ImageURL'
        );

      const validServerImageUrl =
        returnedImageUrl &&
        !isTemporaryBlobUrl(
          returnedImageUrl
        )
          ? String(
              returnedImageUrl
            ).trim()
          : null;

      // ======================================================
      // FINAL IMAGE
      // ======================================================

      const finalImageUri =
        validServerImageUrl ||
        (
          imageUri &&
          !isTemporaryBlobUrl(
            imageUri
          )
            ? imageUri
            : null
        );

      // ======================================================
      // BUILD UPDATED PRODUCT
      // ======================================================

      const updatedProductForNavigation =
        buildUpdatedProduct(
          updatedProduct,
          finalImageUri
        );

      // ======================================================
      // RETURN BACK TO VENDOR PRODUCTS SCREEN
      // ======================================================

      if (isMounted.current) {
        navigation.navigate(
          'VendorTabs',
          {
            screen: 'ProductsTab',
            params: {
              updatedProduct:
                updatedProductForNavigation,
            },
          }
        );
      }

    } catch (error) {
      console.log(
        'ERROR SAVING PRODUCT:',
        error
      );

      const serverMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error;

      showAlert(
        'خطأ',
        serverMessage ||
          error?.message ||
          'تعذر حفظ البيانات، يرجى المحاولة لاحقًا'
      );

    } finally {
      if (
        isMounted.current
      ) {
        setLoading(false);
      }
    }
  };

  // ==========================================================
  // IMAGE KEY
  // ==========================================================

  const imageKey =
    imageUri
      ? `${imageUri}-${selectedImage?.uri || 'server'}`
      : 'product-image-empty';

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
      showsVerticalScrollIndicator={
        false
      }
      keyboardShouldPersistTaps="handled"
    >

      {/* HEADER */}

      <View
        style={styles.headerRow}
      >

        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            navigation.goBack()
          }
          activeOpacity={0.7}
          disabled={loading}
        >

          <Ionicons
            name="arrow-forward"
            size={24}
            color="#1F2937"
          />

        </TouchableOpacity>

        <Text
          style={styles.title}
        >
          {
            existingProduct
              ? 'تعديل منتج'
              : 'منتج جديد'
          }
        </Text>

      </View>

      {/* IMAGE PICKER */}

      <TouchableOpacity
        style={
          styles.imagePicker
        }
        onPress={
          pickImage
        }
        activeOpacity={0.85}
        disabled={loading}
      >

        {imageUri ? (

          <Image
            key={imageKey}
            source={{
              uri: imageUri,
            }}
            style={
              styles.previewImage
            }
            resizeMode="cover"
          />

        ) : (

          <View
            style={
              styles.imagePlaceholder
            }
          >

            <Ionicons
              name="camera-outline"
              size={36}
              color={
                COLORS?.gray ||
                '#9CA3AF'
              }
            />

            <Text
              style={
                styles.imagePlaceholderText
              }
            >
              إضافة صورة للمنتج
            </Text>

            <Text
              style={
                styles.imageHint
              }
            >
              اضغط لاختيار صورة
            </Text>

          </View>

        )}

        {imageUri &&
          !loading && (

          <View
            style={
              styles.changeImageOverlay
            }
          >

            <Ionicons
              name="camera"
              size={20}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.changeImageText
              }
            >
              تغيير الصورة
            </Text>

          </View>

        )}

      </TouchableOpacity>

      {/* NAME */}

      <InputField
        label="الاسم"
        value={name}
        onChangeText={
          setName
        }
        placeholder="مثال: بيتزا مارجريتا / بنادول"
      />

      {/* DESCRIPTION */}

      <InputField
        label="الوصف"
        value={description}
        onChangeText={
          setDescription
        }
        multiline
        placeholder="تفاصيل المنتج أو المكونات"
      />

      {/* PRICE */}

      <InputField
        label="السعر (ج.م)"
        value={price}
        onChangeText={
          setPrice
        }
        keyboardType="decimal-pad"
        placeholder="0.00"
      />

      {/* PRESCRIPTION SWITCH */}

      <View
        style={
          styles.switchRow
        }
      >

        <Switch
          value={
            requiresPrescription
          }
          onValueChange={
            setRequiresPrescription
          }
          disabled={loading}
          trackColor={{
            false: '#D1D5DB',
            true:
              COLORS?.primary ||
              '#F97316',
          }}
        />

        <Text
          style={
            styles.switchLabel
          }
        >
          يتطلب روشتة طبية (للصيدليات فقط)
        </Text>

      </View>

      {/* SAVE BUTTON */}

      <Button
        title={
          existingProduct
            ? 'تحديث المنتج'
            : 'حفظ المنتج'
        }
        onPress={
          handleSave
        }
        loading={loading}
        disabled={loading}
      />

    </ScrollView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    container: {
      flexGrow: 1,

      padding:
        SPACING?.lg ||
        20,

      backgroundColor:
        COLORS?.background ||
        '#F3F4F6',
    },

    headerRow: {
      flexDirection:
        'row-reverse',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom:
        SPACING?.lg ||
        24,
    },

    title: {
      flex: 1,

      marginRight: 10,

      fontSize:
        FONT_SIZES?.xl ||
        20,

      fontWeight:
        '700',

      textAlign:
        'right',

      color:
        '#1F2937',
    },

    backButton: {
      padding: 7,

      borderRadius:
        RADIUS?.sm ||
        8,

      backgroundColor:
        '#E5E7EB',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    imagePicker: {
      width: '100%',

      height: 190,

      borderRadius:
        RADIUS?.md ||
        12,

      backgroundColor:
        COLORS?.white ||
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderStyle:
        'dashed',

      justifyContent:
        'center',

      alignItems:
        'center',

      marginBottom:
        SPACING?.lg ||
        20,

      overflow:
        'hidden',

      position:
        'relative',
    },

    previewImage: {
      width:
        '100%',

      height:
        '100%',
    },

    imagePlaceholder: {
      alignItems:
        'center',

      justifyContent:
        'center',
    },

    imagePlaceholderText: {
      marginTop: 8,

      fontSize:
        FONT_SIZES?.sm ||
        14,

      color:
        COLORS?.gray ||
        '#6B7280',

      fontWeight:
        '600',
    },

    imageHint: {
      marginTop: 4,

      fontSize: 12,

      color:
        '#9CA3AF',
    },

    changeImageOverlay: {
      position:
        'absolute',

      bottom: 0,

      left: 0,

      right: 0,

      height: 42,

      backgroundColor:
        'rgba(0,0,0,0.55)',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    changeImageText: {
      color:
        '#FFFFFF',

      fontSize: 13,

      fontWeight:
        '600',

      marginLeft: 7,
    },

    switchRow: {
      flexDirection:
        'row-reverse',

      alignItems:
        'center',

      marginBottom:
        SPACING?.lg ||
        24,

      backgroundColor:
        COLORS?.white ||
        '#FFFFFF',

      padding:
        SPACING?.md ||
        14,

      borderRadius:
        RADIUS?.sm ||
        8,
    },

    switchLabel: {
      marginRight:
        SPACING?.sm ||
        10,

      flex: 1,

      textAlign:
        'right',

      fontSize:
        FONT_SIZES?.sm ||
        14,

      color:
        '#374151',
    },

  });