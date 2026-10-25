import React, { useState } from 'react';

import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { COLORS } from '../constants/colors';
import {
  FONT_SIZES,
  RADIUS,
  SPACING,
} from '../constants/theme';

// ============================================================
// PRODUCT CARD
// ============================================================
//
// يدعم بيانات الـ API سواء كانت:
//
// camelCase:
// {
//   id,
//   name,
//   price,
//   imageUrl,
//   isAvailable
// }
//
// أو PascalCase:
// {
//   Id,
//   Name,
//   Price,
//   ImageUrl,
//   IsAvailable
// }
// ============================================================

export default function ProductCard({
  product,
  onAdd,
  onPress,
}) {
  const [imageError, setImageError] = useState(false);

  // ==========================================================
  // NORMALIZE PRODUCT DATA
  // ==========================================================

  const productName =
    product?.name ??
    product?.Name ??
    'منتج بدون اسم';

  const productPrice =
    product?.price ??
    product?.Price ??
    0;

  const productImage =
    product?.imageUrl ??
    product?.ImageUrl ??
    null;

  const productAvailable =
    product?.isAvailable ??
    product?.IsAvailable ??
    true;

  const hasImage =
    productImage &&
    String(productImage).trim() !== '' &&
    !imageError;

  const isAvailable =
    Boolean(productAvailable);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >

      {/* ================================================== */}
      {/* PRODUCT IMAGE */}
      {/* ================================================== */}

      <View style={styles.imageContainer}>

        {hasImage ? (

          <Image
            source={{
              uri: String(productImage),
            }}
            style={styles.image}
            resizeMode="cover"
            onError={() => {
              console.warn(
                '⚠️ Product image failed:',
                productImage
              );

              setImageError(true);
            }}
          />

        ) : (

          <View style={styles.imagePlaceholder}>

            <Text style={styles.placeholderIcon}>
              🍽️
            </Text>

          </View>

        )}

      </View>


      {/* ================================================== */}
      {/* PRODUCT INFO */}
      {/* ================================================== */}

      <View style={styles.info}>

        <Text
          style={styles.name}
          numberOfLines={2}
        >
          {productName}
        </Text>


        <Text style={styles.price}>
          {productPrice} ج.م
        </Text>


        {!isAvailable && (

          <Text style={styles.unavailableText}>
            غير متاح حاليًا
          </Text>

        )}

      </View>


      {/* ================================================== */}
      {/* ADD BUTTON */}
      {/* ================================================== */}

      <TouchableOpacity
        style={[
          styles.addBtn,
          !isAvailable && styles.disabled,
        ]}
        onPress={(event) => {

          event?.stopPropagation?.();

          if (
            isAvailable &&
            onAdd
          ) {
            onAdd();
          }

        }}
        disabled={!isAvailable}
        activeOpacity={0.8}
      >

        <Text style={styles.addText}>
          {isAvailable
            ? '+ إضافة'
            : 'غير متاح'}
        </Text>

      </TouchableOpacity>

    </TouchableOpacity>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  card: {
    flexDirection: 'row-reverse',

    backgroundColor:
      COLORS?.white ||
      '#FFFFFF',

    borderRadius:
      RADIUS?.md ||
      12,

    padding:
      SPACING?.sm ||
      8,

    marginBottom:
      SPACING?.sm ||
      8,

    alignItems: 'center',

    elevation: 1,

    boxShadow:
      '0px 1px 3px rgba(0, 0, 0, 0.12)',
  },


  // ========================================================
  // IMAGE
  // ========================================================

  imageContainer: {
    width: 60,
    height: 60,

    borderRadius:
      RADIUS?.sm ||
      8,

    overflow: 'hidden',

    backgroundColor:
      COLORS?.lightGray ||
      '#E5E7EB',
  },


  image: {
    width: '100%',
    height: '100%',
  },


  imagePlaceholder: {
    width: '100%',
    height: '100%',

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor:
      COLORS?.lightGray ||
      '#E5E7EB',
  },


  placeholderIcon: {
    fontSize: 25,
  },


  // ========================================================
  // INFO
  // ========================================================

  info: {
    flex: 1,

    marginRight:
      SPACING?.sm ||
      8,

    minWidth: 0,
  },


  name: {
    fontSize:
      FONT_SIZES?.md ||
      15,

    fontWeight: '600',

    textAlign: 'right',

    color:
      COLORS?.text ||
      '#222222',
  },


  price: {
    fontSize:
      FONT_SIZES?.sm ||
      13,

    color:
      COLORS?.primary ||
      '#F97316',

    marginTop: 4,

    textAlign: 'right',

    fontWeight: '600',
  },


  unavailableText: {
    fontSize:
      FONT_SIZES?.xs ||
      11,

    color: '#DC2626',

    marginTop: 3,

    textAlign: 'right',
  },


  // ========================================================
  // ADD BUTTON
  // ========================================================

  addBtn: {
    backgroundColor:
      COLORS?.primary ||
      '#F97316',

    paddingHorizontal:
      SPACING?.sm ||
      8,

    paddingVertical:
      SPACING?.xs ||
      4,

    borderRadius:
      RADIUS?.sm ||
      8,

    justifyContent: 'center',
    alignItems: 'center',
  },


  disabled: {
    backgroundColor:
      COLORS?.lightGray ||
      '#E5E7EB',
  },


  addText: {
    color:
      COLORS?.white ||
      '#FFFFFF',

    fontSize:
      FONT_SIZES?.xs ||
      11,

    fontWeight: '600',
  },

});