import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Button from '../../components/Button';
import { useCart } from '../../context/CartContext';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

export default function ProductDetailsScreen({ route, navigation }) {
  const { product } = route.params || {};
  const { addItem } = useCart();

  const [quantity, setQuantity] = useState(1);

  // ==========================================
  // NO PRODUCT
  // ==========================================

  if (!product) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={50}
          color="#9CA3AF"
        />

        <Text style={styles.emptyText}>
          المنتج غير موجود
        </Text>

        <TouchableOpacity
          style={styles.emptyBackButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyBackText}>
            رجوع
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================
  // ADD TO CART
  // ==========================================

  const handleAddToCart = () => {
    const vendorId =
      product.VendorId ??
      product.vendorId ??
      product.vendor_id ??
      product.RestaurantId ??
      product.restaurantId ??
      product.restaurant_id;

    addItem(
      product,
      vendorId,
      quantity
    );

    navigation.goBack();
  };

  // ==========================================
  // QUANTITY
  // ==========================================

  const increaseQty = () => {
    setQuantity((prev) => prev + 1);
  };

  const decreaseQty = () => {
    setQuantity((prev) => (
      prev > 1 ? prev - 1 : 1
    ));
  };

  // ==========================================
  // PRODUCT DATA
  // ==========================================

  const price = Number(
    product.Price ??
    product.price ??
    0
  );

  const productName =
    product.Name ??
    product.name ??
    'منتج بدون اسم';

  const description =
    product.Description ??
    product.description ??
    'لا يوجد وصف متاح لهذا المنتج حالياً.';

  const imageUrl =
    product.ImageUrl ??
    product.imageUrl ??
    product.image_url ??
    product.image ??
    null;

  const requiresPrescription =
    product.RequiresPrescription ??
    product.requiresPrescription ??
    product.requires_prescription ??
    false;

  const totalPrice = price * quantity;

  // ==========================================
  // IMAGE SOURCE
  // ==========================================

  /*
   * مهم:
   * لا نستخدم via.placeholder.com هنا.
   *
   * لو مفيش صورة من الـ Backend:
   * نستخدم null ونظهر Placeholder محلي داخل الـ UI.
   */

  const hasImage =
    typeof imageUrl === 'string' &&
    imageUrl.trim().length > 0;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <View style={styles.container}>

      {/* ==========================================
          BACK BUTTON
          ========================================== */}

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Ionicons
          name="arrow-forward"
          size={24}
          color="#1F2937"
        />
      </TouchableOpacity>

      {/* ==========================================
          CONTENT
          ========================================== */}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ========================================
            PRODUCT IMAGE
            ======================================== */}

        <View style={styles.imageContainer}>

          {hasImage ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name="image-outline"
                size={70}
                color="#9CA3AF"
              />

              <Text style={styles.placeholderText}>
                لا توجد صورة
              </Text>
            </View>
          )}

        </View>

        {/* ========================================
            PRODUCT CONTENT
            ======================================== */}

        <View style={styles.content}>

          {/* ======================================
              NAME + PRICE
              ====================================== */}

          <View style={styles.headerRow}>

            <Text
              style={styles.name}
              numberOfLines={3}
            >
              {productName}
            </Text>

            <Text style={styles.price}>
              {totalPrice.toFixed(2)} ج.م
            </Text>

          </View>

          {/* ======================================
              PRESCRIPTION WARNING
              ====================================== */}

          {requiresPrescription && (
            <View style={styles.prescriptionCard}>

              <Ionicons
                name="warning-outline"
                size={22}
                color="#D97706"
              />

              <Text style={styles.prescriptionNote}>
                هذا المنتج يتطلب روشتة طبية معتمدة
              </Text>

            </View>
          )}

          {/* ======================================
              DESCRIPTION
              ====================================== */}

          <Text style={styles.sectionTitle}>
            الوصف
          </Text>

          <Text style={styles.description}>
            {description}
          </Text>

        </View>

      </ScrollView>

      {/* ==========================================
          BOTTOM FOOTER
          ========================================== */}

      <View style={styles.footer}>

        {/* ========================================
            QUANTITY
            ======================================== */}

        <View style={styles.qtyContainer}>

          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={increaseQty}
            activeOpacity={0.7}
          >
            <Ionicons
              name="add"
              size={20}
              color="#1F2937"
            />
          </TouchableOpacity>

          <Text style={styles.qtyText}>
            {quantity}
          </Text>

          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={decreaseQty}
            activeOpacity={0.7}
          >
            <Ionicons
              name="remove"
              size={20}
              color="#1F2937"
            />
          </TouchableOpacity>

        </View>

        {/* ========================================
            ADD TO CART
            ======================================== */}

        <View style={styles.buttonContainer}>
          <Button
            title={`أضف للسلة • ${totalPrice.toFixed(2)} ج.م`}
            onPress={handleAddToCart}
          />
        </View>

      </View>

    </View>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({

  // ========================================
  // CONTAINER
  // ========================================

  container: {
    flex: 1,
    backgroundColor: COLORS?.white || '#FFFFFF',
  },

  // ========================================
  // EMPTY STATE
  // ========================================

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS?.white || '#FFFFFF',
    padding: 24,
  },

  emptyText: {
    marginTop: 12,
    fontSize: FONT_SIZES?.md || 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },

  emptyBackButton: {
    marginTop: 20,
    backgroundColor: COLORS?.primary || '#1850E2',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },

  emptyBackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // ========================================
  // BACK BUTTON
  // ========================================

  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 44,
    right: SPACING?.md || 16,

    width: 42,
    height: 42,

    borderRadius: 21,

    backgroundColor: '#FFFFFF',

    justifyContent: 'center',
    alignItems: 'center',

    zIndex: 100,

    elevation: 5,

    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.15)',
        }
      : {}),
  },

  // ========================================
  // SCROLL
  // ========================================

  scrollContent: {
    paddingBottom: 130,
  },

  // ========================================
  // IMAGE
  // ========================================

  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#F3F4F6',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },

  placeholderText: {
    marginTop: 8,
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  // ========================================
  // CONTENT
  // ========================================

  content: {
    padding: SPACING?.lg || 20,
  },

  // ========================================
  // HEADER
  // ========================================

  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  name: {
    fontSize: FONT_SIZES?.xl || 20,
    fontWeight: '700',
    color: '#1F2937',

    flex: 1,

    textAlign: 'right',

    marginLeft: 12,
  },

  price: {
    fontSize: FONT_SIZES?.xl || 20,
    color: COLORS?.primary || '#F97316',
    fontWeight: '700',

    marginLeft: 10,

    textAlign: 'left',
  },

  // ========================================
  // PRESCRIPTION
  // ========================================

  prescriptionCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',

    backgroundColor: '#FEF3C7',

    padding: 12,

    borderRadius: 10,

    marginBottom: 20,

    gap: 8,
  },

  prescriptionNote: {
    color: '#B45309',
    fontWeight: '600',
    fontSize: 13,

    flex: 1,

    textAlign: 'right',

    lineHeight: 20,
  },

  // ========================================
  // DESCRIPTION
  // ========================================

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',

    color: '#374151',

    textAlign: 'right',

    marginTop: 8,
    marginBottom: 8,
  },

  description: {
    fontSize: FONT_SIZES?.sm || 14,

    color: '#6B7280',

    lineHeight: 23,

    textAlign: 'right',
  },

  // ========================================
  // FOOTER
  // ========================================

  footer: {
    position: 'absolute',

    bottom: 0,
    left: 0,
    right: 0,

    flexDirection: 'row-reverse',

    alignItems: 'center',

    paddingHorizontal: SPACING?.lg || 20,
    paddingTop: 12,
    paddingBottom: 16,

    backgroundColor: '#FFFFFF',

    borderTopWidth: 1,
    borderColor: '#E5E7EB',

    zIndex: 50,

    elevation: 10,

    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0px -2px 8px rgba(0, 0, 0, 0.08)',
        }
      : {}),
  },

  // ========================================
  // QUANTITY
  // ========================================

  qtyContainer: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#F3F4F6',

    borderRadius: RADIUS?.md || 8,

    padding: 4,
  },

  qtyBtn: {
    width: 36,
    height: 36,

    justifyContent: 'center',
    alignItems: 'center',

    borderRadius: 18,

    backgroundColor: '#FFFFFF',
  },

  qtyText: {
    fontSize: 16,
    fontWeight: '700',

    paddingHorizontal: 12,

    color: '#1F2937',

    minWidth: 35,

    textAlign: 'center',
  },

  // ========================================
  // BUTTON
  // ========================================

  buttonContainer: {
    flex: 1,

    marginRight: 16,
  },

});